import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Allergy, PrescriptionItem } from '../../../../core/models';
import { DrugInteractionService, DrugAllergyConflict, DrugInteractionWarning } from '../../../../core/services/drug-interaction.service';
import {
  MEDICATION_FREQUENCY_MASTERS,
  MEDICATION_ROUTE_MASTERS
} from '../prescription-builder/prescription-masters';
import { PRESCRIPTION_DRUG_LIST } from '../prescription-builder/prescription-drug-list';

type PrescriptionActionMode = 'edit' | 'request';

interface PendingMedicineAction {
  mode: 'add' | 'update';
  reasonRequired: boolean;
}

@Component({
  selector: 'app-prescription-form',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, ReactiveFormsModule, FormsModule],
  template: `
    <section class="clinic-card section-card" [class.section-card--locked]="locked || actionMode === 'request'" aria-labelledby="prescription-heading">
      <div class="section-card__head">
        <h3 id="prescription-heading">Prescription <i *ngIf="locked || actionMode === 'request'" class="ti ti-lock section-card__lock"></i></h3>
        <p>Add medicines for this consultation using the searchable fields below.</p>
      </div>

      <div class="pf-banner pf-banner--warn" *ngIf="interactionCheckUnavailable" aria-live="polite">
        <strong>Interaction check unavailable</strong>
        <span class="pf-banner__copy">Drug-interaction checks could not reach the backend. Review manually before prescribing.</span>
      </div>

      <div class="pf-banner pf-banner--danger" *ngIf="activeAllergyConflict as conflict" aria-live="assertive">
        <strong>⚠ Allergy Alert</strong>
        <span class="pf-banner__copy">{{ conflict.message || buildAllergyMessage(conflict) }}</span>
        <div class="pf-banner__reason" *ngIf="awaitingOverrideReason">
          <label for="overrideReason">Reason for override *</label>
          <textarea id="overrideReason" [(ngModel)]="overrideReason" [ngModelOptions]="{ standalone: true }" rows="2" placeholder="Clinical justification required"></textarea>
        </div>
        <div class="pf-banner__actions">
          <button type="button" class="btn-outline" (click)="cancelConflict()">Cancel</button>
          <button type="button" class="btn-primary" (click)="prepareOverride()" *ngIf="!awaitingOverrideReason">Add Anyway (with reason)</button>
          <button type="button" class="btn-primary" (click)="confirmOverride()" *ngIf="awaitingOverrideReason" [disabled]="!overrideReason.trim()">Confirm Override</button>
        </div>
      </div>

      <form class="pf" [formGroup]="form">
        <div class="pf-grid">
          <div class="pf-f pf-full">
            <label for="rx-medicine">Medicine Name *</label>
            <input
              id="rx-medicine"
              formControlName="medicineName"
              placeholder="Start typing drug name..."
              (focus)="showDrugSuggestions=true"
              (blur)="hideDrugSuggestions()"
              (input)="filterDrugs()"
              autocomplete="off"
              [readonly]="isReadOnlyFields"
            />
            <div class="pf-suggest" *ngIf="showDrugSuggestions && filteredDrugs.length > 0">
              <button type="button" *ngFor="let d of filteredDrugs" (mousedown)="selectDrug(d)">
                <strong>{{ d.medicineName }}</strong>
                <span>{{ d.genericName }}</span>
              </button>
            </div>
          </div>

          <div class="pf-f">
            <label for="rx-strength">Strength</label>
            <input id="rx-strength" formControlName="strength" placeholder="e.g. 500mg" [readonly]="isReadOnlyFields" />
          </div>

          <div class="pf-f">
            <label for="rx-dosage">Dosage Form</label>
            <input
              id="rx-dosage"
              formControlName="dosage"
              placeholder="e.g. Tablet"
              (focus)="showDosage=true"
              (blur)="hideDosage()"
              (input)="dosageFilter = form.get('dosage')?.value || ''"
              autocomplete="off"
              [readonly]="isReadOnlyFields"
            />
            <div class="pf-suggest" *ngIf="showDosage && dosageOptionsFiltered.length > 0">
              <button type="button" *ngFor="let d of dosageOptionsFiltered" (mousedown)="selectDosage(d)">{{ d }}</button>
            </div>
          </div>

          <div class="pf-f">
            <label for="rx-route">Route</label>
            <input
              id="rx-route"
              formControlName="route"
              placeholder="e.g. Oral"
              (focus)="showRoute=true"
              (blur)="hideRoute()"
              (input)="routeFilter = form.get('route')?.value || ''"
              autocomplete="off"
              [readonly]="isReadOnlyFields"
            />
            <div class="pf-suggest" *ngIf="showRoute && routeOptionsFiltered.length > 0">
              <button type="button" *ngFor="let r of routeOptionsFiltered" (mousedown)="selectRoute(r)">{{ r.label }}</button>
            </div>
          </div>

          <div class="pf-f">
            <label for="rx-frequency">Frequency</label>
            <input
              id="rx-frequency"
              formControlName="frequency"
              placeholder="e.g. TID"
              (focus)="showFreq=true"
              (blur)="hideFreq()"
              (input)="freqFilter = form.get('frequency')?.value || ''"
              autocomplete="off"
              [readonly]="isReadOnlyFields"
            />
            <div class="pf-suggest" *ngIf="showFreq && freqOptionsFiltered.length > 0">
              <button type="button" *ngFor="let f of freqOptionsFiltered" (mousedown)="selectFreq(f)">{{ f.label }}</button>
            </div>
          </div>

          <div class="pf-f">
            <label for="rx-duration">Duration</label>
            <input id="rx-duration" formControlName="duration" placeholder="e.g. 7 days" [readonly]="isReadOnlyFields" />
          </div>

          <div class="pf-f">
            <label for="rx-quantity">Quantity</label>
            <input id="rx-quantity" type="number" min="1" formControlName="quantity" [readonly]="isReadOnlyFields" />
          </div>

          <div class="pf-f pf-full">
            <label for="rx-instructions">Instructions</label>
            <input
              id="rx-instructions"
              formControlName="instructions"
              placeholder="e.g. Take after meals"
              (focus)="showInst=true"
              (blur)="hideInst()"
              (input)="instFilter = form.get('instructions')?.value || ''"
              autocomplete="off"
              [readonly]="isReadOnlyFields"
            />
            <div class="pf-suggest" *ngIf="showInst && instOptionsFiltered.length > 0">
              <button type="button" *ngFor="let i of instOptionsFiltered" (mousedown)="selectInst(i)">{{ i }}</button>
            </div>
          </div>
        </div>

        <button
          type="button"
          [ngClass]="actionMode === 'request' ? 'btn-outline' : 'btn-primary'"
          [disabled]="locked || (actionMode === 'edit' && !form.get('medicineName')?.value)"
          (click)="actionMode === 'request' ? requestAttendingPhysician.emit() : attemptSaveMedicine()"
        >
          {{ actionMode === 'request' ? 'Request prescription from attending physician' : (editIdx >= 0 ? 'Update Medicine' : 'Add Medicine') }}
        </button>
      </form>

      <div class="pf-added" *ngIf="medicines.length > 0">
        <div class="pf-item" *ngFor="let med of medicines; let i = index">
          <div class="pf-item-info">
            <strong>{{ med.medicineName }}</strong>
            <span>{{ displayMed(med) }}</span>
            <span class="pf-item-inst" *ngIf="med.instructions">{{ med.instructions }}</span>
            <span class="pf-item-warning" *ngIf="interactionWarnings[med.id] as warning">
              ⚠ Interaction with {{ warning.existingDrugName }}
              <button type="button" class="pf-item-warning__link" (click)="openInteractionDetails(warning)">View details</button>
            </span>
          </div>
          <div class="pf-item-acts">
            <button type="button" (click)="editMedicine(i)" [disabled]="isReadOnlyFields">Edit</button>
            <button type="button" class="pf-remove" (click)="removeMedicine(i)" [disabled]="isReadOnlyFields">Remove</button>
          </div>
        </div>
      </div>
      <p class="pf-empty" *ngIf="medicines.length === 0">No medicines added yet.</p>

      <div class="section-card__footer">
        <span>{{ auditText }}</span>
      </div>

      <div class="pf-modal-backdrop" *ngIf="interactionDetailsOpen" (click)="closeInteractionDetails()"></div>
      <div class="pf-modal" *ngIf="interactionDetailsOpen" role="dialog" aria-modal="true" aria-labelledby="interactionTitle">
        <div class="pf-modal__card">
          <div class="pf-modal__head">
            <h4 id="interactionTitle">Interaction Details</h4>
            <button type="button" class="pf-modal__close" (click)="closeInteractionDetails()">×</button>
          </div>
          <p class="pf-modal__severity" [class.pf-modal__severity--red]="selectedInteraction?.severity === 'red'">
            {{ selectedInteraction?.summary }}
          </p>
          <p class="pf-modal__body">{{ selectedInteraction?.details }}</p>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host{display:block;scroll-margin-top:128px}
      .pf{display:grid;gap:var(--space-4)}
      .pf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-3)}
      .pf-f{display:grid;gap:4px;position:relative}
      .pf-f label{font-size:12px;font-weight:500;color:#475569;text-transform:uppercase}
      .pf-f input{padding:var(--space-2) var(--space-3);font-size:14px;border:1px solid #e2e8f0;border-radius:var(--radius-md);outline:none;background:#fff;color:var(--clinic-text-primary);width:100%;min-height:44px}
      .pf-f input:focus{border-color:var(--ion-color-primary);box-shadow:0 0 0 2px rgba(93,62,142,.12)}
      .pf-full{grid-column:1/-1}
      .pf-suggest{position:absolute;top:100%;left:0;right:0;z-index:50;background:#fff;border:1px solid #e2e8f0;border-radius:var(--radius-md);box-shadow:var(--shadow-lg);max-height:200px;overflow-y:auto}
      .pf-suggest button{display:grid;gap:2px;width:100%;padding:var(--space-2) var(--space-3);text-align:left;font-size:var(--text-sm);border:none;background:transparent;cursor:pointer}
      .pf-suggest button:hover{background:var(--color-primary-50)}
      .pf-suggest button span{font-size:var(--text-xs);color:#64748b}
      .pf-added{display:grid;gap:var(--space-2);margin-top:var(--space-3)}
      .pf-item{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-3);padding:var(--space-3);background:#f8fafc;border-radius:var(--radius-md)}
      .pf-item-info{display:grid;gap:2px;min-width:0}
      .pf-item-info strong{font-size:var(--text-sm)}
      .pf-item-info span{font-size:var(--text-xs);color:#64748b}
      .pf-item-inst{color:#6b21a8}
      .pf-item-warning{display:inline-flex;align-items:center;gap:8px;padding-top:4px;color:#b45309;font-size:12px;font-weight:600}
      .pf-item-warning__link{border:none;background:transparent;color:#5d3e8e;padding:0;font-weight:700;cursor:pointer}
      .pf-item-acts{display:flex;gap:var(--space-1);flex-shrink:0}
      .pf-item-acts button{padding:var(--space-1) var(--space-2);font-size:var(--text-xs);border:1px solid #e2e8f0;border-radius:var(--radius-sm);background:#fff;cursor:pointer;color:#475569}
      .pf-item-acts button:hover{border-color:var(--ion-color-primary);color:var(--ion-color-primary)}
      .pf-remove{color:#dc2626!important}
      .pf-empty{text-align:center;color:#94a3b8;font-size:var(--text-sm);padding:var(--space-4)}
      .pf-banner{border-radius:16px;padding:12px 14px;display:grid;gap:6px;border:1px solid transparent}
      .pf-banner--warn{background:#fffbeb;border-color:#fcd34d;color:#92400e}
      .pf-banner--danger{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
      .pf-banner__copy{font-size:13px;line-height:1.4}
      .pf-banner__actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
      .pf-banner__reason{display:grid;gap:6px}
      .pf-banner__reason label{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
      .pf-banner__reason textarea{width:100%;border:1px solid #fecaca;border-radius:12px;padding:10px 12px;font:inherit;resize:vertical;min-height:76px}
      .pf-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:220}
      .pf-modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;z-index:221}
      .pf-modal__card{width:min(520px,100%);background:#fff;border-radius:20px;padding:18px;box-shadow:0 20px 50px rgba(15,23,42,.24)}
      .pf-modal__head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .pf-modal__head h4{margin:0;font-size:18px}
      .pf-modal__close{width:36px;height:36px;border-radius:50%;border:1px solid #e2e8f0;background:#fff;font-size:20px}
      .pf-modal__severity{margin:12px 0 8px;font-weight:700;color:#b45309}
      .pf-modal__severity--red{color:#b91c1c}
      .pf-modal__body{margin:0;color:#475569;line-height:1.55}
      @media(max-width:767px){.pf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pf-item{flex-direction:column}.pf-f input{min-height:48px}.pf-full{grid-column:1/-1}}
      @media(max-width:374px){.pf-grid{grid-template-columns:1fr}}
    `
  ]
})
export class PrescriptionFormComponent implements OnChanges {
  @Input() items: PrescriptionItem[] = [];
  @Input() allergies: Allergy[] = [];
  @Input() auditText = 'Not yet edited this visit';
  @Input() locked = false;
  @Input() actionMode: PrescriptionActionMode = 'edit';
  @Output() itemsChange = new EventEmitter<PrescriptionItem[]>();
  @Output() requestAttendingPhysician = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly interactionService = inject(DrugInteractionService);

