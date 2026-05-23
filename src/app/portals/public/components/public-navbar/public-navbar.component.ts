import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, menuOutline } from 'ionicons/icons';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ClinicSettingsService } from '../../../../core/services/clinic-settings.service';

@Component({
  selector: 'app-public-navbar',
  standalone: true,
  imports: [AsyncPipe, NgClass, NgIf, RouterLink, RouterLinkActive, IonIcon],
  template: `
    <nav class="public-navbar" [ngClass]="{ scrolled: navScrolled }">
      <a routerLink="/public" class="navbar__logo" (click)="closeMobile()">
        <img *ngIf="settings.logoUrl" [src]="settings.logoUrl" alt="" />
        <span>{{ settings.clinicName }}</span>
      </a>

      <div class="navbar__links">
        <a
          routerLink="/public"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          >Home</a
        >
        <a routerLink="/public/doctors" routerLinkActive="active">Doctors</a>
        <a routerLink="/public/services" routerLinkActive="active">Services</a>
        <a routerLink="/public/announcements" routerLinkActive="active">Announcements</a>
        <ng-container *ngIf="currentUser$ | async as currentUser; else signInLink">
          <a [routerLink]="portalDashboardRoute(currentUser.role)" routerLinkActive="active">{{
            currentUser.role === 'Patient' ? 'My Account' : 'Portal'
          }}</a>
        </ng-container>
        <ng-template #signInLink>
          <a routerLink="/auth/login" routerLinkActive="active">Login</a>
        </ng-template>
        <div class="navbar__cta">
          <a routerLink="/public/booking" class="navbar-book-btn">Book Appointment</a>
        </div>
      </div>

      <button
        type="button"
        class="navbar__hamburger"
        [attr.aria-expanded]="menuOpen"
        aria-label="Toggle menu"
        (click)="menuOpen = !menuOpen"
      >
        <ion-icon [name]="menuOpen ? 'close-outline' : 'menu-outline'"></ion-icon>
      </button>
    </nav>

    <div class="mobile-menu" [class.open]="menuOpen">
      <a
        routerLink="/public"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{ exact: true }"
        (click)="closeMobile()"
        >Home</a
      >
      <a routerLink="/public/doctors" routerLinkActive="active" (click)="closeMobile()">Doctors</a>
      <a routerLink="/public/services" routerLinkActive="active" (click)="closeMobile()">Services</a>
      <a routerLink="/public/announcements" routerLinkActive="active" (click)="closeMobile()"
        >Announcements</a
      >
      <ng-container *ngIf="currentUser$ | async as currentUser; else signInMobile">
        <a [routerLink]="portalDashboardRoute(currentUser.role)" routerLinkActive="active" (click)="closeMobile()">{{
          currentUser.role === 'Patient' ? 'My Account' : 'Portal'
        }}</a>
      </ng-container>
      <ng-template #signInMobile>
        <a routerLink="/auth/login" routerLinkActive="active" (click)="closeMobile()">Login</a>
      </ng-template>
      <a routerLink="/public/booking" class="navbar-book-btn mobile-cta" (click)="closeMobile()"
        >Book Appointment</a
      >
    </div>
  `,
  styleUrl: './public-navbar.component.scss'
})
export class PublicNavbarComponent {
  /** Vertical scroll position of `.public-main` (body/window does not scroll with Ionic defaults). */
  @Input() mainScrollTop = 0;

  readonly currentUser$ = inject(AuthStateService).currentUser$;

  private readonly clinicSettings = inject(ClinicSettingsService);
  readonly settings = this.clinicSettings.load();

  menuOpen = false;

  get navScrolled(): boolean {
    return this.mainScrollTop > 10;
  }

  constructor() {
    addIcons({ menuOutline, closeOutline });
  }

  portalDashboardRoute(role: string): string {
    switch (role) {
      case 'Admin':
        return '/admin/dashboard';
      case 'Staff':
        return '/staff/dashboard';
      case 'Doctor':
        return '/doctor/dashboard';
      default:
        return '/patient/dashboard';
    }
  }

  closeMobile(): void {
    this.menuOpen = false;
  }
}
