import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Booking, Patient, Service } from '../../../../core/models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-doctor-queue-table',
  standalone: true,
  imports: [NgFor, NgIf, EmptyStateComponent, StatusBadgeComponent],
  template: `
    <div class="clinic-card doctor-queue-table">
      <div class="doctor-queue-table__scroll" *ngIf="sortedBookings.length > 0">
        <table class="clinic-table">
          <thead>
            <tr>
              <th>Queue #</th>
              <th>Patient</th>
              <th>Service</th>
              <th>Time</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let booking of sortedBookings">
              <td class="data-mono">{{ booking.queueNumber ?? '-' }}</td>
              <td>
                <div class="cell-stack">
                  <strong>{{ patientName(booking.patientId) }}</strong>
                  <span class="cell-muted">{{ patientCode(booking.patientId) }}</span>
                </div>
              </td>
              <td>{{ serviceName(booking.serviceId) }}</td>
              <td class="data-mono">{{ booking.slotStartTime }} - {{ booking.slotEndTime }}</td>
              <td><app-status-badge [status]="booking.status"></app-status-badge></td>
              <td><app-status-badge [status]="booking.paymentStatus"></app-status-badge></td>
              <td>
                <div class="action-row">
                  <button type="button" class="btn-ghost" (click)="openBooking.emit(booking.id)">Open</button>
                  <button
                    *ngIf="canStartConsultation(booking.status)"
                    type="button"
                    class="btn-primary"
                    (click)="startConsultation.emit(booking.id)"
                  >
                    Start Consultation
                  </button>
                  <button
                    *ngIf="canMarkComplete(booking.status)"
                    type="button"
                    class="btn-ghost"
                    (click)="markComplete.emit(booking.id)"
                  >
                    Mark Complete
                  </button>
                  <button
                    *ngIf="canMarkNoShow(booking.status)"
                    type="button"
                    class="btn-ghost"
                    (click)="markNoShow.emit(booking.id)"
                  >
                    Mark No Show
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="doctor-queue-mobile" *ngIf="sortedBookings.length > 0">
        <article class="doctor-queue-card" *ngFor="let booking of sortedBookings">
          <div class="doctor-queue-card__head">
            <div class="cell-stack">
              <span class="data-mono">#{{ booking.queueNumber ?? '-' }}</span>
              <strong>{{ patientName(booking.patientId) }}</strong>
              <span class="cell-muted">{{ patientCode(booking.patientId) }}</span>
            </div>
            <button type="button" class="btn-ghost" (click)="openBooking.emit(booking.id)">Open</button>
          </div>

          <div class="doctor-queue-card__badges">
            <app-status-badge [status]="booking.status"></app-status-badge>
            <app-status-badge [status]="booking.paymentStatus"></app-status-badge>
          </div>

          <dl class="doctor-queue-card__details">
            <div>
              <dt>Service</dt>
              <dd>{{ serviceName(booking.serviceId) }}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd class="data-mono">{{ booking.slotStartTime }} - {{ booking.slotEndTime }}</dd>
            </div>
          </dl>

          <div class="doctor-queue-card__actions">
            <button
              *ngIf="canStartConsultation(booking.status)"
              type="button"
              class="btn-primary"
              (click)="startConsultation.emit(booking.id)"
            >
              Start Consultation
            </button>
            <button
              *ngIf="canMarkComplete(booking.status)"
              type="button"
              class="btn-ghost"
              (click)="markComplete.emit(booking.id)"
            >
              Mark Complete
            </button>
            <button
              *ngIf="canMarkNoShow(booking.status)"
              type="button"
              class="btn-ghost"
              (click)="markNoShow.emit(booking.id)"
            >
              Mark No Show
            </button>
          </div>
        </article>
      </div>

      <app-empty-state
        *ngIf="sortedBookings.length === 0"
        icon="calendar-outline"
        title="No appointments today"
        description="You have no scheduled appointments for today."
      ></app-empty-state>
    </div>
  `,
  styleUrl: './doctor-queue-table.component.scss'
})
export class DoctorQueueTableComponent {
  @Input() bookings: Booking[] = [];
  @Input() patients: Patient[] = [];
  @Input() services: Service[] = [];

  @Output() openBooking = new EventEmitter<string>();
  @Output() startConsultation = new EventEmitter<string>();
  @Output() markComplete = new EventEmitter<string>();
  @Output() markNoShow = new EventEmitter<string>();

  get sortedBookings(): Booking[] {
    return [...this.bookings].sort((a, b) => {
      const aQueue = a.queueNumber ?? Number.MAX_SAFE_INTEGER;
      const bQueue = b.queueNumber ?? Number.MAX_SAFE_INTEGER;
      if (aQueue !== bQueue) {
        return aQueue - bQueue;
      }
      return `${a.appointmentDate} ${a.slotStartTime}`.localeCompare(`${b.appointmentDate} ${b.slotStartTime}`);
    });
  }

  patientName(patientId: string): string {
    const patient = this.patients.find((item) => item.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  }

  patientCode(patientId: string): string {
    return this.patients.find((item) => item.id === patientId)?.patientCode ?? '';
  }

  serviceName(serviceId: string): string {
    return this.services.find((service) => service.id === serviceId)?.name ?? 'Unknown Service';
  }

  canStartConsultation(status: string): boolean {
    return status === 'Confirmed' || status === 'InProgress';
  }

  canMarkComplete(status: string): boolean {
    return status === 'Confirmed' || status === 'InProgress';
  }

  canMarkNoShow(status: string): boolean {
    return status === 'Confirmed';
  }
}
