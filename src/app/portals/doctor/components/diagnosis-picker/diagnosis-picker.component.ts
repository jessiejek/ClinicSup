import { NgFor, NgIf } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  ElementRef,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { of } from 'rxjs';
import { Diagnosis } from '../../../../core/models';
import icd10Data from '../../../../../assets/icd10.json';
import {
  IonBadge,
  IonButton,
  IonChip,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner
} from '@ionic/angular/standalone';

interface Icd10Entry {
  code: string;
  description: string;
}

interface DiagnosisChipView extends Diagnosis {
  type: 'Primary' | 'Secondary' | 'Comorbidity';
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
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonSpinner
  ],
  template: `
    <section class="clinic-card section-card">
      <div class="section-card__head">
        <h3>Diagnosis ({{ diagnoses.length }} added)</h3>
        <p>Search the local ICD-10 list and pick one or more diagnoses.</p>
      </div>

      <div class="diagnosis-controls" [formGroup]="form">
        <ion-item class="field">
          <ion-label position="stacked">Diagnosis Type</ion-label>
          <select class="native-select" formControlName="diagnosisType" [disabled]="locked">
            <option value="Primary">Primary</option>
            <option value="Secondary">Secondary</option>
            <option value="Comorbidity">Comorbidity</option>
          </select>
        </ion-item>
        <ion-item class="field field--full diagnosis-search">
          <ion-label position="stacked">Search ICD-10</ion-label>
          <ion-input
            formControlName="search"
            placeholder="Search by code or description"
            [disabled]="locked"
            (ionFocus)="searchFocused = true"
            (ionBlur)="handleSearchBlur()"
          ></ion-input>
          <ion-spinner name="crescent" *ngIf="loadingResults" class="search-spinner"></ion-spinner>
        </ion-item>
      </div>

      <ion-list *ngIf="showResultsPanel" class="result-list">
        <button
          type="button"
          class="result-item"
          *ngFor="let entry of searchResults"
          (mousedown)="selectEntry(entry)"
        >
          <div class="result-item__main">
            <strong>{{ entry.code }}</strong>
            <span>{{ entry.description }}</span>
          </div>
          <small>{{ getCategory(entry) }}</small>
        </button>
        <div class="result-empty" *ngIf="!loadingResults && searchResults.length === 0">
          No matching ICD-10 codes found.
        </div>
      </ion-list>

      <div class="selected-list">
        <ion-chip
          *ngFor="let diagnosis of diagnoses"
          [outline]="diagnosis.type !== 'Primary'"
          [class.primary-chip]="diagnosis.type === 'Primary'"
          [class.secondary-chip]="diagnosis.type === 'Secondary'"
          [class.comorbidity-chip]="diagnosis.type === 'Comorbidity'"
        >
          <ion-label>{{ diagnosis.code }} - {{ diagnosis.description }}</ion-label>
          <select class="chip-type" [value]="diagnosis.type" (change)="updateDiagnosisType(diagnosis.id, $any($event.target).value)" [disabled]="locked">
            <option value="Primary">Primary</option>
            <option value="Secondary">Secondary</option>
            <option value="Comorbidity">Comorbidity</option>
          </select>
          <ion-button *ngIf="!locked" fill="clear" size="small" (click)="removeDiagnosis(diagnosis.id)">
            <ion-badge class="chip-remove">X</ion-badge>
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
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  @ViewChild('searchInput', { read: IonInput }) searchInput?: IonInput;

  readonly form = this.fb.group({
    search: [''],
    diagnosisType: ['Primary']
  });

  diagnoses: DiagnosisChipView[] = [];
  searchResults: Icd10Entry[] = [];
  loadingResults = false;
  searchFocused = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  get hasPrimaryDiagnosis(): boolean {
    return this.diagnoses.some((diagnosis) => diagnosis.type === 'Primary');
  }

  get showResultsPanel(): boolean {
    return this.searchFocused && (this.loadingResults || this.searchResults.length > 0);
  }

  constructor() {
    this.form.get('search')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((raw) => {
        const query = String(raw ?? '').trim().toLowerCase();
        this.loadingResults = query.length >= 2;

        if (query.length < 2) {
          this.searchResults = [];
          this.loadingResults = false;
          if (this.searchTimer) {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
          }
          return;
        }

        if (this.searchTimer) {
          clearTimeout(this.searchTimer);
        }

        this.searchTimer = setTimeout(() => {
          this.searchResults = this.filterEntries(query).slice(0, 8);
          this.loadingResults = false;
          this.searchTimer = null;
        }, 180);
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.hostRef.nativeElement.contains(event.target as Node)) {
      this.searchFocused = false;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.diagnoses = this.value.map((diagnosis, index) => ({
        ...diagnosis,
        type: this.normalizeDiagnosisType(diagnosis.type, index)
      }));
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

  handleSearchBlur(): void {
    setTimeout(() => {
      this.searchFocused = false;
    }, 150);
  }

  selectEntry(entry: Icd10Entry): void {
    if (this.locked) {
      return;
    }

    if (this.diagnoses.some((diagnosis) => diagnosis.code === entry.code)) {
      this.form.patchValue({ search: '' }, { emitEvent: false });
      this.searchResults = [];
      this.searchFocused = false;
      return;
    }

    const currentType = (this.form.getRawValue().diagnosisType as DiagnosisChipView['type']) ?? 'Primary';
    const type: DiagnosisChipView['type'] =
      this.diagnoses.length === 0 ? 'Primary' : currentType === 'Primary' ? 'Secondary' : currentType;

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
    this.searchResults = [];
    this.searchFocused = false;
    this.emitState();
  }

  updateDiagnosisType(id: string, nextType: DiagnosisChipView['type']): void {
    if (this.locked) {
      return;
    }

    this.diagnoses = this.diagnoses.map((diagnosis) => (diagnosis.id === id ? { ...diagnosis, type: nextType } : diagnosis));
    this.emitState();
  }

  removeDiagnosis(id: string): void {
    if (this.locked) {
      return;
    }

    this.diagnoses = this.diagnoses.filter((diagnosis) => diagnosis.id !== id);
    this.emitState();
  }

  getCategory(entry: Icd10Entry): string {
    const code = entry.code.trim().toUpperCase();
    const first = code.charAt(0);

    if (first === 'A' || first === 'B') return 'Infectious / Parasitic';
    if (first === 'C' || first === 'D') return 'Neoplasms / Blood';
    if (first === 'E') return 'Endocrine';
    if (first === 'F') return 'Mental Health';
    if (first === 'G') return 'Nervous System';
    if (first === 'H') return 'Eye / Ear';
    if (first === 'I') return 'Circulatory';
    if (first === 'J') return 'Respiratory';
    if (first === 'K') return 'Digestive';
    if (first === 'L') return 'Skin';
    if (first === 'M') return 'Musculoskeletal';
    if (first === 'N') return 'Genitourinary';
    if (first === 'O') return 'Pregnancy';
    if (first === 'P') return 'Perinatal';
    if (first === 'Q') return 'Congenital';
    if (first === 'R') return 'Symptoms / Signs';
    if (first === 'S' || first === 'T') return 'Injury';
    if (first === 'Z') return 'Health Status';
    return 'General';
  }

  private normalizeDiagnosisType(value: unknown, index: number): DiagnosisChipView['type'] {
    const allowed: DiagnosisChipView['type'][] = ['Primary', 'Secondary', 'Comorbidity'];
    const normalized = allowed.find((item) => item === value);
    if (normalized) {
      return normalized;
    }
    return index === 0 ? 'Primary' : 'Secondary';
  }

  private filterEntries(query: string): Icd10Entry[] {
    return ICD10_ENTRIES.filter(
      (entry) =>
        entry.code.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query)
    );
  }

  private emitState(): void {
    this.diagnosesChange.emit(this.diagnoses.map((diagnosis) => ({ ...diagnosis })));
    this.validityChange.emit(this.hasPrimaryDiagnosis);
  }
}
