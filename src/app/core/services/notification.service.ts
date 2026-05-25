import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, from, map, of, switchMap } from 'rxjs';
import { Notification } from '../models';
import { AuthStateService } from './auth-state.service';
import { PushNotificationService, InAppNotification } from './push-notification.service';
import { SupabaseService } from './supabase.service';

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  navigate_to?: string | null;
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
    navigateTo: row.navigate_to ?? undefined,
  };
}

function mapRows(rows: NotificationRow[]): Notification[] {
  return rows.map(rowToNotification);
}

/** Map Supabase Realtime notification to the app's Notification model. */
function liveToLegacyNotification(n: InAppNotification): Notification {
  return {
    id: n.id,
    userId: n.userId,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    createdAt: n.createdAt,
    navigateTo: n.navigateTo
  };
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly supabase = inject(SupabaseService);
  private readonly authState = inject(AuthStateService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private readonly loadingSubject = new BehaviorSubject(false);
  private readonly tableMissing = new BehaviorSubject<boolean>(false);

  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();
  readonly tableMissing$ = this.tableMissing.asObservable();

  readonly currentUserNotifications$ = combineLatest([
    this.notifications$,
    this.authState.currentUser$
  ]).pipe(
    map(([notifications, user]) =>
      user ? notifications.filter((notification) => notification.userId === user.id) : []
    )
  );
  readonly unreadNotifications$ = this.currentUserNotifications$.pipe(
    map((notifications) => notifications.filter((notification) => !notification.isRead))
  );
  readonly unreadCount$ = this.unreadNotifications$.pipe(
    map((notifications) => notifications.length)
  );

  readonly unreadCount = toSignal(this.unreadCount$, { initialValue: 0 });

  constructor() {
    // Listen to auth changes — reload when the user logs in/out
    this.authState.currentUser$.pipe(
      switchMap((user) => {
        if (!user) {
          this.notificationsSubject.next([]);
          return of([] as Notification[]);
        }
        return this.fetchNotifications(user.id);
      })
    ).subscribe((notifications) => {
      this.notificationsSubject.next(notifications);
    });

    // Bridge Realtime-delivered notifications into the same stream.
    // These arrive instantly via PushNotificationService's Realtime subscription
    // and are merged on top of the polled result.
    this.pushNotificationService.notifications$.subscribe((live) => {
      const liveMapped = live.map(liveToLegacyNotification);
      const current = this.notificationsSubject.value;

      // Dedupe by id: live entries override polled ones
      const liveIds = new Set(liveMapped.map((n) => n.id));
      const merged = [
        ...liveMapped,
        ...current.filter((n) => !liveIds.has(n.id))
      ].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      this.notificationsSubject.next(merged);
    });
  }

  refresh(): void {
    const user = this.authState.currentUser();
    if (!user) {
      this.notificationsSubject.next([]);
      return;
    }
    this.loadingSubject.next(true);
    this.fetchNotifications(user.id).subscribe((notifications) => {
      this.notificationsSubject.next(notifications);
      this.loadingSubject.next(false);
    });
  }

  markRead(id: string): void {
    // Optimistic update
    this.notificationsSubject.next(
      this.notificationsSubject.value.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
    // Persist to Supabase (fire-and-forget on failure to keep UI snappy)
    from(this.supabase.client.from('notifications').update({ is_read: true }).eq('id', id)).subscribe(
      ({ error }) => {
        if (error && !this.isTableMissingError(error)) {
          console.warn('[NotificationService] Failed to mark notification as read:', error.message);
        }
      }
    );
  }

  markAllRead(userId?: string): void {
    const uid = userId || this.authState.currentUser()?.id;
    if (!uid) {
      return;
    }
    // Optimistic update
    this.notificationsSubject.next(
      this.notificationsSubject.value.map((notification) =>
        notification.userId === uid ? { ...notification, isRead: true } : notification
      )
    );
    // Persist to Supabase
    from(this.supabase.client.from('notifications').update({ is_read: true }).eq('user_id', uid)).subscribe(
      ({ error }) => {
        if (error && !this.isTableMissingError(error)) {
          console.warn('[NotificationService] Failed to mark all notifications as read:', error.message);
        }
      }
    );
  }

  private fetchNotifications(userId: string) {
    return from(
      this.supabase.client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (this.isTableMissingError(error)) {
            if (!this.tableMissing.value) {
              console.warn(
                '[NotificationService] Notifications table does not exist. ' +
                'Run SUPABASE_REQUIRED_NOTIFICATIONS_SQL.md to create it. ' +
                'Returning empty array.'
              );
              this.tableMissing.next(true);
            }
            return [];
          }
          console.error('[NotificationService] Failed to fetch notifications:', error.message);
          return [];
        }
        if (this.tableMissing.value) {
          this.tableMissing.next(false);
        }
        return mapRows((data ?? []) as NotificationRow[]);
      })
    );
  }

  private isTableMissingError(error: any): boolean {
    const msg = (error?.message ?? error?.code ?? '').toLowerCase();
    return msg.includes('relation') && msg.includes('notifications') && msg.includes('exist');
  }
}
