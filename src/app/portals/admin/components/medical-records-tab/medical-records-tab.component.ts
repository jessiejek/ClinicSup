import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Allergy,
  Consultation,
  FollowUp,
  LabResult,
  Prescription,
  VaccinationRecord
} from '../../../../core/models';
import { MedicalRecordsService } from '../../../../core/services/medical-records.service';
import { ConsultationTimelineComponent } from '../consultation-timeline/consultation-timeline.component';
import { VitalsTrendChartComponent } from '../../../doctor/components/vitals-trend-chart/vitals-trend-chart.component';
import { IonBadge, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonTextarea } from '@ionic/angular/standalone';

@Component({
  selector: 'app-medical-records-tab',
  standalone: true,
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    ReactiveFormsModule,
    ConsultationTimelineComponent,
    VitalsTrendChartComponent,
    IonBadge,
    IonInput,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonTextarea
  ],
  template: `
    <div class="records-shell">
      <app-consultation-timeline [consultations]="consultations"></app-consultation-timeline>

      <section class="clinic-card section-card">
        <div class="section-card__head">
          <h3>Prescriptions</h3>
          <p>Read-only prescription history.</p>
        </div>

        <article class="record-item" *ngFor="let prescription of prescriptions">
          <strong>{{ prescription.issuedAt | date : 'MMMM d, y (EEE)' }}</strong>
          <p>{{ prescription.items.length }} medicine(s) • {{ prescription.status }}</p>
        </article>
        <p *ngIf="prescriptions.length === 0" class="muted-copy">No prescriptions recorded.</p>
      </section>

      <section class="clinic-card section-card">
        <div class="section-card__head">
          <h3>Allergies</h3>
          <p>Current allergy list. New entries are saved to the mock store.</p>
        </div>

        <article class="record-item" *ngFor="let allergy of allergies">
          <strong>{{ allergy.allergen }}</strong>
          <p>{{ allergy.reaction }} • {{ allergy.severity }}</p>
        </article>
        <p *ngIf="allergies.length === 0" class="muted-copy">No allergies recorded.</p>

        <form class="mini-form" [formGroup]="allergyForm">
          <ion-item class="field">
            <ion-label position="stacked">Allergen</ion-label>
            <ion-input formControlName="allergen"></ion-input>
          </ion-item>
          <ion-item class="field">
            <ion-label position="stacked">Reaction</ion-label>
            <ion-input formControlName="reaction"></ion-input>
          </ion-item>
          <ion-item class="field">
            <ion-label position="stacked">Severity</ion-label>
            <ion-select formControlName="severity" interface="popover">
              <ion-select-option value="Mild">Mild</ion-select-option>
              <ion-select-option value="Moderate">Moderate</ion-select-option>
              <ion-select-option value="Severe">Severe</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item class="field field--full">
            <ion-label position="stacked">Notes</ion-label>
            <ion-textarea formControlName="notes"></ion-textarea>
          </ion-item>
          <button type="button" class="btn-outline" (click)="addAllergyEntry()">Add Allergy</button>
        </form>
      </section>

      <section class="clinic-card section-card">
        <div class="section-card__head">
          <h3>Lab Results</h3>
          <p>Latest attachments stored as mock file names only.</p>
        </div>

        <article class="record-item" *ngFor="let labResult of labResults">
          <strong>{{ labResult.fileName }}</strong>
          <p>{{ labResult.resultDate | date : 'MMMM d, y (EEE)' }} • {{ labResult.notes || 'No notes' }}</p>
        </article>
        <p *ngIf="labResults.length === 0" class="muted-copy">No lab results recorded.</p>

        <form class="mini-form" [formGroup]="labResultForm">
          <ion-item class="field">
            <ion-label position="stacked">Lab Request ID</ion-label>
            <ion-input formControlName="labRequestId"></ion-input>
          </ion-item>
          <ion-item class="field">
            <ion-label position="stacked">File Name</ion-label>
            <ion-input formControlName="fileName"></ion-input>
          </ion-item>
          <ion-item class="field field--full">
            <ion-label position="stacked">Notes</ion-label>
            <ion-textarea formControlName="notes"></ion-textarea>
          </ion-item>
          <button type="button" class="btn-outline" (click)="addLabResultEntry()">Add Lab Result</button>
        </form>
      </section>

      <section class="clinic-card section-card">
        <div class="section-card__head">
          <h3>Vaccinations</h3>
          <p>Recorded immunizations.</p>
        </div>

        <article class="record-item" *ngFor="let vaccination of vaccinations">
          <strong>{{ vaccination.vaccineName }}</strong>
          <p>{{ vaccination.dateGiven | date : 'MMMM d, y (EEE)' }} • {{ vaccination.doseNumber || 'Dose n/a' }}</p>
        </article>
        <p *ngIf="vaccinations.length === 0" class="muted-copy">No vaccination records.</p>

        <form class="mini-form" [formGroup]="vaccinationForm">
          <ion-item class="field">
            <ion-label position="stacked">Vaccine Name</ion-label>
            <ion-input formControlName="vaccineName"></ion-input>
          </ion-item>
          <ion-item class="field">
            <ion-label position="stacked">Date Given</ion-label>
            <ion-input type="date" formControlName="dateGiven"></ion-input>
          </ion-item>
          <ion-item class="field">
            <ion-label position="stacked">Remarks</ion-label>
            <ion-textarea formControlName="remarks"></ion-textarea>
          </ion-item>
          <button type="button" class="btn-outline" (click)="addVaccinationEntry()">Add Vaccination</button>
        </form>
      </section>

      <app-vitals-trend-chart [consultations]="consultations"></app-vitals-trend-chart>

      <section class="clinic-card section-card">
        <div class="section-card__head">
          <h3>Follow-Ups</h3>
          <p>Pending follow-up reminders.</p>
        </div>
        <article class="record-item" *ngFor="let followUp of followUps">
          <strong>{{ followUp.followUpDate | date : 'MMMM d, y (EEE)' }}</strong>
          <p>{{ followUp.reason }} • {{ followUp.status }}</p>
        </article>
        <p *ngIf="followUps.length === 0" class="muted-copy">No follow-ups scheduled.</p>
      </section>
    </div>
  `,
  styleUrl: './medical-records-tab.component.scss'
})
export class MedicalRecordsTabComponent implements OnChanges {
  @Input() patientId = '';
  @Input() consultations: Consultation[] = [];
  @Input() prescriptions: Prescription[] = [];
  @Input() allergies: Allergy[] = [];
  @Input() labResults: LabResult[] = [];
  @Input() vaccinations: VaccinationRecord[] = [];
  @Input() followUps: FollowUp[] = [];

