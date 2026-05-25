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
      <!-- ═══ VITALS BAR — compact row of pills ═══ -->
      <div class="cs-vitals-bar" *ngIf="hasVitals">
        <span class="cs-vitals-bar__title">Vitals</span>
        <span class="cs-vitals-bar__item" *ngIf="vitals?.bloodPressureSystolic || vitals?.bloodPressureDiastolic">
          <span class="cs-vitals-bar__lbl">BP</span>
          {{ vitals?.bloodPressureSystolic ?? '--' }}/{{ vitals?.bloodPressureDiastolic ?? '--' }}
        </span>
        <span class="cs-vitals-bar__item" *ngIf="vitals?.heartRate">
          <span class="cs-vitals-bar__lbl">HR</span> {{ vitals?.heartRate }}
        </span>
        <span class="cs-vitals-bar__item" *ngIf="vitals?.respiratoryRate">
          <span class="cs-vitals-bar__lbl">RR</span> {{ vitals?.respiratoryRate }}
        </span>
        <span class="cs-vitals-bar__item" *ngIf="vitals?.temperatureCelsius">
          <span class="cs-vitals-bar__lbl">Temp</span> {{ vitals?.temperatureCelsius }}°
        </span>
        <span class="cs-vitals-bar__item" *ngIf="vitals?.oxygenSaturation">
          <span class="cs-vitals-bar__lbl">SpO2</span> {{ vitals?.oxygenSaturation }}%
        </span>
        <span class="cs-vitals-bar__item" *ngIf="vitals?.weightKg">
          <span class="cs-vitals-bar__lbl">Wt</span> {{ vitals?.weightKg }} kg
        </span>
        <span class="cs-vitals-bar__item" *ngIf="vitals?.heightCm">
          <span class="cs-vitals-bar__lbl">Ht</span> {{ vitals?.heightCm }} cm
        </span>
        <span class="cs-vitals-bar__item" *ngIf="vitals?.bmi">
          <span class="cs-vitals-bar__lbl">BMI</span> {{ vitals?.bmi }}
        </span>
        <span class="cs-vitals-bar__item cs-vitals-bar__item--pain" *ngIf="vitals?.painScore !== undefined && vitals?.painScore !== null">
          <span class="cs-vitals-bar__lbl">Pain</span> {{ vitals?.painScore }}/10
        </span>
      </div>

      <!-- ═══ MAIN TWO-COLUMN LAYOUT ═══ -->
      <div class="cs-main">

        <!-- LEFT COLUMN — SOAP Notes (tall text) -->
        <div class="cs-col cs-col--soap">
          <!-- SOAP Notes -->
          <div class="cs-card cs-card--soap" *ngIf="hasSoap; else noSoap">
            <div class="cs-card__accent"></div>
            <div class="cs-card__body">
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
        </div>

        <!-- RIGHT COLUMN — Diagnoses + Rx + Follow-Up -->
        <div class="cs-col cs-col--side">

          <!-- Diagnoses -->
          <div class="cs-card cs-card--diagnosis">
            <div class="cs-card__accent"></div>
            <div class="cs-card__body">
              <div class="cs-card__bar">
                <h4 class="cs-card__title">Diagnoses</h4>
                <span class="cs-card__count">{{ diagnoses.length }}</span>
              </div>
              <table class="cs-tbl" *ngIf="diagnoses.length > 0">
                <thead><tr><th>Code</th><th>Description</th><th>Type</th></tr></thead>
                <tbody>
                  <tr *ngFor="let d of diagnoses">
                    <td class="cs-tbl__code">{{ d.code || '—' }}</td>
                    <td>{{ d.description }}</td>
                    <td><span class="cs-badge" [class.cs-badge--primary]="d.type === 'Primary'">{{ d.type || 'Secondary' }}</span></td>
                  </tr>
                </tbody>
              </table>
              <p class="cs-empty" *ngIf="diagnoses.length === 0">None recorded.</p>
            </div>
          </div>

          <!-- Prescription (collapsible — can grow) -->
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

      <!-- ═══ BOTTOM ROW — Labs | Allergies | Vaccines ═══ -->
      <div class="cs-bottom">
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
                  <td><span class="cs-badge" [class.cs-badge--danger]="allergy.severity === 'Severe'" [class.cs-badge--warn]="allergy.severity === 'Moderate'">{{ allergy.severity || '—' }}</span></td>
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
  `,
  styles: [`
    :host { display: block; }

    /* ═══════════════════════════════════════════════════
       VITALS BAR — compact inline row
       ═══════════════════════════════════════════════════ */
    .cs-vitals-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 10px 16px; background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%); border-radius: var(--radius-lg); color: #fff; }
    .cs-vitals-bar__title { font-size: .65rem; text-transform: uppercase; letter-spacing: .06em; font-weight: 700; opacity: .7; margin-right: 4px; }
    .cs-vitals-bar__item { display: inline-flex; align-items: baseline; gap: 3px; font-size: .82rem; font-weight: 600; padding: 2px 8px; background: rgba(255,255,255,.12); border-radius: 6px; white-space: nowrap; }
    .cs-vitals-bar__lbl { font-size: .6rem; text-transform: uppercase; letter-spacing: .04em; font-weight: 700; opacity: .7; }
    .cs-vitals-bar__item--pain { background: rgba(239,68,68,.35); }

    /* ═══════════════════════════════════════════════════
       MAIN TWO-COLUMN LAYOUT
       ═══════════════════════════════════════════════════ */
    .cs-main { display: grid; grid-template-columns: 1fr 320px; gap: var(--space-3); align-items: start; }
    @media (max-width: 860px) { .cs-main { grid-template-columns: 1fr; } }
    .cs-col { display: flex; flex-direction: column; gap: var(--space-3); }

    /* ═══════════════════════════════════════════════════
       CARDS (shared)
       ═══════════════════════════════════════════════════ */
    .cs-card { display: flex; background: #fff; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
    .cs-card__accent { width: 4px; flex-shrink: 0; }
    .cs-card__body { flex: 1; min-width: 0; padding: 12px 14px; }
    .cs-card__body--empty { font-style: italic; color: #94a3b8; font-size: var(--text-sm); }
    .cs-card__bar { display: flex; align-items: center; gap: var(--space-2); margin-bottom: 8px; }
    .cs-card__bar--clickable { cursor: pointer; user-select: none; }
    .cs-card__bar--clickable:hover { opacity: .7; }
    .cs-card__title { margin: 0; font-size: .78rem; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: .04em; flex: 1; }
    .cs-card__right { display: flex; align-items: center; gap: 4px; }
    .cs-card__count { font-size: .65rem; font-weight: 700; color: #64748b; background: #f1f5f9; border-radius: 10px; padding: 0 7px; line-height: 18px; }
    .cs-card__chevron { color: #94a3b8; transition: transform .2s; flex-shrink: 0; }
    .cs-card--collapsed .cs-card__chevron { transform: rotate(-90deg); }
    .cs-card--collapsed .cs-card__body-inner { display: none; }

    /* Section accent colors */
    .cs-card--soap .cs-card__accent { background: #8b5cf6; }
    .cs-card--diagnosis .cs-card__accent { background: #f59e0b; }
    .cs-card--rx .cs-card__accent { background: #10b981; }
    .cs-card--lab .cs-card__accent { background: #06b6d4; }
    .cs-card--fu .cs-card__accent { background: #6366f1; }
    .cs-card--allergy .cs-card__accent { background: #ef4444; }
    .cs-card--vax .cs-card__accent { background: #14b8a6; }

    /* ═══════════════════════════════════════════════════
       SOAP
       ═══════════════════════════════════════════════════ */
    .cs-soap__block { display: flex; gap: 8px; margin-bottom: 6px; }
    .cs-soap__block:last-child { margin-bottom: 0; }
    .cs-soap__badge { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; font-size: .6rem; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
    .cs-soap__badge--cc { background: #fef3c7; color: #92400e; }
    .cs-soap__badge--s  { background: #dbeafe; color: #1e40af; }
    .cs-soap__badge--o  { background: #d1fae5; color: #065f46; }
    .cs-soap__badge--a  { background: #ede9fe; color: #5b21b6; }
    .cs-soap__badge--p  { background: #fce7f3; color: #9d174d; }
    .cs-soap__content { flex: 1; padding: 6px 10px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: var(--radius-md); }
    .cs-soap__label { font-size: .6rem; text-transform: uppercase; letter-spacing: .05em; color: #64748b; font-weight: 700; margin-bottom: 1px; }
    .cs-text { margin: 0; white-space: pre-wrap; line-height: 1.55; color: #334155; font-size: var(--text-sm); }

    /* ═══════════════════════════════════════════════════
       TABLES (compact)
       ═══════════════════════════════════════════════════ */
    .cs-tbl { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
    .cs-tbl thead { border-bottom: 1.5px solid #e2e8f0; }
    .cs-tbl th { text-align: left; padding: 3px 6px; font-size: .6rem; text-transform: uppercase; letter-spacing: .05em; color: #64748b; font-weight: 700; background: #f8fafc; white-space: nowrap; }
    .cs-tbl td { padding: 4px 6px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
    .cs-tbl tbody tr:last-child td { border-bottom: none; }
    .cs-tbl tbody tr:hover { background: #f8fafc; }
    .cs-tbl__code { font-family: 'SF Mono','Fira Code',monospace; color: #64748b; font-size: .72rem; }
    .cs-tbl__muted { color: #64748b; }
    .cs-tbl__num { text-align: center; }

    .cs-empty { color: #94a3b8; font-style: italic; margin: 0; font-size: .74rem; }
    .cs-badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: .65rem; font-weight: 600; background: #f1f5f9; color: #475569; white-space: nowrap; }
    .cs-badge--primary { background: #dbeafe; color: #1d4ed8; }
    .cs-badge--warn { background: #fef3c7; color: #92400e; }
    .cs-badge--danger { background: #fee2e2; color: #dc2626; }

    /* ═══════════════════════════════════════════════════
       FOLLOW-UP
       ═══════════════════════════════════════════════════ */
    .cs-fu__date { font-size: .9rem; font-weight: 700; color: #4338ca; }

    /* ═══════════════════════════════════════════════════
       BOTTOM ROW — labs | allergies | vaccines
       ═══════════════════════════════════════════════════ */
    .cs-bottom { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
    @media (max-width: 860px) { .cs-bottom { grid-template-columns: 1fr; } }
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
