import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, from, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStateService } from './auth-state.service';
import { SupabaseService } from './supabase.service';

/** Shape of a notification received from Supabase Realtime. */
export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  navigateTo?: string;
}

/** Maps a Supabase notifications row to the app model. */
function rowToNotification(row: any): InAppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    isRead: row.is_read ?? false,
    createdAt: row.created_at,
    navigateTo: row.navigate_to ?? undefined
  };
}

/**
 * Push notification service.
 *
 * Two responsibilities:
 *   1. **In-app delivery** — subscribes to the `notifications` table via
 *      Supabase Realtime so new notifications appear instantly.
 *   2. **Web push** — registers the browser for background push via the
 *      Push API (VAPID + Service Worker) and persists the subscription
 *      via `upsert_device_token` RPC.
 *
 * Auto-connects on login, disconnects on logout.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly authState = inject(AuthStateService);
  private readonly supabase = inject(SupabaseService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly notificationsSubject = new BehaviorSubject<InAppNotification[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject(0);
  private readonly deviceRegisteredSubject = new BehaviorSubject(false);

  /** Live stream of in-app notifications (newest first). */
  readonly notifications$: Observable<InAppNotification[]> =
    this.notificationsSubject.asObservable();

  /** Current unread count. */
  readonly unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();

  /** Whether this device has been registered for push. */
  readonly isDeviceRegistered$: Observable<boolean> =
    this.deviceRegisteredSubject.asObservable();

  /** Snapshot of current notifications. */
  get notificationSnapshot(): InAppNotification[] {
    return this.notificationsSubject.value;
  }

  constructor() {
    // Subscribe/unsubscribe on auth changes
    this.authState.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user) {
          this.subscribeToNotifications(user.id);
          void this.registerDevice();
        } else {
          this.cleanup();
        }
      });
  }

  // ── In-App Realtime Notifications ───────────────────

  private subscribeToNotifications(userId: string): void {
    // Subscribe to INSERT on notifications
    this.supabase.client
      .channel('realtime-notifications')
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const row = payload.new;
          if (!row || row.user_id !== userId) return;

          const notif = rowToNotification(row);
          const current = this.notificationsSubject.value;
          this.notificationsSubject.next([notif, ...current]);
          this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const row = payload.new;
          if (!row || row.user_id !== userId) return;

          const current = this.notificationsSubject.value;
          this.notificationsSubject.next(
            current.map((n) => (n.id === row.id ? rowToNotification(row) : n))
          );
          this.recalculateUnreadCount();
        }
      )
      .subscribe();
  }

  // ── Web Push Registration ──────────────────────────

  /**
   * Register this browser for web push.
   * Safe to call multiple times — skips if already registered.
   */
  async registerDevice(): Promise<{ success: boolean; error?: string }> {
    const user = this.authState.snapshot;
    if (!user) {
      return { success: false, error: 'No authenticated user.' };
    }
    if (this.deviceRegisteredSubject.value) {
      return { success: true };
    }

    // Browser support check
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('[PushNotification] Push not supported in this browser.');
      return { success: false, error: 'Push not supported.' };
    }

    // Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[PushNotification] Permission denied.');
      return { success: false, error: 'Permission denied.' };
    }

    // Service worker
    let swRegistration: ServiceWorkerRegistration;
    try {
      swRegistration = await navigator.serviceWorker.ready;
    } catch {
      console.warn('[PushNotification] Service worker unavailable.');
      return { success: false, error: 'Service worker unavailable.' };
    }

    const vapidKey = environment.vapidKey;
    if (!vapidKey) {
      // No VAPID configured — still enable in-app Realtime notifications
      console.warn('[PushNotification] VAPID key not set — in-app notifications only.');
      this.deviceRegisteredSubject.next(true);
      return { success: true };
    }

    try {
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlB64ToUint8Array(vapidKey)
      });

      const { error } = await this.supabase.client.rpc('upsert_device_token', {
        p_token: JSON.stringify(subscription),
        p_platform: 'web'
      });

      if (error) {
        console.error('[PushNotification] Token registration failed:', error.message);
        return { success: false, error: error.message };
      }

      this.deviceRegisteredSubject.next(true);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error.';
      console.error('[PushNotification] Subscription failed:', msg);
      return { success: false, error: msg };
    }
  }

  // ── Mark as Read ──────────────────────────────────

  /** Mark a single notification read (optimistic local + remote). */
  async markRead(notificationId: string): Promise<void> {
    this.notificationsSubject.next(
      this.notificationsSubject.value.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
    this.recalculateUnreadCount();
    await this.supabase.client.from('notifications').update({ is_read: true }).eq('id', notificationId);
  }

  /** Mark all notifications read for the current user. */
  async markAllRead(): Promise<void> {
    const user = this.authState.snapshot;
    if (!user) return;

    this.notificationsSubject.next(
      this.notificationsSubject.value.map((n) => ({ ...n, isRead: true }))
    );
    this.unreadCountSubject.next(0);

    await this.supabase.client
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  }

  // ── Teardown ──────────────────────────────────────

  private cleanup(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.deviceRegisteredSubject.next(false);
  }

  // ── Helpers ───────────────────────────────────────

  private recalculateUnreadCount(): void {
    const count = this.notificationsSubject.value.filter((n) => !n.isRead).length;
    this.unreadCountSubject.next(count);
  }

  private urlB64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      output[i] = rawData.charCodeAt(i);
    }
    return output;
  }
}
