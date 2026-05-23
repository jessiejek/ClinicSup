import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, NgIf } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { IonIcon, IonInput, IonItem, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, imageOutline, receiptOutline } from 'ionicons/icons';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { BookingService, CreateBookingRequest } from '../../../../core/services/booking.service';
import { BookingWizardService } from '../../../../core/services/booking-wizard.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { PatientService } from '../../../patient/services/patient.service';

type ProofChoice = 'ReferenceNumber' | 'Screenshot';

@Component({
  selector: 'app-step-proof',
  standalone: true,
  imports: [NgIf, FormsModule, AsyncPipe, IonIcon, IonItem, IonInput, IonLabel],
  template: `
    <section class="wizard-panel">
      <div class="wizard-panel__header">
        <div>
          <p class="section-heading">Step 7</p>
          <h2 class="wizard-title">{{ (wizard$ | async)?.paymentMode === 'PayAtClinic' ? 'Confirm booking' : 'Submit payment proof' }}</h2>
          <p class="wizard-subtitle" *ngIf="(wizard$ | async)?.paymentMode === 'PayAtClinic'; else onlineHint">
            Confirm your booking. You will pay at the clinic on your appointment day.
          </p>
          <ng-template #onlineHint>
            <p class="wizard-subtitle">Upload a screenshot or enter your transaction reference number.</p>
          </ng-template>
        </div>
      </div>

      <ng-container *ngIf="wizard$ | async as wizard">
        <ng-container *ngIf="wizard.paymentMode !== 'PayAtClinic'; else payAtClinicTpl">
          <div class="proof-type-selector">
            <button
              type="button"
              class="proof-option"
              [class.proof-option--selected]="proofType === 'ReferenceNumber'"
              (click)="proofType = 'ReferenceNumber'"
            >
              <ion-icon name="receipt-outline"></ion-icon>
              <span>Reference Number</span>
            </button>
            <button
              type="button"
              class="proof-option"
              [class.proof-option--selected]="proofType === 'Screenshot'"
              (click)="proofType = 'Screenshot'"
            >
              <ion-icon name="image-outline"></ion-icon>
              <span>Screenshot</span>
            </button>
          </div>

          <div *ngIf="proofType === 'ReferenceNumber'">
            <ion-item class="clinic-input">
              <ion-label position="floating">Transaction Reference Number</ion-label>
              <ion-input
                [(ngModel)]="referenceNumber"
                placeholder="e.g. GC1234567890"
              ></ion-input>
            </ion-item>
            <p class="form-hint">Enter the reference number from your GCash, Maya, or bank transaction.</p>
          </div>

          <div *ngIf="proofType === 'Screenshot'">
            <div class="upload-zone" (click)="fileInput.click()">
              <ion-icon name="cloud-upload-outline"></ion-icon>
              <p>Click to upload payment screenshot</p>
              <p class="form-hint" *ngIf="!screenshotFileName">Accepted: JPG, PNG, PDF</p>
              <p class="file-selected" *ngIf="screenshotFileName">&#10003; {{ screenshotFileName }}</p>
            </div>
            <input
              #fileInput
              type="file"
              accept="image/*,.pdf"
              style="display: none"
              (change)="onFileSelected($event)"
            />
          </div>
        </ng-container>

        <ng-template #payAtClinicTpl>
          <div class="clinic-card clinic-card--accent-green pay-at-clinic-panel">
            <p class="section-heading">Pay at Clinic</p>
            <p class="pay-at-clinic-panel__text">
              No online proof is required. Confirm this booking to reserve your slot, then pay
              at the clinic on the day of your visit.
            </p>
          </div>
        </ng-template>
      </ng-container>

      <div class="wizard-actions wizard-actions--split">
        <button type="button" class="btn-outline" (click)="goBack()">Back</button>
        <ng-container *ngIf="(wizard$ | async)?.paymentMode !== 'PayAtClinic'; else payAtClinicActions">
          <button
            type="button"
            class="btn-primary"
            [disabled]="!canSubmit || isSubmitting"
            (click)="onSubmit()"
          >
            {{ isSubmitting ? 'Submitting...' : 'Submit Booking' }}
          </button>
        </ng-container>
        <ng-template #payAtClinicActions>
          <button
            type="button"
            class="btn-primary"
            [disabled]="isSubmitting"
            (click)="submitPayAtClinic()"
          >
            {{ isSubmitting ? 'Submitting...' : 'Submit Booking' }}
          </button>
        </ng-template>
      </div>
    </section>
  `,
  styleUrl: './step-proof.component.scss'
})
export class StepProofComponent {
  private readonly wizardService = inject(BookingWizardService);
  private readonly bookingService = inject(BookingService);
  private readonly authState = inject(AuthStateService);
  private readonly patientService = inject(PatientService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);

