import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreatePatientVaccinationRequest, defaultCreateVaccinationPayload, VACCINATION_STATUS_OPTIONS, VACCINATION_SOURCE_OPTIONS, VACCINATION_ROUTE_OPTIONS, VACCINATION_SITE_OPTIONS, VACCINATION_DOSE_UNIT_OPTIONS } from '../../../../core/models/vaccination.models';

export interface VaccinationFormDraft {
  id?: string;
  vaccineName: string;
  administeredDate: string;
  status: string;
  source: string;
  manufacturer?: string | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  doseNumber?: string | null;
  doseAmount?: number | null;
  doseUnit?: string | null;
  route?: string | null;
  site?: string | null;
  nextDueDate?: string | null;
  visEditionDate?: string | null;
  visProvidedDate?: string | null;
  notes?: string | null;
  reactionNotes?: string | null;
}

@Component({
  selector: 'app-vaccination-form',
  standalone: true,
  imports: [DatePipe, FormsModule, NgFor, NgIf],
  template: `
    <section class="clinic-card section-card">
      <div class="section-card__head">
        <h3>Vaccinations</h3>
        <p>Add vaccination records for this patient. Required fields are marked with *.</p>
      </div>

      <div class="vf-notice" *ngIf="!locked">
        <p>Vaccination records are saved directly to the patient chart.</p>
      </div>

      <form class="vf" #vaccineForm="ngForm">
        <div class="vf-grid">
          <!-- Required -->
          <div class="vf-f vf-full">
            <label>Vaccine Name *</label>
            <input [(ngModel)]="draft.vaccineName" name="vaccineName" placeholder="e.g. Influenza, Hepatitis B" required />
          </div>
          <div class="vf-f">
            <label>Administered Date *</label>
            <input type="date" [(ngModel)]="draft.administeredDate" name="administeredDate" required />
          </div>
          <div class="vf-f">
            <label>Status *</label>
            <select [(ngModel)]="draft.status" name="status">
              <option *ngFor="let s of statusOptions" [value]="s">{{ s }}</option>
            </select>
          </div>
          <div class="vf-f">
            <label>Source *</label>
            <select [(ngModel)]="draft.source" name="source">
              <option *ngFor="let s of sourceOptions" [value]="s">{{ formatSource(s) }}</option>
            </select>
          </div>

          <!-- Optional details -->
          <div class="vf-f">
            <label>Manufacturer</label>
            <input [(ngModel)]="draft.manufacturer" name="manufacturer" placeholder="e.g. Sanofi" />
          </div>
          <div class="vf-f">
            <label>Lot Number</label>
            <input [(ngModel)]="draft.lotNumber" name="lotNumber" placeholder="e.g. L12345" />
          </div>
          <div class="vf-f">
            <label>Expiration Date</label>
            <input type="date" [(ngModel)]="draft.expirationDate" name="expirationDate" />
          </div>
          <div class="vf-f">
            <label>Dose Number</label>
            <input [(ngModel)]="draft.doseNumber" name="doseNumber" placeholder="e.g. Dose 1" />
          </div>
          <div class="vf-f">
            <label>Dose Amount</label>
            <input type="number" min="0" step="0.01" [(ngModel)]="draft.doseAmount" name="doseAmount" placeholder="e.g. 0.5" />
          </div>
          <div class="vf-f">
            <label>Dose Unit</label>
            <select [(ngModel)]="draft.doseUnit" name="doseUnit">
              <option [ngValue]="null">-- Select --</option>
              <option *ngFor="let u of doseUnitOptions" [value]="u">{{ u }}</option>
            </select>
          </div>
          <div class="vf-f">
            <label>Route</label>
            <select [(ngModel)]="draft.route" name="route">
              <option [ngValue]="null">-- Select --</option>
              <option *ngFor="let r of routeOptions" [value]="r">{{ r }}</option>
            </select>
          </div>
          <div class="vf-f">
            <label>Site</label>
            <select [(ngModel)]="draft.site" name="site">
              <option [ngValue]="null">-- Select --</option>
              <option *ngFor="let s of siteOptions" [value]="s">{{ s }}</option>
            </select>
          </div>
          <div class="vf-f">
            <label>Next Due Date</label>
            <input type="date" [(ngModel)]="draft.nextDueDate" name="nextDueDate" />
          </div>
          <div class="vf-f">
            <label>VIS Edition Date</label>
            <input type="date" [(ngModel)]="draft.visEditionDate" name="visEditionDate" />
          </div>
          <div class="vf-f">
            <label>VIS Provided Date</label>
            <input type="date" [(ngModel)]="draft.visProvidedDate" name="visProvidedDate" />
          </div>
          <div class="vf-f vf-full">
            <label>Notes</label>
            <textarea [(ngModel)]="draft.notes" name="notes" rows="2" placeholder="Any additional notes about this vaccination..."></textarea>
          </div>
          <div class="vf-f vf-full">
            <label>Reaction Notes</label>
            <textarea [(ngModel)]="draft.reactionNotes" name="reactionNotes" rows="2" placeholder="Any adverse reactions or observations..."></textarea>
          </div>
        </div>

        <button type="button" class="btn-primary" [disabled]="locked || !draft.vaccineName.trim() || !draft.administeredDate" (click)="addVaccination()">
          {{ editIdx >= 0 ? 'Update Vaccination' : 'Add Vaccination' }}
        </button>
      </form>

      <div class="vf-added" *ngIf="addedVaccinations.length > 0">
        <div class="vf-item" *ngFor="let v of addedVaccinations; let i = index">
          <div class="vf-item-info">
            <strong>{{ v.vaccineName }}</strong>
            <span>{{ v.administeredDate | date:'MMM d, y' }} &middot; {{ v.status }}</span>
            <span class="vf-item-detail" *ngIf="v.doseNumber">Dose: {{ v.doseNumber }}</span>
            <span class="vf-item-detail" *ngIf="v.manufacturer">{{ v.manufacturer }}</span>
            <span class="vf-item-detail" *ngIf="v.lotNumber">Lot: {{ v.lotNumber }}</span>
            <span class="vf-item-detail" *ngIf="v.nextDueDate">Next due: {{ v.nextDueDate | date:'MMM d, y' }}</span>
          </div>
          <div class="vf-item-acts">
            <button type="button" (click)="editVaccination(i)">Edit</button>
            <button type="button" class="vf-remove" (click)="removeVaccination(i)">Remove</button>
          </div>
        </div>
      </div>
      <p class="vf-empty" *ngIf="addedVaccinations.length === 0">No vaccinations added yet.</p>
    </section>
  `,
  styles: [`
    .vf{display:grid;gap:var(--space-4);margin-top:var(--space-3)}
    .vf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-3)}
    .vf-f{display:grid;gap:4px}
    .vf-f label{font-size:var(--text-xs);font-weight:600;color:#475569;text-transform:uppercase}
    .vf-f input,.vf-f select,.vf-f textarea{padding:var(--space-2) var(--space-3);font-size:var(--text-sm);border:1px solid #e2e8f0;border-radius:var(--radius-md);outline:none;background:#fff;color:var(--clinic-text-primary);width:100%}
    .vf-f input:focus,.vf-f select:focus,.vf-f textarea:focus{border-color:var(--ion-color-primary);box-shadow:0 0 0 2px rgba(93,62,142,.12)}
    .vf-full{grid-column:1/-1}
    .vf-added{display:grid;gap:var(--space-2);margin-top:var(--space-3)}
    .vf-item{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-3);padding:var(--space-3);background:#f8fafc;border-radius:var(--radius-md)}
    .vf-item-info{display:grid;gap:2px;min-width:0}
    .vf-item-info strong{font-size:var(--text-sm)}
    .vf-item-info span{font-size:var(--text-xs);color:#64748b}
    .vf-item-detail{color:#6b21a8}
    .vf-item-acts{display:flex;gap:var(--space-1);flex-shrink:0}
    .vf-item-acts button{padding:var(--space-1) var(--space-2);font-size:var(--text-xs);border:1px solid #e2e8f0;border-radius:var(--radius-sm);background:#fff;cursor:pointer;color:#475569}
    .vf-item-acts button:hover{border-color:var(--ion-color-primary);color:var(--ion-color-primary)}
    .vf-remove{color:#dc2626!important}
    .vf-empty{text-align:center;color:#94a3b8;font-size:var(--text-sm);padding:var(--space-4)}
    .vf-notice{background:#ede9fe;border:1px solid #c4b5fd;border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-2)}
    .vf-notice p{font-size:var(--text-sm);color:#5b21b6;margin:0}
    @media(max-width:640px){.vf-grid{grid-template-columns:1fr}.vf-item{flex-direction:column}}
  `]
})
export class VaccinationFormComponent {
  @Input() locked = false;
  @Input() existingVaccinations: any[] = [];
  @Output() vaccinationsAdded = new EventEmitter<CreatePatientVaccinationRequest[]>();

