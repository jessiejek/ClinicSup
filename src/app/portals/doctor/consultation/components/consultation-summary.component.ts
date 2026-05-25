import { DatePipe, NgFor, NgIf, NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ConsultationPageVm } from '../doctor-consultation.types';
import { Allergy, Diagnosis, FollowUp, LabRequest, PrescriptionItem, VitalSigns } from '../../../../core/models';

interface NavItem {
  id: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-consultation-summary',
  standalone: true,
  imports: [DatePipe, NgIf, NgFor, NgClass],
  template: `
    <div class="cs">
      <!-- Anchor Nav -->
      <nav class="cs-nav" *ngIf="navItems.length > 0">
        <button class="cs-nav__toggle" (click)="toggleAll()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          {{ allExpanded ? 'Collapse All' : 'Expand All' }}
        </button>
        <div class="cs-nav__links">
          <a *ngFor="let item of navItems" class="cs-nav__link" [class.cs-nav__link--active]="activeSection === item.id" (click)="scrollTo(item.id); $event.preventDefault()" href="#cs-{{ item.id }}">
            <span class="cs-nav__dot cs-nav__dot--{{ item.id }}"></span>
            {{ item.label }}
            <span class="cs-nav__count">({{ item.count }})</span>
          </a>
        </div>
      </nav>

      <!-- Vital Signs -->
      <section class="cs-card cs-card--vitals" [class.cs-card--collapsed]="!isExpanded('vitals')" id="cs-vitals">
        <div class="cs-card__accent"></div>
        <div class="cs-card__body">
          <div class="cs-card__header" (click)="toggle('vitals')">
            <h3 class="cs-card__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Vital Signs
              <span class="cs-card__summary" *ngIf="!isExpanded('vitals') && hasVitals">{{ vitalsSummary }}</span>
            </h3>
            <svg class="cs-card__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="cs-card__body-inner" *ngIf="isExpanded('vitals')">
            <div class="cs-grid cs-grid--4" *ngIf="hasVitals">
              <div class="cs-vital" *ngIf="vitals?.bloodPressureSystolic || vitals?.bloodPressureDiastolic">
                <div class="cs-vital__value">{{ vitals?.bloodPressureSystolic ?? '--' }}/{{ vitals?.bloodPressureDiastolic ?? '--' }}</div>
                <div class="cs-vital__label">Blood Pressure</div>
                <div class="cs-vital__unit">mmHg</div>
              </div>
              <div class="cs-vital" *ngIf="vitals?.heartRate">
                <div class="cs-vital__value">{{ vitals?.heartRate }}</div>
                <div class="cs-vital__label">Heart Rate</div>
                <div class="cs-vital__unit">bpm</div>
              </div>
              <div class="cs-vital" *ngIf="vitals?.respiratoryRate">
                <div class="cs-vital__value">{{ vitals?.respiratoryRate }}</div>
                <div class="cs-vital__label">Resp. Rate</div>
                <div class="cs-vital__unit">/min</div>
              </div>
              <div class="cs-vital" *ngIf="vitals?.temperatureCelsius">
                <div class="cs-vital__value">{{ vitals?.temperatureCelsius }}°</div>
                <div class="cs-vital__label">Temperature</div>
                <div class="cs-vital__unit">Celsius</div>
              </div>
              <div class="cs-vital" *ngIf="vitals?.oxygenSaturation">
                <div class="cs-vital__value">{{ vitals?.oxygenSaturation }}<span class="cs-vital__pct">%</span></div>
                <div class="cs-vital__label">O2 Sat</div>
                <div class="cs-vital__unit">SpO2</div>
              </div>
              <div class="cs-vital" *ngIf="vitals?.weightKg">
                <div class="cs-vital__value">{{ vitals?.weightKg }}</div>
                <div class="cs-vital__label">Weight</div>
                <div class="cs-vital__unit">kg</div>
              </div>
              <div class="cs-vital" *ngIf="vitals?.heightCm">
                <div class="cs-vital__value">{{ vitals?.heightCm }}</div>
                <div class="cs-vital__label">Height</div>
                <div class="cs-vital__unit">cm</div>
              </div>
              <div class="cs-vital" *ngIf="vitals?.bmi">
                <div class="cs-vital__value">{{ vitals?.bmi }}</div>
                <div class="cs-vital__label">BMI</div>
                <div class="cs-vital__unit">kg/m²</div>
              </div>
              <div class="cs-vital" *ngIf="vitals?.painScore !== undefined && vitals?.painScore !== null">
                <div class="cs-vital__value cs-vital__value--pain">{{ vitals?.painScore }}<span class="cs-vital__pct">/10</span></div>
                <div class="cs-vital__label">Pain Score</div>
                <div class="cs-vital__unit">Severity</div>
              </div>
            </div>
            <p class="cs-empty" *ngIf="!hasVitals">No vital signs recorded.</p>
          </div>
        </div>
      </section>

      <!-- SOAP Notes -->
      <section class="cs-card cs-card--soap" [class.cs-card--collapsed]="!isExpanded('soap')" id="cs-soap">
        <div class="cs-card__accent"></div>
        <div class="cs-card__body">
          <div class="cs-card__header" (click)="toggle('soap')">
            <h3 class="cs-card__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              SOAP Notes
              <span class="cs-card__summary" *ngIf="!isExpanded('soap') && hasSoap">{{ soapSummary }}</span>
            </h3>
            <svg class="cs-card__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="cs-card__body-inner" *ngIf="isExpanded('soap')">
            <div class="cs-soap" *ngIf="hasSoap">
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
            <p class="cs-empty" *ngIf="!hasSoap">No SOAP notes recorded.</p>
          </div>
        </div>
      </section>

      <!-- Diagnoses -->
      <section class="cs-card cs-card--diagnosis" [class.cs-card--collapsed]="!isExpanded('diagnoses')" id="cs-diagnoses">
        <div class="cs-card__accent"></div>
        <div class="cs-card__body">
          <div class="cs-card__header" (click)="toggle('diagnoses')">
            <h3 class="cs-card__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Diagnoses
              <span class="cs-card__summary" *ngIf="!isExpanded('diagnoses') && diagnoses.length > 0">{{ diagnoses.length }} diagnosis{{ diagnoses.length !== 1 ? 'es' : '' }}</span>
            </h3>
            <svg class="cs-card__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="cs-card__body-inner" *ngIf="isExpanded('diagnoses')">
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
            <p class="cs-empty" *ngIf="diagnoses.length === 0">No diagnoses recorded.</p>
          </div>
        </div>
      </section>

      <!-- Prescription -->
      <section class="cs-card cs-card--rx" [class.cs-card--collapsed]="!isExpanded('rx')" id="cs-rx">
        <div class="cs-card__accent"></div>
        <div class="cs-card__body">
          <div class="cs-card__header" (click)="toggle('rx')">
            <h3 class="cs-card__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M8 3H3v5"/><path d="M21 3l-6.5 18h-3L5 3"/></svg>
              Prescription
              <span class="cs-card__summary" *ngIf="!isExpanded('rx') && prescriptionItems.length > 0">{{ prescriptionItems.length }} item{{ prescriptionItems.length !== 1 ? 's' : '' }}</span>
            </h3>
            <svg class="cs-card__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="cs-card__body-inner" *ngIf="isExpanded('rx')">
            <table class="cs-tbl" *ngIf="prescriptionItems.length > 0">
              <thead><tr><th>Medication</th><th>Strength</th><th>Dosage</th><th class="cs-tbl__num">Qty</th><th>Duration</th></tr></thead>
              <tbody>
                <tr *ngFor="let item of prescriptionItems">
                  <td><strong>{{ item.medicineName }}</strong></td>
                  <td class="cs-tbl__muted">{{ item.strength || '—' }}</td>
                  <td class="cs-tbl__muted">{{ item.sig || '—' }}</td>
                  <td class="cs-tbl__num">{{ item.quantity }}</td>
                  <td class="cs-tbl__muted">{{ item.duration || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p class="cs-empty" *ngIf="prescriptionItems.length === 0">No prescriptions recorded.</p>
          </div>
        </div>
      </section>

      <!-- Lab Requests -->
      <section class="cs-card cs-card--lab" [class.cs-card--collapsed]="!isExpanded('lab')" id="cs-lab">
        <div class="cs-card__accent"></div>
        <div class="cs-card__body">
          <div class="cs-card__header" (click)="toggle('lab')">
            <h3 class="cs-card__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v6l-6 7v4h16v-4l-6-7V2"/><path d="M4.5 16h15"/></svg>
              Lab Requests
              <span class="cs-card__summary" *ngIf="!isExpanded('lab') && labRequests.length > 0">{{ labRequests.length }} request{{ labRequests.length !== 1 ? 's' : '' }}</span>
            </h3>
            <svg class="cs-card__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="cs-card__body-inner" *ngIf="isExpanded('lab')">
            <table class="cs-tbl" *ngIf="labRequests.length > 0">
              <thead><tr><th>Test Name</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                <tr *ngFor="let request of labRequests">
                  <td><strong>{{ request.testName }}</strong></td>
                  <td class="cs-tbl__muted">{{ request.reason || '—' }}</td>
                  <td><span class="cs-badge cs-badge--warn">{{ request.status || 'Requested' }}</span></td>
                </tr>
              </tbody>
            </table>
            <p class="cs-empty" *ngIf="labRequests.length === 0">No lab requests recorded.</p>
          </div>
        </div>
      </section>

      <!-- Follow-Up & Allergies side-by-side -->
      <div class="cs-cols">
        <section class="cs-card cs-card--fu" [class.cs-card--collapsed]="!isExpanded('fu')" id="cs-fu">
          <div class="cs-card__accent"></div>
          <div class="cs-card__body">
            <div class="cs-card__header" (click)="toggle('fu')">
              <h3 class="cs-card__title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Follow-Up
              </h3>
              <svg class="cs-card__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="cs-card__body-inner" *ngIf="isExpanded('fu')">
              <div *ngIf="followUpDate; else noFu" class="cs-fu">
                <div class="cs-fu__date">{{ followUpDate | date:'MMM d, y' }}</div>
                <div class="cs-fu__label">Scheduled follow-up</div>
              </div>
              <ng-template #noFu><p class="cs-empty">No follow-up scheduled.</p></ng-template>
            </div>
          </div>
        </section>

        <section class="cs-card cs-card--allergy" [class.cs-card--collapsed]="!isExpanded('allergy')" id="cs-allergy">
          <div class="cs-card__accent"></div>
          <div class="cs-card__body">
            <div class="cs-card__header" (click)="toggle('allergy')">
              <h3 class="cs-card__title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Allergies
                <span class="cs-card__summary" *ngIf="!isExpanded('allergy') && vm.allergies.length > 0">{{ vm.allergies.length }} allergen{{ vm.allergies.length !== 1 ? 's' : '' }}</span>
              </h3>
              <svg class="cs-card__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="cs-card__body-inner" *ngIf="isExpanded('allergy')">
              <table class="cs-tbl" *ngIf="vm.allergies.length > 0">
                <thead><tr><th>Allergen</th><th>Severity</th></tr></thead>
                <tbody>
                  <tr *ngFor="let allergy of vm.allergies">
                    <td>{{ allergy.allergen }}</td>
                    <td><span class="cs-badge" [class.cs-badge--danger]="allergy.severity === 'Severe'" [class.cs-badge--warn]="allergy.severity === 'Moderate'">{{ allergy.severity || 'Not specified' }}</span></td>
                  </tr>
                </tbody>
              </table>
              <p class="cs-empty" *ngIf="vm.allergies.length === 0">No allergies on record.</p>
            </div>
          </div>
        </section>
      </div>

      <!-- Vaccinations -->
      <section class="cs-card cs-card--vax" [class.cs-card--collapsed]="!isExpanded('vax')" id="cs-vax">
        <div class="cs-card__accent"></div>
        <div class="cs-card__body">
          <div class="cs-card__header" (click)="toggle('vax')">
            <h3 class="cs-card__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 12h-4v-4h-4v4H6v4h4v4h4v-4h4v-4z"/></svg>
              Vaccinations
              <span class="cs-card__summary" *ngIf="!isExpanded('vax') && vm.vaccinations.length > 0">{{ vm.vaccinations.length }} record{{ vm.vaccinations.length !== 1 ? 's' : '' }}</span>
            </h3>
            <svg class="cs-card__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="cs-card__body-inner" *ngIf="isExpanded('vax')">
            <table class="cs-tbl" *ngIf="vm.vaccinations.length > 0">
              <thead><tr><th>Vaccine</th><th>Date Given</th></tr></thead>
              <tbody>
                <tr *ngFor="let vax of vm.vaccinations">
                  <td>{{ vax.vaccineName }}</td>
                  <td class="cs-tbl__muted">{{ vax.dateGiven | date:'MMM d, y' }}</td>
                </tr>
              </tbody>
            </table>
            <p class="cs-empty" *ngIf="vm.vaccinations.length === 0">No vaccinations recorded.</p>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .cs { display: flex; flex-direction: column; gap: var(--space-3); }

    /* ===== Anchor Nav ===== */
    .cs-nav { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; padding: var(--space-3) var(--space-4); background: #fff; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); box-shadow: 0 1px 3px rgba(0,0,0,.04); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(8px); }
    .cs-nav__toggle { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; font-size: 0.72rem; font-weight: 600; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: var(--radius-md); cursor: pointer; white-space: nowrap; transition: all .12s; }
    .cs-nav__toggle:hover { background: #e2e8f0; }
    .cs-nav__links { display: flex; gap: var(--space-1); flex-wrap: wrap; }
    .cs-nav__link { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 0.72rem; font-weight: 500; color: #64748b; text-decoration: none; border-radius: var(--radius-sm); cursor: pointer; transition: all .12s; }
    .cs-nav__link:hover { background: #f1f5f9; color: #334155; }
    .cs-nav__link--active { background: #eef2ff; color: #4338ca; font-weight: 600; }
    .cs-nav__dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .cs-nav__dot--vitals { background: #3b82f6; }
    .cs-nav__dot--soap { background: #8b5cf6; }
    .cs-nav__dot--diagnoses { background: #f59e0b; }
    .cs-nav__dot--rx { background: #10b981; }
    .cs-nav__dot--lab { background: #06b6d4; }
    .cs-nav__dot--fu { background: #6366f1; }
    .cs-nav__dot--allergy { background: #ef4444; }
    .cs-nav__dot--vax { background: #14b8a6; }
    .cs-nav__count { color: #94a3b8; font-size: 0.68rem; }

    /* ===== Collapsible Cards ===== */
    .cs-card { display: flex; background: #fff; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.04); transition: box-shadow .2s; }
    .cs-card:hover { box-shadow: 0 2px 6px rgba(0,0,0,.06); }
    .cs-card--collapsed .cs-card__header { border-bottom: none; }
    .cs-card__accent { width: 4px; flex-shrink: 0; }
    .cs-card__body { flex: 1; min-width: 0; }
    .cs-card__header { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-5); cursor: pointer; user-select: none; transition: background .12s; border-bottom: 1px solid #f1f5f9; }
    .cs-card__header:hover { background: #f8fafc; }
    .cs-card__title { display: flex; align-items: center; gap: var(--space-2); margin: 0; font-size: 0.95rem; font-weight: 700; color: #1e293b; letter-spacing: -0.01em; flex: 1; }
    .cs-card__title svg { color: var(--ion-color-primary); flex-shrink: 0; }
    .cs-card__summary { font-size: 0.72rem; font-weight: 400; color: #94a3b8; margin-left: auto; }
    .cs-card__chevron { color: #94a3b8; flex-shrink: 0; transition: transform .2s; }
    .cs-card--collapsed .cs-card__chevron { transform: rotate(-90deg); }
    .cs-card__body-inner { padding: 0 var(--space-5) var(--space-5); }
    .cs-card--collapsed .cs-card__body-inner { display: none; }

    /* Section accent colors */
    .cs-card--vitals .cs-card__accent { background: #3b82f6; }
    .cs-card--soap .cs-card__accent { background: #8b5cf6; }
    .cs-card--diagnosis .cs-card__accent { background: #f59e0b; }
    .cs-card--rx .cs-card__accent { background: #10b981; }
    .cs-card--lab .cs-card__accent { background: #06b6d4; }
    .cs-card--fu .cs-card__accent { background: #6366f1; }
    .cs-card--allergy .cs-card__accent { background: #ef4444; }
    .cs-card--vax .cs-card__accent { background: #14b8a6; }

    /* Vital signs meter display */
    .cs-grid { display: grid; gap: var(--space-2); }
    .cs-grid--4 { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .cs-vital { display: flex; flex-direction: column; gap: 1px; padding: var(--space-2) var(--space-3); background: #f8fafc; border: 1px solid #f1f5f9; border-radius: var(--radius-md); }
    .cs-vital__value { font-size: 1.25rem; font-weight: 700; color: #1e293b; line-height: 1.2; }
    .cs-vital__pct { font-size: 0.85rem; font-weight: 400; color: #94a3b8; }
    .cs-vital__value--pain { color: #dc2626; }
    .cs-vital__label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
    .cs-vital__unit { font-size: 0.68rem; color: #94a3b8; }

    /* SOAP with colored badge */
    .cs-soap { display: flex; flex-direction: column; gap: var(--space-2); }
    .cs-soap__block { display: flex; gap: var(--space-2); }
    .cs-soap__badge { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; font-size: 0.65rem; font-weight: 700; flex-shrink: 0; margin-top: 2px; }
    .cs-soap__badge--cc { background: #fef3c7; color: #92400e; }
    .cs-soap__badge--s { background: #dbeafe; color: #1e40af; }
    .cs-soap__badge--o { background: #d1fae5; color: #065f46; }
    .cs-soap__badge--a { background: #ede9fe; color: #5b21b6; }
    .cs-soap__badge--p { background: #fce7f3; color: #9d174d; }
    .cs-soap__content { flex: 1; padding: var(--space-2) var(--space-3); background: #f8fafc; border: 1px solid #f1f5f9; border-radius: var(--radius-md); }
    .cs-soap__label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; margin-bottom: 2px; }
    .cs-text { margin: 0; white-space: pre-wrap; line-height: 1.6; color: #334155; font-size: var(--text-sm); }
    .cs-empty { color: #94a3b8; font-style: italic; margin: 0; font-size: var(--text-sm); padding: var(--space-2) 0; }

    /* Tables */
    .cs-tbl { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
    .cs-tbl thead { border-bottom: 2px solid #e2e8f0; }
    .cs-tbl th { text-align: left; padding: var(--space-1) var(--space-2); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; background: #f8fafc; white-space: nowrap; }
    .cs-tbl td { padding: var(--space-1) var(--space-2); border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
    .cs-tbl tbody tr:last-child td { border-bottom: none; }
    .cs-tbl tbody tr:hover { background: #f8fafc; }
    .cs-tbl__code { font-family: 'SF Mono', 'Fira Code', monospace; color: #64748b; font-size: 0.78rem; }
    .cs-tbl__muted { color: #64748b; }
    .cs-tbl__num { text-align: center; }

    /* Badges */
    .cs-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; background: #f1f5f9; color: #475569; letter-spacing: 0.01em; }
    .cs-badge--primary { background: #dbeafe; color: #1d4ed8; }
    .cs-badge--warn { background: #fef3c7; color: #92400e; }
    .cs-badge--danger { background: #fee2e2; color: #dc2626; }

    /* Follow-up */
    .cs-fu { display: flex; flex-direction: column; gap: 2px; padding: var(--space-2) var(--space-3); background: #eef2ff; border: 1px solid #e0e7ff; border-radius: var(--radius-md); }
    .cs-fu__date { font-size: 1rem; font-weight: 700; color: #4338ca; }
    .cs-fu__label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6366f1; font-weight: 600; }

    /* Side-by-side columns */
    .cs-cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    @media (max-width: 720px) { .cs-cols { grid-template-columns: 1fr; } }

    /* Scroll margin for anchor targets */
    #cs-vitals, #cs-soap, #cs-diagnoses, #cs-rx, #cs-lab, #cs-fu, #cs-allergy, #cs-vax { scroll-margin-top: 80px; }
  `]
})
export class ConsultationSummaryComponent {
  @Input({ required: true }) vm!: ConsultationPageVm;

