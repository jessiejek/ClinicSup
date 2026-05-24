import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { IonIcon, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { Subscription, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DoctorSchedule } from '../../../../core/models';
import { BookingWizardService } from '../../../../core/services/booking-wizard.service';
import { BookingAvailabilityService, WorkingDay } from '../../services/booking-availability.service';
import { PublicService } from '../../services/public.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-step-date-picker',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, DatePipe, IonIcon, IonSpinner, EmptyStateComponent],
  template: `
    <section class="wizard-panel">
      <div class="wizard-panel__header">
        <div>
          <p class="section-heading">Step 2</p>
          <h2 class="wizard-title">Select your appointment date</h2>
          <p class="wizard-subtitle">Choose a working day that matches the doctor&apos;s schedule.</p>
        </div>
      </div>

      <ng-container *ngIf="selectedDoctorId$ | async as doctorId; else noDoctorState">
        <div class="calendar-loading" *ngIf="isLoading">
          <ion-spinner name="crescent"></ion-spinner>
        </div>

        <ng-container *ngIf="!isLoading">
          <div class="calendar clinic-card">
            <div class="calendar-header">
              <button
                type="button"
                class="btn-icon"
                [disabled]="isCurrentMonth"
                (click)="prevMonth()"
              >
                <ion-icon name="chevron-back-outline"></ion-icon>
              </button>
              <div class="calendar-header__title">{{ currentMonth | date : 'MMMM yyyy' }}</div>
              <button type="button" class="btn-icon" (click)="nextMonth()">
                <ion-icon name="chevron-forward-outline"></ion-icon>
              </button>
            </div>

            <div class="calendar-grid">
              <div class="calendar-day-label" *ngFor="let label of weekdayLabels">{{ label }}</div>

              <ng-container *ngFor="let cell of calendarCells">
                <button
                  *ngIf="cell.date; else emptyCell"
                type="button"
                class="calendar-cell"
                [class.calendar-cell--working]="isWorkingDay(doctorId, cell.date)"
                [class.calendar-cell--selected]="isSelected(cell.date)"
                [class.calendar-cell--today]="isToday(cell.date)"
                [class.calendar-cell--disabled]="isPast(cell.date) || !isWorkingDay(doctorId, cell.date)"
                [disabled]="!isSelectable(doctorId, cell.date)"
                (click)="onDayClick(doctorId, cell.date)"
              >
                {{ cell.date.getDate() }}
                </button>
                <ng-template #emptyCell>
                  <div class="calendar-cell calendar-cell--empty"></div>
                </ng-template>
              </ng-container>
            </div>
          </div>

          <div class="wizard-actions wizard-actions--split">
            <button type="button" class="btn-outline" (click)="goBack()">Back</button>
            <button type="button" class="btn-primary" [disabled]="!(selectedDate$ | async)" (click)="goNext()">
              Continue
            </button>
          </div>
        </ng-container>
      </ng-container>

      <ng-template #noDoctorState>
        <app-empty-state
          icon="medical-outline"
          title="Select a doctor first"
          description="Please go back and choose a doctor before picking a date."
        ></app-empty-state>
      </ng-template>
    </section>
  `,
  styleUrl: './step-date-picker.component.scss'
})
export class StepDatePickerComponent implements OnInit {
  private readonly wizardService = inject(BookingWizardService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);
  private readonly subscriptions = new Subscription();

  currentMonth = this.startOfMonth(new Date());

  selectedDoctorId$ = this.wizardService.selectedDoctorId$;
  selectedDate$ = this.wizardService.selectedDate$;
  private latestSelectedDate: string | null = null;

  weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  isLoading = false;
  private schedules: DoctorSchedule[] = [];
  private workingDays: WorkingDay[] = [];
  private readonly availabilityService = inject(BookingAvailabilityService);

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline });
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.selectedDate$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((selectedDate) => {
        this.latestSelectedDate = selectedDate;
      })
    );

    this.subscriptions.add(
      this.selectedDoctorId$.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((doctorId) => {
        if (!doctorId) {
          this.schedules = [];
          this.isLoading = false;
          return;
        }

        this.isLoading = true;
        this.availabilityService
          .getDoctorWorkingDays(doctorId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (workingDays) => {
              this.workingDays = workingDays;
              this.schedules = workingDays.map((wd) => ({
                id: '',
                doctorId,
                dayOfWeek: wd.dayOfWeek,
                startTime: wd.startTime,
                endTime: wd.endTime
              }));
              this.isLoading = false;

              if (workingDays.length === 0) {
                console.warn('[StepDatePicker] Doctor has no working days defined.');
              } else {
                this.autoSelectDate(doctorId);
              }
            },
            error: (error: unknown) => {
              this.workingDays = [];
              this.schedules = [];
              this.isLoading = false;
              void this.presentToast(extractApiErrorMessage(error, 'Failed to load availability.'));
            }
          });
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get isCurrentMonth(): boolean {
    const now = this.startOfMonth(new Date());
    return this.currentMonth.getFullYear() === now.getFullYear() && this.currentMonth.getMonth() === now.getMonth();
  }

  get calendarCells(): Array<{ date: Date | null }> {
    const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const daysInMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      0
    ).getDate();
    const lead = (firstDay.getDay() + 6) % 7;
    const cells: Array<{ date: Date | null }> = [];

    for (let i = 0; i < lead; i++) {
      cells.push({ date: null });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), day) });
    }

    return cells;
  }

  prevMonth(): void {
    if (this.isCurrentMonth) {
      return;
    }
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
  }

  onDayClick(doctorId: string, date: Date): void {
    if (!this.isSelectable(doctorId, date)) {
      return;
    }

    this.wizardService.selectDate(this.toIsoDate(date));
  }

  goBack(): void {
    this.wizardService.prevStep();
  }

  goNext(): void {
    this.wizardService.nextStep();
  }

  isToday(date: Date): boolean {
    return this.availabilityService.isManilaToday(this.toIsoDate(date));
  }

  isPast(date: Date): boolean {
    return this.availabilityService.isManilaPast(this.toIsoDate(date));
  }

  isWorkingDay(doctorId: string, date: Date): boolean {
    const dayOfWeek = this.availabilityService.getManilaDayOfWeek(this.toIsoDate(date)).toLowerCase();
    return this.schedules.some((schedule) => schedule.dayOfWeek.toLowerCase() === dayOfWeek);
  }

  isSelected(date: Date): boolean {
    return this.latestSelectedDate === this.toIsoDate(date);
  }

  isSelectable(doctorId: string, date: Date): boolean {
    return !this.isPast(date) && this.isWorkingDay(doctorId, date);
  }

  /**
   * Auto-select the first valid working date when Step 2 loads:
   * 1. Prefer today if it is a working day and not in the past.
   * 2. Otherwise, find the next working day within the next 60 days.
   */
  private autoSelectDate(doctorId: string): void {
    const todayIso = this.availabilityService.getManilaTodayIso();

    // Check if today is valid (working day, not past)
    if (this.isSelectable(doctorId, this.parseIsoDate(todayIso))) {
      this.wizardService.selectDate(todayIso);
      return;
    }

    // Find the next valid working day within 60 days
    const maxLookahead = 60;
    for (let offset = 1; offset <= maxLookahead; offset++) {
      const nextDate = this.availabilityService.getManilaDateOffset(offset);
      if (this.isSelectable(doctorId, this.parseIsoDate(nextDate))) {
        this.wizardService.selectDate(nextDate);
        return;
      }
    }
  }

  private parseIsoDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2400,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const body = (error as { error?: unknown }).error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
