import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastController } from '@ionic/angular/standalone';
import { Booking } from '../../../core/models';
import {
  BookingService,
  PagedResult,
  StaffBookingsFilterParams,
} from '../../../core/services/booking.service';
import { ClinicDashboardRealtimeService } from '../../../core/services/clinic-dashboard-realtime.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PublicService } from '../../public/services/public.service';

type StaffTodayStatus = 'all' | 'Confirmed' | 'CheckedIn' | 'Completed' | 'NoShow' | 'Cancelled';

@Component({
  selector: 'app-staff-bookings-page',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf, FormsModule, PageHeaderComponent, EmptyStateComponent, StatusBadgeComponent],
  template: `
    <app-page-header
      [title]="'Bookings' + (selectedDate ? ' — ' + (selectedDate | date : 'MMMM d, y (EEE)') : '')"
      subtitle="View and manage patient bookings across all dates"
    ></app-page-header>

    <section class="filter-bar">
      <select class="filter-input" [(ngModel)]="doctorFilter" (ngModelChange)="onFiltersChanged()">
        <option value="">All Doctors</option>
        <option *ngFor="let doctor of doctors" [value]="doctor.id">{{ doctor.fullName }}</option>
      </select>

      <select class="filter-input" [(ngModel)]="statusFilter" (ngModelChange)="onFiltersChanged()">
        <option *ngFor="let status of statuses" [value]="status.value">{{ status.label }}</option>
      </select>

      <input
        type="date"
        class="filter-input filter-date"
        [(ngModel)]="dateValue"
        (ngModelChange)="onDateChanged()"
      />

      <button type="button" class="btn-icon" (click)="refresh()" [disabled]="isLoading">
        <span class="btn-icon__text">⟳</span> Refresh
      </button>
    </section>

    <div class="loading-card" *ngIf="isLoading">Loading bookings…</div>

    <ng-container *ngIf="!isLoading">
      <section class="table-card" *ngIf="bookings.length > 0; else emptyState">
        <div class="table-scroll">
          <table class="bookings-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor / Services</th>
                <th>Date / Time</th>
                <th>Queue</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Mode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let booking of bookings"
                class="booking-row"
                tabindex="0"
                role="button"
                [attr.aria-label]="'Open booking for ' + (booking.patientName || 'patient')"
                (click)="openBooking(booking.id)"
                (keydown.enter)="openBooking(booking.id)"
              >
                <td>
                  <button type="button" class="booking-link" (click)="openBooking(booking.id, $event)">
                    {{ booking.patientName || 'Patient' }}
                  </button>
                </td>
                <td>
                  <div class="doctor-name">{{ booking.doctorName || 'Doctor' }}</div>
                  <div class="doctor-services">{{ servicesLabel(booking) }}</div>
                </td>
                <td>
                  <div>{{ booking.appointmentDate | date : 'MMMM d, y (EEE)' }}</div>
                  <div class="time-range">{{ timeRangeLabel(booking) }}</div>
                </td>
                <td class="col-queue">{{ booking.queueNumber !== null ? '#' + booking.queueNumber : '-' }}</td>
                <td class="col-center">
                  <app-status-badge
                    [status]="booking.status"
                    [labelOverride]="bookingStatusLabel(booking.status)"
                  ></app-status-badge>
                </td>
                <td class="col-center"><app-status-badge [status]="booking.paymentStatus"></app-status-badge></td>
                <td class="col-center">{{ booking.paymentMode }}</td>
                <td class="col-actions">
                  <div class="action-row">
                    <button
                      *ngIf="booking.status === 'Confirmed'"
                      type="button"
                      class="btn-primary"
                      (click)="checkIn(booking, $event)"
                      [disabled]="actionBookingId === booking.id"
                    >
                      Check In
                    </button>
                    <button
                      *ngIf="booking.status === 'CheckedIn'"
                      type="button"
                      class="btn-outline"
                      (click)="undoCheckIn(booking, $event)"
                      [disabled]="actionBookingId === booking.id"
                    >
                      Undo Check-In
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" *ngIf="totalPages > 1">
          <button class="btn-ghost pagination__button" type="button" (click)="previousPage()" [disabled]="currentPage <= 1 || isLoading">
            Previous
          </button>
          <span class="pagination__page">Page {{ currentPage }} of {{ totalPages }}</span>
          <button class="btn-ghost pagination__button" type="button" (click)="nextPage()" [disabled]="currentPage >= totalPages || isLoading">
            Next
          </button>
        </div>
      </section>

      <!-- Mobile card layout -->
      <section class="mobile-layout" *ngIf="bookings.length > 0">
        <div
          class="mobile-card"
          *ngFor="let booking of bookings"
          tabindex="0"
          role="button"
          [attr.aria-label]="'Open booking for ' + (booking.patientName || 'patient')"
          (click)="openBooking(booking.id)"
          (keydown.enter)="openBooking(booking.id)"
        >
          <div class="mobile-card__header">
            <div class="mobile-card__info">
              <strong>{{ booking.patientName || 'Patient' }}</strong>
              <span class="mobile-card__doctor">{{ booking.doctorName || 'Doctor' }}</span>
              <span class="mobile-card__services">{{ servicesLabel(booking) }}</span>
              <span class="mobile-card__queue">{{ booking.queueNumber !== null ? '#' + booking.queueNumber : '-' }}</span>
            </div>
            <div class="mobile-card__badge">
              <app-status-badge
                [status]="booking.status"
                [labelOverride]="bookingStatusLabel(booking.status)"
              ></app-status-badge>
            </div>
          </div>
          <div class="mobile-card__details">
            <div>
              <dt>Date</dt>
              <dd>{{ booking.appointmentDate | date : 'MMMM d, y (EEE)' }}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{{ timeRangeLabel(booking) }}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd><app-status-badge [status]="booking.paymentStatus"></app-status-badge></dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{{ booking.paymentMode }}</dd>
            </div>
          </div>
          <div class="mobile-card__actions">
            <button
              *ngIf="booking.status === 'Confirmed'"
              type="button"
              class="btn-primary btn-full"
              (click)="checkIn(booking, $event)"
              [disabled]="actionBookingId === booking.id"
            >
              Check In
            </button>
            <button
              *ngIf="booking.status === 'CheckedIn'"
              type="button"
              class="btn-outline btn-full"
              (click)="undoCheckIn(booking, $event)"
              [disabled]="actionBookingId === booking.id"
            >
              Undo Check-In
            </button>
          </div>
        </div>

        <div class="pagination" *ngIf="totalPages > 1">
          <button class="btn-ghost pagination__button" type="button" (click)="previousPage()" [disabled]="currentPage <= 1 || isLoading">
            Previous
          </button>
          <span class="pagination__page">Page {{ currentPage }} of {{ totalPages }}</span>
          <button class="btn-ghost pagination__button" type="button" (click)="nextPage()" [disabled]="currentPage >= totalPages || isLoading">
            Next
          </button>
        </div>
      </section>
    </ng-container>

    <ng-template #emptyState>
      <app-empty-state
        icon="calendar-outline"
        title="No bookings found"
        description="There are no bookings for the selected date and filters."
      ></app-empty-state>
    </ng-template>
  `,
  styleUrl: './staff-bookings.page.scss'
})
export class StaffBookingsPage implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly publicService = inject(PublicService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly realtime = inject(ClinicDashboardRealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  doctors: Array<{ id: string; fullName: string }> = [];
  bookings: Booking[] = [];
  isLoading = false;
  actionBookingId: string | null = null;
  doctorFilter = '';
  statusFilter: StaffTodayStatus = 'all';
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  selectedDate: string = this.toLocalIsoDate();

  get dateValue(): string {
    return this.selectedDate;
  }
  set dateValue(value: string) {
    this.selectedDate = value;
  }

  readonly statuses: Array<{ label: string; value: StaffTodayStatus }> = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Booked', value: 'Confirmed' },
    { label: 'Confirmed', value: 'CheckedIn' },
    { label: 'Completed', value: 'Completed' },
    { label: 'No Show', value: 'NoShow' },
    { label: 'Cancelled', value: 'Cancelled' }
  ];

  ngOnInit(): void {
    const initialStatus = this.route.snapshot.queryParamMap.get('status');
    if (initialStatus && this.statuses.some((status) => status.value === initialStatus)) {
      this.statusFilter = initialStatus as StaffTodayStatus;
    }

    this.publicService.getDoctors().subscribe({
      next: (doctors) => {
        this.doctors = doctors.map((doctor) => ({ id: doctor.id, fullName: doctor.fullName }));
      },
      error: () => {
        this.doctors = [];
      }
    });

    this.loadBookings();

    this.realtime.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const name = event.eventName;
        if (
          name === 'BookingCreated' ||
          name === 'BookingCancelled' ||
          name === 'PatientCheckedIn' ||
          name === 'PatientCheckInUndone' ||
          name === 'DoctorCompletedConsultation' ||
          name === 'PaymentCompleted' ||
          name === 'PaymentWaived'
        ) {
          this.loadBookings();
        }
      });
  }

  onDateChanged(): void {
    this.currentPage = 1;
    this.loadBookings();
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
    this.loadBookings();
  }

  refresh(): void {
    this.loadBookings();
  }

  previousPage(): void {
    if (this.currentPage <= 1 || this.isLoading) {
      return;
    }

    this.currentPage -= 1;
    this.loadBookings();
  }

  nextPage(): void {
    if (this.currentPage >= this.totalPages || this.isLoading) {
      return;
    }

    this.currentPage += 1;
    this.loadBookings();
  }

  openBooking(bookingId: string, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/staff/bookings', bookingId]);
  }

  checkIn(booking: Booking, event?: Event): void {
    event?.stopPropagation();
    this.actionBookingId = booking.id;
    this.bookingService.checkInBooking(booking.id, {}).subscribe({
      next: async () => {
        this.actionBookingId = null;
        this.loadBookings();
        await this.presentToast('Patient checked in.', 'success');
      },
      error: async (error) => {
        this.actionBookingId = null;
        await this.presentToast(extractApiErrorMessage(error, 'Failed to check in booking.'), 'danger');
      }
    });
  }

  undoCheckIn(booking: Booking, event?: Event): void {
    event?.stopPropagation();
    this.actionBookingId = booking.id;
    this.bookingService.undoCheckInBooking(booking.id).subscribe({
      next: async () => {
        this.actionBookingId = null;
        this.loadBookings();
        await this.presentToast('Check-in undone.', 'success');
      },
      error: async (error) => {
        this.actionBookingId = null;
        await this.presentToast(extractApiErrorMessage(error, 'Failed to undo check-in.'), 'danger');
      }
    });
  }

  servicesLabel(booking: Booking): string {
    return servicesLabel(booking);
  }

  bookingStatusLabel(status: StaffTodayStatus | Booking['status']): string {
    switch (status) {
      case 'Confirmed':
        return 'Booked';
      case 'CheckedIn':
        return 'Confirmed';
      case 'Completed':
        return 'Completed';
      case 'Cancelled':
        return 'Cancelled';
      case 'NoShow':
        return 'No Show';
      case 'Pending':
        return 'Pending';
      case 'ProofSubmitted':
        return 'Proof Submitted';
      case 'OnHold':
        return 'On Hold';
      case 'Expired':
        return 'Expired';
      case 'Rescheduled':
        return 'Rescheduled';
      case 'InProgress':
        return 'In Progress';
      default:
        return String(status);
    }
  }

  timeRangeLabel(booking: Booking): string {
    return timeRangeLabel(booking);
  }

  private loadBookings(): void {
    const filters: StaffBookingsFilterParams = {
      doctorId: this.doctorFilter || undefined,
      status: this.statusFilter === 'all' ? undefined : this.statusFilter,
      appointmentDate: this.selectedDate || undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.isLoading = true;
    this.bookingService.getStaffBookings(filters).subscribe({
      next: (result: PagedResult<Booking>) => {
        this.bookings = result.items;
        this.currentPage = result.page;
        this.pageSize = result.pageSize;
        this.totalPages = Math.max(1, Math.ceil(result.totalCount / result.pageSize));
        this.isLoading = false;
      },
      error: async (error) => {
        this.bookings = [];
        this.totalPages = 1;
        this.isLoading = false;
        await this.presentToast(extractApiErrorMessage(error, 'Failed to load bookings.'), 'danger');
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

  private toLocalIsoDate(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
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
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}
