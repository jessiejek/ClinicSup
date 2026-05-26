import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, logOutOutline, menuOutline } from 'ionicons/icons';
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

      <button
        type="button"
        class="topbar__hamburger"
        aria-label="Toggle sidebar"
        (click)="menuToggle.emit()"
      >
        <ion-icon name="menu-outline"></ion-icon>
      </button>

      <div class="topbar__actions">
        <app-notification-bell [unreadCount]="unreadCount"></app-notification-bell>
        <button type="button" class="topbar__user" aria-label="Account options" (click)="goToProfile()">
          <app-avatar [name]="currentUser?.fullName || 'Admin'" size="sm"></app-avatar>
          <span class="topbar__user-meta">
            <span class="topbar__user-line">
              <span class="topbar__user-name">{{ displayUserName }}</span>
              <span class="topbar__role-badge" [ngClass]="roleBadge.className">{{ roleBadge.label }}</span>
            </span>
          </span>
        </button>
        <button type="button" class="topbar__logout" aria-label="Log out" (click)="logout.emit()">
          <ion-icon name="log-out-outline" aria-hidden="true"></ion-icon>
          <span class="topbar__logout-label">Logout</span>
        </button>
      </div>
    </header>
  `,
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {
  @Input() title = 'Dashboard';
  @Input() portalLabel = 'Portal';
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
    addIcons({ closeOutline, logOutOutline, menuOutline });
  }

  get roleBadge() {
    return getClinicalRoleBadge(resolveClinicalRole(this.currentUser));
  }

  get displayUserName(): string {
    if (!this.currentUser) {
      return 'Admin User';
    }

    if (this.currentUser.role === 'Doctor') {
      const parts = (this.currentUser.fullName || '').split(' ').filter(Boolean);
      const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'Doctor';
      return `Dr. ${lastName}`;
    }

    return this.currentUser.fullName || 'Admin User';
  }

  goToProfile(): void {
    if (!this.currentUser) return;
    const route = this.profileRoutes[this.currentUser.role];
    if (route) {
      void this.router.navigateByUrl(route);
    }
  }
}
