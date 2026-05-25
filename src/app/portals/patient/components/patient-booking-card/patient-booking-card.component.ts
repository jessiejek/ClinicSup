import { DatePipe, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Booking, Doctor, Service } from '../../../../core/models';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-patient-booking-card',
  standalone: true,
  imports: [NgIf, DatePipe, StatusBadgeComponent],
  template: `
    <article class="booking-card clinic-card">
      <div class="booking-card__header">
        <div>
          <div class="booking-card__id data-mono">{{ booking.id }}</div>
          <h3>{{ doctorDisplayName }}</h3>
          <p>{{ servicesDisplayName }}</p>
        </div>
        <div class="booking-card__badges">
          <app-status-badge [status]="displayStatus"></app-status-badge>
          <app-status-badge [status]="displayPaymentStatus"></app-status-badge>
        </div>
      </div>

      <div class="booking-card__details">
        <div>
          <span>Date</span>
          <strong>{{ booking.appointmentDate | date : 'MMMM d, y (EEE)' }}</strong>
        </div>
        <div>
          <span>Time</span>
          <strong>{{ timeRangeLabel }}</strong>
        </div>
        <div *ngIf="booking.queueNumber !== null">
          <span>Queue</span>
          <strong>#{{ booking.queueNumber }}</strong>
        </div>
        <div *ngIf="showAmountDue">
          <span>Amount Due</span>
          <strong>PHP {{ booking.finalAmount }}</strong>
        </div>
      </div>

      <div class="booking-card__actions">
        <button type="button" class="btn-outline" (click)="viewDetails.emit(booking.id)">
          View Details
        </button>
        <button *ngIf="canCancel" type="button" class="btn-ghost" (click)="cancelBooking.emit(booking.id)">
          Cancel
        </button>
      </div>
    </article>
  `,
  styleUrl: './patient-booking-card.component.scss'
})
export class PatientBookingCardComponent {
  @Input({ required: true }) booking!: Booking;
  @Input() doctor?: Doctor;
  @Input() service?: Service;
  @Input() canSubmitProof = false;
  @Input() canCancel = false;

  @Output() viewDetails = new EventEmitter<string>();
  @Output() submitProof = new EventEmitter<string>();
  @Output() cancelBooking = new EventEmitter<string>();

  get doctorDisplayName(): string {
    return this.booking.doctorName?.trim() || this.doctor?.fullName?.trim() || 'Assigned Doctor';
  }

  get servicesDisplayName(): string {
    if (this.booking.serviceNames?.length) {
      return this.booking.serviceNames.join(', ');
    }

    const namesFromItems = this.booking.services?.map((item) => item.name).filter((name) => name.trim().length > 0) ?? [];
    if (namesFromItems.length > 0) {
      return namesFromItems.join(', ');
    }

    return this.booking.serviceName?.trim() || this.service?.name?.trim() || 'Service';
  }

  get displayStatus(): string {
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
    if (this.isWaived) {
      return 'Waived';
    }

    return this.booking.paymentStatus;
  }

  get showAmountDue(): boolean {
    return !this.isWaived && this.booking.finalAmount !== null && this.booking.finalAmount !== undefined;
  }

  get isWaived(): boolean {
    return this.booking.isProfessionalFeeWaived === true || this.booking.paymentStatus === 'Waived';
  }

  get timeRangeLabel(): string {
    const start = this.booking.slotStartTime?.trim() ?? '';
    const end = this.booking.slotEndTime?.trim() ?? '';

    if (!start) {
      return 'Time not available';
    }

    if (!end || end === start) {
      return start;
    }

    return `${start} - ${end}`;
  }
}
