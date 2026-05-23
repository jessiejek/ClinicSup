import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Booking, Doctor, Patient, Service } from '../../../../core/models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import {
  BookingActionsMenuComponent,
  BookingActionItem
} from '../booking-actions-menu/booking-actions-menu.component';

@Component({
  selector: 'app-today-appointments-table',
  standalone: true,
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    RouterLink,
    EmptyStateComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    BookingActionsMenuComponent
  ],
  template: `
    <div class="table-wrap">
      <div class="table-scroll-wrap" *ngIf="!isLoading && bookings.length > 0">
        <table class="clinic-table">
        <thead>
          <tr>
            <th>Queue#</th>
            <th>Patient Name</th>
            <th>Doctor</th>
            <th>Service</th>
            <th>Time</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let booking of bookings"
            tabindex="0"
            role="button"
            [attr.aria-label]="'Open appointment for ' + patientName(booking.patientId)"
            (click)="rowClicked.emit(booking)"
            (keydown.enter)="rowClicked.emit(booking)"
          >
            <td class="data-mono">{{ booking.queueNumber ?? 'â€”' }}</td>
            <td>{{ patientName(booking.patientId) }}</td>
            <td>{{ doctorName(booking.doctorId) }}</td>
            <td>{{ serviceName(booking.serviceId) }}</td>
            <td class="data-mono">{{ booking.slotStartTime }} - {{ booking.slotEndTime }}</td>
            <td><app-status-badge [status]="booking.status"></app-status-badge></td>
            <td><app-status-badge [status]="booking.paymentStatus"></app-status-badge></td>
          <td>
              <app-booking-actions-menu
                [actions]="actions"
                (actionSelected)="action.emit({ action: $event, id: booking.id })"
              ></app-booking-actions-menu>
            </td>
          </tr>
        </tbody>
        </table>
      </div>

      <div *ngIf="isLoading" class="table-skeleton">
        <app-skeleton variant="row" [count]="5"></app-skeleton>
      </div>

      <app-empty-state
        *ngIf="!isLoading && bookings.length === 0"
        icon="calendar-outline"
        title="No appointments today"
        description="There are no booked visits for today yet."
      ></app-empty-state>
    </div>
  `,
  styleUrl: './today-appointments-table.component.scss'
})
export class TodayAppointmentsTableComponent {
  @Input() bookings: Booking[] = [];
  @Input() doctors: Doctor[] = [];
  @Input() patients: Patient[] = [];
  @Input() services: Service[] = [];
  @Input() isLoading = false;
  @Input() actions: BookingActionItem[] = [
    { label: 'View', value: 'view' },
    { label: 'Confirm', value: 'confirm' },
    { label: 'Reject', value: 'reject', danger: true }
  ];

  @Output() rowClicked = new EventEmitter<Booking>();
  @Output() action = new EventEmitter<{ action: string; id: string }>();

  patientName(patientId: string): string {
    const patient = this.patients.find((item) => item.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
  }

  doctorName(doctorId: string): string {
    return this.doctors.find((item) => item.id === doctorId)?.fullName ?? 'Unknown';
  }

  serviceName(serviceId: string): string {
    return this.services.find((item) => item.id === serviceId)?.name ?? 'Unknown';
  }
}
