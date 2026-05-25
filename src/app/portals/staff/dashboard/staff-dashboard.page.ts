import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cashOutline } from 'ionicons/icons';
import { Booking, Doctor, Patient } from '../../../core/models';
import { BookingService } from '../../../core/services/booking.service';
import { ClinicDashboardRealtimeService } from '../../../core/services/clinic-dashboard-realtime.service';
import { DoctorStateService } from '../../../core/services/doctor-state.service';
import { PatientStateService } from '../../../core/services/patient-state.service';
import { QueueTableComponent } from '../components/queue-table/queue-table.component';

@Component({
  selector: 'app-staff-dashboard-page',
  standalone: true,
  imports: [NgFor, NgIf, IonIcon, QueueTableComponent],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Dashboard</h2>
          <p class="page-subtitle">Track today's queue and resolve booking actions quickly.</p>
        </div>
      </div>

      <div class="stat-grid">
        <article class="stat-card stat-card--green">
          <div class="stat-card__accent"></div>
          <div class="stat-card__body">
            <p class="stat-card__label">Today's Appointments</p>
            <div class="stat-card__value">{{ todaysAppointmentsCount }}</div>
            <p class="stat-card__desc">Scheduled for today</p>
          </div>
        </article>

        <article class="stat-card stat-card--red">
          <div class="stat-card__accent"></div>
          <div class="stat-card__body">
            <p class="stat-card__label">Ready for Payment</p>
            <div class="stat-card__value">{{ completedUnpaidCount }}</div>
            <p class="stat-card__badge" *ngIf="completedUnpaidCount > 0; else noPayment">Collect Now</p>
            <ng-template #noPayment><p class="stat-card__desc">All payments collected</p></ng-template>
          </div>
        </article>

        <article class="stat-card stat-card--blue">
          <div class="stat-card__accent"></div>
          <div class="stat-card__body">
            <p class="stat-card__label">Walk-Ins Today</p>
            <div class="stat-card__value">{{ walkInsTodayCount }}</div>
            <p class="stat-card__desc">Unscheduled arrivals</p>
          </div>
        </article>

        <article class="stat-card stat-card--neutral">
          <div class="stat-card__accent"></div>
          <div class="stat-card__body">
            <p class="stat-card__label">Confirmed Today</p>
            <div class="stat-card__value">{{ confirmedTodayCount }}</div>
            <p class="stat-card__desc">Checked in to clinic</p>
          </div>
        </article>
      </div>

      <div
        class="banner banner--danger"
        *ngIf="completedUnpaidCount > 0"
        (click)="goToPaymentQueue()"
      >
        <ion-icon name="cash-outline"></ion-icon>
        <span>
          {{ completedUnpaidCount }} completed consultation(s) are ready for payment collection.
          <strong>Go to Payment Queue &rarr;</strong>
        </span>
      </div>

      <div class="clinic-card queue-card">
        <div class="queue-card__header">
          <div>
            <div class="section-heading">Today's Queue</div>
            <p class="queue-card__subtitle">Booked and confirmed patients waiting for staff actions.</p>
          </div>
          <div class="queue-card__meta">
            <span>{{ walkInsTodayCount }} walk-ins</span>
            <span>{{ confirmedTodayCount }} confirmed</span>
          </div>
        </div>
        <app-queue-table
          [bookings]="todaysBookings"
          [doctors]="doctors"
          [patients]="patients"
          [isLoading]="isLoading"
          (rowClicked)="openBooking($event)"
          (actionTaken)="onQueueAction($event)"
        ></app-queue-table>
      </div>
    </section>
  `,
  styleUrl: './staff-dashboard.page.scss'
})
export class StaffDashboardPage implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly realtime = inject(ClinicDashboardRealtimeService);
  private readonly doctorState = inject(DoctorStateService);
  private readonly patientState = inject(PatientStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  todaysBookings: Booking[] = [];
  doctors: Doctor[] = [];
  patients: Patient[] = [];
  bookingsLoading = false;
  doctorsLoading = false;
  patientsLoading = false;

  get isLoading(): boolean {
    return this.bookingsLoading || this.doctorsLoading || this.patientsLoading;
  }

  get todaysAppointmentsCount(): number {
    return this.todaysBookings.length;
  }

  get walkInsTodayCount(): number {
    return this.todaysBookings.filter((booking) => booking.isWalkIn).length;
  }

  get confirmedTodayCount(): number {
    return this.todaysBookings.filter((booking) => booking.status === 'CheckedIn').length;
  }

  get completedUnpaidCount(): number {
    return this.todaysBookings.filter(
      (booking) => booking.status === 'Completed' && booking.paymentStatus === 'Unpaid'
    ).length;
  }

  constructor() {
    addIcons({ cashOutline });
  }

  ngOnInit(): void {
    this.doctorState.doctors$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((doctors) => (this.doctors = doctors));

    this.patientState.patients$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((patients) => (this.patients = patients));

    this.bookingService.isLoading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((bookingsLoading) => {
      this.bookingsLoading = bookingsLoading;
    });
    this.doctorState.isLoading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((doctorsLoading) => {
      this.doctorsLoading = doctorsLoading;
    });
    this.patientState.isLoading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((patientsLoading) => {
      this.patientsLoading = patientsLoading;
    });

    // Realtime: auto-refresh dashboard on booking events
    this.realtime.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if ([
          'BookingCreated',
          'BookingCancelled',
          'PatientCheckedIn',
          'PatientCheckInUndone',
          'DoctorCompletedConsultation',
          'PaymentCompleted',
          'PaymentWaived'
        ].includes(event.eventName)) {
          this.refreshDashboardBookings();
        }
      });

    this.refreshDashboardData();
  }

  ionViewWillEnter(): void {
    this.refreshDashboardData();
  }

  goToPaymentQueue(): void {
    void this.router.navigate(['/staff/payments']);
  }

  openBooking(bookingId: string): void {
    void this.router.navigate(['/staff/bookings', bookingId]);
  }

  onQueueAction(event: { action: string; bookingId: string }): void {
    switch (event.action) {
      case 'check-in':
        this.bookingService.checkInBooking(event.bookingId).subscribe();
        break;
      case 'undo-check-in':
        this.bookingService.undoCheckInBooking(event.bookingId).subscribe();
        break;
      case 'collect-payment':
        void this.goToPaymentQueue();
        break;
    }
  }

  private refreshDashboardBookings(): void {
    this.loadTodaysBookings();
  }

  private refreshDashboardData(): void {
    this.loadTodaysBookings();
    this.doctorState.refresh();
    this.patientState.refresh();
  }

  private loadTodaysBookings(): void {
    this.bookingService
      .getStaffTodayBookings({ page: 1, pageSize: 500 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.todaysBookings = result.items;
        },
        error: () => {
          this.todaysBookings = [];
        }
      });
  }
}