  draft: VaccinationFormDraft = {
    vaccineName: '',
    administeredDate: new Date().toISOString().slice(0, 10),
    status: 'Completed',
    source: 'AdministeredInClinic'
  };

  addedVaccinations: VaccinationFormDraft[] = [];
  editIdx = -1;

  readonly statusOptions = VACCINATION_STATUS_OPTIONS;
  readonly sourceOptions = VACCINATION_SOURCE_OPTIONS;
  readonly routeOptions = VACCINATION_ROUTE_OPTIONS;
  readonly siteOptions = VACCINATION_SITE_OPTIONS;
  readonly doseUnitOptions = VACCINATION_DOSE_UNIT_OPTIONS;

  formatSource(source: string): string {
    switch (source) {
      case 'AdministeredInClinic': return 'Administered In Clinic';
      case 'PatientReported': return 'Patient Reported';
      case 'ExternalRecord': return 'External Record';
      default: return source;
    }
  }

  addVaccination(): void {
    if (!this.draft.vaccineName.trim() || !this.draft.administeredDate) return;

    const item: VaccinationFormDraft = {
      id: this.editIdx >= 0 ? this.addedVaccinations[this.editIdx].id : `vac-${Date.now()}`,
      vaccineName: this.draft.vaccineName.trim(),
      administeredDate: this.draft.administeredDate,
      status: this.draft.status,
      source: this.draft.source,
      manufacturer: this.draft.manufacturer || null,
      lotNumber: this.draft.lotNumber || null,
      expirationDate: this.draft.expirationDate || null,
      doseNumber: this.draft.doseNumber || null,
      doseAmount: this.draft.doseAmount ?? null,
      doseUnit: this.draft.doseUnit || null,
      route: this.draft.route || null,
      site: this.draft.site || null,
      nextDueDate: this.draft.nextDueDate || null,
      visEditionDate: this.draft.visEditionDate || null,
      visProvidedDate: this.draft.visProvidedDate || null,
      notes: this.draft.notes || null,
      reactionNotes: this.draft.reactionNotes || null
    };

    if (this.editIdx >= 0) {
      this.addedVaccinations = this.addedVaccinations.map((v, i) => i === this.editIdx ? item : v);
      this.editIdx = -1;
    } else {
      this.addedVaccinations = [...this.addedVaccinations, item];
    }

    this.emitChanges();
    this.resetForm();
  }