  expanded: Record<string, boolean> = {
    vitals: true,
    soap: true,
    diagnoses: true,
    rx: true,
    lab: true,
    fu: true,
    allergy: true,
    vax: true
  };

  activeSection = '';
  private observer: IntersectionObserver | null = null;

  get allExpanded(): boolean {
    return Object.values(this.expanded).every(v => v === true);
  }

  get navItems(): NavItem[] {
    const items: NavItem[] = [];
    if (this.hasVitals || this.vitals) items.push({ id: 'vitals', label: 'Vitals', count: this.vitalCount });
    if (this.hasSoap) items.push({ id: 'soap', label: 'SOAP', count: this.soapSectionCount });
    if (this.diagnoses.length > 0) items.push({ id: 'diagnoses', label: 'Diagnoses', count: this.diagnoses.length });
    if (this.prescriptionItems.length > 0) items.push({ id: 'rx', label: 'Rx', count: this.prescriptionItems.length });
    if (this.labRequests.length > 0) items.push({ id: 'lab', label: 'Labs', count: this.labRequests.length });
    if (this.followUpDate) items.push({ id: 'fu', label: 'Follow-Up', count: 1 });
    if (this.vm.allergies.length > 0) items.push({ id: 'allergy', label: 'Allergies', count: this.vm.allergies.length });
    if (this.vm.vaccinations.length > 0) items.push({ id: 'vax', label: 'Vaccines', count: this.vm.vaccinations.length });
    return items;
  }

