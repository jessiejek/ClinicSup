import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Diagnosis, PrescriptionItem, VitalSigns } from '../../../../core/models';
import { ClinicalRole } from '../../../../core/models/auth.models';
import { CreatePatientVaccinationRequest } from '../../../../core/models/vaccination.models';
import { AllergyWarningBannerComponent } from '../../components/allergy-warning-banner/allergy-warning-banner.component';
import { DiagnosisPickerComponent } from '../../components/diagnosis-picker/diagnosis-picker.component';
import { FollowUpDraftView, FollowUpFormComponent } from '../../components/follow-up-form/follow-up-form.component';
import { LabRequestDraftView, LabRequestFormComponent } from '../../components/lab-request-form/lab-request-form.component';
import { PrescriptionFormComponent } from '../../components/prescription-form/prescription-form.component';
import { SoapFormComponent, SoapFormValue } from '../../components/soap-form/soap-form.component';
import { VaccinationFormComponent } from '../../components/vaccination-form/vaccination-form.component';
import { VitalSignsFormComponent } from '../../components/vital-signs-form/vital-signs-form.component';
import { VitalsTrendChartComponent } from '../../components/vitals-trend-chart/vitals-trend-chart.component';
import {
  ProfessionalFeeDecisionFormComponent,
  ProfessionalFeePaymentMode
} from './professional-fee-decision-form.component';
import { ConsultationPageVm } from '../doctor-consultation.types';

