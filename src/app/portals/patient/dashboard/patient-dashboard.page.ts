import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, checkmarkCircleOutline, medkitOutline, receiptOutline } from 'ionicons/icons';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { AuthUser, Booking, Consultation, Doctor, Patient, Prescription } from '../../../core/models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { BookingService } from '../../../core/services/booking.service';
import { ClinicSettingsService } from '../../../core/services/clinic-settings.service';
import { DoctorStateService } from '../../../core/services/doctor-state.service';
import { MedicalRecordsService } from '../../../core/services/medical-records.service';
import { BannerComponent } from '../../../shared/components/banner/banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { DoctorCardComponent } from '../../public/components/doctor-card/doctor-card.component';
import { PatientService } from '../services/patient.service';
import { MedicalRecordCardComponent } from '../components/medical-record-card/medical-record-card.component';
import { PrescriptionCardComponent } from '../components/prescription-card/prescription-card.component';
import { UpcomingAppointmentCardComponent } from '../components/upcoming-appointment-card/upcoming-appointment-card.component';

interface DashboardVm {
  user: AuthUser | null;
  patient: Patient | undefined;
  upcomingBookings: Booking[];
  pendingProofBookings: Booking[];
  consultations: Consultation[];
  prescriptions: Prescription[];
  doctors: Doctor[];
  latestBooking?: Booking;
  latestBookingDoctor?: Doctor;
  recentConsultations: Array<{ consultation: Consultation; doctor?: Doctor }>;
  recentPrescriptions: Array<{ prescription: Prescription; doctor?: Doctor }>;
  showEmailWarning: boolean;
  showConsentWarning: boolean;
  upcomingCount: number;
  pendingProofCount: number;
  completedVisitCount: number;
  activePrescriptionCount: number;
}

