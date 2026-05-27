import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStateService } from './auth-state.service';
import { ApiService } from './api.service';

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

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  vapidKey: string;
};

const FIREBASE_WEB_PLATFORM = 'firebase-web';

/**
 * Push notification service.
 *
 * Two responsibilities:
 *   1. **In-app delivery** â€” subscribes to the `notifications` table via
 *      Supabase Realtime so new notifications appear instantly.
 *   2. **Web push** â€” registers the browser with Firebase Messaging,
 *      obtains an FCM token, and persists it via `upsert_device_token`.
 *
 * Auto-connects on login, disconnects on logout.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly authState = inject(AuthStateService);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly notificationsSubject = new BehaviorSubject<InAppNotification[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject(0);
  private readonly deviceRegisteredSubject = new BehaviorSubject(false);

  private firebaseApp: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private foregroundListenerRegistered = false;

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

  private subscribeToNotifications(_userId: string): void {
    // In-app notifications delivered via NotificationService polling.
    // SignalR integration will replace this for real-time delivery.
  }

  /**
   * Register this browser for Firebase Messaging.
   * Safe to call multiple times - skips if already registered.
   */
  async registerDevice(): Promise<{ success: boolean; error?: string }> {
    const user = this.authState.snapshot;
    if (!user) {
      return { success: false, error: 'No authenticated user.' };
    }
    if (this.deviceRegisteredSubject.value) {
      return { success: true };
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('[PushNotification] Push not supported in this browser.');
      return { success: false, error: 'Push not supported.' };
    }

    const config = this.getFirebaseConfig();
    if (!config) {
      console.warn('[PushNotification] Firebase config incomplete - browser push disabled.');
      return { success: false, error: 'Firebase config missing.' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[PushNotification] Permission denied.');
      return { success: false, error: 'Permission denied.' };
    }

    const swRegistration = await this.ensureServiceWorkerRegistration(config);
    if (!swRegistration) {
      console.warn('[PushNotification] Service worker unavailable.');
      return { success: false, error: 'Service worker unavailable.' };
    }

    const messaging = await this.getMessagingClient();
    if (!messaging) {
      console.warn('[PushNotification] Firebase Messaging unavailable.');
      return { success: false, error: 'Firebase Messaging unavailable.' };
    }

    this.registerForegroundMessageHandler(messaging);

    try {
      const token = await getToken(messaging, {
        vapidKey: config.vapidKey,
        serviceWorkerRegistration: swRegistration
      });

      if (!token) {
        return { success: false, error: 'Failed to obtain Firebase token.' };
      }

      await this.apiService.post('device-tokens', {
        token,
        platform: FIREBASE_WEB_PLATFORM
      }).toPromise();

      this.deviceRegisteredSubject.next(true);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error.';
      console.error('[PushNotification] Subscription failed:', msg);
      return { success: false, error: msg };
    }
  }

  async markRead(notificationId: string): Promise<void> {
    this.notificationsSubject.next(
      this.notificationsSubject.value.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
    this.recalculateUnreadCount();
    await this.apiService.put(`notifications/${notificationId}/read`, {}).toPromise();
  }

  async markAllRead(): Promise<void> {
    const user = this.authState.snapshot;
    if (!user) return;

    this.notificationsSubject.next(
      this.notificationsSubject.value.map((n) => ({ ...n, isRead: true }))
    );
    this.unreadCountSubject.next(0);

    await this.apiService.put('notifications/read-all', {}).toPromise();
  }

  private cleanup(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.deviceRegisteredSubject.next(false);
  }

  private recalculateUnreadCount(): void {
    const count = this.notificationsSubject.value.filter((n) => !n.isRead).length;
    this.unreadCountSubject.next(count);
  }

  private async getMessagingClient(): Promise<Messaging | null> {
    if (this.messaging) {
      return this.messaging;
    }

    try {
      if (!(await isSupported())) {
        return null;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error.';
      console.warn('[PushNotification] Firebase Messaging support check failed:', msg);
      return null;
    }

    const app = this.ensureFirebaseApp();
    if (!app) {
      return null;
    }

    this.messaging = getMessaging(app);
    return this.messaging;
  }

  private registerForegroundMessageHandler(messaging: Messaging): void {
    if (this.foregroundListenerRegistered) {
      return;
    }

    this.foregroundListenerRegistered = true;

    onMessage(messaging, (payload) => {
      const notification = (payload.notification ?? {}) as Record<string, string>;
      const data = (payload.data ?? {}) as Record<string, string>;
      const title = notification['title'] || data['title'] || 'Clinic notification';
      const body =
        notification['body'] ||
        data['body'] ||
        data['message'] ||
        'You have a new notification.';
      const navigateTo = data['navigate_to'] || data['navigateTo'] || '/doctor/appointments';

      if ('Notification' in window && Notification.permission === 'granted') {
        const browserNotification = new Notification(title, {
          body,
          icon: '/assets/icons/icon-192x192.png',
          badge: '/assets/icons/icon-192x192.png',
          data: { navigateTo }
        });

        browserNotification.onclick = () => {
          browserNotification.close();
          window.focus();
          if (navigateTo) {
            void window.location.assign(navigateTo);
          }
        };
      }

      this.notificationsSubject.next([
        {
          id: crypto.randomUUID(),
          userId: this.authState.snapshot?.id ?? '',
          title,
          message: body,
          isRead: false,
          createdAt: new Date().toISOString(),
          navigateTo
        },
        ...this.notificationsSubject.value
      ]);
      this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
    });
  }

  private ensureFirebaseApp(): FirebaseApp | null {
    if (this.firebaseApp) {
      return this.firebaseApp;
    }

    const config = this.getFirebaseConfig();
    if (!config) {
      return null;
    }

    this.firebaseApp =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            apiKey: config.apiKey,
            authDomain: config.authDomain,
            projectId: config.projectId,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId,
            measurementId: config.measurementId
          });

    return this.firebaseApp;
  }

  private async ensureServiceWorkerRegistration(
    config: FirebaseWebConfig
  ): Promise<ServiceWorkerRegistration | null> {
    try {
      const existing = await navigator.serviceWorker.getRegistration('/');
      if (existing) {
        const scriptUrl =
          existing.active?.scriptURL ??
          existing.waiting?.scriptURL ??
          existing.installing?.scriptURL ??
          '';

        if (scriptUrl.includes('/firebase-messaging-sw.js')) {
          return existing;
        }

        await existing.unregister();
      }

      const swUrl = this.buildFirebaseServiceWorkerUrl(config);
      return await navigator.serviceWorker.register(swUrl, { scope: '/' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error.';
      console.error('[PushNotification] Failed to register service worker:', msg);
      return null;
    }
  }

  private buildFirebaseServiceWorkerUrl(config: FirebaseWebConfig): string {
    const params = new URLSearchParams({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    });

    if (config.measurementId) {
      params.set('measurementId', config.measurementId);
    }

    return `/firebase-messaging-sw.js?${params.toString()}`;
  }

  private getFirebaseConfig(): FirebaseWebConfig | null {
    const apiKey = environment.firebaseApiKey?.trim();
    const authDomain = environment.firebaseAuthDomain?.trim();
    const projectId = environment.firebaseProjectId?.trim();
    const messagingSenderId = environment.firebaseMessagingSenderId?.trim();
    const appId = environment.firebaseAppId?.trim();
    const measurementId = environment.firebaseMeasurementId?.trim();
    const vapidKey = environment.firebaseVapidKey?.trim() || environment.vapidKey?.trim();

    if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId || !vapidKey) {
      return null;
    }

    return {
      apiKey,
      authDomain,
      projectId,
      messagingSenderId,
      appId,
      measurementId: measurementId || undefined,
      vapidKey
    };
  }
}
