import { AsyncPipe, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  DoctorBlockedDate,
  DayOfWeek,
  DoctorScheduleInput,
  TimeSlot
} from '../../../core/models';
import { DoctorService } from '../services/doctor.service';
import {
  DoctorScheduleEditorComponent,
  DoctorWeeklyScheduleDraft
} from '../components/doctor-schedule-editor/doctor-schedule-editor.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

const DAY_NAMES: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  standalone: true,
  selector: 'app-doctor-schedule-page',
  imports: [AsyncPipe, NgIf, PageHeaderComponent, DoctorScheduleEditorComponent, SkeletonComponent],
  template: `
    <app-page-header title="Schedule" subtitle="Weekly availability and blocked dates"></app-page-header>

    <app-skeleton *ngIf="isLoading" variant="card" [count]="2"></app-skeleton>

    <div *ngIf="error" class="er">
      <p>Unable to load schedule. Please try again.</p>
      <button type="button" class="btn-primary" (click)="loadData()">Retry</button>
    </div>

    <ng-container *ngIf="doctorId && !isLoading && !error">
      <div class="note-banner">
        <span>Changes here affect patient booking slot availability.</span>
      </div>

      <app-doctor-schedule-editor
        [schedules]="draftSchedules"
        [blockedDates]="blockedDates"
        [previewSlots]="previewSlots"
        [previewDate]="previewDate"
        [isSaving]="isSaving"
        (schedulesSaved)="saveSchedules($event)"
        (blockedDateAdded)="addBlockedDate($event.blockedDate, $event.reason)"
        (blockedDateRemoved)="removeBlockedDate($event)"
        (previewDateChanged)="updatePreviewDate($event)"
      ></app-doctor-schedule-editor>
    </ng-container>
  `,
  styleUrl: './doctor-schedule.page.scss'
})
export class DoctorSchedulePage implements OnInit {
  private readonly doctorService = inject(DoctorService);
  private readonly toastController = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  doctorId = '';
  isLoading = true;
  error = false;
  isSaving = false;
  previewDate = new Date().toISOString().slice(0, 10);
  previewSlots: TimeSlot[] = [];
  draftSchedules: DoctorWeeklyScheduleDraft[] = [];
  blockedDates: DoctorBlockedDate[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = false;
    this.doctorService.getMyProfile().pipe(
      catchError(() => {
        this.isLoading = false;
        this.error = true;
        return [];
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((doctor) => {
      if (!doctor || !doctor.id) {
        this.isLoading = false;
        this.error = true;
        return;
      }
      this.doctorId = doctor.id;
      forkJoin([
        this.doctorService.getDoctorSchedules(doctor.id),
        this.doctorService.getDoctorBlockedDates(doctor.id)
      ]).pipe(
        catchError(() => {
          this.isLoading = false;
          this.error = true;
          return [];
        }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(([schedules, blockedDates]) => {
        this.draftSchedules = this.buildDraftSchedules(schedules, doctor.slotDurationMinutes, doctor.slotCapacity);
        this.blockedDates = blockedDates;
        this.isLoading = false;
        this.refreshPreview();
      });
    });
  }

  saveSchedules(drafts: DoctorWeeklyScheduleDraft[]): void {
    this.draftSchedules = drafts.map((d) => ({ ...d }));
    const activeSchedules = drafts
      .filter((d) => d.isActive)
      .map((d) => ({
        dayOfWeek: d.dayOfWeek,
        startTime: this.toBackendTime(d.startTime),
        endTime: this.toBackendTime(d.endTime)
      } as DoctorScheduleInput));

    this.isSaving = true;
    this.doctorService.updateSchedule(this.doctorId, activeSchedules).pipe(
      finalize(() => (this.isSaving = false)),
      catchError(() => {
        void this.presentToast('Failed to save schedule.', 'danger');
        return [];
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.refreshPreview();
      void this.presentToast('Schedule saved successfully.', 'success');
    });
  }

  addBlockedDate(blockedDate: string, reason: string): void {
    if (!this.doctorId) {
      return;
    }
    this.isSaving = true;
    this.doctorService.createBlockedDate(this.doctorId, { blockedDate, reason: reason || null }).pipe(
      finalize(() => (this.isSaving = false)),
      catchError(() => {
        void this.presentToast('Failed to add blocked date.', 'danger');
        return [];
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((record) => {
      this.blockedDates = [...this.blockedDates, record];
      this.refreshPreview();
      void this.presentToast('Blocked date added.', 'success');
    });
  }

  removeBlockedDate(id: string): void {
    if (!this.doctorId) {
      return;
    }
    this.isSaving = true;
    this.doctorService.deleteBlockedDate(this.doctorId, id).pipe(
      finalize(() => (this.isSaving = false)),
      catchError(() => {
        void this.presentToast('Failed to remove blocked date.', 'danger');
        return [];
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.blockedDates = this.blockedDates.filter((item) => item.id !== id);
      this.refreshPreview();
      void this.presentToast('Blocked date removed.', 'success');
    });
  }

  updatePreviewDate(date: string): void {
    this.previewDate = date;
    this.refreshPreview();
  }

  private buildDraftSchedules(
    schedules: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[],
    slotDurationMinutes = 30,
    slotCapacity = 1
  ): DoctorWeeklyScheduleDraft[] {
    return DAY_NAMES.map((dayOfWeek) => {
      const schedule = schedules.find((item) => item.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        startTime: schedule?.startTime ? this.toDisplayTime(schedule.startTime) : '08:00',
        endTime: schedule?.endTime ? this.toDisplayTime(schedule.endTime) : '17:00',
        isActive: !!schedule,
        slotDurationMinutes,
        slotCapacity
      };
    });
  }

  /** Convert HH:mm:ss backend format to HH:mm for the time input. */
  private toDisplayTime(time: string): string {
    return time.length >= 5 ? time.substring(0, 5) : time;
  }

  /** Ensure time is HH:mm format (strip seconds if present). */
  private toBackendTime(time: string): string {
    const trimmed = time.trim();
    // Already HH:mm
    if (trimmed.length === 5) {
      return trimmed;
    }
    // Strip :ss from HH:mm:ss
    if (trimmed.length >= 5) {
      return trimmed.substring(0, 5);
    }
    return trimmed;
  }

  private refreshPreview(): void {
    this.previewSlots = this.generatePreviewSlots(this.previewDate);
  }

  private generatePreviewSlots(date: string): TimeSlot[] {
    if (!this.doctorId || !date) {
      return [];
    }

    const previewDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(previewDate.getTime())) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (previewDate < today) {
      return [];
    }

    if (this.blockedDates.some((blockedDate) => blockedDate.blockedDate === date)) {
      return [];
    }

    const dayName = DAY_NAMES[previewDate.getDay()];
    const schedule = this.draftSchedules.find((item) => item.dayOfWeek === dayName && item.isActive);
    if (!schedule) {
      return [];
    }

    const startMinutes = this.minutesFromTime(schedule.startTime);
    const endMinutes = this.minutesFromTime(schedule.endTime);
    const duration = Math.max(5, schedule.slotDurationMinutes);
    const slots: TimeSlot[] = [];

    for (let current = startMinutes; current + duration <= endMinutes; current += duration) {
      const time = this.timeFromMinutes(current);
      const endTime = this.timeFromMinutes(current + duration);
      slots.push({
        time,
        endTime,
        status: 'available'
      });
    }

    return slots;
  }

  private minutesFromTime(time: string): number {
    const [hours, minutes] = time.split(':').map((value) => Number(value));
    return hours * 60 + minutes;
  }

  private timeFromMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private async presentToast(message: string, color: string = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
