import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, from, map, of, switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { IonLabel, IonSegment, IonSegmentButton, ModalController } from '@ionic/angular/standalone';
import { PatientClinicalHistoryDto, PatientClinicalHistoryPatientDto, PatientClinicalHistorySummaryDto } from '../../../core/models/patient-clinical-history.models';
import { SupabaseService } from '../../../core/services/supabase.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

type ClinicalTab = 'timeline' | 'consultations' | 'prescriptions' | 'labs' | 'documents' | 'vaccinations' | 'appointments';



@Component({
  standalone: true,
  selector: 'app-doctor-patient-detail-page',
  imports: [
    AsyncPipe, DatePipe, NgFor, NgIf, FormsModule, RouterLink,
    IonLabel, IonSegment, IonSegmentButton,
    PageHeaderComponent, EmptyStateComponent
  ],
  template: `
    <ng-container *ngIf="history$ | async as history; else loadingTpl">
      <app-page-header
        [title]="history.patient.fullName"
        [subtitle]="'Patient Code: ' + history.patient.patientCode"
        [showBackButton]="true"
        defaultBackHref="/doctor/patients"
      ></app-page-header>

      <div class="patient-summary clinic-card">
        <div class="patient-summary__avatar">{{ history.patient.fullName.charAt(0) }}</div>
        <div class="patient-summary__info">
          <div class="patient-summary__name">{{ history.patient.fullName }}</div>
          <div class="patient-summary__meta">
            <span *ngIf="history.patient.sex">{{ history.patient.sex }}</span>
            <span *ngIf="history.patient.dateOfBirth">&middot; {{ calcAge(history.patient.dateOfBirth) }} yrs</span>
            <span *ngIf="history.patient.contactNumber">&middot; {{ history.patient.contactNumber }}</span>
            <span *ngIf="history.patient.email">&middot; {{ history.patient.email }}</span>
          </div>
          <div class="patient-summary__dates">
            <span *ngIf="history.summary.lastVisitDate">Last visit: {{ history.summary.lastVisitDate }}</span>
            <span *ngIf="history.summary.nextAppointmentDate">Next appointment: {{ history.summary.nextAppointmentDate }}</span>
          </div>
        </div>
      </div>

      <div class="summary-cards">
        <div class="stat-card"><span class="stat-num">{{ history.summary.totalAppointments }}</span><span class="stat-label">Appointments</span></div>
        <div class="stat-card"><span class="stat-num">{{ history.summary.completedConsultations }}</span><span class="stat-label">Consultations</span></div>
        <div class="stat-card"><span class="stat-num">{{ history.summary.activePrescriptions }}</span><span class="stat-label">Prescriptions</span></div>
        <div class="stat-card"><span class="stat-num">{{ history.summary.labResultsCount }}</span><span class="stat-label">Lab Results</span></div>
        <div class="stat-card"><span class="stat-num">{{ history.summary.documentsCount }}</span><span class="stat-label">Documents</span></div>
        <div class="stat-card"><span class="stat-num">{{ history.summary.vaccinationsCount }}</span><span class="stat-label">Vaccinations</span></div>
      </div>

      <section class="clinic-card tab-card">
        <ion-segment [(ngModel)]="activeTab">
          <ion-segment-button value="timeline"><ion-label>Timeline</ion-label></ion-segment-button>
          <ion-segment-button value="appointments"><ion-label>Appointments</ion-label></ion-segment-button>
          <ion-segment-button value="consultations"><ion-label>Consultations</ion-label></ion-segment-button>
          <ion-segment-button value="prescriptions"><ion-label>Prescriptions</ion-label></ion-segment-button>
          <ion-segment-button value="labs"><ion-label>Lab Results</ion-label></ion-segment-button>
          <ion-segment-button value="documents"><ion-label>Documents</ion-label></ion-segment-button>
          <ion-segment-button value="vaccinations"><ion-label>Vaccinations</ion-label></ion-segment-button>
        </ion-segment>
      </section>

      <section *ngIf="activeTab === 'timeline'" class="clinical-section">
        <div class="timeline" *ngIf="history.timeline.length > 0; else emptyTimeline">
          <div class="timeline-item" *ngFor="let item of history.timeline">
            <div class="timeline-dot" [class]="'dot-' + item.type.toLowerCase().replace(' ', '-')"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-date">{{ item.date }}</span>
                <span class="timeline-badge" [class]="'badge-' + item.type.toLowerCase().replace(' ', '-')">{{ item.type }}</span>
              </div>
              <div class="timeline-title">{{ item.title }}</div>
              <div class="timeline-desc" *ngIf="item.description">{{ item.description }}</div>
              <a *ngIf="item.bookingId" class="timeline-link" [routerLink]="['/doctor/appointments', item.bookingId]">View Appointment &rarr;</a>
            </div>
          </div>
        </div>
      </section>

      <section *ngIf="activeTab === 'appointments'" class="clinical-section">
        <div class="card-list" *ngIf="history.appointments.length > 0; else emptyAppointments">
          <div class="apt-card clinic-card" *ngFor="let a of history.appointments">
            <div class="apt-card__header">
              <div>
                <strong>{{ a.appointmentDate }}</strong>
                <span>{{ a.slotStartTime }} - {{ a.slotEndTime }}</span>
              </div>
              <div class="apt-card__right">
                <span class="status-tag" [class]="'status-' + a.status.toLowerCase()">{{ a.status }}</span>
                <a class="btn-sm" [routerLink]="['/doctor/appointments', a.bookingId]">View</a>
              </div>
            </div>
            <div class="apt-card__meta">
              <span>{{ a.doctorName }}</span>
              <span *ngIf="a.queueNumber">Queue: #{{ a.queueNumber }}</span>
              <span>{{ a.paymentStatus }}</span>
            </div>
          </div>
        </div>
      </section>

      <section *ngIf="activeTab === 'consultations'" class="clinical-section">
        <div class="card-list" *ngIf="history.consultations.length > 0; else emptyConsultations">
          <div class="consult-card clinic-card" *ngFor="let c of history.consultations">
            <div class="consult-card__header">
              <div>
                <strong>{{ c.appointmentDate }}</strong> &middot; {{ c.appointmentTime }}
                <p class="consult-card__doctor">{{ c.doctorName }}</p>
              </div>
              <a *ngIf="c.bookingId" class="btn-sm" [routerLink]="['/doctor/appointments', c.bookingId]">View</a>
            </div>
            <div class="consult-card__body" *ngIf="c.diagnosesSummary"><span>Diagnosis</span><p>{{ c.diagnosesSummary }}</p></div>
            <div class="consult-card__body" *ngIf="c.generalNotes"><span>Notes</span><p>{{ c.generalNotes }}</p></div>
            <div class="consult-card__footer" *ngIf="c.prescription || c.labOrders.length > 0 || c.followUp">
              <span *ngIf="c.prescription">{{ c.prescription['items']?.length || 0 }} medicine(s)</span>
              <span *ngIf="c.labOrders.length > 0">{{ c.labOrders.length }} lab order(s)</span>
              <span *ngIf="c.followUp">Follow-up: {{ c.followUp['followUpDate'] }}</span>
            </div>
          </div>
        </div>
      </section>

      <section *ngIf="activeTab === 'prescriptions'" class="clinical-section">
        <div class="card-list" *ngIf="history.prescriptions.length > 0; else emptyPrescriptions">
          <div class="presc-card clinic-card" *ngFor="let p of history.prescriptions">
            <div class="presc-card__header" *ngIf="p.prescriptionDate"><strong>{{ p.prescriptionDate }}</strong><span *ngIf="p.notes">{{ p.notes }}</span></div>
            <div class="presc-item" *ngFor="let item of p.items">
              <div class="presc-item__name">{{ item.medicationName }}</div>
              <div class="presc-item__detail">
                <span *ngIf="item.strength">{{ item.strength }}</span>
                <span *ngIf="item.dosage">{{ item.dosage }}</span>
                <span *ngIf="item.frequency">{{ item.frequency }}</span>
                <span *ngIf="item.duration">{{ item.duration }}</span>
              </div>
              <div class="presc-item__inst" *ngIf="item.instructions">{{ item.instructions }}</div>
            </div>
          </div>
        </div>
      </section>

      <section *ngIf="activeTab === 'labs'" class="clinical-section">
        <div class="card-list" *ngIf="history.labResults.length > 0; else emptyLabs">
          <div class="doc-card clinic-card" *ngFor="let lr of history.labResults">
            <div class="doc-card__header"><strong>{{ lr.resultTitle || 'Lab Result' }}</strong><span>{{ lr.createdAt | date:'MMM d, y' }}</span></div>
            <p *ngIf="lr.resultText">{{ lr.resultText }}</p>
            <button *ngIf="lr.fileUrl" class="btn-sm" (click)="viewFile(lr.fileUrl, lr.resultTitle || lr.fileName || 'lab-result')">View</button>
          </div>
        </div>
      </section>

      <section *ngIf="activeTab === 'documents'" class="clinical-section">
        <div class="card-list" *ngIf="history.documents.length > 0; else emptyDocuments">
          <div class="doc-card clinic-card" *ngFor="let d of history.documents">
            <div class="doc-card__header"><strong>{{ d.title || d.documentType }}</strong><span>{{ d.createdAt | date:'MMM d, y' }}</span></div>
            <p *ngIf="d.description">{{ d.description }}</p>
            <span class="doc-card__type">{{ d.documentType }}</span>
            <button *ngIf="d.fileUrl" class="btn-sm" (click)="viewFile(d.fileUrl, d.fileName || d.title || 'file')">View</button>
          </div>
        </div>
      </section>

      <section *ngIf="activeTab === 'vaccinations'" class="clinical-section">
        <div class="card-list" *ngIf="history.vaccinations.length > 0; else emptyVaccinations">
          <div class="vac-card clinic-card" *ngFor="let v of history.vaccinations">
            <div class="vac-card__header"><strong>{{ v.vaccineName }}</strong><span>{{ v.administeredDate }}</span></div>
            <div class="vac-card__meta">
              <span *ngIf="v.doseNumber">Dose: {{ v.doseNumber }}</span>
              <span *ngIf="v.manufacturer">{{ v.manufacturer }}</span>
              <span *ngIf="v.lotNumber">Lot: {{ v.lotNumber }}</span>
              <span>{{ v.status }}</span>
              <span *ngIf="v.nextDueDate">Next: {{ v.nextDueDate }}</span>
            </div>
            <p *ngIf="v.notes" class="vac-card__notes">{{ v.notes }}</p>
          </div>
        </div>
      </section>
    </ng-container>

    <ng-template #loadingTpl>
      <div class="loading-state" *ngIf="!errorMessage; else errorTpl">
        <div class="loading-spinner"></div>
        <p>Loading clinical history...</p>
      </div>
    </ng-template>

    <ng-template #errorTpl>
      <div class="loading-state">
        <p class="error-text">{{ errorMessage }}</p>
        <button class="btn-sm" (click)="retry()">Retry</button>
      </div>
    </ng-template>

    <ng-template #emptyTimeline><app-empty-state icon="time-outline" title="No records yet" description="Clinical records will appear here once the patient has appointments."></app-empty-state></ng-template>
    <ng-template #emptyConsultations><app-empty-state icon="medical-outline" title="No consultation records yet"></app-empty-state></ng-template>
    <ng-template #emptyPrescriptions><app-empty-state icon="document-text-outline" title="No prescriptions yet"></app-empty-state></ng-template>
    <ng-template #emptyDocuments><app-empty-state icon="folder-outline" title="No documents yet"></app-empty-state></ng-template>
    <ng-template #emptyLabs><app-empty-state icon="flask-outline" title="No lab results yet"></app-empty-state></ng-template>
    <ng-template #emptyVaccinations><app-empty-state icon="shield-checkmark-outline" title="No vaccinations recorded"></app-empty-state></ng-template>
    <ng-template #emptyAppointments><app-empty-state icon="calendar-outline" title="No appointments"></app-empty-state></ng-template>
  `,
  styleUrl: './doctor-patient-detail.page.scss'
})
export class DoctorPatientDetailPage {
  private readonly supabase = inject(SupabaseService).client;
  private readonly route = inject(ActivatedRoute);
  private readonly modalCtrl = inject(ModalController);

