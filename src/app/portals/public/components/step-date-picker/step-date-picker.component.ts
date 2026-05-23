import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { IonIcon, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { Subscription, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DayOfWeek, DoctorSchedule } from '../../../../core/models';
import { BookingWizardService } from '../../../../core/services/booking-wizard.service';
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
  private readonly publicService = inject(PublicService);
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
        this.publicService
          .getDoctorSchedules(doctorId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (schedules) => {
              this.schedules = schedules;
              this.isLoading = false;
            },
            error: (error: unknown) => {
              this.schedules = [];
              this.isLoading = false;
              void this.presentToast(extractApiErrorMessage(error, 'Failed to load available dates.'));
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
    const today = this.startOfDay(new Date());
    return this.toIsoDate(date) === this.toIsoDate(today);
  }

  isPast(date: Date): boolean {
    return this.startOfDay(date).getTime() < this.startOfDay(new Date()).getTime();
  }

  isWorkingDay(doctorId: string, date: Date): boolean {
    const dayOfWeek = this.dayNames()[date.getDay()].toLowerCase();
    return this.schedules.some((schedule) => schedule.dayOfWeek.toLowerCase() === dayOfWeek);
  }

  isSelected(date: Date): boolean {
    return this.latestSelectedDate === this.toIsoDate(date);
  }

  isSelectable(doctorId: string, date: Date): boolean {
    return !this.isPast(date) && this.isWorkingDay(doctorId, date);
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private dayNames(): DayOfWeek[] {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
