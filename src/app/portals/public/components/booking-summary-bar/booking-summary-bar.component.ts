import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { BookingWizardService } from '../../../../core/services/booking-wizard.service';
import { TimeSlotPipe } from '../../../../shared/pipes/time-slot.pipe';
import { PublicService } from '../../services/public.service';

@Component({
  selector: 'app-booking-summary-bar',
  standalone: true,
  imports: [NgIf, AsyncPipe, DatePipe, TimeSlotPipe],
  template: `
    <div class="summary-bar" *ngIf="(currentStep$ | async)! >= 2">
      <ng-container *ngIf="summary$ | async as summary">
        <div class="summary-bar__items">
          <div class="summary-bar__item" *ngIf="summary.doctorName">
            <span class="summary-bar__label">Doctor</span>
            <span class="summary-bar__value">{{ summary.doctorName }}</span>
          </div>
          <div class="summary-bar__divider" *ngIf="summary.doctorName && summary.servicesLabel"></div>
          <div class="summary-bar__item" *ngIf="summary.servicesLabel">
            <span class="summary-bar__label">Services</span>
            <span class="summary-bar__value">{{ summary.servicesLabel }}</span>
          </div>
          <div class="summary-bar__divider" *ngIf="summary.servicesLabel && summary.selectedDate"></div>
          <div class="summary-bar__item" *ngIf="summary.selectedDate">
            <span class="summary-bar__label">Date</span>
            <span class="summary-bar__value">{{ summary.selectedDate | date : 'MMM d' }}</span>
          </div>
          <div class="summary-bar__divider" *ngIf="summary.selectedDate && summary.selectedSlot"></div>
          <div class="summary-bar__item" *ngIf="summary.selectedSlot">
            <span class="summary-bar__label">Time</span>
            <span class="summary-bar__value data-mono"
              >{{ summary.selectedSlot | timeSlot }} - {{ summary.selectedSlotEnd | timeSlot }}</span
            >
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styleUrl: './booking-summary-bar.component.scss'
})
export class BookingSummaryBarComponent {
  private readonly wizardService = inject(BookingWizardService);
  private readonly publicService = inject(PublicService);

  wizard$ = this.wizardService.state$;
  currentStep$ = this.wizardService.currentStep$;

  summary$ = this.wizard$.pipe(
    switchMap((wizard) =>
      combineLatest([
        of(wizard),
        this.publicService.getDoctors().pipe(catchError(() => of([]))),
        wizard.selectedDoctorId
          ? this.publicService.getDoctorServices(wizard.selectedDoctorId).pipe(catchError(() => of([])))
          : of([])
      ])
    ),
    map(([wizard, doctors, services]) => {
      const doctor = wizard.selectedDoctorId ? doctors.find((item) => item.id === wizard.selectedDoctorId) : null;
      const selectedServices = services.filter((service) => wizard.selectedServiceIds.includes(service.id));

      return {
        doctorName: doctor?.fullName ?? '',
        servicesLabel:
          selectedServices.length > 0
            ? selectedServices.map((service) => service.name).join(', ')
            : '',
        selectedDate: wizard.selectedDate,
        selectedSlot: wizard.selectedSlot,
        selectedSlotEnd: wizard.selectedSlotEnd
      };
    })
  );
}