@Component({
  selector: 'app-consultation-workspace',
  standalone: true,
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    AllergyWarningBannerComponent,
    VitalSignsFormComponent,
    SoapFormComponent,
    DiagnosisPickerComponent,
    PrescriptionFormComponent,
    LabRequestFormComponent,
    FollowUpFormComponent,
    VaccinationFormComponent,
    VitalsTrendChartComponent,
    ProfessionalFeeDecisionFormComponent
  ],
  template: `
    <section class="consultation-grid">
      <div class="consultation-main">
        <app-vital-signs-form
          id="section-vitals"
          [value]="vm.consultation?.vitalSigns ?? null"
          [locked]="locked"
          [validationRequested]="validationRequested"
          (vitalSignsChange)="vitalSignsChange.emit($event)"
          (validityChange)="vitalsValidityChange.emit($event)"
        ></app-vital-signs-form>

        <app-soap-form
          id="section-soap"
          [value]="vm.soap"
          [lastVisitSoap]="getLastVisitSoap(vm)"
          [auditText]="getSectionAuditText('soap', vm)"
          [locked]="locked"
          [validationRequested]="validationRequested"
          (soapChange)="soapChange.emit($event)"
          (validityChange)="soapValidityChange.emit($event)"
          (loadFromLastVisit)="loadFromLastVisit.emit()"
        ></app-soap-form>

        <app-diagnosis-picker
          id="section-diagnosis"
          [value]="vm.consultation?.diagnoses ?? emptyDiagnoses"
          [auditText]="getSectionAuditText('diagnosis', vm)"
          [locked]="locked"
          [validationRequested]="validationRequested"
          (diagnosesChange)="diagnosesChange.emit($event)"
          (validityChange)="diagnosisValidityChange.emit($event)"
        ></app-diagnosis-picker>

        <app-allergy-warning-banner
          [allergies]="vm.allergies"
          [prescriptionItems]="prescriptionItems"
        ></app-allergy-warning-banner>

        <app-prescription-form
          id="section-prescription"
          [items]="vm.existingPrescription?.items ?? emptyPrescriptionItems"
          [auditText]="getSectionAuditText('prescription', vm)"
          [locked]="locked"
          [allergies]="vm.allergies"
          [actionMode]="isPhysician ? 'edit' : 'request'"
          (itemsChange)="prescriptionItemsChange.emit($event)"
          (requestAttendingPhysician)="requestPrescription.emit()"
        ></app-prescription-form>

        <app-lab-request-form
          id="section-lab-orders"
          [value]="vm.labRequestDrafts"
          [auditText]="getSectionAuditText('lab-orders', vm)"
          [locked]="locked"
          [actionMode]="isPhysician ? 'edit' : 'request'"
          (requestsChange)="labRequestsChange.emit($event)"
          (requestAttendingPhysician)="requestLabOrder.emit()"
        ></app-lab-request-form>

        <div class="record-list clinic-card" *ngIf="vm.labRequests.length > 0">
          <h3>Saved Lab Requests</h3>
          <article class="record-item" *ngFor="let request of vm.labRequests">
            <strong>{{ request.testName }}</strong>
            <p>{{ request.reason || 'No reason' }} &bull; {{ request.status }}</p>
          </article>
        </div>

        <app-vaccination-form
          [locked]="locked"
          [canEdit]="canEditVaccinations"
          [existingVaccinations]="vm.vaccinations"
          [draftVaccinations]="pendingVaccinations"
          [auditText]="getSectionAuditText('vaccinations', vm)"
          (vaccinationsAdded)="vaccinationsAdded.emit($event)"
        ></app-vaccination-form>

        <app-follow-up-form
          id="section-followup"
          [value]="vm.followUpDraft"
          [locked]="locked"
          (followUpChange)="followUpChange.emit($event)"
        ></app-follow-up-form>

        <div class="record-list clinic-card" *ngIf="vm.followUps.length > 0">
          <h3>Saved Follow-Ups</h3>
          <article class="record-item" *ngFor="let followUp of vm.followUps">
            <strong>{{ followUp.followUpDate | date : 'MMMM d, y (EEE)' }}</strong>
            <p>{{ followUp.reason }} &bull; {{ followUp.status }}</p>
          </article>
        </div>

        <app-professional-fee-decision-form
          *ngIf="showPfDecision"
          id="section-pf-decision"
          [currentConsultationFee]="vm.booking.consultationFeeSnapshot ?? vm.booking.totalFee ?? 0"
          [professionalFee]="professionalFee"
          [paymentMode]="professionalFeePaymentMode"
          [notes]="professionalFeeNotes"
          [locked]="locked"
          (professionalFeeChange)="professionalFeeChange.emit($event)"
          (paymentModeChange)="professionalFeePaymentModeChange.emit($event)"
          (notesChange)="professionalFeeNotesChange.emit($event)"
          (validityChange)="professionalFeeValidityChange.emit($event)"
        ></app-professional-fee-decision-form>
      </div>

      <aside class="consultation-side">
        <app-vitals-trend-chart [consultations]="vm.recentConsultations"></app-vitals-trend-chart>

        <section class="clinic-card side-card">
          <h3>Patient Allergies</h3>
          <p *ngFor="let allergy of vm.allergies">{{ allergy.allergen }} &bull; {{ allergy.severity }}</p>
          <p *ngIf="vm.allergies.length === 0">No allergies on record.</p>
        </section>

        <section class="clinic-card side-card">
          <h3>Vaccinations</h3>
          <p *ngFor="let vaccination of vm.vaccinations">
            {{ vaccination.vaccineName }} &bull; {{ vaccination.dateGiven | date : 'MMMM d, y (EEE)' }}
          </p>
          <p *ngIf="vm.vaccinations.length === 0">No vaccinations on record.</p>
        </section>

        <section class="clinic-card side-card">
          <div class="side-card__head" title="Lab result files uploaded by the patient">
            <h3><i class="ti ti-upload"></i> Lab Results</h3>
            <p>Files uploaded by the patient</p>
          </div>
          <p *ngFor="let result of vm.labResults">
            {{ result.fileName }} &bull; {{ result.resultDate | date : 'MMMM d, y (EEE)' }}
          </p>
          <p *ngIf="vm.labResults.length === 0">No lab results on record.</p>
        </section>
      </aside>
    </section>
  `,
  styleUrl: './consultation-workspace.component.scss'
})
export class ConsultationWorkspaceComponent {
  @Input({ required: true }) vm!: ConsultationPageVm;
  @Input() locked = false;
  @Input() prescriptionItems: PrescriptionItem[] = [];
  @Input() professionalFee = 0;
  @Input() professionalFeePaymentMode: ProfessionalFeePaymentMode = 'Cash';
  @Input() professionalFeeNotes = '';
  @Input() pendingVaccinations: CreatePatientVaccinationRequest[] = [];
  @Input() clinicalRole: ClinicalRole = 'physician';
  @Input() validationRequested = false;

