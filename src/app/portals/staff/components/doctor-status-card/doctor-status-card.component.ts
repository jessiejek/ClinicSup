import { NgClass, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline, timeOutline } from 'ionicons/icons';
import { AvailabilityStatus, Doctor, DoctorDayStatus } from '../../../../core/models';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-doctor-status-card',
  standalone: true,
  imports: [NgClass, NgIf, FormsModule, IonIcon, AvatarComponent, ConfirmModalComponent],
  template: `
    <div
      class="doctor-status-card clinic-card"
      [class.clinic-card--accent-green]="currentStatus === 'Available'"
      [class.clinic-card--accent-amber]="currentStatus === 'RunningLate'"
      [class.clinic-card--accent-red]="currentStatus === 'UnavailableToday'"
    >
      <div class="doctor-status-card__header">
        <div class="doctor-info">
          <app-avatar [name]="doctor.fullName" size="md"></app-avatar>
          <div>
            <p class="doctor-name">{{ doctor.fullName }}</p>
            <p class="doctor-spec">{{ doctor.specialization }}</p>
          </div>
        </div>

        <div
          class="status-chip"
          [class.status-chip--green]="currentStatus === 'Available'"
          [class.status-chip--amber]="currentStatus === 'RunningLate'"
          [class.status-chip--red]="currentStatus === 'UnavailableToday'"
        >
          {{
            currentStatus === 'RunningLate'
              ? 'Running Late'
              : currentStatus === 'UnavailableToday'
                ? 'Unavailable Today'
                : 'Available'
          }}
        </div>
      </div>

      <p class="running-late-info" *ngIf="currentStatus === 'RunningLate' && dayStatus?.runningLateMinutes">
        <ion-icon name="time-outline"></ion-icon>
        Approximately {{ dayStatus?.runningLateMinutes }} minutes late
      </p>

      <div class="running-late-form" *ngIf="isSettingRunningLate">
        <label class="field-label" for="running-late-input-{{ doctor.id }}">Estimated delay (minutes)</label>
        <input
          id="running-late-input-{{ doctor.id }}"
          class="filter-input"
          type="number"
          min="5"
          max="120"
          step="5"
          [(ngModel)]="runningLateMinutes"
        />
        <div class="running-late-actions">
          <button class="btn-primary" type="button" (click)="confirmRunningLate()" [disabled]="runningLateMinutes < 5">
            Confirm
          </button>
          <button class="btn-ghost" type="button" (click)="isSettingRunningLate = false">Cancel</button>
        </div>
      </div>

      <div class="status-actions" *ngIf="!isSettingRunningLate">
        <button class="btn-primary" *ngIf="currentStatus !== 'Available'" type="button" (click)="setAvailable()">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          Mark Available
        </button>
        <button class="btn-outline" *ngIf="currentStatus !== 'RunningLate'" type="button" (click)="isSettingRunningLate = true">
          <ion-icon name="time-outline"></ion-icon>
          Set Running Late
        </button>
        <button class="btn-danger" *ngIf="currentStatus !== 'UnavailableToday'" type="button" (click)="setUnavailable()">
          <ion-icon name="close-circle-outline"></ion-icon>
          Mark Unavailable Today
        </button>
      </div>
    </div>

    <app-confirm-modal
      [isOpen]="confirmOpen"
      title="Mark Doctor Unavailable"
      message="Mark this doctor as unavailable for today?"
      confirmLabel="Mark Unavailable"
      [isDanger]="true"
      (confirmed)="confirmUnavailable()"
      (cancelled)="confirmOpen = false"
    ></app-confirm-modal>
  `,
  styleUrl: './doctor-status-card.component.scss'
})
export class DoctorStatusCardComponent {
  @Input({ required: true }) doctor!: Doctor;
  @Input() dayStatus: DoctorDayStatus | null = null;

  @Output() statusChanged = new EventEmitter<{
    doctorId: string;
    status: AvailabilityStatus;
    runningLateMinutes?: number;
  }>();

  isSettingRunningLate = false;
  confirmOpen = false;
  runningLateMinutes = 15;

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      timeOutline
    });
  }

  get currentStatus(): AvailabilityStatus {
    return this.dayStatus?.status ?? 'Available';
  }

  setAvailable(): void {
    this.isSettingRunningLate = false;
    this.statusChanged.emit({ doctorId: this.doctor.id, status: 'Available' });
  }

  setUnavailable(): void {
    this.confirmOpen = true;
  }

  confirmRunningLate(): void {
    this.statusChanged.emit({
      doctorId: this.doctor.id,
      status: 'RunningLate',
      runningLateMinutes: this.runningLateMinutes
    });
    this.isSettingRunningLate = false;
  }

  confirmUnavailable(): void {
    this.statusChanged.emit({ doctorId: this.doctor.id, status: 'UnavailableToday' });
    this.confirmOpen = false;
  }
}