  readonly form = this.fb.group({ medicineName: [''], strength: [''], dosage: [''], route: ['Oral'], frequency: ['Once daily'], duration: [''], quantity: [1], instructions: [''] });

  readonly dosageOptions = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Powder', 'Suspension', 'Ointment', 'Others'];
  readonly routeOptions = MEDICATION_ROUTE_MASTERS.map((r) => ({ value: r.route_description, label: r.route_description }));
  readonly freqOptions = [...MEDICATION_FREQUENCY_MASTERS].sort((a, b) => a.priority_order - b.priority_order).map((f) => ({ value: f.dosage_desc, label: f.dosage_desc }));

  medicines: PrescriptionItem[] = [];
  editIdx = -1;
  showDrugSuggestions = false;
  showDosage = false;
  showRoute = false;
  showFreq = false;
  showInst = false;
  drugFilter = '';
  dosageFilter = '';
  routeFilter = '';
  freqFilter = '';
  instFilter = '';
  interactionWarnings: Record<string, DrugInteractionWarning> = {};
  interactionCheckUnavailable = false;
  interactionDetailsOpen = false;
  selectedInteraction: DrugInteractionWarning | null = null;
  activeAllergyConflict: DrugAllergyConflict | null = null;
  awaitingOverrideReason = false;
  overrideReason = '';
  private pendingMedicineAction: PendingMedicineAction | null = null;

