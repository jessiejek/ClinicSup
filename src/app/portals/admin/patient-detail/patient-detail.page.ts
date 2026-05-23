import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonLabel, IonSegment, IonSegmentButton, ModalController } from '@ionic/angular/standalone';
import { Allergy, Booking, Consultation, FollowUp, LabResult, Patient, Prescription, VaccinationRecord } from '../../../core/models';
import { BookingService } from '../../../core/services/booking.service';
import { MedicalRecordsService } from '../../../core/services/medical-records.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { MedicalRecordsTabComponent } from '../components/medical-records-tab/medical-records-tab.component';
import { AdminPatientEditModalComponent } from './admin-patient-edit-modal.component';
import { AdminPatientsService } from '../services/admin-patients.service';

@Component({
  selector: 'app-admin-patient-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    AvatarComponent,
    EmptyStateComponent,
    MedicalRecordsTabComponent,
    StatusBadgeComponent,
    IonSegment,
    IonSegmentButton,
    IonLabel
  ],
  template: `
    <section class="page-shell" *ngIf="patient">
      <div class="page-shell__header">
        <div>
          <button type="button" class="btn-ghost" (click)="back()">Back to Patients</button>
          <h2 class="page-title">{{ patient.firstName }} {{ patient.lastName }}</h2>
          <div class="page-subtitle data-mono">{{ patient.patientCode }}</div>
        </div>
        <button class="btn-primary" type="button" (click)="openEdit()">Edit Profile</button>
      </div>

      <ion-segment [value]="selectedTab" (ionChange)="onTabChange($event)">
        <ion-segment-button value="overview"><ion-label>Overview</ion-label></ion-segment-button>
        <ion-segment-button value="bookings"><ion-label>Bookings</ion-label></ion-segment-button>
        <ion-segment-button value="records"><ion-label>Medical Records</ion-label></ion-segment-button>
      </ion-segment>

      <div *ngIf="selectedTab === 'overview'" class="overview-grid">
        <div class="clinic-card">
          <div class="section-heading">Personal Info</div>
          <div class="profile-card">
            <app-avatar [name]="patient.firstName + ' ' + patient.lastName" size="lg"></app-avatar>
            <div>
              <p>{{ patient.dateOfBirth }}</p>
              <p>{{ patient.sex }}</p>
              <p>{{ patient.civilStatus || 'N/A' }}</p>
              <p>{{ patient.bloodType || 'N/A' }}</p>
            </div>
          </div>
        </div>

        <div class="clinic-card">
          <div class="section-heading">Contact Info</div>
          <p>{{ patient.address || 'No address provided' }}</p>
          <p>{{ patient.contactNumber || 'No phone provided' }}</p>
          <p>{{ patient.email || 'No email provided' }}</p>
          <div class="section-heading" style="margin-top: var(--space-4);">Login Account</div>
          <app-status-badge
            [status]="patientAccountStatus(patient)"
            [labelOverride]="patientAccountLabel(patient)"
          ></app-status-badge>
          <p *ngIf="patientAccountStatus(patient) === 'LinkedAccount' && patient.userId" class="data-mono" style="margin-top: var(--space-2);">User ID: {{ patient.userId }}</p>
          <p *ngIf="patientAccountStatus(patient) === 'NoAccount'" style="margin-top: var(--space-2);">No linked login account</p>
          <p *ngIf="patientAccountStatus(patient) === 'AccountUnknown'" style="margin-top: var(--space-2);">Account linkage unknown</p>
        </div>

        <div class="clinic-card">
          <div class="section-heading">Emergency Contact</div>
          <p>{{ patient.emergencyContactName || 'N/A' }}</p>
          <p>{{ patient.emergencyContactNumber || 'N/A' }}</p>
          <p>{{ patient.emergencyContactRelationship || 'N/A' }}</p>
        </div>

        <div class="clinic-card">
          <div class="section-heading">Insurance</div>
          <p>{{ patient.philHealthNumber || 'N/A' }}</p>
          <p>{{ patient.hmoProvider || 'N/A' }}</p>
          <p>{{ patient.hmoCardNumber || 'N/A' }}</p>
        </div>
      </div>

      <div *ngIf="selectedTab === 'bookings'" class="clinic-card">
        <table class="clinic-table" *ngIf="bookings.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let booking of bookings">
              <td class="data-mono">{{ booking.id }}</td>
              <td>{{ booking.appointmentDate }}</td>
              <td>{{ booking.slotStartTime }}</td>
              <td><app-status-badge [status]="booking.status"></app-status-badge></td>
              <td><app-status-badge [status]="booking.paymentStatus"></app-status-badge></td>
            </tr>
          </tbody>
        </table>
        <app-empty-state
          *ngIf="bookings.length === 0"
          icon="calendar-outline"
          title="No bookings"
          description="This patient has no bookings yet."
        ></app-empty-state>
      </div>

      <div *ngIf="selectedTab === 'records'" class="clinic-card">
        <app-medical-records-tab
          [patientId]="patient.id"
          [consultations]="consultations"
          [prescriptions]="prescriptions"
          [allergies]="allergies"
          [labResults]="labResults"
          [vaccinations]="vaccinations"
          [followUps]="followUps"
        ></app-medical-records-tab>
      </div>
    </section>
  `,
  styleUrl: './patient-detail.page.scss'
})
export class PatientDetailPage implements OnInit {
  private readonly adminPatientsService = inject(AdminPatientsService);
  private readonly bookingService = inject(BookingService);
  private readonly medicalRecords = inject(MedicalRecordsService);
  private readonly modalCtrl = inject(ModalController);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  patientId = '';
  patient: Patient | null = null;
  bookings: Booking[] = [];
  consultations: Consultation[] = [];
  prescriptions: Prescription[] = [];
  allergies: Allergy[] = [];
  labResults: LabResult[] = [];
  vaccinations: VaccinationRecord[] = [];
  followUps: FollowUp[] = [];
  selectedTab: 'overview' | 'bookings' | 'records' = 'overview';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.patientId = id;
    this.loadPatient(id);
    this.loadSupportingData(id);
  }

  back(): void {
    void this.router.navigate(['/admin/patients']);
  }

  async openEdit(): Promise<void> {
    if (!this.patient) {
      return;
    }

    const modal = await this.modalCtrl.create({
      component: AdminPatientEditModalComponent,
      componentProps: { patient: this.patient },
      cssClass: 'admin-patient-edit-modal',
      backdropDismiss: false
    });

    await modal.present();

    const result = await modal.onDidDismiss<{ updated?: boolean }>();
    if (result.role === 'saved' || result.data?.updated) {
      this.loadPatient(this.patientId);
    }
  }

  onTabChange(event: Event): void {
    const detail = event as CustomEvent<{ value?: string | number }>;
    const value = detail.detail.value as 'overview' | 'bookings' | 'records' | undefined;
    if (value) {
      this.selectedTab = value;
    }
  }

  private loadPatient(id: string): void {
    this.adminPatientsService.getPatientById(id).subscribe((patient) => {
      this.patient = patient ?? null;
    });
  }

  private loadSupportingData(id: string): void {
    this.bookingService.getBookingsByPatientId(id).subscribe((bookings) => (this.bookings = bookings));
    this.medicalRecords.getConsultationsByPatientId(id).subscribe((consultations) => (this.consultations = consultations));
    this.medicalRecords.getPrescriptionsByPatientId(id).subscribe((prescriptions) => (this.prescriptions = prescriptions));
    this.medicalRecords.getAllergiesByPatientId(id).subscribe((allergies) => (this.allergies = allergies));
    this.medicalRecords.getLabResultsByPatientId(id).subscribe((labResults) => (this.labResults = labResults));
    this.medicalRecords.getVaccinationsByPatientId(id).subscribe((vaccinations) => (this.vaccinations = vaccinations));
    this.medicalRecords.getFollowUpsByPatientId(id).subscribe((followUps) => (this.followUps = followUps));
  }

  patientAccountStatus(patient: Patient): 'LinkedAccount' | 'NoAccount' | 'AccountUnknown' {
    if (patient.hasAccount === true || Boolean(patient.userId?.trim())) {
      return 'LinkedAccount';
    }

    if (patient.hasAccount === false) {
      return 'NoAccount';
    }

    return 'AccountUnknown';
  }

  patientAccountLabel(patient: Patient): string {
    switch (this.patientAccountStatus(patient)) {
      case 'LinkedAccount':
        return 'Account Linked';
      case 'NoAccount':
        return 'No Account';
      default:
        return 'Account Unknown';
    }
  }
}
