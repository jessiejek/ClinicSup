import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { Notification } from '../models';
import { AuthStateService } from './auth-state.service';
import { MockDataService } from './mock-data.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly mockData = inject(MockDataService);
  private readonly authState = inject(AuthStateService);
  private readonly notificationsSubject = new BehaviorSubject<Notification[]>(
    this.mockData.getNotifications()
  );
  private readonly loadingSubject = new BehaviorSubject(false);

  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();
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

  refresh(): void {
    this.notificationsSubject.next(this.mockData.getNotifications());
  }

  markRead(id: string): void {
    this.notificationsSubject.next(
      this.notificationsSubject.value.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  }

  markAllRead(userId?: string): void {
    this.notificationsSubject.next(
      this.notificationsSubject.value.map((notification) =>
        !userId || notification.userId === userId ? { ...notification, isRead: true } : notification
      )
    );
  }
}
