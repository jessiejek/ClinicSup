import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, map, of, switchMap } from 'rxjs';
import { Notification } from '../models';
import { ApiService } from './api.service';
import { AuthStateService } from './auth-state.service';
import { PushNotificationService, InAppNotification } from './push-notification.service';

interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  navigateTo?: string;
}

function dtoToNotification(dto: NotificationDto): Notification {
  return {
    id: dto.id,
    userId: dto.userId,
    title: dto.title,
    message: dto.message,
    isRead: dto.isRead,
    createdAt: dto.createdAt,
    navigateTo: dto.navigateTo,
  };
}

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
  private readonly apiService = inject(ApiService);
  private readonly authState = inject(AuthStateService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private readonly loadingSubject = new BehaviorSubject(false);

  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();

  readonly currentUserNotifications$ = combineLatest([
    this.notifications$,
    this.authState.currentUser$
  ]).pipe(
    map(([notifications, user]) =>
      user ? notifications.filter((n) => n.userId === user.id) : []
    )
  );
  readonly unreadNotifications$ = this.currentUserNotifications$.pipe(
    map((notifications) => notifications.filter((n) => !n.isRead))
  );
  readonly unreadCount$ = this.unreadNotifications$.pipe(
    map((notifications) => notifications.length)
  );

  readonly unreadCount = toSignal(this.unreadCount$, { initialValue: 0 });

  constructor() {
    this.authState.currentUser$.pipe(
      switchMap((user) => {
        if (!user) {
          this.notificationsSubject.next([]);
          return of([] as Notification[]);
        }
        return this.fetchNotifications();
      })
    ).subscribe((notifications) => {
      this.notificationsSubject.next(notifications);
    });

    this.pushNotificationService.notifications$.subscribe((live) => {
      const liveMapped = live.map(liveToLegacyNotification);
      const current = this.notificationsSubject.value;
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
    this.fetchNotifications().subscribe((notifications) => {
      this.notificationsSubject.next(notifications);
      this.loadingSubject.next(false);
    });
  }

  markRead(id: string): void {
    this.notificationsSubject.next(
      this.notificationsSubject.value.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      )
    );
    this.apiService.put(`notifications/${id}/read`, {}).subscribe({
      error: (err) => console.warn('[NotificationService] Failed to mark notification as read:', err)
    });
  }

  markAllRead(userId?: string): void {
    const uid = userId || this.authState.currentUser()?.id;
    if (!uid) return;

    this.notificationsSubject.next(
      this.notificationsSubject.value.map((n) =>
        n.userId === uid ? { ...n, isRead: true } : n
      )
    );
    this.apiService.put('notifications/read-all', {}).subscribe({
      error: (err) => console.warn('[NotificationService] Failed to mark all as read:', err)
    });
  }

  private fetchNotifications() {
    return this.apiService.get<NotificationDto[]>('notifications').pipe(
      map((data) => (data ?? []).map(dtoToNotification))
    );
  }
}
