import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonChip, IonIcon, IonInput, IonNote, IonToggle } from '@ionic/angular/standalone';
import { DayOfWeek, DoctorBlockedDate, TimeSlot } from '../../../../core/models';
import { SlotGridComponent } from '../../../../shared/components/slot-grid/slot-grid.component';

export interface DoctorWeeklyScheduleDraft {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
  slotDurationMinutes: number;
  slotCapacity: number;
}

export interface DoctorScheduleSavePayload {
  schedules: DoctorWeeklyScheduleDraft[];
  dailyPatientLimit: number | null;
}

@Component({
  selector: 'app-doctor-schedule-editor',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf, FormsModule, IonChip, IonIcon, IonInput, IonNote, IonToggle, SlotGridComponent],
  template: `
    <section class="schedule-editor">
      <div class="clinic-card schedule-card">
        <div class="schedule-card__head">
          <div>
            <p class="section-label">Weekly</p>
            <h2>Schedule Editor</h2>
          </div>
          <div class="schedule-card__head-actions">
            <button
              type="button"
              class="schedule-card__save btn-primary"
              [disabled]="isSaving"
              (click)="save()"
            >
              Save Schedule
            </button>
            <button
              type="button"
              class="schedule-card__info"
              title="Saving updates which time slots patients can book online."
              aria-label="Saving updates which time slots patients can book online."
            >
              <ion-icon name="information-circle-outline" aria-hidden="true"></ion-icon>
            </button>
          </div>
        </div>

        <div class="daily-limit-row">
          <div class="daily-limit-row__copy">
            <div class="limit-label">Daily Patient Limit</div>
            <div class="limit-sublabel">(across all active days)</div>
          </div>
          <div class="daily-limit-row__input">
            <ion-input
              class="limit-input"
              type="number"
              min="1"
              step="1"
              [(ngModel)]="dailyPatientLimit"
              (ngModelChange)="markDirty()"
              placeholder="No limit"
            ></ion-input>
            <ion-icon class="limit-pencil" name="pencil-outline" aria-hidden="true"></ion-icon>
          </div>
        </div>

        <table class="clinic-table schedule-table">
          <thead>
            <tr class="table-header">
              <th>Day</th>
              <th>Active</th>
              <th>Start</th>
              <th>End</th>
              <th class="col-right">DURATION (min)</th>
              <th class="col-right">CAPACITY</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let draft of draftSchedules; let i = index" [class.row-inactive]="!draft.isActive">
              <td class="day-cell">{{ draft.dayOfWeek }}</td>
              <td class="toggle-cell">
                <ion-toggle
                  [name]="'active-' + i"
                  [(ngModel)]="draft.isActive"
                  [color]="draft.isActive ? 'success' : 'medium'"
                  (ionChange)="markDirty()"
                ></ion-toggle>
              </td>
              <td class="time-cell">
                <ion-input
                  [name]="'start-' + i"
                  type="time"
                  [(ngModel)]="draft.startTime"
                  (ngModelChange)="markDirty()"
                ></ion-input>
              </td>
              <td class="time-cell">
                <ion-input
                  [name]="'end-' + i"
                  type="time"
                  [(ngModel)]="draft.endTime"
                  (ngModelChange)="markDirty()"
                ></ion-input>
              </td>
              <td class="col-right duration-cell">
                <ion-input
                  [name]="'duration-' + i"
                  type="number"
                  min="5"
                  step="5"
                  [(ngModel)]="draft.slotDurationMinutes"
                  (ngModelChange)="markDirty()"
                ></ion-input>
              </td>
              <td class="col-right capacity-cell">
                <ion-input
                  [name]="'capacity-' + i"
                  type="number"
                  min="1"
                  step="1"
                  [(ngModel)]="draft.slotCapacity"
                  (ngModelChange)="markDirty()"
                ></ion-input>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="save-footer-sticky">
          <button type="button" class="btn-primary" [disabled]="isSaving" (click)="save()">Save Schedule</button>
        </div>
      </div>

      <div class="clinic-card schedule-card">
        <div class="schedule-card__head">
          <div>
            <p class="section-label">Blocked Dates</p>
            <h2>Block Off Dates</h2>
          </div>
        </div>

        <div class="blocked-form">
          <ion-input type="date" [(ngModel)]="blockedDateValue" placeholder="Choose date"></ion-input>
          <ion-input type="text" [(ngModel)]="blockedReason" placeholder="Reason"></ion-input>
          <button type="button" class="btn-primary" (click)="addBlockedDate()">+ Block a Date</button>
        </div>

        <ion-note class="empty-blocked-note" *ngIf="blockedDates.length === 0">
          No dates blocked. Add holidays or leave days here to hide those slots from patients.
        </ion-note>

        <div class="blocked-list" *ngIf="blockedDates.length > 0">
          <ion-chip class="blocked-chip" *ngFor="let blockedDate of blockedDates">
            <span class="blocked-chip__date">Calendar {{ blockedDate.blockedDate | date:'MMM d' }}</span>
            <span class="blocked-chip__reason">- {{ blockedDate.reason || 'Holiday' }}</span>
            <button type="button" class="blocked-chip__remove" (click)="removeBlockedDate(blockedDate.id)">x</button>
          </ion-chip>
        </div>
      </div>

      <div class="clinic-card schedule-card">
        <div class="schedule-card__head">
          <div>
            <p class="section-label">Preview</p>
            <h2>Slot Preview</h2>
          </div>
        </div>

        <div class="preview-picker">
          <ion-input type="date" [value]="previewDate" (ionInput)="onPreviewDateInput($event)"></ion-input>
        </div>

        <ng-container *ngIf="previewDayIsBlocked">
          <ion-note class="inactive-preview-note">This date is blocked. No slots will be shown to patients.</ion-note>
        </ng-container>

        <ng-container *ngIf="!previewDayIsBlocked && !previewDayIsActive">
          <ion-note class="inactive-preview-note">No slots - this day is not active in your schedule.</ion-note>
        </ng-container>

        <ng-container *ngIf="!previewDayIsBlocked && previewDayIsActive && previewDayHasSlots">
          <app-slot-grid [slots]="previewSlots" [isLoading]="false" [selectedSlot]="null"></app-slot-grid>
        </ng-container>

        <ion-note class="inactive-preview-note" *ngIf="!previewDayIsBlocked && previewDayIsActive && !previewDayHasSlots">
          No slots generated - check your start and end times for this day.
        </ion-note>
      </div>
    </section>
  `,
  styleUrl: './doctor-schedule-editor.component.scss'
})
export class DoctorScheduleEditorComponent implements OnChanges {
  @Input() schedules: DoctorWeeklyScheduleDraft[] = [];
  @Input() blockedDates: DoctorBlockedDate[] = [];
  @Input() previewSlots: TimeSlot[] = [];
  @Input() previewDate = '';
  @Input() isSaving = false;
  @Input() dailyPatientLimit: number | string | null = null;
  @Input() previewDayIsActive = false;
  @Input() previewDayHasSlots = false;
  @Input() previewDayIsBlocked = false;