  @Output() vitalSignsChange = new EventEmitter<VitalSigns>();
  @Output() vitalsValidityChange = new EventEmitter<boolean>();
  @Output() soapChange = new EventEmitter<SoapFormValue>();
  @Output() soapValidityChange = new EventEmitter<boolean>();
  @Output() diagnosesChange = new EventEmitter<Diagnosis[]>();
  @Output() diagnosisValidityChange = new EventEmitter<boolean>();
  @Output() prescriptionItemsChange = new EventEmitter<PrescriptionItem[]>();
  @Output() labRequestsChange = new EventEmitter<LabRequestDraftView[]>();
  @Output() followUpChange = new EventEmitter<FollowUpDraftView | null>();
  @Output() professionalFeeChange = new EventEmitter<number>();
  @Output() professionalFeePaymentModeChange = new EventEmitter<ProfessionalFeePaymentMode>();
  @Output() professionalFeeNotesChange = new EventEmitter<string>();
  @Output() professionalFeeValidityChange = new EventEmitter<boolean>();
  @Output() vaccinationsAdded = new EventEmitter<CreatePatientVaccinationRequest[]>();
  @Output() loadFromLastVisit = new EventEmitter<void>();
  @Output() requestPrescription = new EventEmitter<void>();
  @Output() requestLabOrder = new EventEmitter<void>();

  readonly emptyDiagnoses: Diagnosis[] = [];
  readonly emptyPrescriptionItems: PrescriptionItem[] = [];

  get isPhysician(): boolean {
    return this.clinicalRole === 'physician';
  }

  get canEditVaccinations(): boolean {
    return this.clinicalRole === 'physician' || this.clinicalRole === 'nurse' || this.clinicalRole === 'medical_assistant';
  }

  get showPfDecision(): boolean {
    return this.clinicalRole === 'physician' || this.clinicalRole === 'admin' || this.clinicalRole === 'receptionist';
  }

  getLastVisitSoap(vm: ConsultationPageVm): SoapFormValue | null {
    const last = vm.recentConsultations[0];
    if (!last) {
      return null;
    }

    return {
      chiefComplaint: last.chiefComplaint ?? '',
      subjective: last.subjective ?? last.historyOfPresentIllness ?? '',
      objective: last.objective ?? last.peGeneralFindings ?? '',
      assessment: last.assessment ?? '',
      plan: last.plan ?? ''
    };
  }

  getSectionAuditText(
    sectionKey: 'soap' | 'diagnosis' | 'prescription' | 'lab-orders' | 'vaccinations',
    vm: ConsultationPageVm
  ): string {
    const updatedAt = vm.consultation?.updatedAt || vm.booking.doctorCompletedAt || vm.booking.createdAt;
    const doctorName = vm.doctor.fullName || 'Doctor';
    if (sectionKey === 'soap' && !vm.soap.chiefComplaint.trim() && !vm.soap.subjective.trim() && !vm.soap.objective.trim() && !vm.soap.assessment.trim() && !vm.soap.plan.trim()) {
      return 'Not yet edited this visit';
    }

    const hasContent =
      (sectionKey === 'soap' && Boolean(vm.soap.chiefComplaint.trim() || vm.soap.subjective.trim() || vm.soap.objective.trim() || vm.soap.assessment.trim() || vm.soap.plan.trim())) ||
      (sectionKey === 'diagnosis' && Boolean(vm.consultation?.diagnoses?.length)) ||
      (sectionKey === 'prescription' && (vm.existingPrescription?.items?.length ?? 0) > 0) ||
      (sectionKey === 'lab-orders' && vm.labRequestDrafts.length > 0) ||
      (sectionKey === 'vaccinations' && (vm.vaccinations.length > 0 || this.pendingVaccinations.length > 0));

    if (!hasContent) {
      return 'Not yet edited this visit';
    }

    return `Last edited by ${doctorName} at ${this.formatAuditTime(updatedAt)}`;
  }

  private formatAuditTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}
