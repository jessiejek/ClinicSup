import { Component, inject } from '@angular/core';
import { AsyncPipe, NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmark } from 'ionicons/icons';
import { BookingWizardService } from '../../../../core/services/booking-wizard.service';
import { BookingSummaryBarComponent } from '../booking-summary-bar/booking-summary-bar.component';
import { StepAuthCheckComponent } from '../step-auth-check/step-auth-check.component';
import { StepDatePickerComponent } from '../step-date-picker/step-date-picker.component';
import { StepDoctorServiceComponent } from '../step-doctor-service/step-doctor-service.component';
import { StepPaymentComponent } from '../step-payment/step-payment.component';
import { StepReviewComponent } from '../step-review/step-review.component';
import { StepSlotSelectComponent } from '../step-slot-select/step-slot-select.component';

@Component({
  selector: 'app-booking-wizard',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    AsyncPipe,
    IonIcon,
    BookingSummaryBarComponent,
    StepDoctorServiceComponent,
    StepDatePickerComponent,
    StepSlotSelectComponent,
    StepReviewComponent,
    StepAuthCheckComponent,
    StepPaymentComponent
  ],
  template: `
    <div class="booking-wizard">
      <div class="wizard-steps" *ngIf="currentStep$ | async as currentStep">
        <div
          *ngFor="let s of STEPS"
          class="wizard-step"
          [class.wizard-step--completed]="currentStep > s.step"
          [class.wizard-step--active]="currentStep === s.step"
          [class.wizard-step--upcoming]="currentStep < s.step"
        >
          <div class="wizard-step__circle">
            <ion-icon name="checkmark" *ngIf="currentStep > s.step"></ion-icon>
            <span *ngIf="currentStep <= s.step">{{ s.step }}</span>
          </div>
          <span class="wizard-step__label">{{ s.label }}</span>
        </div>
      </div>

      <div class="booking-wizard__body">
        <ng-container [ngSwitch]="(currentStep$ | async)">
          <app-step-doctor-service *ngSwitchCase="1"></app-step-doctor-service>
          <app-step-date-picker *ngSwitchCase="2"></app-step-date-picker>
          <app-step-slot-select *ngSwitchCase="3"></app-step-slot-select>
          <app-step-review *ngSwitchCase="4"></app-step-review>
          <app-step-auth-check *ngSwitchCase="5"></app-step-auth-check>
          <app-step-payment *ngSwitchCase="6"></app-step-payment>
        </ng-container>
      </div>

      <app-booking-summary-bar></app-booking-summary-bar>
    </div>
  `,
  styleUrl: './booking-wizard.component.scss'
})
export class BookingWizardComponent {
  readonly STEPS = [
    { step: 1, label: 'Doctor & Service' },
    { step: 2, label: 'Select Date' },
    { step: 3, label: 'Select Time' },
    { step: 4, label: 'Review' },
    { step: 5, label: 'Account' },
    { step: 6, label: 'Confirm' }
  ];

  private readonly wizardService = inject(BookingWizardService);

  wizard$ = this.wizardService.state$;
  currentStep$ = this.wizardService.currentStep$;

  constructor() {
    addIcons({ checkmark });
  }
}
