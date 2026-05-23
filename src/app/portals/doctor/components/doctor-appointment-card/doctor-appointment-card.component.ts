import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Booking } from '../../../../core/models';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-doctor-appointment-card',
  standalone: true,
  imports: [NgIf, StatusBadgeComponent],
  template: `
    <article class="clinic-card appointment-card">
      <div class="appointment-card__head">
        <div>
          <div class="appointment-card__patient">{{ displayPatientName }}</div>
          <div class="appointment-card__sub" *ngIf="patientCode">{{ patientCode }}</div>
        </div>
        <app-status-badge [status]="booking.status"></app-status-badge>
      </div>

      <div class="appointment-card__meta">
        <div>
          <span class="label">Service</span>
          <strong>{{ displayServiceName }}</strong>
        </div>
        <div>
          <span class="label">Schedule</span>
          <strong>{{ scheduleLabel }}</strong>
        </div>
        <div>
          <span class="label">Queue #</span>
          <strong class="data-mono">{{ booking.queueNumber ?? '-' }}</strong>
        </div>
        <div>
          <span class="label">Payment</span>
          <app-status-badge [status]="booking.paymentStatus"></app-status-badge>
        </div>
      </div>

      <div class="appointment-card__actions">
        <button type="button" class="btn-ghost" (click)="openBooking.emit(booking.id)">View</button>
        <button
          *ngIf="canStartConsultation(booking.status)"
          type="button"
          class="btn-primary"
          (click)="startConsultation.emit(booking.id)"
        >
          Start Consultation
        </button>
      </div>
    </article>
  `,
  styleUrl: './doctor-appointment-card.component.scss'
})
export class DoctorAppointmentCardComponent {
  @Input({ required: true }) booking!: Booking;
  @Input() patientName = '';
  @Input() patientCode = '';
  @Input() serviceName = '';

  @Output() openBooking = new EventEmitter<string>();
  @Output() startConsultation = new EventEmitter<string>();

  get displayPatientName(): string {
    return this.patientName.trim() || this.booking.patientName?.trim() || 'Unknown Patient';
  }

  get displayServiceName(): string {
    return this.serviceName.trim() || this.booking.serviceName?.trim() || 'Unknown Service';
  }

  get scheduleLabel(): string {
    const date = this.booking.appointmentDate?.trim() ?? '';
    const time = this.booking.slotStartTime?.trim() ?? '';

    if (!date) {
      return time || '-';
    }

    if (!time) {
      return date;
    }

    return `${date} ${time}`;
  }

  canStartConsultation(status: string): boolean {
    return status === 'Confirmed' || status === 'InProgress';
  }
}
