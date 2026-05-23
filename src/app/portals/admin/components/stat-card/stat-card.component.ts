import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  host: { style: 'display: block; min-width: 0;' },
  imports: [NgIf, NgClass, IonIcon],
  template: `
    <div class="stat-card" [ngClass]="'stat-card--' + color">
      <div class="stat-card__icon">
        <ion-icon [name]="icon"></ion-icon>
      </div>
      <div class="stat-card__value">{{ value }}</div>
      <div class="stat-card__label">{{ label }}</div>
      <span *ngIf="badgeLabel" class="badge badge--danger stat-card__badge">{{ badgeLabel }}</span>
    </div>
  `,
  styleUrl: './stat-card.component.scss'
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() icon = 'grid-outline';
  @Input() color: 'green' | 'blue' | 'amber' | 'red' | 'gray' = 'green';
  @Input() badgeLabel?: string;
}
