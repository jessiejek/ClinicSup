import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonInput } from '@ionic/angular/standalone';
import {
  AvailabilityStatus,
  Doctor,
  DoctorDayStatus
} from '../../../../core/models';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-doctor-status-panel',
  standalone: true,
  imports: [NgIf, IonInput, StatusBadgeComponent],
  template: `
    <section
      class="clinic-card doctor-status-panel"
      [class.clinic-card--accent-green]="currentStatus === 'Available'"
      [class.clinic-card--accent-amber]="currentStatus === 'RunningLate'"
      [class.clinic-card--accent-red]="currentStatus === 'UnavailableToday'"
    >
      <div class="doctor-status-panel__head">
        <div>
          <p class="section-label">Today</p>
          <h2>Availability Status</h2>
        </div>
        <app-status-badge [status]="currentStatus"></app-status-badge>
      </div>

      <p class="doctor-status-panel__summary doctor-status-panel__summary--running-late" *ngIf="currentStatus === 'RunningLate'">
        Running late by {{ status?.runningLateMinutes ?? 0 }} minutes.
      </p>
      <p class="doctor-status-panel__summary doctor-status-panel__summary--available" *ngIf="currentStatus === 'Available'">
        You are currently marked as available.
      </p>
      <p class="doctor-status-panel__summary doctor-status-panel__summary--unavailable" *ngIf="currentStatus === 'UnavailableToday'">
        You are unavailable today.
      </p>

      <div class="doctor-status-panel__actions">
        <button type="button" class="doctor-status-panel__action-button" (click)="setAvailable()">
          Mark Available
        </button>

        <div class="running-late-box">
          <label>Minutes late</label>
          <ion-input
            type="number"
            min="5"
            inputmode="numeric"
            [value]="runningLateMinutes.toString()"
            (ionInput)="onMinutesChange($event)"
          ></ion-input>
          <button
            type="button"
            class="doctor-status-panel__action-button"
            [disabled]="runningLateMinutes < 5"
            (click)="setRunningLate()"
          >
            Set Running Late
          </button>
        </div>

        <button type="button" class="doctor-status-panel__action-button" (click)="markUnavailableToday()">
          Mark Unavailable Today
        </button>
      </div>
    </section>
  `,
  styleUrl: './doctor-status-panel.component.scss'
})
export class DoctorStatusPanelComponent {
  @Input({ required: true }) doctor!: Doctor;
  @Input() status: DoctorDayStatus | null = null;

  @Output() statusChanged = new EventEmitter<{
    doctorId: string;
    status: AvailabilityStatus;
    runningLateMinutes?: number;
  }>();

  runningLateMinutes = 5;

  get currentStatus(): AvailabilityStatus {
    return this.status?.status ?? 'Available';
  }

  setAvailable(): void {
    this.statusChanged.emit({
      doctorId: this.doctor.id,
      status: 'Available'
    });
  }

  setRunningLate(): void {
    const minutes = Math.max(5, Math.floor(this.runningLateMinutes || 0));
    if (minutes < 5) {
      return;
    }
    this.statusChanged.emit({
      doctorId: this.doctor.id,
      status: 'RunningLate',
      runningLateMinutes: minutes
    });
  }

  markUnavailableToday(): void {
    this.statusChanged.emit({
      doctorId: this.doctor.id,
      status: 'UnavailableToday'
    });
  }

  onMinutesChange(event: CustomEvent<{ value?: string | number | null }>): void {
    const nextValue = Number(event.detail?.value ?? 0);
    this.runningLateMinutes = Number.isFinite(nextValue) ? nextValue : 0;
  }
}
