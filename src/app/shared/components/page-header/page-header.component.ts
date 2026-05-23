import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { IonBackButton, IonButtons } from '@ionic/angular/standalone';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [NgIf, IonButtons, IonBackButton],
  template: `
    <div class="page-header">
      <ion-buttons *ngIf="showBackButton">
        <ion-back-button [defaultHref]="defaultBackHref"></ion-back-button>
      </ion-buttons>
      <div class="page-header__main">
        <h1 class="page-title">{{ title }}</h1>
        <p *ngIf="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-header__actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styleUrl: './page-header.component.scss'
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() showBackButton = false;
  @Input() defaultBackHref = '/public';
}
