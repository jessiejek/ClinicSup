import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Booking, BookingStatus, Doctor, Patient } from '../../../core/models';
import { BookingService } from '../../../core/services/booking.service';
import { DoctorStateService } from '../../../core/services/doctor-state.service';
import { PatientStateService } from '../../../core/services/patient-state.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Pending',
  ProofSubmitted: 'Proof Submitted',
  Confirmed: 'Confirmed',
  CheckedIn: 'Checked In',
  OnHold: 'On Hold',
  Cancelled: 'Cancelled',
  Completed: 'Completed',
  Expired: 'Expired',
  NoShow: 'No Show',
  Rescheduled: 'Rescheduled'
};

const FILTER_STATUSES: BookingStatus[] = [
  'Pending',
  'Confirmed',
  'Completed',
  'Cancelled',
  'OnHold',
  'ProofSubmitted',
  'CheckedIn',
  'NoShow',
  'Rescheduled'
];

@Component({
  selector: 'app-admin-bookings-page',
  standalone: true,
  imports: [AsyncPipe, FormsModule, NgFor, NgIf, RouterLink, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Bookings</h2>
          <p class="page-subtitle">Manage all scheduled and walk-in bookings.</p>
        </div>
        <button type="button" class="btn-primary" routerLink="/admin/walk-in">New Walk-In</button>
      </div>

      <div class="filter-bar clinic-card">
        <select class="filter-input" [(ngModel)]="doctorFilter">
          <option value="all">All Doctors</option>
          <option *ngFor="let doctor of doctors" [value]="doctor.id">{{ doctor.fullName }}</option>
        </select>
        <select class="filter-input" [(ngModel)]="statusFilter">
          <option value="all">All Statuses</option>
          <option *ngFor="let status of filterStatuses" [value]="status">{{ statusLabel(status) }}</option>
        </select>
        <input class="filter-input" type="date" [(ngModel)]="dateFilter" />
        <input class="filter-input" type="search" placeholder="Search patient or booking ID" [(ngModel)]="searchQuery" />
        <button type="button" class="btn-ghost" (click)="clearFilters()">Clear Filters</button>
      </div>

      <div class="clinic-card" *ngIf="!isLoading && filteredBookings.length > 0">
        <div class="table-desktop">
          <div class="table-scroll-wrap">
            <table class="clinic-table">
              <thead>
                <tr>
                                    <th class="col-check"><input type="checkbox" [checked]="selectAll" (change)="toggleSelectAll($event)" /></th>
                  <th class="col-queue">#</th>
                  <th class="col-patient">Patient</th>
                  <th class="col-doctor">Doctor / Service</th>
                  <th class="col-status">Status</th>
                  <th class="col-payment">Payment</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let booking of filteredBookings"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="'Open booking for ' + displayPatientName(booking)"
                  (click)="openBooking(booking.id)"
                  (keydown.enter)="openBooking(booking.id)"
                >
                                    <td class="col-check" (click)="$event.stopPropagation()">
                    <input
                      type="checkbox"
                      [checked]="selectedIds.has(booking.id)"
                      (change)="toggleSelect(booking.id, $event)"
                    />
                  </td>
                  <td class="col-queue"><span class="data-mono">{{ booking.queueNumber ?? '-' }}</span></td>
                  <td class="col-patient">
                    <div class="cell-patient">
                      <span class="cell-patient__name">{{ displayPatientName(booking) }}</span>
                      <span *ngIf="booking.patient?.patientCode" class="cell-patient__code">{{ booking.patient!.patientCode }}</span>
                      <span class="cell-patient__time">{{ formatDateTime(booking.appointmentDate, booking.slotStartTime) }}</span>
                    </div>
                  </td>
                  <td class="col-doctor">
                    <div class="cell-doctor">
                      <span class="cell-doctor__name">{{ displayDoctorName(booking) }}</span>
                      <span *ngIf="booking.doctor?.specialization" class="cell-doctor__spec">{{ booking.doctor!.specialization }}</span>
                      <span class="cell-doctor__service">{{ displayServiceNames(booking).join(', ') }}</span>
                    </div>
                  </td>
                  <td class="col-status"><app-status-badge [status]="booking.status"></app-status-badge></td>
                  <td class="col-payment"><app-status-badge [status]="booking.paymentStatus"></app-status-badge></td>
                  <td class="col-actions" (click)="$event.stopPropagation()">
                    <button type="button" class="btn-ghost btn-sm" (click)="openBooking(booking.id)">View</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="totalPages > 1">
          <div class="pagination__info">
            Showing page {{ currentPage }} of {{ totalPages }} ({{ totalBookings }} total)
          </div>
          <div class="pagination__controls">
            <button type="button" class="btn-ghost btn-sm" [disabled]="currentPage <= 1" (click)="goToPage(currentPage - 1)">Previous</button>
            <span class="pagination__pages">
              <button *ngFor="let p of paginationPages" type="button" class="btn-sm" [class.btn-primary]="p === currentPage" [class.btn-ghost]="p !== currentPage" (click)="goToPage(p)">{{ p }}</button>
            </span>
            <button type="button" class="btn-ghost btn-sm" [disabled]="currentPage >= totalPages" (click)="goToPage(currentPage + 1)">Next</button>
          </div>
        </div>

        <div class="table-mobile">
          <article
            *ngFor="let booking of filteredBookings"
            class="mobile-card"
            tabindex="0"
            role="button"
            [attr.aria-label]="'Open booking for ' + displayPatientName(booking)"
            (click)="openBooking(booking.id)"
            (keydown.enter)="openBooking(booking.id)"
          >
                        <div class="mobile-card__header">
              <div>
                <div class="mobile-card__name">{{ displayPatientName(booking) }}</div>
                <div class="mobile-card__code">{{ booking.patient?.patientCode || 'Queue #' + (booking.queueNumber ?? '-') }}</div>
                <div class="mobile-card__meta">{{ formatDateTime(booking.appointmentDate, booking.slotStartTime) }}</div>
              </div>
              <app-status-badge [status]="booking.status"></app-status-badge>
            </div>

            <div class="mobile-card__row">
              <span class="mobile-card__label">Queue</span>
              <span class="data-mono">{{ booking.queueNumber ?? '-' }}</span>
            </div>

            <div class="mobile-card__row">
              <span class="mobile-card__label">Doctor</span>
              <span>{{ displayDoctorName(booking) }} · {{ displayServiceNames(booking).join(', ') }}</span>
            </div>

            <div class="mobile-card__row">
              <span class="mobile-card__label">Payment</span>
              <app-status-badge [status]="booking.paymentStatus"></app-status-badge>
            </div>

            <div class="mobile-card__actions" (click)="$event.stopPropagation()">
              <button type="button" class="btn-ghost btn-sm" (click)="openBooking(booking.id)">View Details</button>
            </div>
          </article>

          <!-- Mobile Pagination -->
          <div class="pagination" *ngIf="totalPages > 1">
            <div class="pagination__info">Page {{ currentPage }} of {{ totalPages }}</div>
            <div class="pagination__controls">
              <button type="button" class="btn-ghost btn-sm" [disabled]="currentPage <= 1" (click)="goToPage(currentPage - 1)">Prev</button>
              <button type="button" class="btn-ghost btn-sm" [disabled]="currentPage >= totalPages" (click)="goToPage(currentPage + 1)">Next</button>
            </div>
          </div>
        </div>
      </div>

      <app-skeleton *ngIf="isLoading" variant="row" [count]="5"></app-skeleton>

      <app-empty-state
        *ngIf="!isLoading && filteredBookings.length === 0"
        icon="calendar-outline"
        title="No bookings found"
        description="Try adjusting the filters or create a new walk-in booking."
      ></app-empty-state>
    </section>
  `,
  styleUrl: './bookings.page.scss'
})
export class BookingsPage implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly doctorState = inject(DoctorStateService);
  private readonly patientState = inject(PatientStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  bookings: Booking[] = [];
  doctors: Doctor[] = [];
  patients: Patient[] = [];
  isLoading = false;
  doctorFilter = 'all';
  statusFilter = 'all';
  dateFilter = '';
  searchQuery = '';
  selectAll = false;
  selectedIds = new Set<string>();
  filterStatuses = FILTER_STATUSES;

  // Pagination state
  totalBookings = 0;
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;

  ngOnInit(): void {
    this.bookingService.isLoading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loading) => (this.isLoading = loading));

    this.bookingService.bookings$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((bookings) => {
        this.bookings = bookings;
      });

    // Kick off the fetch
    this.fetchBookings();

    this.doctorState
      .getDoctors()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((doctors) => (this.doctors = doctors));

    this.patientState
      .getPatients()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((patients) => (this.patients = patients));
  }

  private fetchBookings(): void {
    this.bookingService.getBookings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /** Fetch a specific page of bookings from the API */
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.bookingService.getBookings({
      page,
      pageSize: this.pageSize,
      doctorId: this.doctorFilter !== 'all' ? this.doctorFilter : undefined,
      status: this.statusFilter !== 'all' ? (this.statusFilter as BookingStatus) : undefined,
      appointmentDate: this.dateFilter || undefined,
      search: this.searchQuery || undefined
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((bookings) => {
      this.bookings = bookings;
    });
  }

  get paginationPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get filteredBookings(): Booking[] {
    const q = this.searchQuery.trim().toLowerCase();
    return [...this.bookings]
      .sort((a, b) => {
        const dateCompare = b.appointmentDate.localeCompare(a.appointmentDate);
        if (dateCompare !== 0) return dateCompare;
        return b.slotStartTime.localeCompare(a.slotStartTime);
      })
      .filter((booking) => (this.doctorFilter === 'all' ? true : booking.doctorId === this.doctorFilter))
      .filter((booking) => (this.statusFilter === 'all' ? true : booking.status === this.statusFilter))
      .filter((booking) => (this.dateFilter ? booking.appointmentDate === this.dateFilter : true))
      .filter((booking) => {
        if (!q) return true;
        const patient = this.displayPatientName(booking).toLowerCase();
        const code = (booking.patient?.patientCode ?? '').toLowerCase();
        const id = booking.id.toLowerCase();
        return id.includes(q) || patient.includes(q) || code.includes(q);
      });
  }

  clearFilters(): void {
    this.doctorFilter = 'all';
    this.statusFilter = 'all';
    this.dateFilter = '';
    this.searchQuery = '';
    this.selectAll = false;
    this.selectedIds.clear();
    this.currentPage = 1;
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectAll = checked;
    this.selectedIds = checked ? new Set(this.filteredBookings.map((booking) => booking.id)) : new Set();
  }

  toggleSelect(bookingId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds.add(bookingId);
    } else {
      this.selectedIds.delete(bookingId);
      this.selectAll = false;
    }
  }

  openBooking(id: string): void {
    void this.router.navigate(['/admin/bookings', id]);
  }

    statusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
  }

  /** Format date as "May 20, 2026 · 3:30PM" */
  formatDateTime(dateStr: string, timeStr: string): string {
    if (!dateStr) return timeStr || '—';
    try {
      // Parse YYYY-MM-DD
      const parts = dateStr.split('-');
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const year = parseInt(parts[0], 10);
      const date = new Date(year, month, day);
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      // Format time — keep as-is if it already looks formatted, otherwise try to parse
      let formattedTime = '';
      if (timeStr && timeStr.includes(':')) {
        const [h, m] = timeStr.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        formattedTime = `${hour12}:${m.toString().padStart(2, '0')}${period}`;
      } else {
        formattedTime = timeStr || '';
      }
      return formattedTime ? `${formattedDate} · ${formattedTime}` : formattedDate;
    } catch {
      return `${dateStr} · ${timeStr || ''}`;
    }
  }

  /** Display patient name using fallback chain */
  displayPatientName(booking: Booking): string {
    if (booking.patientName) return booking.patientName;
    if (booking.patient?.fullName) return booking.patient.fullName;
    if (booking.patient?.firstName || booking.patient?.lastName) {
      return [booking.patient.firstName, booking.patient.lastName].filter(Boolean).join(' ');
    }
    return 'Unknown Patient';
  }

  /** Display doctor name using fallback chain */
  displayDoctorName(booking: Booking): string {
    if (booking.doctorName) return booking.doctorName;
    if (booking.doctor?.fullName) return booking.doctor.fullName;
    return 'Doctor not assigned';
  }

  /** Display service names as an array using fallback chain */
  displayServiceNames(booking: Booking): string[] {
    if (booking.serviceNames && booking.serviceNames.length > 0) {
      return booking.serviceNames;
    }
    if (booking.services && booking.services.length > 0) {
      return booking.services.map((s) => s.name).filter((n): n is string => Boolean(n));
    }
    if (booking.serviceName) return [booking.serviceName];
    if (booking.service?.name) return [booking.service.name];
    return ['No service listed'];
  }
}