@Component({
    selector: 'app-patient-dashboard-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    NgFor,
    NgIf,
    RouterLink,
    IonIcon,
    BannerComponent,
    EmptyStateComponent,
    DoctorCardComponent,
    UpcomingAppointmentCardComponent,
    MedicalRecordCardComponent,
    PrescriptionCardComponent
  ],
  template: `
    <section class="page-shell" *ngIf="vm$ | async as vm; else loadingTpl">
            <div class="dashboard-hero">
        <div class="dashboard-hero__content">
              <h2 class="page-title">Welcome back, {{ vm.patient?.firstName || getWelcomeName(vm.user) || 'Juan' }}</h2>
          <p class="page-subtitle">View your appointments, documents, prescriptions, and medical records in one place.</p>
          <div class="dashboard-hero__actions">
            <button type="button" class="btn-primary" routerLink="/patient/doctors">
              Book Appointment
            </button>
            <button type="button" class="btn-outline" routerLink="/patient/bookings">
              View My Bookings
            </button>
          </div>
        </div>
      </div>

      <div class="dashboard-banners">
        <app-banner
          *ngIf="vm.showEmailWarning"
          variant="warning"
          message="Your email is not verified. Some notifications may not be delivered."
        ></app-banner>

        <div class="dashboard-banner-row" *ngIf="vm.showConsentWarning">
          <app-banner
            variant="info"
            message="Please review and accept the latest privacy consent."
          ></app-banner>
          <button type="button" class="btn-outline" routerLink="/patient/privacy-consent" aria-label="Review and accept privacy consent">
            Review Consent
          </button>
        </div>
      </div>

            <div class="stats-grid">
        <div class="stat-card stat-card--blue">
          <ion-icon name="calendar-outline" class="stat-card__icon"></ion-icon>
          <div class="stat-card__value">{{ vm.upcomingCount }}</div>
          <div class="stat-card__label">Upcoming Appointments</div>
        </div>
        <div class="stat-card stat-card--amber">
          <ion-icon name="receipt-outline" class="stat-card__icon"></ion-icon>
          <div class="stat-card__value">{{ vm.pendingProofCount }}</div>
          <div class="stat-card__label">Pending Payment Proof</div>
        </div>
        <div class="stat-card stat-card--green">
          <ion-icon name="checkmark-circle-outline" class="stat-card__icon"></ion-icon>
          <div class="stat-card__value">{{ vm.completedVisitCount }}</div>
          <div class="stat-card__label">Completed Visits</div>
        </div>
        <div class="stat-card stat-card--red">
          <ion-icon name="medkit-outline" class="stat-card__icon"></ion-icon>
          <div class="stat-card__value">{{ vm.activePrescriptionCount }}</div>
          <div class="stat-card__label">Active Prescriptions</div>
        </div>
      </div>

            <div class="dashboard-section">
        <div class="section-heading section-heading--with-action">
          <span>Book With a Doctor</span>
          <a class="section-action-link" routerLink="/patient/doctors">View all doctors &rarr;</a>
        </div>
        <div class="dashboard-doctors" *ngIf="vm.doctors.length > 0; else noDoctorsTpl">
          <app-doctor-card *ngFor="let doctor of vm.doctors" [doctor]="doctor"></app-doctor-card>
        </div>
        <ng-template #noDoctorsTpl>
          <app-empty-state
            icon="medical-outline"
            title="No doctors available"
            description="Please check back later for available providers."
            ctaLabel="Browse Doctors"
            ctaRoute="/patient/doctors"
          ></app-empty-state>
        </ng-template>
      </div>

      <div class="dashboard-section" *ngIf="vm.latestBooking; else noUpcomingTpl">
        <app-upcoming-appointment-card
          [booking]="vm.latestBooking"
          [doctor]="vm.latestBookingDoctor"
          [canSubmitProof]="canSubmitProof(vm.latestBooking)"
          [canCancel]="false"
          (viewDetails)="openBooking($event)"
          (submitProof)="openBooking($event)"
        ></app-upcoming-appointment-card>
      </div>
      <ng-template #noUpcomingTpl>
        <app-empty-state
          icon="calendar-outline"
          title="No upcoming appointment"
          description="Your next booking will appear here once it is scheduled."
          ctaLabel="Browse Doctors"
          ctaRoute="/patient/doctors"
        ></app-empty-state>
      </ng-template>

      <div class="dashboard-grid">
        <div class="dashboard-panel">
          <div class="section-heading">Recent Medical Records</div>
          <ng-container *ngIf="vm.recentConsultations.length > 0; else noRecordsTpl">
            <app-medical-record-card
              *ngFor="let item of vm.recentConsultations"
              [consultation]="item.consultation"
              [doctor]="item.doctor"
              (viewDetails)="showPhaseNineToast()"
            ></app-medical-record-card>
          </ng-container>
          <ng-template #noRecordsTpl>
            <app-empty-state
              icon="document-text-outline"
              title="No medical records yet"
              description="Your completed consultations will appear here."
            ></app-empty-state>
          </ng-template>
        </div>

        <div class="dashboard-panel">
          <div class="section-heading">Recent Prescriptions</div>
          <ng-container *ngIf="vm.recentPrescriptions.length > 0; else noRxTpl">
            <app-prescription-card
              *ngFor="let item of vm.recentPrescriptions"
              [prescription]="item.prescription"
              [doctor]="item.doctor"
              (download)="showPhaseTenToast()"
            ></app-prescription-card>
          </ng-container>
          <ng-template #noRxTpl>
            <app-empty-state
              icon="medkit-outline"
              title="No prescriptions yet"
              description="Active prescriptions will appear here once issued."
            ></app-empty-state>
          </ng-template>
        </div>
      </div>
    </section>
  <ng-template #loadingTpl>
      <div class="dashboard-loading">
        <div class="skel-hero"></div>
        <div class="skel-stats">
          <div class="skel-stat"></div>
          <div class="skel-stat"></div>
          <div class="skel-stat"></div>
          <div class="skel-stat"></div>
        </div>
        <div class="skel-grid">
          <div class="skel-panel"></div>
          <div class="skel-panel"></div>
        </div>
      </div>
    </ng-template>
  `,
  styleUrl: './patient-dashboard.page.scss'
})
export class PatientDashboardPage implements OnInit {
  constructor() {
    addIcons({ calendarOutline, checkmarkCircleOutline, medkitOutline, receiptOutline });
  }