  proofType: ProofChoice = 'ReferenceNumber';
  referenceNumber = '';
  screenshotFileName = '';
  isSubmitting = false;

  wizard$ = this.wizardService.state$;

  constructor() {
    addIcons({ receiptOutline, imageOutline, cloudUploadOutline });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.screenshotFileName = file.name;
    }
  }

  get canSubmit(): boolean {
    if (this.proofType === 'ReferenceNumber') {
      return this.referenceNumber.trim().length >= 5;
    }
    return this.screenshotFileName.length > 0;
  }

  async onSubmit(): Promise<void> {
    if (this.isSubmitting || !this.canSubmit) {
      return;
    }

    await this.createBooking();
  }

  async submitPayAtClinic(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    await this.createBooking(true);
  }

  goBack(): void {
    this.wizardService.prevStep();
  }

  private async createBooking(payAtClinic = false): Promise<void> {
    const wizard = this.wizardService.snapshot;
    const user = this.authState.snapshot;

    if (!wizard.selectedDoctorId || !wizard.selectedServiceId || !wizard.selectedDate || !wizard.selectedSlot) {
      await this.presentToast('Please complete all booking details before submitting.');
      return;
    }

    const patientId = user?.id ? await this.resolvePatientId(user.id) : undefined;

    const payload = this.buildBookingRequest(patientId, payAtClinic ? 'PayAtClinic' : wizard.paymentMode);
    this.isSubmitting = true;

    try {
      const booking = await firstValueFrom(this.bookingService.createBooking(payload));
      this.wizardService.patchState({
        bookingId: booking.id,
        queueNumber: booking.queueNumber ?? null
      });

      if (!user) {
        await this.presentToast('Create an account to track your bookings', 'success');
        await this.router.navigate(['/public/booking-confirmation', booking.id]);
        return;
      }

      await this.router.navigate(['/patient/bookings', booking.id]);
    } catch (error) {
      await this.presentToast(extractApiErrorMessage(error, 'Failed to create booking.'));
    } finally {
      this.isSubmitting = false;
    }
  }

  private buildBookingRequest(patientId: string | undefined, paymentMode: 'Online' | 'PayAtClinic'): CreateBookingRequest {
    const wizard = this.wizardService.snapshot;
    const notes = this.buildNotes(paymentMode);

    const request: CreateBookingRequest = {
      doctorId: wizard.selectedDoctorId ?? '',
      serviceId: wizard.selectedServiceId ?? '',
      appointmentDate: wizard.selectedDate ?? '',
      slotStartTime: wizard.selectedSlot ?? '',
      slotEndTime: wizard.selectedSlotEnd ?? wizard.selectedSlot ?? '',
      paymentMode,
      notes
    };

    if (patientId) {
      request.patientId = patientId;
    }

    return request;
  }

  private buildNotes(paymentMode: 'Online' | 'PayAtClinic'): string | undefined {
    if (paymentMode === 'PayAtClinic') {
      return undefined;
    }

    const proofValue =
      this.proofType === 'ReferenceNumber' ? this.referenceNumber.trim() : this.screenshotFileName.trim();

    if (!proofValue) {
      return undefined;
    }

    return `Payment proof (${this.proofType}): ${proofValue}`;
  }

  private async resolvePatientId(userId: string): Promise<string | undefined> {
    if (!userId) {
      return undefined;
    }

    try {
      const patient = await firstValueFrom(this.patientService.getMyProfile());
      return patient.userId && patient.userId !== userId ? undefined : patient.id;
    } catch (error) {
      console.warn('Unable to resolve the signed-in patient profile for booking submission.', error);
      return undefined;
    }
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium' = 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2400,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const body = (error as { error?: unknown }).error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
