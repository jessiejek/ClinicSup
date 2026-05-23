import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MockDataService } from '../../../../core/services/mock-data.service';
import { PrescriptionItem, MockDrug } from '../../../../core/models';
import {
  MEDICATION_ROUTE_MASTERS,
  MEDICATION_FREQUENCY_MASTERS,
  MEDICATION_UOM_MASTERS,
} from '../prescription-builder/prescription-masters';

@Component({
  selector: 'app-prescription-form',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule],
  template: `
    <section class="clinic-card section-card">
      <div class="section-card__head">
        <h3>Prescription</h3>
        <p>Add medicines for this consultation using the searchable fields below.</p>
      </div>

      <form class="pf" [formGroup]="form">
        <div class="pf-grid">
          <div class="pf-f pf-full">
            <label>Medicine Name *</label>
            <input formControlName="medicineName" placeholder="Start typing drug name..." (focus)="showDrugSuggestions=true" (blur)="hideDrugSuggestions()" (input)="filterDrugs()" autocomplete="off" />
            <div class="pf-suggest" *ngIf="showDrugSuggestions && filteredDrugs.length > 0">
              <button type="button" *ngFor="let d of filteredDrugs" (mousedown)="selectDrug(d)"><strong>{{ d.medicineName }}</strong><span>{{ d.genericName }}</span></button>
            </div>
          </div>
          <div class="pf-f">
            <label>Strength</label>
            <input formControlName="strength" placeholder="e.g. 500mg" />
          </div>
          <div class="pf-f">
            <label>Dosage Form</label>
            <input formControlName="dosage" placeholder="e.g. Tablet" (focus)="showDosage=true" (blur)="hideDosage()" (input)="dosageFilter = form.get('dosage')?.value || ''" autocomplete="off" />
            <div class="pf-suggest" *ngIf="showDosage && dosageOptionsFiltered.length > 0">
              <button type="button" *ngFor="let d of dosageOptionsFiltered" (mousedown)="selectDosage(d)">{{ d }}</button>
            </div>
          </div>
          <div class="pf-f">
            <label>Route</label>
            <input formControlName="route" placeholder="e.g. Oral" (focus)="showRoute=true" (blur)="hideRoute()" (input)="routeFilter = form.get('route')?.value || ''" autocomplete="off" />
            <div class="pf-suggest" *ngIf="showRoute && routeOptionsFiltered.length > 0">
              <button type="button" *ngFor="let r of routeOptionsFiltered" (mousedown)="selectRoute(r)">{{ r.label }}</button>
            </div>
          </div>
          <div class="pf-f">
            <label>Frequency</label>
            <input formControlName="frequency" placeholder="e.g. TID" (focus)="showFreq=true" (blur)="hideFreq()" (input)="freqFilter = form.get('frequency')?.value || ''" autocomplete="off" />
            <div class="pf-suggest" *ngIf="showFreq && freqOptionsFiltered.length > 0">
              <button type="button" *ngFor="let f of freqOptionsFiltered" (mousedown)="selectFreq(f)">{{ f.label }}</button>
            </div>
          </div>
          <div class="pf-f">
            <label>Duration</label>
            <input formControlName="duration" placeholder="e.g. 7 days" />
          </div>
          <div class="pf-f">
            <label>Quantity</label>
            <input type="number" min="1" formControlName="quantity" />
          </div>
          <div class="pf-f pf-full">
            <label>Instructions</label>
            <input formControlName="instructions" placeholder="e.g. Take after meals" (focus)="showInst=true" (blur)="hideInst()" (input)="instFilter = form.get('instructions')?.value || ''" autocomplete="off" />
            <div class="pf-suggest" *ngIf="showInst && instOptionsFiltered.length > 0">
              <button type="button" *ngFor="let i of instOptionsFiltered" (mousedown)="selectInst(i)">{{ i }}</button>
            </div>
          </div>
        </div>

        <button type="button" class="btn-primary" [disabled]="!form.get('medicineName')?.value" (click)="editIdx >= 0 ? updateMedicine() : addMedicine()">
          {{ editIdx >= 0 ? 'Update Medicine' : 'Add Medicine' }}
        </button>
      </form>

      <div class="pf-added" *ngIf="medicines.length > 0">
        <div class="pf-item" *ngFor="let med of medicines; let i = index">
          <div class="pf-item-info">
            <strong>{{ med.medicineName }}</strong>
            <span>{{ displayMed(med) }}</span>
            <span class="pf-item-inst" *ngIf="med.instructions">{{ med.instructions }}</span>
          </div>
          <div class="pf-item-acts">
            <button type="button" (click)="editMedicine(i)">Edit</button>
            <button type="button" class="pf-remove" (click)="removeMedicine(i)">Remove</button>
          </div>
        </div>
      </div>
      <p class="pf-empty" *ngIf="medicines.length === 0">No medicines added yet.</p>
    </section>
  `,
  styles: [`
    .pf{display:grid;gap:var(--space-4)}
    .pf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-3)}
    .pf-f{display:grid;gap:4px;position:relative}
    .pf-f label{font-size:var(--text-xs);font-weight:600;color:#475569;text-transform:uppercase}
    .pf-f input,.pf-f textarea{padding:var(--space-2) var(--space-3);font-size:var(--text-sm);border:1px solid #e2e8f0;border-radius:var(--radius-md);outline:none;background:#fff;color:var(--clinic-text-primary);width:100%}
    .pf-f input:focus,.pf-f textarea:focus{border-color:var(--ion-color-primary);box-shadow:0 0 0 2px rgba(93,62,142,.12)}
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
    .pf-item-acts{display:flex;gap:var(--space-1);flex-shrink:0}
    .pf-item-acts button{padding:var(--space-1) var(--space-2);font-size:var(--text-xs);border:1px solid #e2e8f0;border-radius:var(--radius-sm);background:#fff;cursor:pointer;color:#475569}
    .pf-item-acts button:hover{border-color:var(--ion-color-primary);color:var(--ion-color-primary)}
    .pf-remove{color:#dc2626!important}
    .pf-empty{text-align:center;color:#94a3b8;font-size:var(--text-sm);padding:var(--space-4)}
    @media(max-width:640px){.pf-grid{grid-template-columns:1fr}.pf-item{flex-direction:column}}
  `]
})
export class PrescriptionFormComponent implements OnChanges {
  @Input() items: PrescriptionItem[] = [];
  @Input() locked = false;
  @Output() itemsChange = new EventEmitter<PrescriptionItem[]>();

