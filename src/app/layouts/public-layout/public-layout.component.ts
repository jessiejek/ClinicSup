import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonRouterOutlet,
  IonButton
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-legacy-public-layout',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar style="--background: var(--gradient-hero); --color: white; height: 72px;">
        <ion-title slot="start" style="font-weight: 800; letter-spacing: -0.5px; font-size: 20px;">
          DR. GAVINO<span style="opacity: 0.7;"> MEDICAL CLINIC</span>
        </ion-title>
        <div slot="end" class="ion-padding-horizontal hide-sm">
          <ion-button fill="clear" color="light" style="font-weight: 600;">Home</ion-button>
          <ion-button fill="clear" color="light" style="font-weight: 600;">Services</ion-button>
          <ion-button fill="clear" color="light" style="font-weight: 600;">Contact</ion-button>
          <ion-button fill="solid" color="secondary" style="--border-radius: 8px; font-weight: 700; margin-left: 12px;">
            Book Now
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page-container">
        <ion-router-outlet></ion-router-outlet>
      </div>
    </ion-content>

    <style>
      .page-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 20px;
      }
      @media (max-width: 768px) {
        .hide-sm {
          display: none;
        }
      }
    </style>
  `,
  standalone: true,
  imports: [
    CommonModule, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonRouterOutlet,
    IonButton
  ]
})
export class LegacyPublicLayoutComponent {}