  private readonly authState = inject(AuthStateService);
  private readonly bookingService = inject(BookingService);
  private readonly clinicSettings = inject(ClinicSettingsService);
  private readonly doctorState = inject(DoctorStateService);
  private readonly medicalRecords = inject(MedicalRecordsService);
  private readonly router = inject(Router);
  private readonly patientService = inject(PatientService);

  readonly currentUser$ = this.authState.currentUser$;
  readonly patient$ = this.currentUser$.pipe(
    switchMap((user) =>
      user ? this.patientService.getMyProfile().pipe(catchError(() => of(undefined))) : of(undefined)
    )
  );

  readonly upcomingBookings$ = this.patient$.pipe(
    switchMap((patient) =>
      patient ? this.bookingService.getUpcomingBookingsByPatientId(patient.id) : of([])
    )
  );

  readonly pendingProofBookings$ = this.patient$.pipe(
    switchMap((patient) =>
      patient ? this.bookingService.getPendingProofBookingsByPatientId(patient.id) : of([])
    )
  );

  readonly doctors$ = this.doctorState.getDoctors();

  vm$ = combineLatest([
    this.currentUser$,
    this.patient$,
    this.upcomingBookings$,
    this.pendingProofBookings$,
    this.doctors$
  ]).pipe(
    switchMap(([user, patient, upcomingBookings, pendingProofBookings, doctors]) => {
      if (!patient) {
        return of({
          user,
          patient,
          upcomingBookings,
          pendingProofBookings,
          consultations: [],
          prescriptions: [],
          doctors: doctors.slice(0, 3),
          latestBooking: undefined,
          latestBookingDoctor: undefined,
          recentConsultations: [],
          recentPrescriptions: [],
          showEmailWarning: false,
          showConsentWarning: false,
          upcomingCount: 0,
          pendingProofCount: 0,
          completedVisitCount: 0,
          activePrescriptionCount: 0
        } satisfies DashboardVm);
      }

      return combineLatest([
        this.medicalRecords.getConsultationsByPatientId(patient.id),
        this.medicalRecords.getPrescriptionsByPatientId(patient.id),
        this.clinicSettings.settings$
      ]).pipe(
        map(([consultations, prescriptions, settings]) => {
          // Build doctor lookup map from the already-loaded doctors array
          const doctorMap = new Map<string, Doctor>();
          for (const d of doctors) {
            doctorMap.set(d.id, d);
          }

          const latestBooking = upcomingBookings[0];
          const latestBookingDoctor = latestBooking
            ? doctorMap.get(latestBooking.doctorId)
            : undefined;

          return {
            user,
            patient,
            upcomingBookings,
            pendingProofBookings,
          consultations,
          prescriptions,
          doctors: doctors.slice(0, 3),
          latestBooking,
          latestBookingDoctor,
            recentConsultations: consultations.slice(0, 2).map((consultation) => ({
              consultation,
              doctor: doctorMap.get(consultation.doctorId)
            })),
            recentPrescriptions: prescriptions.slice(0, 2).map((prescription) => ({
              prescription,
              doctor: doctorMap.get(prescription.doctorId)
            })),
            showEmailWarning: patient.isEmailVerified === false,
            showConsentWarning:
              patient.consentVersion !== settings.consentVersion,
            upcomingCount: upcomingBookings.length,
            pendingProofCount: pendingProofBookings.length,
            completedVisitCount: consultations.length,
            activePrescriptionCount: prescriptions.filter((item) => item.status === 'Active').length
          } satisfies DashboardVm;
        })
      );
    })
  );

  ngOnInit(): void {
    this.doctorState.refresh();
  }

  canSubmitProof(booking: Booking): boolean {
    return (
      booking.paymentMode === 'Online' &&
      booking.paymentStatus === 'Unpaid' &&
      ['Pending', 'OnHold'].includes(booking.status)
    );
  }

  openBooking(bookingId: string): void {
    void this.router.navigate(['/patient/bookings', bookingId]);
  }

  showPhaseNineToast(): void {
    void this.router.navigate(['/patient/medical-records']);
  }

  showPhaseTenToast(): void {
    void this.router.navigate(['/patient/prescriptions']);
  }

  getWelcomeName(user: AuthUser | null): string {
    return user?.fullName?.split(' ')?.[0] ?? '';
  }
}
