import { NgFor, NgIf } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Diagnosis } from '../../../../core/models';
import icd10Data from '../../../../../assets/icd10.json';
import {
  IonBadge,
  IonButton,
  IonChip,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';

interface Icd10Entry {
  code: string;
  description: string;
}

const ICD10_ENTRIES = icd10Data as Icd10Entry[];

@Component({
  selector: 'app-diagnosis-picker',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    ReactiveFormsModule,
    IonBadge,
    IonButton,
    IonChip,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonSelect,
    IonSelectOption
  ],
  template: `
    <section class="clinic-card section-card">
      <div class="section-card__head">
        <h3>Diagnosis</h3>
        <p>Search the local ICD-10 list and pick one or more diagnoses.</p>
      </div>

      <div class="diagnosis-controls" [formGroup]="form">
        <ion-item class="field">
          <ion-label position="stacked">Diagnosis Type</ion-label>
          <ion-select formControlName="diagnosisType" interface="popover">
            <ion-select-option value="Primary">Primary</ion-select-option>
            <ion-select-option value="Secondary">Secondary</ion-select-option>
            <ion-select-option value="Differential">Differential</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item class="field field--full">
          <ion-label position="stacked">Search ICD-10</ion-label>
          <ion-input
            formControlName="search"
            placeholder="Search by code or description"
            [disabled]="locked"
          ></ion-input>
        </ion-item>
      </div>

      <ion-list *ngIf="filteredEntries.length > 0" class="result-list">
        <button
          type="button"
          class="result-item"
          *ngFor="let entry of filteredEntries"
          (click)="selectEntry(entry)"
        >
          <strong>{{ entry.code }}</strong>
          <span>{{ entry.description }}</span>
        </button>
      </ion-list>

      <div class="selected-list">
        <ion-chip
          *ngFor="let diagnosis of diagnoses"
          [outline]="true"
          [class.primary-chip]="diagnosis.type === 'Primary'"
        >
          <ion-label>{{ diagnosis.code }} - {{ diagnosis.description }}</ion-label>
          <ion-badge>{{ diagnosis.type }}</ion-badge>
          <ion-button *ngIf="!locked" fill="clear" size="small" (click)="removeDiagnosis(diagnosis.id)">
            <ion-icon name="close-circle-outline"></ion-icon>
          </ion-button>
        </ion-chip>
      </div>

      <p class="helper" *ngIf="!hasPrimaryDiagnosis">
        At least one primary diagnosis is required before completing the consultation.
      </p>
    </section>
  `,
  styleUrl: './diagnosis-picker.component.scss'
})
export class DiagnosisPickerComponent implements OnChanges {
  @Input() value: Diagnosis[] = [];
  @Input() locked = false;

  @Output() diagnosesChange = new EventEmitter<Diagnosis[]>();
  @Output() validityChange = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    search: [''],
    diagnosisType: ['Primary']
  });

  diagnoses: Diagnosis[] = [];
  filteredEntries: Icd10Entry[] = [];

  get hasPrimaryDiagnosis(): boolean {
    return this.diagnoses.some((diagnosis) => diagnosis.type === 'Primary');
  }

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      const query = (value.search ?? '').trim().toLowerCase();
      this.filteredEntries = query
        ? ICD10_ENTRIES.filter(
            (entry) =>
              entry.code.toLowerCase().includes(query) ||
              entry.description.toLowerCase().includes(query)
          ).slice(0, 8)
        : [];
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.diagnoses = [...this.value];
      this.emitState();
    }

    if (changes['locked']) {
      if (this.locked) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    }
  }

  selectEntry(entry: Icd10Entry): void {
    if (this.locked) {
      return;
    }
    const type = (this.form.getRawValue().diagnosisType as Diagnosis['type']) ?? 'Primary';
    if (this.diagnoses.some((diagnosis) => diagnosis.code === entry.code)) {
      this.form.patchValue({ search: '' }, { emitEvent: false });
      this.filteredEntries = [];
      return;
    }
    this.diagnoses = [
      ...this.diagnoses,
      {
        id: `dx-${Date.now()}-${this.diagnoses.length + 1}`,
        code: entry.code,
        description: entry.description,
        type
      }
    ];
    this.form.patchValue({ search: '' }, { emitEvent: false });
    this.filteredEntries = [];
    this.emitState();
  }

  removeDiagnosis(id: string): void {
    if (this.locked) {
      return;
    }
    this.diagnoses = this.diagnoses.filter((diagnosis) => diagnosis.id !== id);
    this.emitState();
  }

  private emitState(): void {
    this.diagnosesChange.emit([...this.diagnoses]);
    this.validityChange.emit(this.hasPrimaryDiagnosis);
  }
}
