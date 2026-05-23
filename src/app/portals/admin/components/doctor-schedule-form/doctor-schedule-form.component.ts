import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DayOfWeek } from '../../../../core/models';

export interface DoctorScheduleDraft {
  dayOfWeek: DayOfWeek;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-doctor-schedule-form',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="schedule-form">
      <div class="schedule-form__row schedule-form__row--header">
        <div>Day</div>
        <div>Enabled</div>
        <div>Start</div>
        <div>End</div>
      </div>
      <div class="schedule-form__row" *ngFor="let row of rows; let i = index">
        <div class="schedule-form__day">{{ row.dayOfWeek }}</div>
        <label class="schedule-form__check">
          <input type="checkbox" [checked]="row.enabled" (change)="toggle(i, $any($event.target).checked)" />
          <span>Open</span>
        </label>
        <input type="time" [value]="row.startTime" [disabled]="!row.enabled" (change)="updateTime(i, 'startTime', $any($event.target).value)" />
        <input type="time" [value]="row.endTime" [disabled]="!row.enabled" (change)="updateTime(i, 'endTime', $any($event.target).value)" />
      </div>
    </div>
  `,
  styleUrl: './doctor-schedule-form.component.scss'
})
export class DoctorScheduleFormComponent {
  @Input() value: DoctorScheduleDraft[] = this.defaultRows();
  @Output() valueChange = new EventEmitter<DoctorScheduleDraft[]>();

  get rows(): DoctorScheduleDraft[] {
    return this.value.length ? this.value : this.defaultRows();
  }

  toggle(index: number, enabled: boolean): void {
    const next = this.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, enabled } : row));
    this.value = next;
    this.valueChange.emit(next);
  }

  updateTime(index: number, key: 'startTime' | 'endTime', value: string): void {
    const next = this.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row));
    this.value = next;
    this.valueChange.emit(next);
  }

  private defaultRows(): DoctorScheduleDraft[] {
    return [
      { dayOfWeek: 'Monday', enabled: true, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 'Tuesday', enabled: true, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 'Wednesday', enabled: true, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 'Thursday', enabled: true, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 'Friday', enabled: true, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 'Saturday', enabled: false, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 'Sunday', enabled: false, startTime: '08:00', endTime: '12:00' }
    ];
  }
}