  @Output() schedulesSaved = new EventEmitter<DoctorScheduleSavePayload>();
  @Output() blockedDateAdded = new EventEmitter<{ blockedDate: string; reason: string }>();
  @Output() blockedDateRemoved = new EventEmitter<string>();
  @Output() previewDateChanged = new EventEmitter<string>();
  @Output() dirtyChanged = new EventEmitter<void>();

  draftSchedules: DoctorWeeklyScheduleDraft[] = [];
  blockedDateValue = '';
  blockedReason = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schedules']) {
      this.draftSchedules = this.schedules.map((schedule) => ({ ...schedule }));
    }
    if (changes['previewDate']) {
      this.blockedDateValue = this.blockedDateValue || '';
    }
  }

  save(): void {
    this.schedulesSaved.emit({
      schedules: this.draftSchedules.map((schedule) => ({ ...schedule })),
      dailyPatientLimit:
        this.dailyPatientLimit === null || this.dailyPatientLimit === undefined || this.dailyPatientLimit === ''
          ? null
          : Number(this.dailyPatientLimit)
    });
  }

  addBlockedDate(): void {
    const blockedDate = this.blockedDateValue.trim();
    const reason = this.blockedReason.trim();
    if (!blockedDate) {
      return;
    }
    this.dirtyChanged.emit();
    this.blockedDateAdded.emit({
      blockedDate,
      reason: reason || 'Unavailable'
    });
    this.blockedDateValue = '';
    this.blockedReason = '';
  }

  removeBlockedDate(id: string): void {
    this.dirtyChanged.emit();
    this.blockedDateRemoved.emit(id);
  }

  onPreviewDateInput(event: Event): void {
    const custom = event as CustomEvent<{ value?: string | number | null }>;
    const value = String(custom.detail?.value ?? '').trim();
    if (!value) {
      return;
    }
    this.previewDate = value;
    this.previewDateChanged.emit(value);
  }

  markDirty(): void {
    this.dirtyChanged.emit();
  }
}
