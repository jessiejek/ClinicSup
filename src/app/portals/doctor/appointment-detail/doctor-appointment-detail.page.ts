import { AsyncPipe, CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Booking, Patient, Service } from '../../../core/models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { BookingService } from '../../../core/services/booking.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PatientMediaPanelComponent } from '../../../shared/components/patient-media-panel/patient-media-panel.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  standalone: true,
  selector: 'app-doctor-appointment-detail-page',
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    NgFor,
    NgIf,
    PageHeaderComponent,
    EmptyStateComponent,
    PatientMediaPanelComponent,
    StatusBadgeComponent
  ],
  template: `
    <ng-container *ngIf="detail$ | async as detail; else notFound">
      <section class="appointment-detail-page">
        <app-page-header
          title="Appointment Overview"
          subtitle="Review the booking before starting consultation"
          [showBackButton]="true"
          defaultBackHref="/doctor/appointments"
        ></app-page-header>

        <section class="detail-shell">
          <section class="detail-hero clinic-card">
            <div class="detail-hero__main">
              <p class="section-label">Booking Snapshot</p>
              <h2>{{ patientName(detail.patient) }}</h2>
              <p class="detail-hero__sub">
                {{ detail.booking.appointmentDate | date : 'MMMM d, y (EEE)' }} &middot;
                {{ detail.booking.slotStartTime }} - {{ detail.booking.slotEndTime }} &middot;
                Queue #{{ detail.booking.queueNumber ?? '-' }}
              </p>
              <div class="detail-hero__chips">
                <span class="detail-chip detail-chip--status"><app-status-badge [status]="detail.booking.status"></app-status-badge></span>
                <span class="detail-chip">Payment {{ detail.booking.paymentStatus || 'N/A' }}</span>
                <span class="detail-chip">{{ detail.service.name }}</span>
                <span class="detail-chip">{{ detail.service.category }}</span>
              </div>
            </div>

            <div class="detail-hero__meta">
              <div class="detail-metric">
                <span>Consultation Fee</span>
                <strong>{{ detail.booking.consultationFeeSnapshot | currency:'PHP':'symbol-narrow':'1.0-0' }}</strong>
              </div>
              <div class="detail-metric">
                <span>Service Fee</span>
                <strong>{{ detail.booking.serviceFeeSnapshot | currency:'PHP':'symbol-narrow':'1.0-0' }}</strong>
              </div>
              <div class="detail-metric">
                <span>Total Fee</span>
                <strong>{{ detail.booking.totalFee | currency:'PHP':'symbol-narrow':'1.0-0' }}</strong>
              </div>
            </div>
          </section>

          <section class="detail-grid">
            <div class="detail-main">
              <div class="clinic-card detail-card">
                <h3>Patient Info</h3>
                <div class="info-grid">
                  <div><span>Patient</span><strong>{{ patientName(detail.patient) }}</strong></div>
                  <div><span>Code</span><strong>{{ detail.patient.patientCode }}</strong></div>
                  <div><span>Contact</span><strong>{{ detail.patient.contactNumber || 'N/A' }}</strong></div>
                  <div><span>Email</span><strong>{{ detail.patient.email || 'N/A' }}</strong></div>
                </div>
              </div>

              <div class="clinic-card detail-card">
                <h3>Appointment Details</h3>
                <div class="info-grid">
                  <div><span>Date</span><strong>{{ detail.booking.appointmentDate | date : 'MMMM d, y (EEE)' }}</strong></div>
                  <div><span>Time</span><strong>{{ detail.booking.slotStartTime }} - {{ detail.booking.slotEndTime }}</strong></div>
                  <div><span>Queue #</span><strong>{{ detail.booking.queueNumber ?? '-' }}</strong></div>
                  <div><span>Payment</span><strong>{{ detail.booking.paymentStatus }}</strong></div>
                </div>
              </div>

              <div class="clinic-card detail-card">
                <h3>Service Details</h3>
                <div class="info-grid">
                  <div><span>Service</span><strong>{{ detail.service.name }}</strong></div>
                  <div><span>Category</span><strong>{{ detail.service.category }}</strong></div>
                  <div><span>Consultation Fee</span><strong>{{ detail.booking.consultationFeeSnapshot | currency:'PHP':'symbol-narrow':'1.0-0' }}</strong></div>
                  <div><span>Service Fee</span><strong>{{ detail.booking.serviceFeeSnapshot | currency:'PHP':'symbol-narrow':'1.0-0' }}</strong></div>
                </div>
              </div>

              <div class="clinic-card detail-card">
                <h3>Booking Timeline</h3>
                <div class="timeline">
                  <article class="timeline-item" *ngFor="let step of timeline(detail.booking.status)">
                    <div class="timeline-dot" [class.timeline-dot--active]="step.active"></div>
                    <div>
                      <strong>{{ step.label }}</strong>
                      <p>{{ step.description }}</p>
                    </div>
                  </article>
                </div>
              </div>

              <div class="clinic-card detail-card">
                <h3>Doctor Notes</h3>
                <p class="muted-text">Notes will be captured in the Phase 9 consultation workspace.</p>
              </div>

              <div class="clinic-card detail-card patient-uploads-section" *ngIf="detail.booking.patientId">
                <h3>Patient Uploads</h3>
                <p class="muted-text">All documents and lab results uploaded by this patient.</p>
                <div class="patient-uploads-section__panels">
                  <app-patient-media-panel
                    kind="document"
                    [patientId]="detail.booking.patientId"
                    [filterByBooking]="false"
                    [allowUpload]="false"
                    heading="Documents"
                    subheading="Referrals, certificates, prescriptions, and supporting files."
                  ></app-patient-media-panel>
                  <app-patient-media-panel
                    kind="lab-result"
                    [patientId]="detail.booking.patientId"
                    [filterByBooking]="false"
                    [allowUpload]="false"
                    heading="Lab Results"
                    subheading="Uploaded lab reports and test result files."
                  ></app-patient-media-panel>
                </div>
              </div>
            </div>

            <aside class="detail-side">
              <div class="clinic-card action-card detail-card detail-card--sticky">
                <button type="button" class="btn-primary" (click)="openConsultation(detail.booking.id)">
                  {{ consultationActionLabel(detail.booking) }}
                </button>
                <button
                  *ngIf="detail.booking.status === 'Completed'"
                  type="button"
                  class="btn-ghost"
                  (click)="openConsultation(detail.booking.id, true)"
                >
                  Edit / Amend Consultation
                </button>
                <button type="button" class="btn-ghost" (click)="back()">Back to appointments</button>
              </div>

              <div class="clinic-card detail-card">
                <h3>Payment Summary</h3>
                <div class="summary-list">
                  <div><span>Total Fee</span><strong>{{ detail.booking.totalFee | currency:'PHP':'symbol-narrow':'1.0-0' }}</strong></div>
                  <div><span>Status</span><strong>{{ detail.booking.paymentStatus }}</strong></div>
                  <div><span>Mode</span><strong>{{ detail.booking.paymentMode }}</strong></div>
                </div>
              </div>
            </aside>
          </section>
        </section>
      </section>
    </ng-container>

    <ng-template #notFound>
      <app-empty-state
        icon="document-text-outline"
        title="Appointment not available"
        description="This appointment is either unavailable or assigned to another doctor."
        ctaLabel="Back to Appointments"
        ctaRoute="/doctor/appointments"
      ></app-empty-state>
    </ng-template>
  `,
  styleUrl: './doctor-appointment-detail.page.scss'
})
export class DoctorAppointmentDetailPage implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly bookingService = inject(BookingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly detail$ = combineLatest([
    this.route.paramMap.pipe(map((paramMap) => paramMap.get('id') ?? '')),
    this.authState.currentUser$
  ]).pipe(
    switchMap(([bookingId, user]) => {
      if (!bookingId || !user) {
        return of(null);
      }

      return this.bookingService.getBookingById$(bookingId).pipe(
        map((booking) => {
          if (!booking || !isOwnedByLoggedInDoctor(booking, user.id)) {
            return null;
          }

          const patient = buildPatientFromBooking(booking);
          const service = buildFallbackService(booking);
          return { booking, patient, service };
        })
      );
    })
  );

  ngOnInit(): void {
    // Data is preloaded by the doctor portal resolver, so the detail view only needs to stay in sync.
  }

  openConsultation(bookingId: string, amend = false): void {
    void this.router.navigate(['/doctor/consultation', bookingId], amend ? { queryParams: { amend: '1' } } : undefined);
  }

  back(): void {
    void this.router.navigate(['/doctor/appointments']);
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`;
  }

  timeline(status: Booking['status']): Array<{ label: string; description: string; active: boolean }> {
    const steps = [
      { label: 'Confirmed', description: 'Booking is ready for consultation.' },
      { label: 'In Consultation', description: 'Consultation session in progress.' },
      { label: 'Completed', description: 'Visit has been completed.' }
    ];

    const activeIndex = status === 'Completed' ? 2 : status === 'Confirmed' ? 0 : -1;
    return steps.map((step, index) => ({
      ...step,
      active: index <= activeIndex
    }));
  }

  consultationActionLabel(booking: Booking): string {
    if (booking.status === 'Completed') {
      return 'View Consultation';
    }

    if (booking.status === 'CheckedIn' || booking.status === 'InProgress') {
      return 'Open Consultation';
    }

    return 'Appointment Ready';
  }
}

function buildFallbackService(booking: Booking): Service {
  return {
    id: booking.serviceId || booking.id,
    name: booking.serviceName || booking.serviceNames?.[0] || 'Service',
    description: booking.serviceNames?.join(', '),
    estimatedDurationMinutes: 0,
    price: booking.consultationFeeSnapshot ?? 0,
    category: 'Consultation',
    doctorIds: booking.doctorId ? [booking.doctorId] : []
  };
}

function isOwnedByLoggedInDoctor(
  booking: Booking,
  currentUserId: string
): boolean {
  if (!booking) {
    return false;
  }

  if (booking.doctor?.userId && booking.doctor.userId === currentUserId) {
    return true;
  }

  if (booking.doctorId && booking.doctor?.id && booking.doctorId === booking.doctor.id) {
    return true;
  }

  return false;
}

function buildPatientFromBooking(booking: Booking): Patient {
  const fullName = booking.patientName?.trim() ?? booking.patient?.fullName?.trim() ?? '';
  const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);

  return {
    id: booking.patientId,
    patientCode: booking.patient?.patientCode ?? booking.patientId,
    firstName: booking.patient?.firstName ?? firstName ?? 'Patient',
    middleName: booking.patient?.middleName,
    lastName: booking.patient?.lastName ?? rest.join(' '),
    dateOfBirth: booking.patient?.dateOfBirth ?? '',
    sex: booking.patient?.sex ?? '',
    contactNumber: booking.patient?.contactNumber,
    email: booking.patient?.email,
    isGuest: Boolean(booking.patient?.isGuest)
  };
}
