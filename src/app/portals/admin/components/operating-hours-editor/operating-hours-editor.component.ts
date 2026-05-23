import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DaySchedule, OperatingHours } from '../../../../core/models';

interface DayRow {
  day: keyof OperatingHours;
  label: string;
}

@Component({
  selector: 'app-operating-hours-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor, NgIf],
  template: `
    <div class="hours-editor">
      <div class="hours-editor__row hours-editor__header">
        <span>Day</span>
        <span>Status</span>
        <span>Open</span>
        <span>Close</span>
      </div>

      <div
        class="hours-editor__row"
        *ngFor="let row of dayRows"
        [class.is-closed]="!hoursSnapshot[row.day].isOpen"
      >
        <strong>{{ row.label }}</strong>
        <label class="toggle-wrap">
          <input
            type="checkbox"
            [ngModel]="hoursSnapshot[row.day].isOpen"
            (ngModelChange)="setOpen(row.day, $event)"
          />
          <span>{{ hoursSnapshot[row.day].isOpen ? 'Open' : 'Closed' }}</span>
        </label>
        <input
          type="time"
          class="time-input"
          [ngModel]="hoursSnapshot[row.day].openTime"
          [disabled]="!hoursSnapshot[row.day].isOpen"
          (ngModelChange)="setTime(row.day, 'openTime', $event)"
        />
        <input
          type="time"
          class="time-input"
          [ngModel]="hoursSnapshot[row.day].closeTime"
          [disabled]="!hoursSnapshot[row.day].isOpen"
          (ngModelChange)="setTime(row.day, 'closeTime', $event)"
        />
        <small class="hours-editor__error" *ngIf="hoursSnapshot[row.day].isOpen && !isRangeValid(row.day)">
          Close time must be later than open time.
        </small>
      </div>
    </div>
  `,
  styleUrl: './operating-hours-editor.component.scss'
})
export class OperatingHoursEditorComponent implements OnChanges {
  @Input({ required: true }) hours!: OperatingHours;
  @Output() hoursChange = new EventEmitter<OperatingHours>();

  readonly dayRows: DayRow[] = [
    { day: 'monday', label: 'Monday' },
    { day: 'tuesday', label: 'Tuesday' },
    { day: 'wednesday', label: 'Wednesday' },
    { day: 'thursday', label: 'Thursday' },
    { day: 'friday', label: 'Friday' },
    { day: 'saturday', label: 'Saturday' },
    { day: 'sunday', label: 'Sunday' }
  ];

  hoursSnapshot: OperatingHours = this.emptyHours();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['hours'] && this.hours) {
      this.hoursSnapshot = this.cloneHours(this.hours);
    }
  }

  setOpen(day: keyof OperatingHours, isOpen: boolean): void {
    this.hoursSnapshot = {
      ...this.hoursSnapshot,
      [day]: {
        ...this.hoursSnapshot[day],
        isOpen,
        openTime: isOpen ? this.hoursSnapshot[day].openTime || '08:00' : '00:00',
        closeTime: isOpen ? this.hoursSnapshot[day].closeTime || '17:00' : '00:00'
      }
    };
    this.emit();
  }

  setTime(day: keyof OperatingHours, key: keyof DaySchedule, value: string): void {
    this.hoursSnapshot = {
      ...this.hoursSnapshot,
      [day]: {
        ...this.hoursSnapshot[day],
        [key]: value
      }
    };
    this.emit();
  }

  isRangeValid(day: keyof OperatingHours): boolean {
    const schedule = this.hoursSnapshot[day];
    if (!schedule.isOpen) {
      return true;
    }
    return this.toMinutes(schedule.closeTime) > this.toMinutes(schedule.openTime);
  }

  private emit(): void {
    this.hoursChange.emit(this.cloneHours(this.hoursSnapshot));
  }

  private toMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map((part) => Number(part));
    return hours * 60 + minutes;
  }

  private cloneHours(hours: OperatingHours): OperatingHours {
    return {
      monday: { ...hours.monday },
      tuesday: { ...hours.tuesday },
      wednesday: { ...hours.wednesday },
      thursday: { ...hours.thursday },
      friday: { ...hours.friday },
      saturday: { ...hours.saturday },
      sunday: { ...hours.sunday }
    };
  }

  private emptyHours(): OperatingHours {
    const closed: DaySchedule = { isOpen: false, openTime: '00:00', closeTime: '00:00' };
    return {
      monday: { ...closed },
      tuesday: { ...closed },
      wednesday: { ...closed },
      thursday: { ...closed },
      friday: { ...closed },
      saturday: { ...closed },
      sunday: { ...closed }
    };
  }
}
