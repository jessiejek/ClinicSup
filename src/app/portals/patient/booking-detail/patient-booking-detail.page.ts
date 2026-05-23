import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, IonIcon } from '@ionic/angular/standalone';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, firstValueFrom, of, switchMap, take } from 'rxjs';
import { Booking, ReceiptData } from '../../../core/models';
import { BookingService } from '../../../core/services/booking.service';
import { ClinicDashboardRealtimeService } from '../../../core/services/clinic-dashboard-realtime.service';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ReceiptModalComponent } from '../../../shared/components/receipt-modal/receipt-modal.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { BookingTimelineComponent } from '../components/booking-timeline/booking-timeline.component';
import { PatientService } from '../services/patient.service';

@Component({
  selector: 'app-patient-booking-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    BookingTimelineComponent,
    ConfirmModalComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ReceiptModalComponent,
    IonIcon
  ],
  template: `
    <section class="page-shell" *ngIf="booking; else emptyTpl">
      <div class="page-shell__header">
        <div>
          <button type="button" class="btn-ghost" (click)="back()">Back to Bookings</button>
          <h2 class="page-title">Booking Detail</h2>
          <p class="page-subtitle data-mono">{{ booking.id }}</p>
        </div>
      </div>

      <div class="booking-detail-grid">
        <div class="booking-detail-main">
          <div class="clinic-card booking-summary">
            <div class="booking-summary__top">
              <div>
                <div class="section-heading">Summary</div>
                <h3>{{ servicesDisplayName }}</h3>
                <p>{{ booking.doctorName || 'Doctor' }}</p>
              </div>
              <div class="booking-summary__badges">
                <app-status-badge [status]="displayStatus"></app-status-badge>
                <app-status-badge [status]="displayPaymentStatus"></app-status-badge>
              </div>
            </div>

            <div class="summary-grid">
              <div><span>Appointment Date</span><strong>{{ booking.appointmentDate | date : 'EEEE, MMMM d, y' }}</strong></div>
              <div><span>Time</span><strong>{{ timeRangeLabel }}</strong></div>
              <div><span>Queue Number</span><strong>{{ booking.queueNumber !== null ? '#' + booking.queueNumber : 'Not assigned' }}</strong></div>
              <div><span>Payment Mode</span><strong>{{ booking.paymentMode }}</strong></div>
              <div *ngIf="showAmountDue"><span>Amount Due</span><strong>PHP {{ booking.finalAmount }}</strong></div>
              <div *ngIf="isWaived"><span>Professional Fee</span><strong>Waived</strong></div>
              <div><span>Created</span><strong>{{ booking.createdAt | date : 'MMM d, y h:mm a' }}</strong></div>
            </div>

            <div class="clinic-card clinic-card--accent-green booking-summary__note">
              Payment will be settled at the clinic after consultation.
            </div>
          </div>

          <app-booking-timeline [booking]="booking"></app-booking-timeline>

          <div class="clinic-card payment-panel">
            <div class="section-heading">Payment Details</div>
            <div class="summary-grid summary-grid--compact">
              <div><span>Payment Status</span><strong>{{ displayPaymentStatus }}</strong></div>
              <div><span>Payment Method</span><strong>{{ booking.payment?.paymentMethod || booking.paymentMode }}</strong></div>
              <div *ngIf="showAmountDue"><span>Final Amount Due</span><strong>PHP {{ booking.finalAmount }}</strong></div>
              <div *ngIf="isWaived && booking.professionalFeeWaivedReason">
                <span>Waived Reason</span>
                <strong>{{ booking.professionalFeeWaivedReason }}</strong>
              </div>
            </div>
          </div>

          <div class="clinic-card" *ngIf="canViewReceipt">
            <div class="section-heading">Official Receipt</div>
            <p>Your payment has been recorded. You can open or print the clinic receipt.</p>
            <button type="button" class="btn-primary" (click)="openReceipt()">View Receipt</button>
          </div>

          <div class="clinic-card cancellation-panel" *ngIf="canCancelOnline; else cannotCancelTpl">
            <div class="section-heading">Cancellation</div>
            <p>This booking can still be cancelled online.</p>
            <button type="button" class="btn-danger" (click)="openCancelModal()">Cancel Booking</button>
          </div>
          <ng-template #cannotCancelTpl>
            <div class="clinic-card">
              <p>This booking can no longer be cancelled online. Please contact the clinic if you need help.</p>
            </div>
          </ng-template>
        </div>

        <div class="booking-detail-side">
          <div class="clinic-card">
            <div class="section-heading">Doctor Info</div>
            <p>{{ booking.doctorName || 'Doctor' }}</p>
          </div>

          <div class="clinic-card">
            <div class="section-heading">Services</div>
            <div class="detail-meta">
              <div *ngFor="let serviceName of serviceNamesToDisplay">
                <span>Service</span>
                <strong>{{ serviceName }}</strong>
              </div>
            </div>
          </div>

          <div class="clinic-card">
            <div class="section-heading">Quick Links</div>
            <div class="action-list">
              <button type="button" class="btn-ghost" style="width: 100%; text-align: left; padding-left: 0;" (click)="navigateToDocuments()">
                <ion-icon name="document-text-outline" style="margin-right: 8px; vertical-align: middle;"></ion-icon> My Documents
              </button>
              <button type="button" class="btn-ghost" style="width: 100%; text-align: left; padding-left: 0;" (click)="navigateToLabResults()">
                <ion-icon name="flask-outline" style="margin-right: 8px; vertical-align: middle;"></ion-icon> My Labs
              </button>
            </div>
          </div>
        </div>
      </div>

      <app-confirm-modal
        [isOpen]="cancelModalOpen"
        title="Cancel Booking"
        message="Confirm cancellation for this appointment?"
        confirmLabel="Cancel Booking"
        cancelLabel="Keep Booking"
        [isDanger]="true"
        (confirmed)="confirmCancel()"
        (cancelled)="cancelModalOpen = false"
      ></app-confirm-modal>

      <app-receipt-modal [isOpen]="receiptModalOpen" [data]="receiptData" (closed)="receiptModalOpen = false"></app-receipt-modal>
    </section>

    <ng-template #emptyTpl>
      <app-empty-state
        icon="calendar-outline"
        title="Booking not found"
        description="We could not load this booking or it does not belong to your account."
        ctaLabel="Back to Bookings"
        ctaRoute="/patient/bookings"
      ></app-empty-state>
    </ng-template>
  `,
  styleUrl: './patient-booking-detail.page.scss'
})
export class PatientBookingDetailPage implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly realtime = inject(ClinicDashboardRealtimeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastCtrl = inject(ToastController);
  private readonly patientService = inject(PatientService);

  receiptModalOpen = false;
  receiptData: ReceiptData | null = null;

  booking: Booking | null = null;
  cancelModalOpen = false;

  get displayStatus(): string {
    if (!this.booking) {
      return '-';
    }

    if (this.booking.status === 'Confirmed') {
      return 'Booked';
    }

    if (this.booking.status === 'CheckedIn') {
      return 'InClinic';
    }

    if (this.booking.status === 'Completed' && this.booking.paymentStatus === 'Unpaid') {
      return 'ForPayment';
    }

    if (this.booking.status === 'Completed' && this.isWaived) {
      return 'PFWaived';
    }

    if (this.booking.status === 'Completed' && this.booking.paymentStatus === 'Paid') {
      return 'CompletedPaid';
    }

    return this.booking.status;
  }

  get displayPaymentStatus(): string {
    if (!this.booking) {
      return '-';
    }

    return this.isWaived ? 'Waived' : this.booking.paymentStatus;
  }

  get isWaived(): boolean {
    return !!this.booking && (this.booking.isProfessionalFeeWaived === true || this.booking.paymentStatus === 'Waived');
  }

  get showAmountDue(): boolean {
    return !!this.booking && !this.isWaived && this.booking.finalAmount !== null && this.booking.finalAmount !== undefined;
  }

  get canCancelOnline(): boolean {
    if (!this.booking || ['Cancelled', 'Completed', 'NoShow', 'Expired'].includes(this.booking.status)) {
      return false;
    }

    return new Date(`${this.booking.appointmentDate}T${this.booking.slotStartTime}:00`).getTime() > Date.now();
  }

  get canViewReceipt(): boolean {
    return !!this.booking?.payment?.id && ['Paid', 'Waived'].includes(this.booking.paymentStatus);
  }

  get servicesDisplayName(): string {
    if (!this.booking) {
      return 'Service';
    }

    if (this.booking.serviceNames?.length) {
      return this.booking.serviceNames.join(', ');
    }

    const names = this.booking.services?.map((service) => service.name).filter((name) => name.trim().length > 0) ?? [];
    if (names.length > 0) {
      return names.join(', ');
    }

    return this.booking.serviceName?.trim() || 'Service';
  }

  get serviceNamesToDisplay(): string[] {
    if (!this.booking) {
      return [];
    }

    if (this.booking.serviceNames?.length) {
      return this.booking.serviceNames;
    }

    const names = this.booking.services?.map((service) => service.name).filter((name) => name.trim().length > 0) ?? [];
    if (names.length > 0) {
      return names;
    }

    return this.booking.serviceName?.trim() ? [this.booking.serviceName.trim()] : [];
  }

  get timeRangeLabel(): string {
    if (!this.booking) {
      return 'Time not available';
    }

    return this.timeRangeLabelFor(this.booking);
  }

  ngOnInit(): void {
    void this.realtime.ensureConnected();
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const bookingId = params.get('id') ?? '';
          return combineLatest([
            this.patientService.getMyProfile().pipe(catchError(() => of(undefined))),
            this.bookingService.getBookingById$(bookingId)
          ]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(([patient, booking]) => {
        if (!booking || !patient || (booking.patientId && booking.patientId !== patient.id)) {
          this.booking = null;
          return;
        }

        this.booking = booking;
      });

    this.realtime.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (
          this.booking &&
          [
            'BookingCreated',
            'BookingCancelled',
            'PatientCheckedIn',
            'PatientCheckInUndone',
            'DoctorCompletedConsultation',
            'PaymentCompleted',
            'PaymentWaived'
          ].includes(event.eventName) &&
          (!event.bookingId || event.bookingId === this.booking.id)
        ) {
          this.bookingService.getBookingById$(this.booking.id).pipe(take(1)).subscribe();
        }
      });
  }

  openCancelModal(): void {
    if (!this.canCancelOnline) {
      return;
    }

    this.cancelModalOpen = true;
  }

  confirmCancel(): void {
    if (!this.booking) {
      return;
    }

    this.bookingService.cancelBooking(this.booking.id, 'Cancelled by patient.');
    this.booking = {
      ...this.booking,
      status: 'Cancelled',
      cancellationReason: 'Cancelled by patient.'
    };
    this.cancelModalOpen = false;
    void this.presentToast('Booking cancelled.');
  }

  back(): void {
    void this.router.navigate(['/patient/bookings']);
  }

  navigateToDocuments(): void {
    void this.router.navigate(['/patient/documents'], { queryParams: { bookingId: this.booking?.id } });
  }

  navigateToLabResults(): void {
    void this.router.navigate(['/patient/lab-results'], { queryParams: { bookingId: this.booking?.id } });
  }

  async openReceipt(): Promise<void> {
    if (!this.booking?.payment?.id) {
      await this.presentToast('Receipt is not available yet.', 'warning');
      return;
    }

    try {
      this.receiptData = await firstValueFrom(this.bookingService.getReceipt(this.booking.payment.id));
      this.receiptModalOpen = true;
    } catch (error) {
      await this.presentToast(extractApiErrorMessage(error, 'Failed to load receipt.'), 'danger');
    }
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

  private timeRangeLabelFor(booking: Booking): string {
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
