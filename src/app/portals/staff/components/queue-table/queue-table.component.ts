import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Booking, Doctor, Patient, Service } from '../../../../core/models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

type QueueActionType = 'check-in' | 'undo-check-in' | 'collect-payment';

interface QueueActionConfig {
  action: QueueActionType;
  label: string;
  buttonClass: 'btn-primary' | 'btn-outline';
}

@Component({
  selector: 'app-queue-table',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent],
  template: `
    <div class="queue-table-shell">
      <div class="table-wrap" *ngIf="!isLoading && sortedBookings.length > 0">
        <table class="clinic-table queue-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Doctor / Services</th>
              <th>Time</th>
              <th>Queue #</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let booking of sortedBookings"
              tabindex="0"
              role="button"
              [attr.aria-label]="'Open booking for ' + patientLabel(booking)"
              (click)="rowClicked.emit(booking.id)"
              (keydown.enter)="rowClicked.emit(booking.id)"
            >
              <td class="cell cell--patient">
                <strong>{{ patientLabel(booking) }}</strong>
              </td>
              <td class="cell cell--doctor">
                <div class="cell-doctor">
                  <span class="cell-doctor__name">{{ doctorLabel(booking) }}</span>
                  <span class="cell-doctor__service">{{ serviceLabel(booking) }}</span>
                </div>
              </td>
              <td class="cell cell--time data-mono">{{ timeLabel(booking) }}</td>
              <td class="cell cell--queue"><span class="queue-pill">{{ queueLabel(booking) }}</span></td>
              <td class="cell cell--status">
                <app-status-badge
                  portal="staff"
                  [status]="booking.status"
                  [labelOverride]="queueStatusLabel(booking.status)"
                ></app-status-badge>
              </td>
              <td class="cell cell--payment">
                <app-status-badge
                  portal="staff"
                  [status]="booking.paymentStatus"
                ></app-status-badge>
              </td>
              <td class="cell cell--actions">
                <ng-container *ngIf="actionConfig(booking) as action; else noAction">
                  <button
                    type="button"
                    class="queue-action-button"
                    [ngClass]="action.buttonClass"
                    (click)="takeAction(action.action, booking.id, $event)"
                  >
                    {{ action.label }}
                  </button>
                </ng-container>
                <ng-template #noAction>
                  <span class="queue-actions__empty">&mdash;</span>
                </ng-template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="queue-mobile-list" *ngIf="!isLoading && sortedBookings.length > 0">
        <article
          class="queue-mobile-card"
          *ngFor="let booking of sortedBookings"
          tabindex="0"
          role="button"
          [attr.aria-label]="'Open booking for ' + patientLabel(booking)"
          (click)="rowClicked.emit(booking.id)"
          (keydown.enter)="rowClicked.emit(booking.id)"
        >
          <div class="queue-mobile-card__header">
            <div class="queue-mobile-card__identity">
              <span class="queue-mobile-card__queue">{{ queueLabel(booking) }}</span>
              <strong>{{ patientLabel(booking) }}</strong>
              <span class="queue-mobile-card__time data-mono">{{ timeLabel(booking) }}</span>
            </div>

            <div class="queue-mobile-card__badges">
              <app-status-badge
                portal="staff"
                [status]="booking.status"
                [labelOverride]="queueStatusLabel(booking.status)"
              ></app-status-badge>
              <app-status-badge
                portal="staff"
                [status]="booking.paymentStatus"
              ></app-status-badge>
            </div>
          </div>

          <dl class="queue-mobile-card__details">
            <div>
              <dt>Doctor</dt>
              <dd>
                {{ doctorLabel(booking) }}
                <span class="mobile-service">{{ serviceLabel(booking) }}</span>
              </dd>
            </div>
          </dl>

          <div class="queue-mobile-card__actions">
            <ng-container *ngIf="actionConfig(booking) as action; else noMobileAction">
              <button
                type="button"
                class="queue-action-button"
                [ngClass]="action.buttonClass"
                (click)="takeAction(action.action, booking.id, $event)"
              >
                {{ action.label }}
              </button>
            </ng-container>
            <ng-template #noMobileAction>
              <span class="queue-actions__empty">&mdash;</span>
            </ng-template>
          </div>
        </article>
      </div>

      <app-skeleton *ngIf="isLoading" variant="row" [count]="5"></app-skeleton>

      <app-empty-state
        *ngIf="!isLoading && sortedBookings.length === 0"
        icon="calendar-outline"
        title="No queue items for now."
        description="Booked and confirmed bookings will appear here during the day."
      ></app-empty-state>
    </div>
  `,
  styleUrl: './queue-table.component.scss'
})
export class QueueTableComponent {
  @Input() bookings: Booking[] = [];
  @Input() doctors: Doctor[] = [];
  @Input() patients: Patient[] = [];
  @Input() services: Service[] = [];
  @Input() isLoading = false;