  editVaccination(idx: number): void {
    const v = this.addedVaccinations[idx];
    if (!v) return;
    this.editIdx = idx;
    this.draft = { ...v };
  }

  removeVaccination(idx: number): void {
    this.addedVaccinations = this.addedVaccinations.filter((_, i) => i !== idx);
    if (this.editIdx === idx) this.editIdx = -1;
    else if (this.editIdx > idx) this.editIdx--;
    this.emitChanges();
  }

  private resetForm(): void {
    this.draft = {
      vaccineName: '',
      administeredDate: new Date().toISOString().slice(0, 10),
      status: 'Completed',
      source: 'AdministeredInClinic'
    };
  }

  private emitChanges(): void {
    const payloads: CreatePatientVaccinationRequest[] = this.addedVaccinations.map((v) => ({
      vaccineName: v.vaccineName,
      administeredDate: v.administeredDate,
      status: v.status as any,
      source: v.source as any,
      manufacturer: v.manufacturer,
      lotNumber: v.lotNumber,
      expirationDate: v.expirationDate,
      doseNumber: v.doseNumber,
      doseAmount: v.doseAmount,
      doseUnit: v.doseUnit,
      route: v.route,
      site: v.site,
      nextDueDate: v.nextDueDate,
      visEditionDate: v.visEditionDate,
      visProvidedDate: v.visProvidedDate,
      notes: v.notes,
      reactionNotes: v.reactionNotes,
      bookingId: null,
      consultationId: null,
      doctorId: null,
      vaccineCode: null
    }));
    this.vaccinationsAdded.emit(payloads);
  }
}
