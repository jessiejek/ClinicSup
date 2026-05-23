import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular/standalone';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Booking } from '../../../core/models';
import {
  BookingService,
  DoctorCompleteBookingRequest,
  DoctorTodaySummary
} from '../../../core/services/booking.service';
import { ClinicDashboardRealtimeService } from '../../../core/services/clinic-dashboard-realtime.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

type DoctorQueueFilter = 'all' | 'Confirmed' | 'CheckedIn' | 'Completed' | 'NoShow' | 'Cancelled';

@Component({
  standalone: true,
  selector: 'app-doctor-appointments-page',
  imports: [
    DatePipe,
    FormsModule,
    NgFor,
    NgIf,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonModal,
    IonTitle,
    IonToolbar,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusBadgeComponent
  ],
  template: `
    <app-page-header
      title="Today Queue"
      subtitle="Today's bookings, check-ins, and completed consultations"
    ></app-page-header>

    <section class="doctor-appointments-page">
      <section class="stats-grid" *ngIf="summary">
        <div class="stat-card stat-card--blue">
          <div class="stat-card__value">{{ summary.bookedToday }}</div>
          <div class="stat-card__label">Booked Today</div>
        </div>
        <div class="stat-card stat-card--amber">
          <div class="stat-card__value">{{ summary.checkedIn }}</div>
          <div class="stat-card__label">In Clinic</div>
        </div>
        <div class="stat-card stat-card--green">
          <div class="stat-card__value">{{ summary.waiting }}</div>
          <div class="stat-card__label">Waiting</div>
        </div>
        <div class="stat-card stat-card--blue">
          <div class="stat-card__value">{{ summary.completed }}</div>
          <div class="stat-card__label">Completed</div>
        </div>
        <div class="stat-card stat-card--red">
          <div class="stat-card__value">{{ summary.noShow }}</div>
          <div class="stat-card__label">No Show</div>
        </div>
        <div class="stat-card stat-card--red">
          <div class="stat-card__value">{{ summary.cancelled }}</div>
          <div class="stat-card__label">Cancelled</div>
        </div>
      </section>

      <section class="clinic-card filters-card">
        <div class="filters-grid">
          <label>
            <span>Status</span>
            <select [(ngModel)]="selectedFilter">
              <option *ngFor="let option of filterOptions" [value]="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="filters-grid__search">
            <span>Search patient or service</span>
            <input type="search" [(ngModel)]="searchQuery" placeholder="Search queue" />
          </label>
          <div class="filters-grid__actions">
            <button type="button" class="btn-ghost" (click)="loadSummary()" [disabled]="isLoading">Refresh</button>
          </div>
        </div>
      </section>

      <div class="clinic-card" *ngIf="isLoading">Loading today's queue...</div>

      <ng-container *ngIf="!isLoading">
        <app-empty-state
          *ngIf="filteredBookings.length === 0"
          icon="calendar-outline"
          title="No matching appointments"
          description="No appointments match the selected filters."
        ></app-empty-state>

        <section class="appointments-desktop clinic-card" *ngIf="filteredBookings.length > 0">
          <table class="clinic-table">
            <thead>
              <tr>
                <th>Queue</th>
                <th>Patient</th>
                <th>Services</th>
                <th>Time</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let booking of filteredBookings">
                <td>{{ booking.queueNumber !== null ? '#' + booking.queueNumber : '-' }}</td>
                <td>{{ booking.patientName || 'Patient' }}</td>
                <td>{{ servicesLabel(booking) }}</td>
                <td>{{ timeRangeLabel(booking) }}</td>
                <td><app-status-badge [status]="booking.status"></app-status-badge></td>
                <td><app-status-badge [status]="booking.paymentStatus"></app-status-badge></td>
                <td>
                  <div class="action-row">
                    <button type="button" class="btn-ghost" (click)="view(booking.id)">View</button>
                    <button
                      *ngIf="canStartConsultation(booking)"
                      type="button"
                      class="btn-outline"
                      (click)="consult(booking.id)"
                    >
                      Start Consultation
                    </button>
                    <button
                      *ngIf="canComplete(booking)"
                      type="button"
                      class="btn-primary"
                      (click)="openCompleteModal(booking)"
                    >
                      Complete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="appointments-mobile" *ngIf="filteredBookings.length > 0">
          <article class="mobile-card appointment-card" *ngFor="let booking of filteredBookings">
            <div class="mobile-card__header">
              <div>
                <div class="mobile-card__name">{{ booking.patientName || 'Patient' }}</div>
                <div class="mobile-card__code">
                  {{ booking.queueNumber !== null ? '#' + booking.queueNumber : booking.id }}
                </div>
              </div>
              <button type="button" class="btn-ghost" (click)="view(booking.id)">View</button>
            </div>

            <div class="mobile-card__row">
              <span class="mobile-card__label">Status</span>
              <app-status-badge [status]="booking.status"></app-status-badge>
            </div>

            <div class="mobile-card__row">
              <span class="mobile-card__label">Payment</span>
              <app-status-badge [status]="booking.paymentStatus"></app-status-badge>
            </div>

            <div class="mobile-card__row">
              <span class="mobile-card__label">Services</span>
              <span>{{ servicesLabel(booking) }}</span>
            </div>

            <div class="mobile-card__row">
              <span class="mobile-card__label">Time</span>
              <span class="data-mono">{{ timeRangeLabel(booking) }}</span>
            </div>

            <div class="appointment-card__actions">
              <button
                *ngIf="canStartConsultation(booking)"
                type="button"
                class="btn-outline"
                (click)="consult(booking.id)"
              >
                Start Consultation
              </button>
              <button *ngIf="canComplete(booking)" type="button" class="btn-primary" (click)="openCompleteModal(booking)">
                Complete
              </button>
            </div>
          </article>
        </section>
      </ng-container>
    </section>

    <ion-modal [isOpen]="completeModalOpen" (didDismiss)="closeCompleteModal()">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Complete Consultation</ion-title>
            <ion-buttons slot="end">
              <ion-button fill="clear" (click)="closeCompleteModal()">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div class="clinic-card" *ngIf="selectedBooking">
            <div class="section-heading">{{ selectedBooking.patientName || 'Patient' }}</div>
            <p>{{ servicesLabel(selectedBooking) }}</p>
          </div>

          <div class="payment-mode-tabs">
            <button type="button" [class.active]="!isProfessionalFeeWaived" (click)="setWaived(false)">Charge PF</button>
            <button type="button" [class.active]="isProfessionalFeeWaived" (click)="setWaived(true)">Waive PF</button>
          </div>

          <div class="clinic-card" *ngIf="!isProfessionalFeeWaived">
            <label class="form-label">Final Amount</label>
            <input class="filter-input" type="number" min="0" [(ngModel)]="finalAmount" />
          </div>

          <div class="clinic-card" *ngIf="isProfessionalFeeWaived">
            <label class="form-label">Waived Reason</label>
            <textarea class="filter-input" rows="3" [(ngModel)]="professionalFeeWaivedReason"></textarea>
          </div>

          <div class="clinic-card">
            <label class="form-label">SOAP Notes (optional)</label>
            <textarea class="filter-input" rows="3" [(ngModel)]="soapNotes"></textarea>
          </div>

          <div class="clinic-card">
            <label class="form-label">Doctor Fee Notes (optional)</label>
            <textarea class="filter-input" rows="3" [(ngModel)]="doctorFeeNotes"></textarea>
          </div>

          <div class="clinic-card">
            <label class="form-label">Additional Notes (optional)</label>
            <textarea class="filter-input" rows="3" [(ngModel)]="notes"></textarea>
          </div>

          <div class="wizard-actions wizard-actions--split">
            <button type="button" class="btn-outline" (click)="closeCompleteModal()">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="isSubmittingComplete" (click)="submitCompletion()">
              {{ isSubmittingComplete ? 'Saving...' : 'Complete Booking' }}
            </button>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styleUrl: './doctor-appointments.page.scss'
})
export class DoctorAppointmentsPage implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly realtime = inject(ClinicDashboardRealtimeService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  summary: DoctorTodaySummary | null = null;
  isLoading = false;
  searchQuery = '';
  selectedFilter: DoctorQueueFilter = 'all';
  completeModalOpen = false;
  selectedBooking: Booking | null = null;
  isProfessionalFeeWaived = false;
  finalAmount = 0;
  professionalFeeWaivedReason = '';
  soapNotes = '';
  doctorFeeNotes = '';
  notes = '';
  isSubmittingComplete = false;

  readonly filterOptions: Array<{ label: string; value: DoctorQueueFilter }> = [
    { label: 'All', value: 'all' },
    { label: 'Booked', value: 'Confirmed' },
    { label: 'In Clinic', value: 'CheckedIn' },
    { label: 'Completed', value: 'Completed' },
    { label: 'No Show', value: 'NoShow' },
    { label: 'Cancelled', value: 'Cancelled' }
  ];

  get filteredBookings(): Booking[] {
    const bookings = this.summary?.items ?? [];
    const normalizedSearch = this.searchQuery.trim().toLowerCase();

    return bookings
      .filter((booking) => (this.selectedFilter === 'all' ? true : booking.status === this.selectedFilter))
      .filter((booking) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          booking.patientName ?? '',
          booking.doctorName ?? '',
          servicesLabel(booking),
          booking.slotStartTime ?? '',
          booking.queueNumber?.toString() ?? ''
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => {
        const aQueue = a.queueNumber ?? Number.MAX_SAFE_INTEGER;
        const bQueue = b.queueNumber ?? Number.MAX_SAFE_INTEGER;
        if (aQueue !== bQueue) {
          return aQueue - bQueue;
        }

        return `${a.appointmentDate} ${a.slotStartTime}`.localeCompare(`${b.appointmentDate} ${b.slotStartTime}`);
      });
  }

  ngOnInit(): void {
    this.loadSummary();
    void this.realtime.ensureConnected();
    this.realtime.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (
          [
            'BookingCreated',
            'BookingCancelled',
            'PatientCheckedIn',
            'PatientCheckInUndone',
            'DoctorCompletedConsultation',
            'PaymentCompleted',
            'PaymentWaived'
          ].includes(event.eventName)
        ) {
          this.loadSummary();
        }
      });
  }

  loadSummary(): void {
    this.isLoading = true;
    this.bookingService.getDoctorTodaySummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.isLoading = false;
      },
      error: async (error) => {
        this.summary = null;
        this.isLoading = false;
        await this.presentToast(extractApiErrorMessage(error, 'Failed to load today summary.'), 'danger');
      }
    });
  }

  view(bookingId: string): void {
    void this.router.navigate(['/doctor/appointments', bookingId]);
  }

  consult(bookingId: string): void {
    void this.router.navigate(['/doctor/consultation', bookingId]);
  }

  canStartConsultation(booking: Booking): boolean {
    return booking.status === 'CheckedIn' || booking.status === 'InProgress';
  }

  canComplete(booking: Booking): boolean {
    return booking.status === 'CheckedIn' || booking.status === 'InProgress';
  }

  timeRangeLabel(booking: Booking): string {
    return timeRangeLabel(booking);
  }

  servicesLabel(booking: Booking): string {
    return servicesLabel(booking);
  }

  openCompleteModal(booking: Booking): void {
    this.selectedBooking = booking;
    this.completeModalOpen = true;
    this.isProfessionalFeeWaived = false;
    this.finalAmount = Math.max(0, booking.finalAmount ?? 0);
    this.professionalFeeWaivedReason = booking.professionalFeeWaivedReason ?? '';
    this.soapNotes = '';
    this.doctorFeeNotes = '';
    this.notes = '';
  }

  closeCompleteModal(): void {
    this.completeModalOpen = false;
    this.selectedBooking = null;
    this.isSubmittingComplete = false;
  }

  setWaived(value: boolean): void {
    this.isProfessionalFeeWaived = value;
    if (value) {
      this.finalAmount = 0;
    }
  }

  submitCompletion(): void {
    if (!this.selectedBooking || this.isSubmittingComplete) {
      return;
    }

    if (!this.isProfessionalFeeWaived && (this.finalAmount < 0 || Number.isNaN(this.finalAmount))) {
      void this.presentToast('Enter a valid final amount.', 'warning');
      return;
    }

    if (this.isProfessionalFeeWaived && !this.professionalFeeWaivedReason.trim()) {
      void this.presentToast('A waived reason is required.', 'warning');
      return;
    }

    const payload: DoctorCompleteBookingRequest = {
      finalAmount: this.isProfessionalFeeWaived ? 0 : this.finalAmount,
      isProfessionalFeeWaived: this.isProfessionalFeeWaived,
      professionalFeeWaivedReason: this.professionalFeeWaivedReason.trim() || undefined,
      soapNotes: this.soapNotes.trim() || undefined,
      doctorFeeNotes: this.doctorFeeNotes.trim() || undefined,
      notes: this.notes.trim() || undefined
    };

    this.isSubmittingComplete = true;
    this.bookingService.doctorCompleteBooking(this.selectedBooking.id, payload).subscribe({
      next: async () => {
        this.closeCompleteModal();
        this.loadSummary();
        await this.presentToast('Consultation completed.', 'success');
      },
      error: async (error) => {
        this.isSubmittingComplete = false;
        await this.presentToast(extractApiErrorMessage(error, 'Failed to complete consultation.'), 'danger');
      }
    });
  }

  private async presentToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
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

function servicesLabel(booking: Booking): string {
  if (booking.serviceNames?.length) {
    return booking.serviceNames.join(', ');
  }

  const names = booking.services?.map((service) => service.name).filter((name) => name.trim().length > 0) ?? [];
  if (names.length > 0) {
    return names.join(', ');
  }

  return booking.serviceName?.trim() || 'Service';
}

function timeRangeLabel(booking: Booking): string {
  const start = booking.slotStartTime?.trim() ?? '';
  const end = booking.slotEndTime?.trim() ?? '';

  if (!start) {
    return 'Time not available';
  }

  if (!end || end === start) {
    return start;
  }

  return `${start} - ${end}`;
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
