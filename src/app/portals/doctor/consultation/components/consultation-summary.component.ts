import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ConsultationPageVm } from '../doctor-consultation.types';
import { Diagnosis, LabRequest, PrescriptionItem, VitalSigns } from '../../../../core/models';

@Component({
  selector: 'app-consultation-summary',
  standalone: true,
  imports: [DatePipe, NgIf, NgFor],
  template: `
    <div class="cs">
      <!-- ═══ TWO-COLUMN CLINICAL GRID ═══ -->
      <div class="cs-grid">
        <!-- ─── LEFT COLUMN: SOAP → Lab → Allergies → Vaccines ─── -->
        <div class="cs-col cs-col--primary">
          <!-- SOAP Notes -->
          <div class="cs-card cs-card--soap" *ngIf="hasSoap; else noSoap">
            <div class="cs-card__accent"></div>
            <div class="cs-card__body">
              <h4 class="cs-card__title">SOAP Notes</h4>
              <div class="cs-soap__block" *ngIf="vm.consultation?.chiefComplaint">
                <span class="cs-soap__badge cs-soap__badge--cc">CC</span>
                <div class="cs-soap__content">
                  <div class="cs-soap__label">Chief Complaint</div>
                  <p class="cs-text">{{ vm.consultation?.chiefComplaint }}</p>
                </div>
              </div>
              <div class="cs-soap__block" *ngIf="vm.consultation?.subjective">
                <span class="cs-soap__badge cs-soap__badge--s">S</span>
                <div class="cs-soap__content">
                  <div class="cs-soap__label">Subjective</div>
                  <p class="cs-text">{{ vm.consultation?.subjective }}</p>
                </div>
              </div>
              <div class="cs-soap__block" *ngIf="vm.consultation?.objective">
                <span class="cs-soap__badge cs-soap__badge--o">O</span>
                <div class="cs-soap__content">
                  <div class="cs-soap__label">Objective</div>
                  <p class="cs-text">{{ vm.consultation?.objective }}</p>
                </div>
              </div>
              <div class="cs-soap__block" *ngIf="vm.consultation?.assessment">
                <span class="cs-soap__badge cs-soap__badge--a">A</span>
                <div class="cs-soap__content">
                  <div class="cs-soap__label">Assessment</div>
                  <p class="cs-text">{{ vm.consultation?.assessment }}</p>
                </div>
              </div>
              <div class="cs-soap__block" *ngIf="vm.consultation?.plan">
                <span class="cs-soap__badge cs-soap__badge--p">P</span>
                <div class="cs-soap__content">
                  <div class="cs-soap__label">Plan</div>
                  <p class="cs-text">{{ vm.consultation?.plan }}</p>
                </div>
              </div>
            </div>
          </div>
          <ng-template #noSoap>
            <div class="cs-card cs-card--soap">
              <div class="cs-card__accent"></div>
              <div class="cs-card__body cs-card__body--empty">No SOAP notes recorded.</div>
            </div>
          </ng-template>

          <!-- Labs + Allergies + Vaccines inline row -->
          <div class="cs-triad">
            <!-- Lab Requests -->
            <div class="cs-card cs-card--lab">
              <div class="cs-card__accent"></div>
              <div class="cs-card__body">
                <h4 class="cs-card__title">Lab Requests</h4>
                <table class="cs-tbl" *ngIf="labRequests.length > 0">
                  <thead><tr><th>Test</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let request of labRequests">
                      <td>{{ request.testName }}</td>
                      <td><span class="cs-badge cs-badge--warn">{{ request.status || 'Requested' }}</span></td>
                    </tr>
                  </tbody>
                </table>
                <p class="cs-empty" *ngIf="labRequests.length === 0">None requested.</p>
              </div>
            </div>

            <!-- Allergies -->
            <div class="cs-card cs-card--allergy">
              <div class="cs-card__accent"></div>
              <div class="cs-card__body">
                <h4 class="cs-card__title">Allergies</h4>
                <table class="cs-tbl" *ngIf="vm.allergies.length > 0">
                  <thead><tr><th>Allergen</th><th>Sev</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let allergy of vm.allergies">
                      <td>{{ allergy.allergen }}</td>
                      <td><span class="cs-badge"
                            [class.cs-badge--danger]="allergy.severity === 'Severe'"
                            [class.cs-badge--warn]="allergy.severity === 'Moderate'">{{ allergy.severity || '—' }}</span></td>
                    </tr>
                  </tbody>
                </table>
                <p class="cs-empty" *ngIf="vm.allergies.length === 0">None recorded.</p>
              </div>
            </div>

            <!-- Vaccinations -->
            <div class="cs-card cs-card--vax">
              <div class="cs-card__accent"></div>
              <div class="cs-card__body">
                <h4 class="cs-card__title">Vaccines</h4>
                <table class="cs-tbl" *ngIf="vm.vaccinations.length > 0">
                  <thead><tr><th>Vaccine</th><th>Date</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let vax of vm.vaccinations">
                      <td>{{ vax.vaccineName }}</td>
                      <td class="cs-tbl__muted">{{ vax.dateGiven | date:'MMM d, y' }}</td>
                    </tr>
                  </tbody>
                </table>
                <p class="cs-empty" *ngIf="vm.vaccinations.length === 0">None recorded.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── RIGHT COLUMN: Vitals → Diagnoses → Rx → Follow-Up ─── -->
        <div class="cs-col cs-col--side">
          <!-- Vitals Card -->
          <div class="cs-card cs-card--vitals" *ngIf="hasVitals">
            <div class="cs-card__accent"></div>
            <div class="cs-card__body">
              <h4 class="cs-card__title">Vital Signs</h4>
              <div class="cs-vitals-grid">
                <div class="cs-vital" *ngIf="vitals?.bloodPressureSystolic || vitals?.bloodPressureDiastolic">
                  <span class="cs-vital__value">{{ vitals?.bloodPressureSystolic ?? '--' }}/{{ vitals?.bloodPressureDiastolic ?? '--' }}</span>
                  <span class="cs-vital__label">BP</span>
                </div>
                <div class="cs-vital" *ngIf="vitals?.heartRate">
                  <span class="cs-vital__value">{{ vitals?.heartRate }}</span>
                  <span class="cs-vital__unit">bpm</span>
                  <span class="cs-vital__label">Heart Rate</span>
                </div>
                <div class="cs-vital" *ngIf="vitals?.respiratoryRate">
                  <span class="cs-vital__value">{{ vitals?.respiratoryRate }}</span>
                  <span class="cs-vital__unit">/min</span>
                  <span class="cs-vital__label">Resp. Rate</span>
                </div>
                <div class="cs-vital" *ngIf="vitals?.temperatureCelsius">
                  <span class="cs-vital__value">{{ vitals?.temperatureCelsius }}<span class="cs-vital__deg">°</span></span>
                  <span class="cs-vital__label">Temperature</span>
                </div>
                <div class="cs-vital" *ngIf="vitals?.oxygenSaturation">
                  <span class="cs-vital__value">{{ vitals?.oxygenSaturation }}<span class="cs-vital__unit">%</span></span>
                  <span class="cs-vital__label">SpO₂</span>
                </div>
                <div class="cs-vital" *ngIf="vitals?.weightKg">
                  <span class="cs-vital__value">{{ vitals?.weightKg }}</span>
                  <span class="cs-vital__unit">kg</span>
                  <span class="cs-vital__label">Weight</span>
                </div>
                <div class="cs-vital" *ngIf="vitals?.heightCm">
                  <span class="cs-vital__value">{{ vitals?.heightCm }}</span>
                  <span class="cs-vital__unit">cm</span>
                  <span class="cs-vital__label">Height</span>
                </div>
                <div class="cs-vital" *ngIf="vitals?.bmi">
                  <span class="cs-vital__value">{{ vitals?.bmi }}</span>
                  <span class="cs-vital__label">BMI</span>
                </div>
                <div class="cs-vital cs-vital--pain" *ngIf="vitals?.painScore !== undefined && vitals?.painScore !== null">
                  <span class="cs-vital__value">{{ vitals?.painScore }}<span class="cs-vital__unit">/10</span></span>
                  <span class="cs-vital__label">Pain Score</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Diagnoses -->
          <div class="cs-card cs-card--diagnosis">
            <div class="cs-card__accent"></div>
            <div class="cs-card__body">
              <div class="cs-card__bar">
                <h4 class="cs-card__title">Diagnoses</h4>
                <span class="cs-card__count">{{ diagnoses.length }}</span>
              </div>
              <div class="cs-tbl-wrap" *ngIf="diagnoses.length > 0">
                <table class="cs-tbl">
                  <thead><tr><th>Code</th><th>Description</th><th>Type</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let d of diagnoses">
                      <td class="cs-tbl__code">{{ d.code || '—' }}</td>
                      <td class="cs-tbl__desc">{{ d.description }}</td>
                      <td><span class="cs-badge" [class.cs-badge--primary]="d.type === 'Primary'">{{ d.type || 'Secondary' }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="cs-empty" *ngIf="diagnoses.length === 0">None recorded.</p>
            </div>
          </div>

          <!-- Prescription (collapsible) -->
          <div class="cs-card cs-card--rx" [class.cs-card--collapsed]="!rxExpanded" *ngIf="prescriptionItems.length > 0">
            <div class="cs-card__accent"></div>
            <div class="cs-card__body">
              <div class="cs-card__bar cs-card__bar--clickable" (click)="rxExpanded = !rxExpanded">
                <h4 class="cs-card__title">Medications</h4>
                <div class="cs-card__right">
                  <span class="cs-card__count">{{ prescriptionItems.length }}</span>
                  <svg class="cs-card__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              <div class="cs-card__body-inner" *ngIf="rxExpanded">
                <div class="cs-tbl-wrap">
                  <table class="cs-tbl">
                    <thead><tr><th>Medication</th><th>Strength</th><th>Dosage</th><th class="cs-tbl__num">Qty</th></tr></thead>
                    <tbody>
                      <tr *ngFor="let item of prescriptionItems">
                        <td><strong>{{ item.medicineName }}</strong></td>
                        <td class="cs-tbl__muted">{{ item.strength || '—' }}</td>
                        <td class="cs-tbl__muted">{{ item.sig || '—' }}</td>
                        <td class="cs-tbl__num">{{ item.quantity }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Follow-Up -->
          <div class="cs-card cs-card--fu" *ngIf="followUpDate; else noFu">
            <div class="cs-card__accent"></div>
            <div class="cs-card__body">
              <div class="cs-card__bar">
                <h4 class="cs-card__title">Follow-Up</h4>
              </div>
              <div class="cs-fu__date">{{ followUpDate | date:'MMM d, y' }}</div>
            </div>
          </div>
          <ng-template #noFu><div></div></ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ═══════════════════════════════════════════════════════════
       TWO-COLUMN CLINICAL GRID
       Left (main): SOAP + Lab + Allergies + Vaccines
       Right (side): Vitals + Diagnoses + Rx + Follow-Up
       ═══════════════════════════════════════════════════════════ */
    .cs-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(360px, 0.8fr);
      gap: var(--space-4);
      align-items: start;
    }

    .cs-col { display: flex; flex-direction: column; gap: var(--space-4); }

    /* ═══════════════════════════════════════════════════════════
       CARDS (shared)
       ═══════════════════════════════════════════════════════════ */
    .cs-card {
      display: flex;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .cs-card__accent { width: 4px; flex-shrink: 0; }
    .cs-card__body { flex: 1; min-width: 0; padding: 16px 18px; }
    .cs-card__body--empty { font-style: italic; color: #94a3b8; font-size: var(--text-sm); padding: 24px 18px; }
    .cs-card__bar { display: flex; align-items: center; gap: var(--space-2); margin-bottom: 10px; }
    .cs-card__bar--clickable { cursor: pointer; user-select: none; }
    .cs-card__bar--clickable:hover { opacity: 0.7; }
    .cs-card__title {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 700;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      flex: 1;
    }
    .cs-card__right { display: flex; align-items: center; gap: 4px; }
    .cs-card__count {
      font-size: 0.65rem; font-weight: 700; color: #64748b;
      background: #f1f5f9; border-radius: 10px; padding: 0 7px; line-height: 18px;
    }
    .cs-card__chevron { color: #94a3b8; transition: transform 0.2s; flex-shrink: 0; }
    .cs-card--collapsed .cs-card__chevron { transform: rotate(-90deg); }
    .cs-card--collapsed .cs-card__body-inner { display: none; }

    /* Accent colors */
    .cs-card--soap .cs-card__accent { background: #8b5cf6; }
    .cs-card--vitals .cs-card__accent { background: #1e40af; }
    .cs-card--diagnosis .cs-card__accent { background: #f59e0b; }
    .cs-card--rx .cs-card__accent { background: #10b981; }
    .cs-card--lab .cs-card__accent { background: #06b6d4; }
    .cs-card--allergy .cs-card__accent { background: #ef4444; }
    .cs-card--vax .cs-card__accent { background: #14b8a6; }
    .cs-card--fu .cs-card__accent { background: #6366f1; }

    /* ═══════════════════════════════════════════════════════════
       VITALS CARD — chip grid
       ═══════════════════════════════════════════════════════════ */
    .cs-vitals-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .cs-vital {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 10px 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-md);
      text-align: center;
      gap: 1px;
    }
    .cs-vital__value {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.2;
    }
    .cs-vital__unit {
      font-size: 0.6rem;
      font-weight: 600;
      color: #94a3b8;
      margin-left: 1px;
    }
    .cs-vital__deg { font-size: 0.75rem; vertical-align: top; }
    .cs-vital__label {
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      font-weight: 600;
    }
    .cs-vital--pain { background: #fef2f2; border-color: #fecaca; }
    .cs-vital--pain .cs-vital__value { color: #dc2626; }
    .cs-vital--pain .cs-vital__label { color: #dc2626; }

    /* ═══════════════════════════════════════════════════════════
       SOAP NOTES
       ═══════════════════════════════════════════════════════════ */
    .cs-soap__block { display: flex; gap: 10px; margin-bottom: 10px; }
    .cs-soap__block:last-child { margin-bottom: 0; }
    .cs-soap__badge {
      display: flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 50%;
      font-size: 0.65rem; font-weight: 700; flex-shrink: 0; margin-top: 2px;
    }
    .cs-soap__badge--cc { background: #fef3c7; color: #92400e; }
    .cs-soap__badge--s  { background: #dbeafe; color: #1e40af; }
    .cs-soap__badge--o  { background: #d1fae5; color: #065f46; }
    .cs-soap__badge--a  { background: #ede9fe; color: #5b21b6; }
    .cs-soap__badge--p  { background: #fce7f3; color: #9d174d; }
    .cs-soap__content {
      flex: 1;
      padding: 8px 12px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: var(--radius-md);
    }
    .cs-soap__label {
      font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em;
      color: #64748b; font-weight: 700; margin-bottom: 2px;
    }
    .cs-text {
      margin: 0; white-space: pre-wrap; line-height: 1.6;
      color: #334155; font-size: var(--text-base);
    }

    /* ═══════════════════════════════════════════════════════════
       BOTTOM TRIAD — Lab | Allergies | Vaccines inline
       ═══════════════════════════════════════════════════════════ */
    .cs-triad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-3);
    }

    /* ═══════════════════════════════════════════════════════════
       TABLES
       ═══════════════════════════════════════════════════════════ */
    .cs-tbl-wrap { overflow-x: auto; }
    .cs-tbl { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
    .cs-tbl thead { border-bottom: 1.5px solid #e2e8f0; }
    .cs-tbl th {
      text-align: left; padding: 5px 8px;
      font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.05em;
      color: #64748b; font-weight: 700; background: #f8fafc; white-space: nowrap;
    }
    .cs-tbl td {
      padding: 6px 8px; border-bottom: 1px solid #f1f5f9;
      color: #334155; vertical-align: middle;
    }
    .cs-tbl tbody tr:last-child td { border-bottom: none; }
    .cs-tbl tbody tr:hover { background: #f8fafc; }
    .cs-tbl__code { font-family: 'SF Mono','Fira Code',monospace; color: #64748b; font-size: 0.75rem; white-space: nowrap; }
    .cs-tbl__desc { min-width: 140px; }
    .cs-tbl__muted { color: #64748b; }
    .cs-tbl__num { text-align: center; white-space: nowrap; }

    .cs-empty { color: #94a3b8; font-style: italic; margin: 0; font-size: 0.76rem; }
    .cs-badge {
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      font-size: 0.65rem; font-weight: 600;
      background: #f1f5f9; color: #475569; white-space: nowrap;
    }
    .cs-badge--primary { background: #dbeafe; color: #1d4ed8; }
    .cs-badge--warn { background: #fef3c7; color: #92400e; }
    .cs-badge--danger { background: #fee2e2; color: #dc2626; }

    /* ═══════════════════════════════════════════════════════════
       FOLLOW-UP
       ═══════════════════════════════════════════════════════════ */
    .cs-fu__date {
      font-size: 1rem; font-weight: 700; color: #4338ca;
      padding: 4px 0 2px;
    }

    /* ═══════════════════════════════════════════════════════════
       RESPONSIVE
       ═══════════════════════════════════════════════════════════ */

    /* 1440px+ desktop: default grid above is fine */

    /* 1366px small laptop: keep grid, slightly tighter */
    @media (max-width: 1400px) {
      .cs-grid { gap: var(--space-3); }
    }

    /* 1024px tablet landscape: single column */
    @media (max-width: 1024px) {
      .cs-grid {
        grid-template-columns: 1fr;
        gap: var(--space-4);
      }
      .cs-vitals-grid { grid-template-columns: repeat(3, 1fr); }
    }

    /* 768px tablet: wider vitals grid */
    @media (max-width: 768px) {
      .cs-vitals-grid { grid-template-columns: repeat(2, 1fr); }
      .cs-triad { grid-template-columns: 1fr; }
      .cs-card__body { padding: 12px 14px; }
    }

    /* 390px mobile: stack everything */
    @media (max-width: 480px) {
      .cs-grid { gap: var(--space-3); }
      .cs-vitals-grid { grid-template-columns: repeat(2, 1fr); }
      .cs-triad { grid-template-columns: 1fr; gap: var(--space-3); }
      .cs-soap__content { padding: 6px 10px; }
      .cs-card__body { padding: 10px 12px; }
      .cs-text { font-size: var(--text-sm); }
    }
  `]
})
export class ConsultationSummaryComponent {
  @Input({ required: true }) vm!: ConsultationPageVm;

  rxExpanded = true;

  get vitals(): VitalSigns | undefined { return this.vm.consultation?.vitalSigns; }

  get hasVitals(): boolean {
    const v = this.vitals; if (!v) return false;
    return [v.bloodPressureSystolic, v.bloodPressureDiastolic, v.heartRate, v.respiratoryRate,
      v.temperatureCelsius, v.oxygenSaturation, v.weightKg, v.heightCm, v.bmi, v.painScore]
      .some(x => x !== null && x !== undefined);
  }

  get hasSoap(): boolean {
    const c = this.vm.consultation; if (!c) return false;
    return !!(c.chiefComplaint || c.subjective || c.objective || c.assessment || c.plan);
  }

  get diagnoses(): Diagnosis[] { return this.vm.consultation?.diagnoses ?? []; }
  get prescriptionItems(): PrescriptionItem[] { return this.vm.existingPrescription?.items ?? []; }
  get labRequests(): LabRequest[] { return this.vm.labRequests ?? []; }
  get followUpDate(): string | null | undefined { return this.vm.consultation?.followUpDate || this.vm.followUpDraft?.followUpDate; }
}
