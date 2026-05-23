import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { lockClosedOutline } from 'ionicons/icons';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { BookingWizardService } from '../../../../core/services/booking-wizard.service';

@Component({
  selector: 'app-step-auth-check',
  standalone: true,
  imports: [NgIf, RouterLink, IonIcon],
  template: `
    <section class="wizard-panel">
      <div class="auth-check-card clinic-card">
        <div class="empty-state__icon">
          <ion-icon name="lock-closed-outline"></ion-icon>
        </div>
        <h3>{{ isAuthenticated ? 'Account ready' : 'Login required' }}</h3>
        <p *ngIf="isAuthenticated; else guestTpl">
          You’re signed in. Continue to confirm your booking.
        </p>
        <ng-template #guestTpl>
          <p>Please log in to book an appointment.</p>
          <div class="wizard-actions wizard-actions--split">
            <a class="btn-primary" routerLink="/auth/login">Log In</a>
            <a class="btn-outline" routerLink="/auth/register">Create Account</a>
          </div>
        </ng-template>
      </div>

      <div class="wizard-actions wizard-actions--split">
        <button type="button" class="btn-outline" (click)="goBack()">Back</button>
        <button *ngIf="isAuthenticated" type="button" class="btn-primary" (click)="continue()">
          Continue to Confirmation
        </button>
      </div>
    </section>
  `,
  styleUrl: './step-auth-check.component.scss'
})
export class StepAuthCheckComponent {
  private readonly authState = inject(AuthStateService);
  private readonly wizardService = inject(BookingWizardService);
  readonly isAuthenticated = !!this.authState.snapshot;

  constructor() {
    addIcons({ lockClosedOutline });
  }

  continue(): void {
    this.wizardService.nextStep();
  }

  goBack(): void {
    this.wizardService.prevStep();
  }
}