  private readonly fb = inject(FormBuilder);
  private readonly mockData = inject(MockDataService);

  readonly form = this.fb.group({ medicineName: [''], strength: [''], dosage: [''], route: [''], frequency: [''], duration: [''], quantity: [1], instructions: [''] });

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
  allDrugs: MockDrug[] = [];

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
    this.allDrugs = this.mockData.getMockDrugList();
    // Auto-generate instructions from other fields
    let autoGen = true;
    this.form.valueChanges.subscribe((v) => {
      if (!autoGen) return;
      const instCtrl = this.form.get('instructions');
      if (instCtrl && instCtrl.dirty) { autoGen = false; return; }
      const smart = this.buildSmartInstruction(v);
      if (smart && instCtrl && instCtrl.value !== smart) {
        instCtrl.setValue(smart, { emitEvent: false });
      }
    });
  }

  get filteredDrugs(): MockDrug[] {
    const q = (this.form.get('medicineName')?.value || '').toLowerCase();
    return q ? this.allDrugs.filter((d) => [d.medicineName, d.genericName].join(' ').toLowerCase().includes(q)).slice(0, 6) : [];
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

  selectDrug(d: MockDrug) {
    this.form.patchValue({ medicineName: d.medicineName });
    this.showDrugSuggestions = false;
  }

  selectDosage(d: string) { this.form.patchValue({ dosage: d }); this.showDosage = false; }
  selectRoute(r: { value: string; label: string }) { this.form.patchValue({ route: r.label }); this.showRoute = false; }
  selectFreq(f: { value: string; label: string }) { this.form.patchValue({ frequency: f.label }); this.showFreq = false; }
  selectInst(i: string) { this.form.patchValue({ instructions: i }); this.showInst = false; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) this.medicines = (this.items || []).map((i) => ({ ...i }));
    if (changes['locked']) { this.locked ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false }); }
  }

  addMedicine(): void {
    const v = this.form.getRawValue();
    if (!v.medicineName) return;
    this.medicines = [...this.medicines, this.buildItem(v)];
    this.emitAndClear();
  }

  editMedicine(idx: number): void {
    const m = this.medicines[idx];
    if (!m) return;
    this.editIdx = idx;
    this.form.patchValue({ medicineName: m.medicineName, strength: m.strength, dosage: m.dosageForm, route: m.route || '', frequency: m.frequency || '', duration: m.duration || '', quantity: m.quantity, instructions: m.instructions || '' });
  }

  updateMedicine(): void {
    if (this.editIdx < 0 || this.editIdx >= this.medicines.length) return;
    const v = this.form.getRawValue();
    if (!v.medicineName) return;
    this.medicines = this.medicines.map((m, i) => i === this.editIdx ? { ...m, ...this.buildItem(v), id: m.id } : m);
    this.editIdx = -1;
    this.emitAndClear();
  }

  removeMedicine(idx: number): void {
    this.medicines = this.medicines.filter((_, i) => i !== idx);
    if (this.editIdx === idx) this.editIdx = -1;
    else if (this.editIdx > idx) this.editIdx--;
  }

  displayMed(m: PrescriptionItem): string {
    return [m.strength, m.sig, m.frequency, m.duration].filter((x) => !!x).join(', ');
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

  private buildItem(v: any): PrescriptionItem {
    return {
      id: `rx-${Date.now()}`,
      medicineName: v.medicineName,
      strength: v.strength || '',
      dosageForm: v.dosage || 'Other',
      quantity: Math.max(1, Number(v.quantity) || 1),
      sig: [v.dosage, v.frequency].filter(Boolean).join(' ') || v.medicineName,
      frequency: v.frequency || undefined,
      duration: v.duration || undefined,
      route: v.route || undefined,
      instructions: v.instructions || undefined
    };
  }

  private emitAndClear(): void {
    this.itemsChange.emit([...this.medicines]);
    this.form.patchValue({ medicineName: '', strength: '', dosage: '', route: '', frequency: '', duration: '', quantity: 1, instructions: '' });
  }
}
