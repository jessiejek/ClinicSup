import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Booking, Patient, Service } from '../../../core/models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { BookingService } from '../../../core/services/booking.service';
import { DoctorStateService } from '../../../core/services/doctor-state.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { PatientStateService } from '../../../core/services/patient-state.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

interface ConsultationVm {
  booking: Booking;
  patient: Patient;
  service: Service;
}

@Component({
  standalone: true,
  selector: 'app-doctor-consultation-stub-page',
imports: [AsyncPipe, DatePipe, NgIf, PageHeaderComponent, EmptyStateComponent],
  template: `
    <ng-container *ngIf="detail$ | async as detail; else notFound">
      <app-page-header
        title="Consultation Form"
        subtitle="Phase 9 placeholder"
        [showBackButton]="true"
        defaultBackHref="/doctor/appointments"
      ></app-page-header>

      <section class="clinic-card summary-grid">
        <div>
          <p class="section-label">Booking Summary</p>
          <h3>{{ detail.booking.id }}</h3>
          <p>{{ detail.booking.appointmentDate | date:'MMMM d, y (EEE)' }} {{ detail.booking.slotStartTime }}</p>
          <p>{{ detail.booking.status }} • {{ detail.booking.paymentStatus }}</p>
        </div>
        <div>
          <p class="section-label">Patient Summary</p>
          <h3>{{ detail.patient.firstName }} {{ detail.patient.lastName }}</h3>
          <p>{{ detail.patient.patientCode }}</p>
          <p>{{ detail.patient.contactNumber || 'No contact number' }}</p>
        </div>
      </section>

      <app-empty-state
        icon="document-text-outline"
        title="Consultation Form — Phase 9"
        description="SOAP notes, vital signs, diagnosis, prescriptions, labs, and follow-up scheduling will be implemented in Phase 9."
      ></app-empty-state>

      <div class="actions">
        <button type="button" class="btn-primary" (click)="backToAppointment(detail.booking.id)">Back to Appointment</button>
      </div>
    </ng-container>

    <ng-template #notFound>
      <app-empty-state
        icon="document-text-outline"
        title="Consultation unavailable"
        description="This consultation stub is only available for your own appointments."
        ctaLabel="Back to Appointments"
        ctaRoute="/doctor/appointments"
      ></app-empty-state>
    </ng-template>
  `,
  styleUrl: './doctor-consultation-stub.page.scss'
})
export class DoctorConsultationStubPage implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly bookingService = inject(BookingService);
  private readonly doctorState = inject(DoctorStateService);
  private readonly patientState = inject(PatientStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mockData = inject(MockDataService);

  readonly detail$ = combineLatest([
    this.route.paramMap.pipe(map((paramMap) => paramMap.get('id') ?? '')),
    this.authState.currentUser$
  ]).pipe(
    switchMap(([bookingId, user]) =>
      bookingId && user
        ? combineLatest([
            this.bookingService.getBookingById$(bookingId),
            this.doctorState.getDoctorByUserId(user.id),
            this.patientState.getPatients()
          ])
        : of([undefined, undefined, []] as const)
    ),
    map(([booking, doctor, patients]) => {
      if (!booking || !doctor || booking.doctorId !== doctor.id) {
        return null;
      }
      const patient = patients.find((item) => item.id === booking.patientId);
      const service = this.mockData.getServiceById(booking.serviceId);
      if (!patient || !service) {
        return null;
      }
      return { booking, patient, service };
    })
  );

  ngOnInit(): void {
    // Stub only. The detail view is read-only until Phase 9.
  }

  backToAppointment(bookingId: string): void {
    void this.router.navigate(['/doctor/appointments', bookingId]);
  }
}