  private readonly fb = inject(FormBuilder);
  private readonly medicalRecords = inject(MedicalRecordsService);

  readonly allergyForm = this.fb.group({
    allergen: ['', Validators.required],
    reaction: ['', Validators.required],
    severity: ['Moderate', Validators.required],
    notes: ['']
  });

  readonly labResultForm = this.fb.group({
    labRequestId: [''],
    fileName: ['', Validators.required],
    notes: ['']
  });

  readonly vaccinationForm = this.fb.group({
    vaccineName: ['', Validators.required],
    dateGiven: ['', Validators.required],
    remarks: ['']
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId']) {
      this.allergyForm.enable({ emitEvent: false });
      this.labResultForm.enable({ emitEvent: false });
      this.vaccinationForm.enable({ emitEvent: false });
    }
  }

  addAllergyEntry(): void {
    if (!this.patientId || this.allergyForm.invalid) {
      return;
    }
    const value = this.allergyForm.getRawValue();
    this.medicalRecords.addAllergy({
          id: `allergy-${Date.now()}`,
          patientId: this.patientId,
          allergen: value.allergen ?? '',
          reaction: value.reaction ?? '',
          severity: (value.severity as Allergy['severity']) ?? 'Moderate',
          notes: value.notes ?? ''
        });
    this.allergyForm.reset({ severity: 'Moderate' });
  }

  addLabResultEntry(): void {
    if (!this.patientId || this.labResultForm.invalid) {
      return;
    }
    const value = this.labResultForm.getRawValue();
    this.medicalRecords.addLabResult({
          id: `labres-${Date.now()}`,
          labRequestId: value.labRequestId || `manual-${Date.now()}`,
          patientId: this.patientId,
          fileName: value.fileName ?? '',
          resultDate: new Date().toISOString(),
          notes: value.notes ?? ''
        });
    this.labResultForm.reset();
  }

  addVaccinationEntry(): void {
    if (!this.patientId || this.vaccinationForm.invalid) {
      return;
    }
    const value = this.vaccinationForm.getRawValue();
    this.medicalRecords.addVaccinationRecord({
          id: `vac-${Date.now()}`,
          patientId: this.patientId,
          vaccineName: value.vaccineName ?? '',
          dateGiven: value.dateGiven ?? '',
          remarks: value.remarks ?? ''
        });
    this.vaccinationForm.reset();
  }
}