  private get vitalCount(): number {
    const v = this.vitals;
    if (!v) return 0;
    return [v.bloodPressureSystolic, v.bloodPressureDiastolic, v.heartRate, v.respiratoryRate,
      v.temperatureCelsius, v.oxygenSaturation, v.weightKg, v.heightCm, v.bmi, v.painScore]
      .filter(x => x !== null && x !== undefined).length;
  }

  private get soapSectionCount(): number {
    const c = this.vm.consultation;
    if (!c) return 0;
    return [c.chiefComplaint, c.subjective, c.objective, c.assessment, c.plan].filter(Boolean).length;
  }

  get vitalsSummary(): string {
    const v = this.vitals;
    const parts: string[] = [];
    if (v?.bloodPressureSystolic) parts.push(`BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`);
    if (v?.heartRate) parts.push(`HR ${v.heartRate}`);
    if (v?.temperatureCelsius) parts.push(`T ${v.temperatureCelsius}°`);
    return parts.join(' · ') || `${this.vitalCount} readings`;
  }

  get soapSummary(): string {
    const c = this.vm.consultation;
    const parts: string[] = [];
    if (c?.chiefComplaint) parts.push(`CC: ${c.chiefComplaint.slice(0, 60)}`);
    if (c?.assessment) parts.push(`A: ${c.assessment.slice(0, 60)}`);
    return parts.join(' · ') || `${this.soapSectionCount} sections`;
  }

  isExpanded(key: string): boolean {
    return this.expanded[key] !== false;
  }

  toggle(key: string): void {
    this.expanded[key] = !this.isExpanded(key);
  }

  toggleAll(): void {
    const newVal = !this.allExpanded;
    Object.keys(this.expanded).forEach(k => this.expanded[k] = newVal);
  }

  scrollTo(sectionId: string): void {
    const el = document.getElementById(`cs-${sectionId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