  readonly instructionOptions = [
    'Take after meals',
    'Take before meals',
    'Take with plenty of water',
    'Take at bedtime',
    'Take as needed for pain',
    'Take with food',
    'Take on empty stomach',
    'Do not drive after taking',
    'Avoid alcohol',
    'Complete the full course',
    'Do not exceed prescribed dose',
    'Take at the same time each day',
    'May cause drowsiness',
    'For external use only',
    'Shake well before use',
    'Refrigerate after opening'
  ];

  constructor() {
    let autoGen = true;
    this.form.valueChanges.subscribe((v) => {
      if (!autoGen) return;
      const instCtrl = this.form.get('instructions');
      if (instCtrl && instCtrl.dirty) {
        autoGen = false;
        return;
      }
      const smart = this.buildSmartInstruction(v);
      if (smart && instCtrl && instCtrl.value !== smart) {
        instCtrl.setValue(smart, { emitEvent: false });
      }
    });
  }

  get isReadOnlyFields(): boolean {
    return this.locked || this.actionMode === 'request';
  }

  get filteredDrugs(): Array<{ medicineName: string; genericName?: string }> {
    const q = (this.form.get('medicineName')?.value || '').toLowerCase();
    return q ? PRESCRIPTION_DRUG_LIST.filter((d) => [d.medicineName, d.genericName].join(' ').toLowerCase().includes(q)).slice(0, 6) : [];
  }

