import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonInput, IonToggle } from '@ionic/angular/standalone';
import {
  DayOfWeek,
  DoctorBlockedDate,
  TimeSlot
} from '../../../../core/models';
import { SlotGridComponent } from '../../../../shared/components/slot-grid/slot-grid.component';

export interface DoctorWeeklyScheduleDraft {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
  slotDurationMinutes: number;
  slotCapacity: number;
}

@Component({
  selector: 'app-doctor-schedule-editor',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, IonInput, IonToggle, SlotGridComponent],
  template: `
    <section class="schedule-editor">
      <div class="clinic-card schedule-card">
        <div class="schedule-card__head">
          <div>
            <p class="section-label">Weekly</p>
            <h2>Schedule Editor</h2>
          </div>
          <button type="button" class="btn-primary" [disabled]="isSaving" (click)="save()">Save Schedule</button>
        </div>

        <table class="clinic-table schedule-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Active</th>
              <th>Start</th>
              <th>End</th>
              <th>Slot Duration</th>
              <th>Slot Capacity</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let draft of draftSchedules; let i = index">
              <td>{{ draft.dayOfWeek }}</td>
              <td>
                <ion-toggle
                  [name]="'active-' + i"
                  [(ngModel)]="draft.isActive"
                ></ion-toggle>
              </td>
              <td>
                <ion-input [name]="'start-' + i" type="time" [(ngModel)]="draft.startTime"></ion-input>
              </td>
              <td>
                <ion-input [name]="'end-' + i" type="time" [(ngModel)]="draft.endTime"></ion-input>
              </td>
              <td>
                <ion-input
                  [name]="'duration-' + i"
                  type="number"
                  min="5"
                  step="5"
                  [(ngModel)]="draft.slotDurationMinutes"
                ></ion-input>
              </td>
              <td>
                <ion-input
                  [name]="'capacity-' + i"
                  type="number"
                  min="1"
                  step="1"
                  [(ngModel)]="draft.slotCapacity"
                ></ion-input>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="clinic-card schedule-card">
        <div class="schedule-card__head">
          <div>
            <p class="section-label">Blocked Dates</p>
            <h2>Manage Unavailability</h2>
          </div>
        </div>

        <div class="blocked-form">
          <ion-input type="date" [(ngModel)]="blockedDateValue" placeholder="Choose date"></ion-input>
          <ion-input type="text" [(ngModel)]="blockedReason" placeholder="Reason"></ion-input>
          <button type="button" class="btn-primary" (click)="addBlockedDate()">Add Blocked Date</button>
        </div>

        <div class="blocked-list" *ngIf="blockedDates.length > 0">
          <article class="blocked-item" *ngFor="let blockedDate of blockedDates">
            <div>
              <strong>{{ blockedDate.blockedDate }}</strong>
              <p>{{ blockedDate.reason || 'Blocked date' }}</p>
            </div>
            <button type="button" class="btn-ghost" (click)="blockedDateRemoved.emit(blockedDate.id)">Remove</button>
          </article>
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
          <ion-input
            type="date"
            [value]="previewDate"
            (ionInput)="onPreviewDateInput($event)"
          ></ion-input>
        </div>

        <app-slot-grid
          [slots]="previewSlots"
          [isLoading]="false"
          [selectedSlot]="null"
        ></app-slot-grid>
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

  @Output() schedulesSaved = new EventEmitter<DoctorWeeklyScheduleDraft[]>();
  @Output() blockedDateAdded = new EventEmitter<{ blockedDate: string; reason: string }>();
  @Output() blockedDateRemoved = new EventEmitter<string>();
  @Output() previewDateChanged = new EventEmitter<string>();

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
    this.schedulesSaved.emit(this.draftSchedules.map((schedule) => ({ ...schedule })));
  }

  addBlockedDate(): void {
    const blockedDate = this.blockedDateValue.trim();
    const reason = this.blockedReason.trim();
    if (!blockedDate) {
      return;
    }
    this.blockedDateAdded.emit({
      blockedDate,
      reason: reason || 'Unavailable'
    });
    this.blockedDateValue = '';
    this.blockedReason = '';
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
}