  @Output() actionTaken = new EventEmitter<{ action: string; bookingId: string; reason?: string }>();
  @Output() rowClicked = new EventEmitter<string>();

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

  patientLabel(booking: Booking): string {
    const patient = this.patients.find((item) => item.id === booking.patientId);
    return firstText(
      booking.patientName,
      personLabel(patient),
      personLabel(getNestedValue(booking, 'patient'))
    ) || 'Unknown Patient';
  }

  doctorLabel(booking: Booking): string {
    const doctor = this.doctors.find((item) => item.id === booking.doctorId);
    return firstText(
      booking.doctorName,
      personLabel(doctor),
      personLabel(getNestedValue(booking, 'doctor'))
    ) || 'Doctor not assigned';
  }

  serviceLabel(booking: Booking): string {
    const fromServices = booking.services
      ?.map((service) => trimText(service.name))
      .filter((name): name is string => Boolean(name)) ?? [];
    if (fromServices.length > 0) {
      return fromServices.join(', ');
    }

    const fromServiceNames = normalizeTextArray(booking.serviceNames);
    if (fromServiceNames.length > 0) {
      return fromServiceNames.join(', ');
    }

    const serviceName = trimText(booking.serviceName);
    if (serviceName) {
      return serviceName;
    }

    const nestedServiceName = nestedText(getNestedValue(booking, 'service'), ['name']);
    if (nestedServiceName) {
      return nestedServiceName;
    }

    const catalogNames = this.resolveCatalogServiceNames(booking.serviceIds ?? (booking.serviceId ? [booking.serviceId] : []));
    if (catalogNames.length > 0) {
      return catalogNames.join(', ');
    }

    return 'No service listed';
  }

  timeLabel(booking: Booking): string {
    const start = trimText(booking.slotStartTime);
    const end = trimText(booking.slotEndTime);

    if (!start) {
      return 'Time not available';
    }

    if (!end || end === start) {
      return start;
    }

    return `${start} - ${end}`;
  }

  queueLabel(booking: Booking): string {
    return booking.queueNumber !== null ? `#${booking.queueNumber}` : '-';
  }

  queueStatusLabel(status: string): string {
    switch (status) {
      case 'Confirmed':
        return 'BOOKED';
      case 'CheckedIn':
        return 'CONFIRMED';
      case 'Completed':
        return 'COMPLETED';
      case 'Cancelled':
        return 'CANCELLED';
      case 'NoShow':
        return 'NO SHOW';
      case 'Pending':
        return 'PENDING';
      case 'ProofSubmitted':
        return 'PROOF SUBMITTED';
      case 'OnHold':
        return 'ON HOLD';
      case 'Expired':
        return 'EXPIRED';
      case 'Rescheduled':
        return 'RESCHEDULED';
      case 'InProgress':
        return 'IN PROGRESS';
      default:
        return status;
    }
  }

  actionConfig(booking: Booking): QueueActionConfig | null {
    if (booking.status === 'Confirmed') {
      return {
        action: 'check-in',
        label: 'Check In',
        buttonClass: 'btn-primary'
      };
    }

    if (booking.status === 'CheckedIn') {
      return {
        action: 'undo-check-in',
        label: 'Undo Check-In',
        buttonClass: 'btn-outline'
      };
    }

    if (booking.status === 'Completed' && booking.paymentStatus === 'Unpaid') {
      return {
        action: 'collect-payment',
        label: 'Collect Payment',
        buttonClass: 'btn-primary'
      };
    }

    return null;
  }

  takeAction(action: QueueActionType, bookingId: string, event: Event): void {
    event.stopPropagation();
    this.actionTaken.emit({ action, bookingId });
  }

  private resolveCatalogServiceNames(serviceIds: string[]): string[] {
    if (serviceIds.length === 0 || this.services.length === 0) {
      return [];
    }

    return serviceIds
      .map((serviceId) => this.services.find((service) => service.id === serviceId)?.name ?? '')
      .map((name) => name.trim())
      .filter((name): name is string => Boolean(name));
  }
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = trimText(value);
    if (text) {
      return text;
    }
  }

  return '';
}

function personLabel(value: unknown): string {
  if (!isRecord(value)) {
    return '';
  }

  const direct = trimText(value['fullName']) || trimText(value['name']);
  if (direct) {
    return direct;
  }

  const firstName = trimText(value['firstName']);
  const middleName = trimText(value['middleName']);
  const lastName = trimText(value['lastName']);
  const parts = [firstName, middleName, lastName].filter((part) => part.length > 0);
  return parts.join(' ').trim();
}

function normalizeTextArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => trimText(item)).filter((item): item is string => Boolean(item))
    : [];
}

function nestedText(value: unknown, keys: string[]): string {
  if (!isRecord(value)) {
    return '';
  }

  for (const key of keys) {
    const text = trimText(value[key]);
    if (text) {
      return text;
    }
  }

  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNestedValue(record: unknown, key: string): unknown {
  if (!isRecord(record)) {
    return undefined;
  }

  return record[key];
}
