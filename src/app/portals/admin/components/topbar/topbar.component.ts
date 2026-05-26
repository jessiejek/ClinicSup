import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, logOutOutline, menuOutline, searchOutline } from 'ionicons/icons';
import { AuthUser, Role } from '../../../../core/models';
import { getClinicalRoleBadge, resolveClinicalRole } from '../../../../core/utils/clinical-role.util';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [IonIcon, AvatarComponent, NotificationBellComponent, NgClass],
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
        <button type="button" class="topbar__user" aria-label="Account options" (click)="goToProfile()">
          <app-avatar [name]="currentUser?.fullName || 'Admin'" size="sm"></app-avatar>
          <span class="topbar__user-meta">
            <span class="topbar__user-name">{{ currentUser?.fullName || 'Admin User' }}</span>
            <span class="topbar__user-role">
              <span class="topbar__role-badge" [ngClass]="roleBadge.className">{{ roleBadge.label }}</span>
            </span>
          </span>
        </button>
        <button type="button" class="topbar__logout" aria-label="Log out" (click)="logout.emit()">
          <ion-icon name="log-out-outline" aria-hidden="true"></ion-icon>
          <span class="topbar__logout-label">Logout</span>
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

  private readonly router = inject(Router);
  private readonly profileRoutes: Record<Role, string> = {
    Admin: '/admin/settings',
    Staff: '/staff/profile',
    Doctor: '/doctor/profile',
    Patient: '/patient/profile'
  };

  constructor() {
    addIcons({ menuOutline, closeOutline, searchOutline, logOutOutline });
  }

  get roleBadge() {
    return getClinicalRoleBadge(resolveClinicalRole(this.currentUser));
  }

  goToProfile(): void {
    if (!this.currentUser) return;
    const route = this.profileRoutes[this.currentUser.role];
    if (route) {
      void this.router.navigateByUrl(route);
    }
  }
}
