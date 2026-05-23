import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, menuOutline, searchOutline } from 'ionicons/icons';
import { AuthUser } from '../../../../core/models';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [IonIcon, AvatarComponent, NotificationBellComponent],
  template: `
    <header class="topbar">
      <div class="topbar__title-group">
        <div class="topbar__portal-label">{{ portalLabel }}</div>
        <h1 class="topbar__title">{{ title }}</h1>
      </div>

      <label class="topbar__search" aria-label="Search">
        <ion-icon name="search-outline"></ion-icon>
        <input type="search" [placeholder]="searchPlaceholder" />
      </label>

      <div class="topbar__actions">
        <app-notification-bell [unreadCount]="unreadCount"></app-notification-bell>
        <button type="button" class="topbar__user" aria-label="Account options" (click)="logout.emit()">
          <app-avatar [name]="currentUser?.fullName || 'Admin'" size="sm"></app-avatar>
          <span class="topbar__user-meta">
            <span class="topbar__user-name">{{ currentUser?.fullName || 'Admin User' }}</span>
            <span class="topbar__user-role">{{ currentUser?.role || 'Admin' }}</span>
          </span>
        </button>
      </div>

      <button type="button" class="topbar__hamburger" aria-label="Open navigation menu" (click)="menuToggle.emit()">
        <ion-icon name="menu-outline"></ion-icon>
      </button>
    </header>
  `,
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {
  @Input() title = 'Dashboard';
  @Input() portalLabel = 'Portal';
  @Input() searchPlaceholder = 'Search patients, bookings...';
  @Input() currentUser: AuthUser | null = null;
  @Input() unreadCount = 0;

  @Output() logout = new EventEmitter<void>();
  @Output() menuToggle = new EventEmitter<void>();

  constructor() {
    addIcons({ menuOutline, closeOutline, searchOutline });
  }
}
