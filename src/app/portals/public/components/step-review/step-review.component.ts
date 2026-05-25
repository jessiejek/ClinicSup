import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { BookingWizardService } from '../../../../core/services/booking-wizard.service';
import { TimeSlotPipe } from '../../../../shared/pipes/time-slot.pipe';
import { PublicService } from '../../services/public.service';

@Component({
  selector: 'app-step-review',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, DatePipe, TimeSlotPipe],
  template: `
    <section class="wizard-panel">
      <div class="wizard-panel__header">
        <div>
          <p class="section-heading">Step 4</p>
          <h2 class="wizard-title">Review your booking</h2>
          <p class="wizard-subtitle">Take a moment to confirm the details before continuing.</p>
        </div>
      </div>

      <ng-container *ngIf="vm$ | async as vm">
        <div class="clinic-card summary-card">
          <p class="section-heading">Booking Summary</p>

          <div class="summary-row">
            <span>Doctor</span>
            <strong>{{ vm.doctorName }}</strong>
          </div>
          <div class="summary-subrow">{{ vm.doctorSpecialization }}</div>

          <div class="summary-row">
            <span>Date</span>
            <strong>{{ vm.selectedDate | date : 'MMMM d, y (EEE)' }}</strong>
          </div>

          <div class="summary-row">
            <span>Time</span>
            <strong class="data-mono"
              >{{ vm.selectedSlot | timeSlot }} - {{ vm.selectedSlotEnd | timeSlot }}</strong
            >
          </div>

          <div class="summary-row">
            <span>Services</span>
            <strong>{{ vm.serviceSummary }}</strong>
          </div>

          <div class="summary-services" *ngIf="vm.services.length > 1">
            <div class="summary-services__item" *ngFor="let service of vm.services">
              {{ service.name }}
            </div>
          </div>

          <div class="divider"></div>

          <p class="wizard-subtitle">Payment will be settled at the clinic after consultation.</p>
        </div>

        <div class="wizard-actions wizard-actions--split">
          <button type="button" class="btn-outline" (click)="goBack()">Back</button>
          <button type="button" class="btn-primary" (click)="onConfirmAndProceed()">Continue</button>
        </div>
      </ng-container>
    </section>
  `,
  styleUrl: './step-review.component.scss'
})
export class StepReviewComponent {
  private readonly wizardService = inject(BookingWizardService);
  private readonly publicService = inject(PublicService);

  vm$ = this.wizardService.state$.pipe(
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
      const fallbackServiceNames = wizard.selectedServiceIds;

      return {
        doctorName: doctor?.fullName ?? '-',
        doctorSpecialization: doctor?.specialization ?? '',
        services: selectedServices,
        serviceSummary:
          selectedServices.length > 0
            ? selectedServices.map((service) => service.name).join(', ')
            : `${fallbackServiceNames.length} service${fallbackServiceNames.length === 1 ? '' : 's'} selected`,
        selectedDate: wizard.selectedDate,
        selectedSlot: wizard.selectedSlot,
        selectedSlotEnd: wizard.selectedSlotEnd
      };
    })
  );

  onConfirmAndProceed(): void {
    this.wizardService.nextStep();
  }

  goBack(): void {
    this.wizardService.prevStep();
  }
}
