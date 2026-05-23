import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, logOutOutline } from 'ionicons/icons';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { AuthUser, NavItem, Role } from '../../../../core/models';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, RouterLinkActive, IonIcon, AvatarComponent],
  template: `
    <aside class="sidebar" [class.is-open]="isOpen">
      <div class="sidebar__brand">
        <div class="sidebar__logo" aria-hidden="true">G</div>
        <div>
          <div class="sidebar__clinic-name">{{ clinicName }}</div>
          <div class="sidebar__portal-label">{{ portalLabel }}</div>
        </div>
        <button type="button" class="sidebar__close" aria-label="Close menu" (click)="navClick.emit()">
          <ion-icon name="close-outline"></ion-icon>
        </button>
      </div>

      <nav class="sidebar__nav">
        <ng-container *ngFor="let item of navItems; let i = index">
          <div
            class="nav-section-label"
            *ngIf="item.section && (i === 0 || navItems[i - 1].section !== item.section)"
          >
            {{ item.section }}
          </div>
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route.endsWith('/dashboard') }"
            class="nav-item"
            (click)="navClick.emit()"
          >
            <ion-icon class="nav-item__icon" [name]="item.icon"></ion-icon>
            <span>{{ item.label }}</span>
            <span *ngIf="item.badgeCount && item.badgeCount > 0" class="nav-item__badge">
              {{ item.badgeCount }}
            </span>
          </a>
        </ng-container>
      </nav>

      <div class="sidebar__footer" *ngIf="currentUser">
        <button
          type="button"
          class="sidebar__profile"
          [attr.aria-label]="profileAriaLabel"
          [disabled]="!profileRoute"
          (click)="goToProfile()"
        >
          <app-avatar [name]="currentUser.fullName" size="md"></app-avatar>
          <div class="sidebar__user-meta">
            <div class="sidebar__user-name">{{ currentUser.fullName }}</div>
            <div class="sidebar__user-role">{{ currentUser.role }} Account</div>
          </div>
        </button>

        <button type="button" class="sidebar__logout-action" aria-label="Logout" (click)="onLogoutClick($event)">
          <span class="sidebar__logout-label">Logout</span>
          <ion-icon name="log-out-outline"></ion-icon>
        </button>
      </div>
    </aside>
  `,
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() navItems: NavItem[] = [];
  @Input() portalLabel = 'Portal';
  @Input() clinicName = 'Clinic';
  @Input() currentUser: AuthUser | null = null;
  @Input() isOpen = false;

  @Output() logout = new EventEmitter<void>();
  @Output() navClick = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly profileRoutes: Record<Role, string> = {
    Admin: '/admin/settings',
    Staff: '/staff/profile',
    Doctor: '/doctor/profile',
    Patient: '/patient/profile'
  };

  constructor() {
    addIcons({ closeOutline, logOutOutline });
  }

  get profileRoute(): string | null {
    return this.currentUser ? this.profileRoutes[this.currentUser.role] : null;
  }

  get profileAriaLabel(): string {
    if (!this.currentUser) {
      return 'Open profile';
    }

    return this.currentUser.role === 'Admin' ? 'Open admin settings' : `Open ${this.currentUser.role} profile`;
  }

  goToProfile(): void {
    if (!this.profileRoute) {
      return;
    }

    this.navClick.emit();
    void this.router.navigateByUrl(this.profileRoute);
  }

  onLogoutClick(event: MouseEvent): void {
    event.stopPropagation();
    this.logout.emit();
  }
}
