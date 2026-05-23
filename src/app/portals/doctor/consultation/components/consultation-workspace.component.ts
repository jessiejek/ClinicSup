import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Diagnosis, PrescriptionItem, VitalSigns } from '../../../../core/models';
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
    VitalsTrendChartComponent
  ],
  template: `
    <section class="consultation-grid">
      <div class="consultation-main">
        <app-vital-signs-form
          [value]="vm.consultation?.vitalSigns ?? null"
          [locked]="locked"
          (vitalSignsChange)="vitalSignsChange.emit($event)"
          (validityChange)="vitalsValidityChange.emit($event)"
        ></app-vital-signs-form>

        <app-soap-form
          [value]="vm.soap"
          [locked]="locked"
          (soapChange)="soapChange.emit($event)"
          (validityChange)="soapValidityChange.emit($event)"
        ></app-soap-form>

        <app-diagnosis-picker
          [value]="vm.consultation?.diagnoses ?? emptyDiagnoses"
          [locked]="locked"
          (diagnosesChange)="diagnosesChange.emit($event)"
          (validityChange)="diagnosisValidityChange.emit($event)"
        ></app-diagnosis-picker>

        <app-allergy-warning-banner
          [allergies]="vm.allergies"
          [prescriptionItems]="prescriptionItems"
        ></app-allergy-warning-banner>

        <app-prescription-form
          [items]="vm.existingPrescription?.items ?? emptyPrescriptionItems"
          [locked]="locked"
          (itemsChange)="prescriptionItemsChange.emit($event)"
        ></app-prescription-form>

        <app-lab-request-form
          [value]="vm.labRequestDrafts"
          [locked]="locked"
          (requestsChange)="labRequestsChange.emit($event)"
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
          [existingVaccinations]="vm.vaccinations"
          (vaccinationsAdded)="vaccinationsAdded.emit($event)"
        ></app-vaccination-form>

        <app-follow-up-form
          [value]="vm.followUpDraft"
          [locked]="locked"
          (followUpChange)="followUpChange.emit($event)"
        ></app-follow-up-form>

        <div class="record-list clinic-card" *ngIf="vm.followUps.length > 0">
          <h3>Saved Follow-Ups</h3>
          <article class="record-item" *ngFor="let followUp of vm.followUps">
            <strong>{{ followUp.followUpDate | date : 'MMM d, y' }}</strong>
            <p>{{ followUp.reason }} &bull; {{ followUp.status }}</p>
          </article>
        </div>
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
            {{ vaccination.vaccineName }} &bull; {{ vaccination.dateGiven | date : 'MMM d, y' }}
          </p>
          <p *ngIf="vm.vaccinations.length === 0">No vaccinations on record.</p>
        </section>

        <section class="clinic-card side-card">
          <h3>Lab Results</h3>
          <p *ngFor="let result of vm.labResults">
            {{ result.fileName }} &bull; {{ result.resultDate | date : 'MMM d, y' }}
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

  @Output() vitalSignsChange = new EventEmitter<VitalSigns>();
  @Output() vitalsValidityChange = new EventEmitter<boolean>();
  @Output() soapChange = new EventEmitter<SoapFormValue>();
  @Output() soapValidityChange = new EventEmitter<boolean>();
  @Output() diagnosesChange = new EventEmitter<Diagnosis[]>();
  @Output() diagnosisValidityChange = new EventEmitter<boolean>();
  @Output() prescriptionItemsChange = new EventEmitter<PrescriptionItem[]>();
  @Output() labRequestsChange = new EventEmitter<LabRequestDraftView[]>();
  @Output() followUpChange = new EventEmitter<FollowUpDraftView | null>();
  @Output() vaccinationsAdded = new EventEmitter<CreatePatientVaccinationRequest[]>();

  readonly emptyDiagnoses: Diagnosis[] = [];
  readonly emptyPrescriptionItems: PrescriptionItem[] = [];
}
