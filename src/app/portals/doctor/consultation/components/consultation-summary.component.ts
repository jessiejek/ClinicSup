import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ConsultationPageVm } from '../doctor-consultation.types';
import { Allergy, Diagnosis, FollowUp, LabRequest, PrescriptionItem, VitalSigns } from '../../../../core/models';

@Component({
  selector: 'app-consultation-summary',
  standalone: true,
  imports: [DatePipe, NgIf, NgFor],
  template: `
    <div class="cs">
      <!-- Vital Signs -->
      <section class="cs-section clinic-card">
        <h3 class="cs-section__title">Vital Signs</h3>
        <div class="cs-grid cs-grid--4">
          <div class="cs-item" *ngIf="vitals?.bloodPressureSystolic || vitals?.bloodPressureDiastolic">
            <span class="cs-item__label">Blood Pressure</span>
            <span class="cs-item__value">{{ vitals?.bloodPressureSystolic ?? '--' }}/{{ vitals?.bloodPressureDiastolic ?? '--' }} mmHg</span>
          </div>
          <div class="cs-item" *ngIf="vitals?.heartRate">
            <span class="cs-item__label">Heart Rate</span>
            <span class="cs-item__value">{{ vitals?.heartRate }} bpm</span>
          </div>
          <div class="cs-item" *ngIf="vitals?.respiratoryRate">
            <span class="cs-item__label">Respiratory Rate</span>
            <span class="cs-item__value">{{ vitals?.respiratoryRate }} /min</span>
          </div>
          <div class="cs-item" *ngIf="vitals?.temperatureCelsius">
            <span class="cs-item__label">Temperature</span>
            <span class="cs-item__value">{{ vitals?.temperatureCelsius }} °C</span>
          </div>
          <div class="cs-item" *ngIf="vitals?.oxygenSaturation">
            <span class="cs-item__label">O2 Saturation</span>
            <span class="cs-item__value">{{ vitals?.oxygenSaturation }}%</span>
          </div>
          <div class="cs-item" *ngIf="vitals?.weightKg">
            <span class="cs-item__label">Weight</span>
            <span class="cs-item__value">{{ vitals?.weightKg }} kg</span>
          </div>
          <div class="cs-item" *ngIf="vitals?.heightCm">
            <span class="cs-item__label">Height</span>
            <span class="cs-item__value">{{ vitals?.heightCm }} cm</span>
          </div>
          <div class="cs-item" *ngIf="vitals?.bmi">
            <span class="cs-item__label">BMI</span>
            <span class="cs-item__value">{{ vitals?.bmi }}</span>
          </div>
          <div class="cs-item" *ngIf="vitals?.painScore !== undefined && vitals?.painScore !== null">
            <span class="cs-item__label">Pain Score</span>
            <span class="cs-item__value">{{ vitals?.painScore }}/10</span>
          </div>
        </div>
        <p class="cs-empty" *ngIf="!hasVitals">No vital signs recorded.</p>
      </section>

      <!-- SOAP -->
      <section class="cs-section clinic-card">
        <h3 class="cs-section__title">SOAP Notes</h3>
        <div class="cs-soap">
          <div class="cs-soap__block" *ngIf="vm.consultation?.chiefComplaint">
            <span class="cs-item__label">Chief Complaint</span>
            <p class="cs-text">{{ vm.consultation?.chiefComplaint }}</p>
          </div>
          <div class="cs-soap__block" *ngIf="vm.consultation?.subjective">
            <span class="cs-item__label">Subjective</span>
            <p class="cs-text">{{ vm.consultation?.subjective }}</p>
          </div>
          <div class="cs-soap__block" *ngIf="vm.consultation?.objective">
            <span class="cs-item__label">Objective</span>
            <p class="cs-text">{{ vm.consultation?.objective }}</p>
          </div>
          <div class="cs-soap__block" *ngIf="vm.consultation?.assessment">
            <span class="cs-item__label">Assessment</span>
            <p class="cs-text">{{ vm.consultation?.assessment }}</p>
          </div>
          <div class="cs-soap__block" *ngIf="vm.consultation?.plan">
            <span class="cs-item__label">Plan</span>
            <p class="cs-text">{{ vm.consultation?.plan }}</p>
          </div>
        </div>
        <p class="cs-empty" *ngIf="!hasSoap">No SOAP notes recorded.</p>
      </section>

      <!-- Diagnoses -->
      <section class="cs-section clinic-card">
        <h3 class="cs-section__title">Diagnoses</h3>
        <div class="cs-table" *ngIf="diagnoses.length > 0">
          <div class="cs-table__row cs-table__header">
            <span class="cs-table__code">Code</span>
            <span class="cs-table__desc">Description</span>
            <span class="cs-table__type">Type</span>
          </div>
          <div class="cs-table__row" *ngFor="let d of diagnoses">
            <span class="cs-table__code">{{ d.code || '--' }}</span>
            <span class="cs-table__desc">{{ d.description }}</span>
            <span class="cs-table__type">
              <span class="cs-badge" [class.cs-badge--primary]="d.type === 'Primary'">{{ d.type || 'Secondary' }}</span>
            </span>
          </div>
        </div>
        <p class="cs-empty" *ngIf="diagnoses.length === 0">No diagnoses recorded.</p>
      </section>

      <!-- Prescription -->
      <section class="cs-section clinic-card">
        <h3 class="cs-section__title">Prescription</h3>
        <div class="cs-table" *ngIf="prescriptionItems.length > 0">
          <div class="cs-table__row cs-table__header">
            <span class="cs-table__med">Medication</span>
            <span class="cs-table__str">Strength</span>
            <span class="cs-table__dos">Dosage</span>
            <span class="cs-table__qty">Qty</span>
            <span class="cs-table__dur">Duration</span>
          </div>
          <div class="cs-table__row" *ngFor="let item of prescriptionItems">
            <span class="cs-table__med">{{ item.medicineName }}</span>
            <span class="cs-table__str">{{ item.strength || '--' }}</span>
            <span class="cs-table__dos">{{ item.sig || '--' }}</span>
            <span class="cs-table__qty">{{ item.quantity }}</span>
            <span class="cs-table__dur">{{ item.duration || '--' }}</span>
          </div>
        </div>
        <p class="cs-empty" *ngIf="prescriptionItems.length === 0">No prescriptions recorded.</p>
      </section>

      <!-- Lab Requests -->
      <section class="cs-section clinic-card">
        <h3 class="cs-section__title">Lab Requests</h3>
        <div class="cs-table" *ngIf="labRequests.length > 0">
          <div class="cs-table__row cs-table__header">
            <span class="cs-table__test">Test Name</span>
            <span class="cs-table__reason">Reason</span>
            <span class="cs-table__status">Status</span>
          </div>
          <div class="cs-table__row" *ngFor="let request of labRequests">
            <span class="cs-table__test">{{ request.testName || '' }}</span>
            <span class="cs-table__reason">{{ request.reason || '--' }}</span>
            <span class="cs-table__status">{{ request.status || 'Requested' }}</span>
          </div>
        </div>
        <p class="cs-empty" *ngIf="labRequests.length === 0">No lab requests recorded.</p>
      </section>

      <!-- Follow-Up -->
      <section class="cs-section clinic-card">
        <h3 class="cs-section__title">Follow-Up</h3>
        <div *ngIf="followUpDate" class="cs-item">
          <span class="cs-item__label">Follow-Up Date</span>
          <span class="cs-item__value">{{ followUpDate | date:'MMM d, y' }}</span>
        </div>
        <p class="cs-empty" *ngIf="!followUpDate">No follow-up scheduled.</p>
      </section>

      <!-- Allergies -->
      <section class="cs-section clinic-card">
        <h3 class="cs-section__title">Allergies</h3>
        <div class="cs-table" *ngIf="vm.allergies.length > 0">
          <div class="cs-table__row cs-table__header">
            <span class="cs-table__desc">Allergen</span>
            <span class="cs-table__status">Severity</span>
          </div>
          <div class="cs-table__row" *ngFor="let allergy of vm.allergies">
            <span class="cs-table__desc">{{ allergy.allergen }}</span>
            <span class="cs-table__status">{{ allergy.severity || 'Not specified' }}</span>
          </div>
        </div>
        <p class="cs-empty" *ngIf="vm.allergies.length === 0">No allergies on record.</p>
      </section>

      <!-- Vaccinations -->
      <section class="cs-section clinic-card">
        <h3 class="cs-section__title">Vaccinations</h3>
        <div class="cs-table" *ngIf="vm.vaccinations.length > 0">
          <div class="cs-table__row cs-table__header">
            <span class="cs-table__desc">Vaccine</span>
            <span class="cs-table__status">Date Given</span>
          </div>
          <div class="cs-table__row" *ngFor="let vax of vm.vaccinations">
            <span class="cs-table__desc">{{ vax.vaccineName }}</span>
            <span class="cs-table__status">{{ vax.dateGiven | date:'MMM d, y' }}</span>
          </div>
        </div>
        <p class="cs-empty" *ngIf="vm.vaccinations.length === 0">No vaccinations recorded.</p>
      </section>
    </div>
  `,
  styles: [`
    .cs { display: flex; flex-direction: column; gap: var(--space-4); }
    .cs-section { padding: var(--space-4); }
    .cs-section__title { margin: 0 0 var(--space-3); font-size: 1.1rem; font-weight: 600; color: var(--text-primary); }
    .cs-grid { display: grid; gap: var(--space-3); }
    .cs-grid--4 { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
    .cs-item { display: flex; flex-direction: column; gap: 2px; }
    .cs-item__label { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
    .cs-item__value { font-size: 1rem; font-weight: 500; color: var(--text-primary); }
    .cs-text { margin: 0; white-space: pre-wrap; line-height: 1.6; color: var(--text-primary); }
    .cs-soap { display: flex; flex-direction: column; gap: var(--space-3); }
    .cs-soap__block { display: flex; flex-direction: column; gap: 2px; }
    .cs-empty { color: var(--text-muted); font-style: italic; margin: 0; }
    .cs-table { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; }
    .cs-table__row { display: flex; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border-color); align-items: center; }
    .cs-table__header { background: var(--bg-muted); font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
    .cs-table__row:last-child { border-bottom: none; }
    .cs-table__code { flex: 0 0 120px; }
    .cs-table__desc { flex: 1; }
    .cs-table__type { flex: 0 0 100px; }
    .cs-table__med { flex: 1; }
    .cs-table__str { flex: 0 0 80px; }
    .cs-table__dos { flex: 1; }
    .cs-table__qty { flex: 0 0 60px; text-align: center; }
    .cs-table__dur { flex: 0 0 100px; }
    .cs-table__test { flex: 1; }
    .cs-table__reason { flex: 1; }
    .cs-table__status { flex: 0 0 110px; }
    .cs-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; background: var(--bg-muted); color: var(--text-muted); }
    .cs-badge--primary { background: #dbeafe; color: #1d4ed8; }
  `]
})
export class ConsultationSummaryComponent {
  @Input({ required: true }) vm!: ConsultationPageVm;

  get vitals(): VitalSigns | undefined {
    return this.vm.consultation?.vitalSigns;
  }

  get hasVitals(): boolean {
    const v = this.vitals;
    if (!v) return false;
    return [
      v.bloodPressureSystolic, v.bloodPressureDiastolic, v.heartRate,
      v.respiratoryRate, v.temperatureCelsius, v.oxygenSaturation,
      v.weightKg, v.heightCm, v.bmi, v.painScore
    ].some(x => x !== null && x !== undefined);
  }

  get hasSoap(): boolean {
    const c = this.vm.consultation;
    if (!c) return false;
    return !!(c.chiefComplaint || c.subjective || c.objective || c.assessment || c.plan);
  }

  get diagnoses(): Diagnosis[] {
    return this.vm.consultation?.diagnoses ?? [];
  }

  get prescriptionItems(): PrescriptionItem[] {
    return this.vm.existingPrescription?.items ?? [];
  }

  get labRequests(): LabRequest[] {
    return this.vm.labRequests ?? [];
  }

  get followUpDate(): string | null | undefined {
    return this.vm.consultation?.followUpDate || this.vm.followUpDraft?.followUpDate;
  }
}
