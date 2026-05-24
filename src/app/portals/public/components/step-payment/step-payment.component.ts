import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom, combineLatest, map, of, switchMap, catchError } from 'rxjs';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { BookingService, CreateBookingRequest } from '../../../../core/services/booking.service';
import { BookingWizardService } from '../../../../core/services/booking-wizard.service';
import { PublicService } from '../../services/public.service';

@Component({
  selector: 'app-step-payment',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, FormsModule],
  template: `
    <section class="wizard-panel">
      <div class="wizard-panel__header">
        <div>
          <p class="section-heading">Step 6</p>
          <h2 class="wizard-title">Confirm your booking</h2>
          <p class="wizard-subtitle">
            Payment will be settled at the clinic after consultation.
          </p>
        </div>
      </div>

      <ng-container *ngIf="vm$ | async as vm">
        <div class="clinic-card clinic-card--accent-green">
          <p class="section-heading">Clinic Payment Flow</p>
          <ul class="payment-mode-list">
            <li>Your appointment will be confirmed immediately after submission.</li>
            <li>No online payment or proof upload is required.</li>
            <li>The final amount due will only appear after the doctor completes the consultation.</li>
          </ul>
        </div>

        <div class="clinic-card summary-card">
          <p class="section-heading">Final Check</p>
          <div class="summary-row">
            <span>Doctor</span>
            <strong>{{ vm.doctorName }}</strong>
          </div>
          <div class="summary-row">
            <span>Services</span>
            <strong>{{ vm.servicesLabel }}</strong>
          </div>
          <div class="summary-row">
            <span>Date</span>
            <strong>{{ vm.selectedDate }}</strong>
          </div>
          <div class="summary-row">
            <span>Time</span>
            <strong>{{ vm.selectedSlot }} - {{ vm.selectedSlotEnd }}</strong>
          </div>
        </div>

        <div class="clinic-card">
          <label class="form-label" for="booking-notes">Notes for the clinic (optional)</label>
          <textarea
            id="booking-notes"
            class="filter-input"
            rows="4"
            [(ngModel)]="notes"
            placeholder="Add any visit notes or special instructions."
          ></textarea>
        </div>
      </ng-container>

      <div class="wizard-actions wizard-actions--split">
        <button type="button" class="btn-outline" (click)="goBack()">Back</button>
        <button type="button" class="btn-primary" [disabled]="isSubmitting" (click)="submitBooking()">
          {{ isSubmitting ? 'Submitting...' : 'Confirm Booking' }}
        </button>
      </div>
    </section>
  `,
  styleUrl: './step-payment.component.scss'
})
export class StepPaymentComponent {
  private readonly wizardService = inject(BookingWizardService);
  private readonly bookingService = inject(BookingService);
  private readonly authState = inject(AuthStateService);
  private readonly publicService = inject(PublicService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);

  notes = '';
  isSubmitting = false;

  vm$ = this.wizardService.state$.pipe(
    switchMap((wizard) =>
      combineLatest([
        of(wizard),
        this.publicService.getDoctors().pipe(catchError(() => of([]))),
        wizard.selectedDoctorId
          ? this.publicService.getDoctorServices(wizard.selectedDoctorId).pipe(catchError(() => of([])))
          : of([])
      ])
    ),
    map(([wizard, doctors, services]) => {
      const doctor = wizard.selectedDoctorId ? doctors.find((item) => item.id === wizard.selectedDoctorId) : null;
      const selectedServices = services.filter((service) => wizard.selectedServiceIds.includes(service.id));

      return {
        doctorName: doctor?.fullName ?? 'Doctor',
        servicesLabel:
          selectedServices.length > 0
            ? selectedServices.map((service) => service.name).join(', ')
            : `${wizard.selectedServiceIds.length} service${wizard.selectedServiceIds.length === 1 ? '' : 's'} selected`,
        selectedDate: wizard.selectedDate ?? '-',
        selectedSlot: wizard.selectedSlot ?? '-',
        selectedSlotEnd: wizard.selectedSlotEnd ?? wizard.selectedSlot ?? '-'
      };
    })
  );

  async submitBooking(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    if (!this.authState.snapshot) {
      await this.presentToast('Please log in to book an appointment.');
      return;
    }

    const wizard = this.wizardService.snapshot;
    if (
      !wizard.selectedDoctorId ||
      wizard.selectedServiceIds.length === 0 ||
      !wizard.selectedDate ||
      !wizard.selectedSlot ||
      !wizard.selectedSlotEnd
    ) {
      await this.presentToast('Please complete all booking details before submitting.');
      return;
    }

    const payload: CreateBookingRequest = {
      doctorId: wizard.selectedDoctorId,
      serviceIds: wizard.selectedServiceIds,
      appointmentDate: wizard.selectedDate,
      slotStartTime: wizard.selectedSlot,
      slotEndTime: wizard.selectedSlotEnd,
      notes: this.notes.trim() || undefined
    };

    this.isSubmitting = true;

    try {
      // Ensure the logged-in patient has a patients row so current_patient_id() resolves
      await this.authState.ensurePatientRecord();

      const booking = await firstValueFrom(this.bookingService.createBooking(payload));
      this.wizardService.patchState({
        bookingId: booking.id,
        queueNumber: booking.queueNumber ?? null
      });
      await this.presentToast('Booking confirmed.', 'success');
      await this.router.navigate(['/patient/bookings', booking.id]);
      this.wizardService.reset();
    } catch (error) {
      await this.presentToast(extractApiErrorMessage(error, 'Failed to create booking.'));
    } finally {
      this.isSubmitting = false;
    }
  }

  goBack(): void {
    this.wizardService.prevStep();
  }

  private async presentToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'medium' = 'danger'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
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
