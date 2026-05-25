import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { BookingWizardService } from '../../../core/services/booking-wizard.service';
import { PublicService } from '../services/public.service';
import { PesoPipe } from '../../../shared/pipes/peso.pipe';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { TimeSlotPipe } from '../../../shared/pipes/time-slot.pipe';

@Component({
  selector: 'app-booking-confirmation-page',
  standalone: true,
  imports: [NgIf, AsyncPipe, DatePipe, RouterLink, IonContent, PesoPipe, TimeSlotPipe, StatusBadgeComponent],
  template: `
    <ion-content>
      <div class="confirmation-container" *ngIf="vm$ | async as vm">
        <div class="confirmation-hero">
          <div class="confirmation-checkmark">&#10003;</div>
          <h1 class="confirmation-title">Booking Confirmed!</h1>
          <p class="confirmation-sub">
            {{ vm.paymentMode === 'PayAtClinic' ? 'Your appointment has been reserved. Please pay at the clinic on your visit day.' : 'Your appointment has been submitted and is awaiting payment verification.' }}
          </p>
        </div>

        <div class="stat-card stat-card--green queue-card">
          <p class="queue-label">You are</p>
          <p class="queue-number">#{{ vm.queueNumber ?? '-' }}</p>
          <p class="queue-label">in the queue</p>
        </div>

        <p class="booking-id">
          Booking ID: <span class="data-mono">{{ vm.bookingId }}</span>
        </p>

        <div class="clinic-card summary-card">
          <p class="section-heading">Appointment Details</p>
          <div class="summary-row">
            <span>Doctor</span>
            <strong>{{ vm.doctorName }}</strong>
          </div>
          <div class="summary-row">
            <span>Date</span>
            <strong>{{ vm.selectedDate | date : 'MMMM d, y (EEE)' }}</strong>
          </div>
          <div class="summary-row">
            <span>Time</span>
            <strong class="data-mono"
              >{{ vm.selectedSlot | timeSlot }} - {{ vm.selectedSlotEnd | timeSlot }}</strong
            >
          </div>
          <div class="summary-row">
            <span>Service</span>
            <strong>{{ vm.serviceName }}</strong>
          </div>
          <div class="divider"></div>
          <div class="summary-row summary-row--total">
            <span>Total Fee</span>
            <strong class="fee-total">{{ vm.totalFee | peso }}</strong>
          </div>
        </div>

        <div style="text-align: center; margin: var(--space-4) 0">
          <app-status-badge status="Pending"></app-status-badge>
          <span class="confirmation-status-text">Awaiting payment verification</span>
        </div>

        <div class="confirmation-actions">
          <ng-container *ngIf="vm.isAuthenticated; else guestActions">
            <button class="btn-primary" routerLink="/patient/bookings" type="button">
              View My Appointments
            </button>
          </ng-container>
          <ng-template #guestActions>
            <div class="confirmation-guest-note">
              <p>Create an account to track your bookings.</p>
            </div>
            <button class="btn-primary" routerLink="/auth/register" type="button">
              Create Account
            </button>
          </ng-template>
          <button class="btn-outline" routerLink="/public" type="button">Back to Home</button>
        </div>
      </div>
    </ion-content>
  `,
  styleUrl: './booking-confirmation.page.scss'
})
export class BookingConfirmationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly authState = inject(AuthStateService);
  private readonly wizardService = inject(BookingWizardService);
  private readonly publicService = inject(PublicService);

  vm$ = combineLatest([
    this.route.paramMap,
    this.wizardService.state$,
    this.authState.isAuthenticated$
  ]).pipe(
    switchMap(([params, wizard, isAuthenticated]) => {
      const bookingId = params.get('bookingId') ?? wizard.bookingId ?? '-';
      const doctor$ = wizard.selectedDoctorId
        ? this.publicService.getDoctors().pipe(
            map((doctors) => doctors.find((d) => d.id === wizard.selectedDoctorId) ?? null)
          )
        : of(null);
      const service$ = wizard.selectedServiceId
        ? this.publicService.getServices().pipe(
            map((services) => services.find((s) => s.id === wizard.selectedServiceId) ?? null)
          )
        : of(null);

      return combineLatest([doctor$, service$]).pipe(
        map(([doctor, service]) => {
          const consultationFee = doctor?.consultationFee ?? 0;
          const serviceFee = service?.price ?? 0;

          return {
            bookingId,
            queueNumber: wizard.queueNumber,
            doctorName: doctor?.fullName ?? '-',
            selectedDate: wizard.selectedDate,
            selectedSlot: wizard.selectedSlot,
            selectedSlotEnd: wizard.selectedSlotEnd,
            serviceName: service?.name ?? '-',
            totalFee: consultationFee + serviceFee,
            paymentMode: wizard.paymentMode,
            isAuthenticated
          };
        })
      );
    })
  );
}
