import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { IonSpinner, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline } from 'ionicons/icons';
import { catchError, combineLatest, distinctUntilChanged, finalize, of, switchMap, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingWizardService } from '../../../../core/services/booking-wizard.service';
import { ClinicDashboardRealtimeService } from '../../../../core/services/clinic-dashboard-realtime.service';
import { TimeSlotPipe } from '../../../../shared/pipes/time-slot.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AvailableSlot, PublicService } from '../../services/public.service';

@Component({
  selector: 'app-step-slot-select',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, DatePipe, IonSpinner, TimeSlotPipe, EmptyStateComponent],
  template: `
    <section class="wizard-panel">
      <div class="wizard-panel__header">
        <div>
          <p class="section-heading">Step 3</p>
          <h2 class="wizard-title">Select your preferred time</h2>
          <p class="wizard-subtitle">Choose an available slot to reserve it for 10 minutes.</p>
        </div>
      </div>

      <ng-container *ngIf="selectedDate$ | async as selectedDate; else noDateState">
        <div class="slot-loading" *ngIf="isLoading">
          <ion-spinner name="crescent"></ion-spinner>
        </div>

        <ng-container *ngIf="!isLoading">
          <h3 class="slot-heading">Available Slots for {{ selectedDate | date : 'MMMM d, yyyy' }}</h3>

          <ng-container *ngIf="slots.length > 0; else noSlotsState">
            <div class="slot-chip-grid">
              <button
                *ngFor="let slot of slots"
                type="button"
                class="slot-chip"
                [class.slot-chip--selected]="slot.slotStartTime === latestSelectedSlot"
                [class.slot-chip--full]="isSlotUnavailable(selectedDate, slot)"
                [disabled]="isSlotUnavailable(selectedDate, slot)"
                (click)="selectSlot(slot)"
              >
                <span class="slot-chip__time"
                  >{{ slot.slotStartTime | timeSlot }} - {{ slot.slotEndTime | timeSlot }}</span
                >
                <span class="slot-chip__label" *ngIf="isSlotUnavailable(selectedDate, slot)">
                  {{ getUnavailableLabel(selectedDate, slot) }}
                </span>
              </button>
            </div>
          </ng-container>

          <ng-template #noSlotsState>
            <div class="slot-empty">No available slots for this date.</div>
          </ng-template>
        </ng-container>
      </ng-container>

      <div class="wizard-actions wizard-actions--split">
        <button type="button" class="btn-outline" (click)="goBack()">Back</button>
        <button type="button" class="btn-primary" [disabled]="!latestSelectedSlot" (click)="goNext()">
          Continue
        </button>
      </div>

      <ng-template #noDateState>
        <app-empty-state
          icon="calendar-outline"
          title="Select a date first"
          description="Please go back and choose a doctor and appointment date before picking a time."
        ></app-empty-state>
      </ng-template>
    </section>
  `,
  styleUrl: './step-slot-select.component.scss'
})
export class StepSlotSelectComponent implements OnInit {
  private readonly wizardService = inject(BookingWizardService);
  private readonly publicService = inject(PublicService);
  private readonly realtime = inject(ClinicDashboardRealtimeService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  selectedDoctorId$ = this.wizardService.selectedDoctorId$;
  selectedDate$ = this.wizardService.selectedDate$;
  selectedSlot$ = this.wizardService.selectedSlot$;

  slots: AvailableSlot[] = [];
  isLoading = false;
  latestSelectedSlot: string | null = null;
  private latestSelectedDate: string | null = null;
  private manilaClock = getManilaClock();

  constructor() {
    addIcons({ calendarOutline });
  }

  ngOnInit(): void {
    void this.realtime.ensureConnected();
    this.selectedSlot$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((selectedSlot) => {
      this.latestSelectedSlot = selectedSlot;
    });

    this.selectedDate$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((selectedDate) => {
      this.latestSelectedDate = selectedDate;
      this.clearInvalidSelectedSlot();
    });

    combineLatest([this.selectedDoctorId$, this.selectedDate$])
      .pipe(
        distinctUntilChanged(
          ([prevDoctorId, prevDate], [doctorId, date]) => prevDoctorId === doctorId && prevDate === date
        ),
        switchMap(([doctorId, date]) => {
          if (!doctorId || !date) {
            this.slots = [];
            this.isLoading = false;
            return of([] as AvailableSlot[]);
          }

          this.isLoading = true;
          return this.loadAvailableSlots(doctorId, date);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((slots) => {
        this.slots = slots;
        this.clearInvalidSelectedSlot();
      });

    timer(0, 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.manilaClock = getManilaClock();
        this.clearInvalidSelectedSlot();
      });

    this.realtime.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (
          event.eventName === 'DoctorScheduleUpdated' &&
          this.wizardService.snapshot.selectedDoctorId &&
          this.wizardService.snapshot.selectedDate &&
          (!event.doctorId || event.doctorId === this.wizardService.snapshot.selectedDoctorId)
        ) {
          this.isLoading = true;
          this.loadAvailableSlots(
            this.wizardService.snapshot.selectedDoctorId,
            this.wizardService.snapshot.selectedDate
          ).subscribe((slots) => {
            this.slots = slots;
            this.clearInvalidSelectedSlot();
          });
        }
      });
  }

  selectSlot(slot: AvailableSlot): void {
    if (!this.isSlotSelectable(this.latestSelectedDate, slot)) {
      return;
    }

    this.wizardService.selectSlot(slot.slotStartTime, slot.slotEndTime);
  }

  goBack(): void {
    this.wizardService.prevStep();
  }

  goNext(): void {
    this.wizardService.nextStep();
  }

  isSlotUnavailable(selectedDate: string | null, slot: AvailableSlot): boolean {
    return !this.isSlotSelectable(selectedDate, slot);
  }

  getUnavailableLabel(selectedDate: string | null, slot: AvailableSlot): string {
    if (this.isPastSlot(selectedDate, slot)) {
      return 'Past';
    }

    return 'Full';
  }

  private clearInvalidSelectedSlot(): void {
    if (!this.latestSelectedSlot || !this.latestSelectedDate) {
      return;
    }

    const matchingSlot = this.slots.find((slot) => slot.slotStartTime === this.latestSelectedSlot);
    if (!matchingSlot || !this.isSlotSelectable(this.latestSelectedDate, matchingSlot)) {
      this.wizardService.selectSlot(null, null);
      this.latestSelectedSlot = null;
    }
  }

  private isSlotSelectable(selectedDate: string | null, slot: AvailableSlot): boolean {
    if (!selectedDate) {
      return false;
    }

    if (!slot.isAvailable) {
      return false;
    }

    if (this.isDateInPastInManila(selectedDate)) {
      return false;
    }

    if (!this.isDateTodayInManila(selectedDate)) {
      return true;
    }

    const slotEndMinutes = this.getSlotEndMinutes(slot);
    return slotEndMinutes !== null && slotEndMinutes > this.manilaClock.minutes;
  }

  private isPastSlot(selectedDate: string | null, slot: AvailableSlot): boolean {
    if (!selectedDate) {
      return true;
    }

    if (this.isDateInPastInManila(selectedDate)) {
      return true;
    }

    if (!this.isDateTodayInManila(selectedDate)) {
      return false;
    }

    const slotEndMinutes = this.getSlotEndMinutes(slot);
    return slotEndMinutes === null || slotEndMinutes <= this.manilaClock.minutes;
  }

  private isDateTodayInManila(selectedDate: string): boolean {
    return selectedDate === this.manilaClock.isoDate;
  }

  private isDateInPastInManila(selectedDate: string): boolean {
    return selectedDate < this.manilaClock.isoDate;
  }

  private getSlotEndMinutes(slot: AvailableSlot): number | null {
    return parseTimeToMinutes(slot.slotEndTime || slot.slotStartTime);
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

  private loadAvailableSlots(doctorId: string, date: string) {
    return this.publicService.getAvailableSlots(doctorId, date).pipe(
      catchError((error: unknown) => {
        void this.presentToast(extractApiErrorMessage(error, 'Failed to load available slots.'));
        return of([] as AvailableSlot[]);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    );
  }
}

interface ManilaClock {
  isoDate: string;
  minutes: number;
}

function getManilaClock(date = new Date()): ManilaClock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '0';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = Number(getPart('hour'));
  const minute = Number(getPart('minute'));

  return {
    isoDate: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute
  };
}

function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const [hourText, minuteText = '0'] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
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
