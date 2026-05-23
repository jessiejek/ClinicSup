import { NgClass, NgFor } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Booking } from '../../../../core/models';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

type TimelineState = 'completed' | 'current' | 'upcoming';

interface TimelineStep {
  label: string;
  description: string;
}

@Component({
  selector: 'app-booking-timeline',
  standalone: true,
  imports: [NgFor, NgClass, StatusBadgeComponent],
  template: `
    <div class="timeline clinic-card">
      <div class="section-heading">Booking Timeline</div>
      <div class="timeline__track">
        <div
          *ngFor="let step of steps; let index = index"
          class="timeline__step"
          [ngClass]="stateClass(index)"
        >
          <div class="timeline__marker"></div>
          <div class="timeline__content">
            <div class="timeline__label">{{ step.label }}</div>
            <div class="timeline__description">{{ step.description }}</div>
          </div>
        </div>
      </div>
      <div class="timeline__footer">
        <app-status-badge [status]="displayStatus"></app-status-badge>
        <app-status-badge [status]="displayPaymentStatus"></app-status-badge>
      </div>
    </div>
  `,
  styleUrl: './booking-timeline.component.scss'
})
export class BookingTimelineComponent {
  @Input({ required: true }) booking!: Booking;

  readonly steps: TimelineStep[] = [
    { label: 'Booked', description: 'Your appointment has been confirmed by the clinic.' },
    { label: 'In Clinic', description: 'The clinic has checked you in for your appointment.' },
    { label: 'Consultation Completed', description: 'The doctor has finished the consultation.' },
    { label: 'Payment Settled', description: 'Your clinic payment has been completed or waived.' }
  ];

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
    return this.isWaived ? 'Waived' : this.booking.paymentStatus;
  }

  stateClass(index: number): TimelineState {
    const current = this.currentStepIndex;
    if (index < current) {
      return 'completed';
    }
    if (index === current) {
      return 'current';
    }
    return 'upcoming';
  }

  get currentStepIndex(): number {
    if (this.booking.paymentStatus === 'Paid' || this.isWaived) {
      return 3;
    }

    if (this.booking.status === 'Completed') {
      return 2;
    }

    if (this.booking.status === 'CheckedIn') {
      return 1;
    }

    return 0;
  }

  private get isWaived(): boolean {
    return this.booking.isProfessionalFeeWaived === true || this.booking.paymentStatus === 'Waived';
  }
}
