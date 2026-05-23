import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  closeOutline,
  documentTextOutline,
  gridOutline,
  medicalOutline,
  menuOutline,
  logOutOutline,
  personOutline
} from 'ionicons/icons';
import { AuthUser, NavItem } from '../../../../core/models';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';

@Component({
  selector: 'app-patient-topbar',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, RouterLinkActive, IonIcon, AvatarComponent],
  template: `
    <header class="patient-topbar">
      <div class="patient-topbar__inner">
        <div class="patient-topbar__brand">
          <div class="patient-topbar__logo">G</div>
          <div>
            <div class="patient-topbar__clinic">{{ clinicName }}</div>
            <div class="patient-topbar__label">{{ portalLabel }}</div>
          </div>
        </div>

        <nav class="patient-topbar__nav" [class.is-open]="menuOpen">
          <a
            *ngFor="let item of navItems"
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route.endsWith('/dashboard') }"
            class="patient-topbar__link"
            (click)="closeMenu()"
          >
            <ion-icon [name]="item.icon"></ion-icon>
            <span>{{ item.label }}</span>
          </a>
          <button type="button" class="patient-topbar__logout patient-topbar__logout--mobile" (click)="logout.emit()">
            <ion-icon name="close-outline"></ion-icon>
            <span>Logout</span>
          </button>
        </nav>

        <div class="patient-topbar__actions">
          <button type="button" class="patient-topbar__menu-btn" (click)="toggleMenu()">
            <ion-icon [name]="menuOpen ? 'close-outline' : 'menu-outline'"></ion-icon>
          </button>

          <button type="button" class="patient-topbar__user" (click)="logout.emit()">
            <app-avatar [name]="currentUser?.fullName || 'Patient'" size="sm"></app-avatar>
            <span class="patient-topbar__user-meta">
              <span class="patient-topbar__user-name">{{ currentUser?.fullName || 'Patient User' }}</span>
              <span class="patient-topbar__user-role">{{ currentUser?.role || 'Patient' }}</span>
            </span>
          </button>

          <button type="button" class="patient-topbar__logout patient-topbar__logout--desktop" (click)="logout.emit()">
            <ion-icon name="log-out-outline"></ion-icon>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  `,
  styleUrl: './patient-topbar.component.scss'
})
export class PatientTopbarComponent {
  @Input() navItems: NavItem[] = [];
  @Input() currentUser: AuthUser | null = null;
  @Input() clinicName = 'Clinic';
  @Input() portalLabel = 'Patient Portal';

  @Output() logout = new EventEmitter<void>();

  menuOpen = false;

  constructor() {
    addIcons({
      gridOutline,
      calendarOutline,
      medicalOutline,
      documentTextOutline,
      personOutline,
      menuOutline,
      closeOutline,
      logOutOutline
    });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}
