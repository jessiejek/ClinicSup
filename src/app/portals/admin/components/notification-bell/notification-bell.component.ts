import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';
import { NotificationPanelComponent } from '../../../../shared/components/notification-panel/notification-panel.component';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [NgIf, IonIcon, NotificationPanelComponent],
  template: `
    <div class="notification-bell-shell">
      <button type="button" class="notification-bell" (click)="togglePanel($event)">
        <ion-icon name="notifications-outline"></ion-icon>
        <span *ngIf="unreadCount > 0" class="notification-badge">{{ unreadCount }}</span>
      </button>

      <div *ngIf="isOpen" class="notification-popover-backdrop" (click)="closePanel()" aria-hidden="true"></div>
      <div *ngIf="isOpen" class="notification-popover-panel" (click)="$event.stopPropagation()">
        <app-notification-panel></app-notification-panel>
      </div>
    </div>
  `,
  styleUrl: './notification-bell.component.scss'
})
export class NotificationBellComponent {
  @Input() unreadCount = 0;

  isOpen = false;

  constructor() {
    addIcons({ notificationsOutline });
  }

  togglePanel(event: Event): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  closePanel(): void {
    this.isOpen = false;
  }
}