  get dosageOptionsFiltered(): string[] {
    const q = (this.form.get('dosage')?.value || '').toLowerCase();
    return q ? this.dosageOptions.filter((d) => d.toLowerCase().includes(q)) : this.dosageOptions;
  }

  get routeOptionsFiltered(): { value: string; label: string }[] {
    const q = (this.form.get('route')?.value || '').toLowerCase();
    return q ? this.routeOptions.filter((r) => r.label.toLowerCase().includes(q)) : this.routeOptions;
  }

  get freqOptionsFiltered(): { value: string; label: string }[] {
    const q = (this.form.get('frequency')?.value || '').toLowerCase();
    return q ? this.freqOptions.filter((f) => f.label.toLowerCase().includes(q)) : this.freqOptions;
  }

  get instOptionsFiltered(): string[] {
    const q = (this.form.get('instructions')?.value || '').toLowerCase();
    const v = this.form.getRawValue();
    const smart = this.buildSmartInstruction(v);
    const base = smart ? [smart, ...this.instructionOptions] : this.instructionOptions;
    return q ? base.filter((i) => i.toLowerCase().includes(q)) : base;
  }

  hideDrugSuggestions() { setTimeout(() => this.showDrugSuggestions = false, 200); }
  hideDosage() { setTimeout(() => this.showDosage = false, 200); }
  hideRoute() { setTimeout(() => this.showRoute = false, 200); }
  hideFreq() { setTimeout(() => this.showFreq = false, 200); }
  hideInst() { setTimeout(() => this.showInst = false, 200); }
  filterDrugs() { this.showDrugSuggestions = true; }

