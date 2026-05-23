import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  documentTextOutline,
  folderOpenOutline,
  medkitOutline,
  medicalOutline,
  notificationsOutline,
  peopleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [NgIf, IonIcon, RouterLink],
  template: `
    <div class="empty-state">
      <div class="empty-state__icon">
        <ion-icon [name]="icon"></ion-icon>
      </div>
      <h3 class="empty-state__title">{{ title }}</h3>
      <p class="empty-state__description">{{ description }}</p>
      <button
        *ngIf="ctaLabel && ctaRoute"
        type="button"
        class="btn-primary"
        [routerLink]="ctaRoute"
      >
        {{ ctaLabel }}
      </button>
      <button *ngIf="ctaLabel && !ctaRoute" type="button" class="btn-primary" (click)="ctaClick.emit()">
        {{ ctaLabel }}
      </button>
    </div>
  `,
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  @Input() icon = 'folder-open-outline';
  @Input() title = 'Nothing here';
  @Input() description = '';
  @Input() ctaLabel?: string;
  @Input() ctaRoute?: string;
  @Output() ctaClick = new EventEmitter<void>();

  constructor() {
    addIcons({
      calendarOutline,
      documentTextOutline,
      folderOpenOutline,
      medkitOutline,
      medicalOutline,
      notificationsOutline,
      peopleOutline
    });
  }
}