  activeTab: ClinicalTab = 'timeline';
  errorMessage = '';

  readonly history$: Observable<PatientClinicalHistoryDto | null> = this.route.paramMap.pipe(
    map((paramMap) => paramMap.get('id') ?? ''),
    switchMap((patientId) => {
      if (!patientId) return of(null);
      this.errorMessage = '';
      return from(this.buildClinicalHistory(patientId)).pipe(
        catchError((err: any) => {
          console.error('Clinical history error:', err);
          this.errorMessage = 'Failed to load clinical history. Verify Supabase backend.';
          return of(null);
        })
      );
    })
  );

  calcAge(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return 0;
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  retry(): void {
    window.location.reload();
  }

  viewFile(fileUrl: string, displayName: string): void {
    // Use signed URL from Supabase storage
    // If fileUrl looks like a storage path, create signed URL
    // Otherwise, open directly as a fallback
    window.open(fileUrl, '_blank');
  }

  private async buildClinicalHistory(patientId: string): Promise<PatientClinicalHistoryDto> {
    // Load patient from Supabase
    const { data: patientRow, error: patientError } = await this.supabase
      .from('patients')
      .select('id, patient_code, first_name, middle_name, last_name, date_of_birth, sex, contact_number, contact_email')
      .eq('id', patientId)
      .maybeSingle();

    if (patientError) throw patientError;

    const patient: PatientClinicalHistoryPatientDto = {
      id: patientId,
      patientCode: trimStr(patientRow?.patient_code) || patientId,
      fullName: composeName(patientRow?.first_name, patientRow?.middle_name, patientRow?.last_name),
      dateOfBirth: trimStr(patientRow?.date_of_birth),
      sex: trimStr(patientRow?.sex),
      contactNumber: trimStr(patientRow?.contact_number),
      email: trimStr(patientRow?.contact_email),
    };

    // Load bookings for this patient
    const { data: bookingRows, error: bookingError } = await this.supabase
      .from('patient_bookings_view')
      .select('*')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
      .limit(50);

    if (bookingError) throw bookingError;

    const bookings = (bookingRows ?? []) as Record<string, unknown>[];

    const summary: PatientClinicalHistorySummaryDto = {
      totalAppointments: bookings.length,
      completedConsultations: bookings.filter((b) => trimStr(b['booking_status']) === 'Completed').length,
      activePrescriptions: 0,
      labResultsCount: 0,
      documentsCount: 0,
      vaccinationsCount: 0,
      lastVisitDate: bookings.length > 0 ? trimStr(bookings[0]['appointment_date']) : undefined,
      nextAppointmentDate: undefined,
    };

    // Build timeline and subsections from booking data (other sections deferred)
    const appointments = bookings.map((b) => ({
      bookingId: trimStr(b['booking_id']) ?? '',
      appointmentDate: trimStr(b['appointment_date']) ?? '',
      slotStartTime: trimStr(b['slot_start_time']) ?? '',
      slotEndTime: trimStr(b['slot_end_time']) ?? '',
      doctorId: trimStr(b['doctor_id']) ?? '',
      doctorName: trimStr(b['doctor_name']) ?? 'Doctor',
      serviceName: trimStr(b['service_name']) ?? '',
      serviceNames: (b['service_names'] as string[]) ?? [],
      status: trimStr(b['booking_status']) ?? '',
      paymentStatus: trimStr(b['payment_status']) ?? '',
      queueNumber: normalizeNum(b['queue_number']),
    }));

    const timeline = appointments.map((a) => ({
      id: a.bookingId,
      date: a.appointmentDate,
      type: 'Appointment' as const,
      title: `${a.doctorName} - ${a.status}`,
      description: `${a.slotStartTime} - ${a.slotEndTime}`,
      bookingId: a.bookingId,
    }));

    return {
      patient,
      summary,
      timeline,
      appointments,
      consultations: [],
      documents: [],
      labResults: [],
      vaccinations: [],
      followUps: [],
      prescriptions: [],
    };
  }
}

function trimStr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t || undefined;
}

function composeName(first: unknown, middle: unknown, last: unknown): string {
  const parts = [first, middle, last]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0);
  return parts.length ? parts.join(' ') : 'Patient';
}

function normalizeNum(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
}