  selectDrug(d: { medicineName: string; genericName?: string }) {
    this.form.patchValue({ medicineName: d.medicineName });
    this.showDrugSuggestions = false;
  }

  selectDosage(d: string) { this.form.patchValue({ dosage: d }); this.showDosage = false; }
  selectRoute(r: { value: string; label: string }) { this.form.patchValue({ route: r.label }); this.showRoute = false; }
  selectFreq(f: { value: string; label: string }) { this.form.patchValue({ frequency: f.label }); this.showFreq = false; }
  selectInst(i: string) { this.form.patchValue({ instructions: i }); this.showInst = false; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.medicines = (this.items || []).map((i) => ({ ...i }));
      this.refreshInteractionWarnings();
    }

    if (changes['locked'] || changes['actionMode']) {
      if (this.isReadOnlyFields) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    }
  }

  async attemptSaveMedicine(): Promise<void> {
    if (this.isReadOnlyFields) {
      return;
    }

    const current = this.form.getRawValue();
    const name = String(current.medicineName ?? '').trim();
    if (!name) {
      return;
    }

    const action: PendingMedicineAction = { mode: this.editIdx >= 0 ? 'update' : 'add', reasonRequired: false };
    this.pendingMedicineAction = action;
    this.overrideReason = '';
    this.awaitingOverrideReason = false;

    const localConflict = await firstValueFrom(this.interactionService.checkAllergyConflict(name, this.allergies)).catch(() => null);
    if (localConflict?.unavailable) {
      this.interactionCheckUnavailable = true;
    }

    if (localConflict?.conflict) {
      this.activeAllergyConflict = localConflict;
      return;
    }

    this.activeAllergyConflict = null;

    const nextItems = this.getNextItems(action.mode, current);
    const warningState = await firstValueFrom(this.interactionService.checkDrugInteractions(nextItems)).catch(() => null);
    if (warningState) {
      this.interactionCheckUnavailable = warningState.unavailable;
      this.applyInteractionWarnings(warningState.warnings);
    }

    if (action.mode === 'update' && this.editIdx >= 0) {
      this.applyUpdate(nextItems[this.editIdx]);
      return;
    }

    this.addNewMedicine(nextItems[nextItems.length - 1]);
  }

  cancelConflict(): void {
    this.activeAllergyConflict = null;
    this.pendingMedicineAction = null;
    this.awaitingOverrideReason = false;
    this.overrideReason = '';
  }

  prepareOverride(): void {
    this.awaitingOverrideReason = true;
  }

  confirmOverride(): void {
    if (!this.overrideReason.trim()) {
      return;
    }

    const current = this.form.getRawValue();
    const nextItem = this.buildItem(current);
    const item = this.editIdx >= 0
      ? { ...this.medicines[this.editIdx], ...nextItem, id: this.medicines[this.editIdx]?.id ?? nextItem.id }
      : nextItem;

    if (this.editIdx >= 0) {
      this.medicines = this.medicines.map((existing, index) => (index === this.editIdx ? item : existing));
      this.editIdx = -1;
    } else {
      this.medicines = [...this.medicines, item];
    }

    this.activeAllergyConflict = null;
    this.pendingMedicineAction = null;
    this.awaitingOverrideReason = false;
    this.emitAndClear();
    this.refreshInteractionWarnings();
  }

  editMedicine(idx: number): void {
    if (this.isReadOnlyFields) {
      return;
    }
    const m = this.medicines[idx];
    if (!m) return;
    this.editIdx = idx;
    this.form.patchValue({ medicineName: m.medicineName, strength: m.strength, dosage: m.dosageForm, route: m.route || '', frequency: m.frequency || '', duration: m.duration || '', quantity: m.quantity, instructions: m.instructions || '' });
  }

  removeMedicine(idx: number): void {
    if (this.isReadOnlyFields) {
      return;
    }
    this.medicines = this.medicines.filter((_, i) => i !== idx);
    if (this.editIdx === idx) this.editIdx = -1;
    else if (this.editIdx > idx) this.editIdx--;
    this.itemsChange.emit([...this.medicines]);
    this.refreshInteractionWarnings();
  }

  openInteractionDetails(warning: DrugInteractionWarning): void {
    this.selectedInteraction = warning;
    this.interactionDetailsOpen = true;
  }

  closeInteractionDetails(): void {
    this.interactionDetailsOpen = false;
    this.selectedInteraction = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeInteractionDetails();
    this.cancelConflict();
  }

  displayMed(m: PrescriptionItem): string {
    return [m.strength, m.sig, m.frequency, m.duration].filter((x) => !!x).join(', ');
  }

  buildAllergyMessage(conflict: DrugAllergyConflict): string {
    return conflict.message || `Allergy Alert - ${this.form.get('medicineName')?.value || 'This medicine'} matches a recorded allergy: ${conflict.allergyName || 'an allergen'}. Review before adding.`;
  }

  private applyUpdate(updated: PrescriptionItem): void {
    if (this.editIdx < 0) return;
    if (!updated) return;
    this.medicines = this.medicines.map((existing, index) => (index === this.editIdx ? { ...updated, id: existing.id } : existing));
    this.editIdx = -1;
    this.emitAndClear();
    this.refreshInteractionWarnings();
  }

  private addNewMedicine(item: PrescriptionItem): void {
    this.medicines = [...this.medicines, item];
    this.emitAndClear();
    this.refreshInteractionWarnings();
  }

  private getNextItems(mode: 'add' | 'update', value: any): PrescriptionItem[] {
    const nextItem = this.buildItem(value);
    if (mode === 'update' && this.editIdx >= 0) {
      return this.medicines.map((existing, index) => (index === this.editIdx ? { ...nextItem, id: existing.id } : existing));
    }
    return [...this.medicines, nextItem];
  }

  private applyInteractionWarnings(warnings: DrugInteractionWarning[]): void {
    const nextWarnings: Record<string, DrugInteractionWarning> = {};
    for (const warning of warnings) {
      nextWarnings[warning.medicineKey] = warning;
    }
    this.interactionWarnings = nextWarnings;
  }

  private refreshInteractionWarnings(): void {
    this.interactionService.checkDrugInteractions(this.medicines).subscribe((result) => {
      this.interactionCheckUnavailable = result.unavailable;
      this.applyInteractionWarnings(result.warnings);
    });
  }

  private buildItem(v: any): PrescriptionItem {
    return {
      id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      medicineName: String(v.medicineName ?? '').trim(),
      strength: String(v.strength ?? '').trim(),
      dosageForm: String(v.dosage ?? 'Other').trim() || 'Other',
      quantity: Math.max(1, Number(v.quantity) || 1),
      sig: [v.dosage, v.frequency].filter(Boolean).join(' ') || String(v.medicineName ?? ''),
      frequency: v.frequency || undefined,
      duration: v.duration || undefined,
      route: v.route || undefined,
      instructions: v.instructions || undefined
    };
  }

  private emitAndClear(): void {
    this.itemsChange.emit([...this.medicines]);
    this.form.patchValue({ medicineName: '', strength: '', dosage: '', route: 'Oral', frequency: 'Once daily', duration: '', quantity: 1, instructions: '' });
  }

  private buildSmartInstruction(v: any): string | null {
    if (!v.medicineName) return null;
    const parts = ['Take', v.medicineName];
    if (v.strength) parts.push(v.strength);
    if (v.route) { const route = v.route.toLowerCase().startsWith('by ') ? v.route : `by ${v.route.toLowerCase()}`; parts.push(route); }
    if (v.frequency) parts.push(v.frequency.toLowerCase().startsWith('every') || v.frequency.toLowerCase().startsWith('once') ? v.frequency : `every ${v.frequency}`);
    if (v.duration) parts.push(`for ${v.duration}`);
    return parts.join(' ');
  }
}
