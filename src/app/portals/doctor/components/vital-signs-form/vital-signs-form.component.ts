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
import { FormBuilder, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VitalSigns } from '../../../../core/models';
import { IonBadge, IonInput, IonItem, IonLabel, IonNote } from '@ionic/angular/standalone';

const optionalRange = (min: number, max: number): ValidatorFn => (control) => {
  const raw = control.value;
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const value = Number(raw);
  if (Number.isNaN(value) || value < min || value > max) {
    return { range: true };
  }
  return null;
};

const optionalPositive = (): ValidatorFn => (control) => {
  const raw = control.value;
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const value = Number(raw);
  if (Number.isNaN(value) || value <= 0) {
    return { positive: true };
  }
  return null;
};

type VitalFieldKey =
  | 'bloodPressureSystolic'
  | 'bloodPressureDiastolic'
  | 'heartRate'
  | 'respiratoryRate'
  | 'painScore'
  | 'temperatureCelsius'
  | 'oxygenSaturation'
  | 'weightKg'
  | 'heightCm';

interface CriticalAlert {
  key: VitalFieldKey;
  label: string;
  value: string;
}

@Component({
  selector: 'app-vital-signs-form',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule, IonBadge, IonInput, IonItem, IonLabel, IonNote],
  template: `
    <section class="clinic-card section-card" [class.section-card--locked]="locked" aria-labelledby="vital-signs-heading">
      <div class="critical-banner" *ngIf="visibleCriticalAlerts.length > 0" aria-live="polite">
        <div class="critical-banner__copy">
          <strong>⚠ Critical vital sign detected</strong>
          <span *ngFor="let alert of visibleCriticalAlerts">{{ alert.label }}: {{ alert.value }}</span>
        </div>
        <button type="button" class="critical-banner__button" (click)="acknowledgeCriticalAlerts()">Acknowledged</button>
      </div>

      <div class="section-card__head">
        <h3 id="vital-signs-heading">Vital Signs <i *ngIf="locked" class="ti ti-lock section-card__lock"></i></h3>
        <p>Capture the latest measurements for this visit.</p>
      </div>

      <form class="form-grid" [formGroup]="form">
        <div class="field-wrap">
          <div class="field-row">
            <ion-item class="field" [disabled]="locked">
              <ion-label position="stacked">Blood Pressure Systolic</ion-label>
              <ion-input type="number" formControlName="bloodPressureSystolic" placeholder="e.g. 120" (ionBlur)="markTouched('bloodPressureSystolic')"></ion-input>
            </ion-item>
            <span class="status-badge" *ngIf="getDisplayStatus('bloodPressureSystolic') as status" [class.status-badge--normal]="status === 'Normal'" [class.status-badge--borderline]="status === 'Borderline'" [class.status-badge--critical]="status === 'Critical'" [attr.aria-label]="getStatusAriaLabel('bloodPressureSystolic', status)">{{ status }}</span>
          </div>
          <div class="field-hint">Normal: &lt;120 mmHg</div>
          <div class="field-error" *ngIf="validationRequested && !hasValue('bloodPressureSystolic')">Blood pressure systolic is required.</div>
        </div>

        <div class="field-wrap">
          <div class="field-row">
            <ion-item class="field" [disabled]="locked">
              <ion-label position="stacked">Blood Pressure Diastolic</ion-label>
              <ion-input type="number" formControlName="bloodPressureDiastolic" placeholder="e.g. 80" (ionBlur)="markTouched('bloodPressureDiastolic')"></ion-input>
            </ion-item>
            <span class="status-badge" *ngIf="getDisplayStatus('bloodPressureDiastolic') as status" [class.status-badge--normal]="status === 'Normal'" [class.status-badge--borderline]="status === 'Borderline'" [class.status-badge--critical]="status === 'Critical'" [attr.aria-label]="getStatusAriaLabel('bloodPressureDiastolic', status)">{{ status }}</span>
          </div>
          <div class="field-hint">Normal: &lt;80 mmHg</div>
          <div class="field-error" *ngIf="validationRequested && !hasValue('bloodPressureDiastolic')">Blood pressure diastolic is required.</div>
        </div>

        <div class="field-wrap">
          <div class="field-row">
            <ion-item class="field" [disabled]="locked">
              <ion-label position="stacked">Heart Rate</ion-label>
              <ion-input type="number" formControlName="heartRate" placeholder="bpm" (ionBlur)="markTouched('heartRate')"></ion-input>
            </ion-item>
            <span class="status-badge" *ngIf="getDisplayStatus('heartRate') as status" [class.status-badge--normal]="status === 'Normal'" [class.status-badge--borderline]="status === 'Borderline'" [class.status-badge--critical]="status === 'Critical'" [attr.aria-label]="getStatusAriaLabel('heartRate', status)">{{ status }}</span>
          </div>
          <div class="field-hint">Normal: 60-100 bpm</div>
          <div class="field-error" *ngIf="validationRequested && !hasValue('heartRate')">Heart rate is required.</div>
        </div>

        <div class="field-wrap">
          <div class="field-row">
            <ion-item class="field" [disabled]="locked">
              <ion-label position="stacked">Respiratory Rate</ion-label>
              <ion-input type="number" formControlName="respiratoryRate" placeholder="breaths/min" (ionBlur)="markTouched('respiratoryRate')"></ion-input>
            </ion-item>
            <span class="status-badge" *ngIf="getDisplayStatus('respiratoryRate') as status" [class.status-badge--normal]="status === 'Normal'" [class.status-badge--borderline]="status === 'Borderline'" [class.status-badge--critical]="status === 'Critical'" [attr.aria-label]="getStatusAriaLabel('respiratoryRate', status)">{{ status }}</span>
          </div>
          <div class="field-hint">Normal: 12-20 breaths/min</div>
        </div>

        <div class="field-wrap">
          <div class="field-row">
            <ion-item class="field" [disabled]="locked">
              <ion-label position="stacked">Pain Score</ion-label>
              <ion-input type="number" formControlName="painScore" placeholder="0 - 10" (ionBlur)="markTouched('painScore')"></ion-input>
            </ion-item>
            <span class="status-badge" *ngIf="getDisplayStatus('painScore') as status" [class.status-badge--normal]="status === 'Normal'" [class.status-badge--borderline]="status === 'Borderline'" [class.status-badge--critical]="status === 'Critical'" [attr.aria-label]="getStatusAriaLabel('painScore', status)">{{ status }}</span>
          </div>
          <div class="field-hint">Normal: 0-3</div>
        </div>

        <div class="field-wrap">
          <div class="field-row">
            <ion-item class="field" [disabled]="locked">
              <ion-label position="stacked">Temperature Celsius</ion-label>
              <ion-input type="number" formControlName="temperatureCelsius" placeholder="e.g. 36.8" (ionBlur)="markTouched('temperatureCelsius')"></ion-input>
            </ion-item>
            <span class="status-badge" *ngIf="getDisplayStatus('temperatureCelsius') as status" [class.status-badge--normal]="status === 'Normal'" [class.status-badge--borderline]="status === 'Borderline'" [class.status-badge--critical]="status === 'Critical'" [attr.aria-label]="getStatusAriaLabel('temperatureCelsius', status)">{{ status }}</span>
          </div>
          <div class="field-hint">Normal: 36.1-37.2°C</div>
        </div>

        <div class="field-wrap">
          <div class="field-row">
            <ion-item class="field" [disabled]="locked">
              <ion-label position="stacked">Oxygen Saturation</ion-label>
              <ion-input type="number" formControlName="oxygenSaturation" placeholder="0 - 100" (ionBlur)="markTouched('oxygenSaturation')"></ion-input>
            </ion-item>
            <span class="status-badge" *ngIf="getDisplayStatus('oxygenSaturation') as status" [class.status-badge--normal]="status === 'Normal'" [class.status-badge--borderline]="status === 'Borderline'" [class.status-badge--critical]="status === 'Critical'" [attr.aria-label]="getStatusAriaLabel('oxygenSaturation', status)">{{ status }}</span>
          </div>
          <div class="field-hint">Normal: 95-100%</div>
        </div>

        <div class="field-wrap">
          <div class="field-row">
            <ion-item class="field" [disabled]="locked">
              <ion-label position="stacked">Weight Kg</ion-label>
              <ion-input type="number" formControlName="weightKg" placeholder="kg" (ionBlur)="markTouched('weightKg')"></ion-input>
            </ion-item>
            <span class="status-badge" *ngIf="getDisplayStatus('weightKg') as status" [class.status-badge--normal]="status === 'Normal'" [class.status-badge--borderline]="status === 'Borderline'" [class.status-badge--critical]="status === 'Critical'" [attr.aria-label]="getStatusAriaLabel('weightKg', status)">{{ status }}</span>
          </div>
          <div class="field-hint">Normal: positive number</div>
        </div>

        <div class="field-wrap">
          <div class="field-row">
            <ion-item class="field" [disabled]="locked">
              <ion-label position="stacked">Height Cm</ion-label>
              <ion-input type="number" formControlName="heightCm" placeholder="cm" (ionBlur)="markTouched('heightCm')"></ion-input>
            </ion-item>
            <span class="status-badge" *ngIf="getDisplayStatus('heightCm') as status" [class.status-badge--normal]="status === 'Normal'" [class.status-badge--borderline]="status === 'Borderline'" [class.status-badge--critical]="status === 'Critical'" [attr.aria-label]="getStatusAriaLabel('heightCm', status)">{{ status }}</span>
          </div>
          <div class="field-hint">Normal: positive number</div>
        </div>

        <ion-item class="field field--readonly">
          <ion-label position="stacked">BMI</ion-label>
          <ion-input [value]="bmiDisplay" readonly="true"></ion-input>
          <ion-note slot="helper">Auto-calculated from weight and height.</ion-note>
        </ion-item>
      </form>
    </section>
  `,
  styleUrl: './vital-signs-form.component.scss'
})
export class VitalSignsFormComponent implements OnChanges {
  @Input() value: VitalSigns | null = null;
  @Input() locked = false;
  @Input() validationRequested = false;

  @Output() vitalSignsChange = new EventEmitter<VitalSigns>();
  @Output() validityChange = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    bloodPressureSystolic: [''],
    bloodPressureDiastolic: [''],
    heartRate: [''],
    respiratoryRate: [''],
    painScore: ['', [optionalRange(0, 10)]],
    temperatureCelsius: ['', [optionalRange(30, 45)]],
    oxygenSaturation: ['', [optionalRange(0, 100)]],
    weightKg: ['', [optionalPositive()]],
    heightCm: ['', [optionalPositive()]],
    bmi: [{ value: '', disabled: true }]
  });

  bmiDisplay = '-';
  touchedFields = new Set<VitalFieldKey>();
  acknowledgedCriticalKeys = new Set<VitalFieldKey>();

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.syncDerivedState();
      this.emitValue();
    });
    this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.validityChange.emit(this.form.valid);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.form.patchValue(
        {
          bloodPressureSystolic: this.toInputValue(this.value?.bloodPressureSystolic),
          bloodPressureDiastolic: this.toInputValue(this.value?.bloodPressureDiastolic),
          heartRate: this.toInputValue(this.value?.heartRate),
          respiratoryRate: this.toInputValue(this.value?.respiratoryRate),
          painScore: this.toInputValue(this.value?.painScore),
          temperatureCelsius: this.toInputValue(this.value?.temperatureCelsius ?? this.value?.temperature),
          oxygenSaturation: this.toInputValue(this.value?.oxygenSaturation),
          weightKg: this.toInputValue(this.value?.weightKg ?? this.value?.weight),
          heightCm: this.toInputValue(this.value?.heightCm ?? this.value?.height),
          bmi: this.toInputValue(this.value?.bmi)
        },
        { emitEvent: false }
      );
      this.syncDerivedState();
      this.emitValue();
    }

    if (changes['locked']) {
      if (this.locked) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
      this.form.get('bmi')?.disable({ emitEvent: false });
    }
  }

  markTouched(field: VitalFieldKey): void {
    this.touchedFields.add(field);
  }

  hasValue(field: VitalFieldKey): boolean {
    const value = this.form.get(field)?.value;
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  acknowledgeCriticalAlerts(): void {
    for (const alert of this.computeCriticalAlerts()) {
      this.acknowledgedCriticalKeys.add(alert.key);
    }
  }

  getDisplayStatus(field: VitalFieldKey): 'Normal' | 'Borderline' | 'Critical' | null {
    if (!this.touchedFields.has(field) && !this.hasValue(field)) {
      return null;
    }

    const status = this.computeStatus(field);
    return status;
  }

  getStatusAriaLabel(field: VitalFieldKey, status: 'Normal' | 'Borderline' | 'Critical'): string {
    const value = this.toNumber(this.form.get(field)?.value);
    const label = this.getFieldLabel(field);
    if (value === undefined) {
      return `${label}: ${status}`;
    }

    const range = this.getNormalRangeLabel(field);
    return `${label}: ${status} - ${value} ${range ? `exceeds normal range of ${range}` : ''}`.trim();
  }

  get visibleCriticalAlerts(): CriticalAlert[] {
    return this.computeCriticalAlerts().filter((alert) => !this.acknowledgedCriticalKeys.has(alert.key));
  }

  private emitValue(): void {
    this.vitalSignsChange.emit(this.normalizeValue());
    this.validityChange.emit(this.form.valid);
  }

  private syncDerivedState(): void {
    const value = this.normalizeValue();
    const bmi = this.calculateBmi(value.weightKg, value.heightCm);
    this.bmiDisplay = bmi === null ? '-' : bmi.toFixed(1);
    this.form.patchValue({ bmi: this.bmiDisplay }, { emitEvent: false });
  }

  private normalizeValue(): VitalSigns {
    const raw = this.form.getRawValue();
    return {
      bloodPressureSystolic: this.toNumber(raw.bloodPressureSystolic),
      bloodPressureDiastolic: this.toNumber(raw.bloodPressureDiastolic),
      heartRate: this.toNumber(raw.heartRate),
      respiratoryRate: this.toNumber(raw.respiratoryRate),
      painScore: this.toNumber(raw.painScore),
      temperatureCelsius: this.toNumber(raw.temperatureCelsius),
      oxygenSaturation: this.toNumber(raw.oxygenSaturation),
      weightKg: this.toNumber(raw.weightKg),
      heightCm: this.toNumber(raw.heightCm),
      bmi: this.calculateBmi(this.toNumber(raw.weightKg), this.toNumber(raw.heightCm)) ?? undefined
    };
  }

  private computeStatus(field: VitalFieldKey): 'Normal' | 'Borderline' | 'Critical' | null {
    const value = this.toNumber(this.form.get(field)?.value);
    if (value === undefined) {
      return null;
    }

    switch (field) {
      case 'bloodPressureSystolic':
        if (value < 90 || value >= 140) return 'Critical';
        if (value >= 120) return 'Borderline';
        return 'Normal';
      case 'bloodPressureDiastolic':
        if (value < 60 || value >= 90) return 'Critical';
        if (value >= 80) return 'Borderline';
        return 'Normal';
      case 'heartRate':
        if (value < 50 || value > 110) return 'Critical';
        if (value >= 101 || value >= 50 && value <= 59) return 'Borderline';
        return 'Normal';
      case 'respiratoryRate':
        if (value < 12 || value > 24) return 'Critical';
        if (value >= 21) return 'Borderline';
        return 'Normal';
      case 'temperatureCelsius':
        if (value < 36 || value > 38) return 'Critical';
        if (value <= 36 || value >= 37.3) return 'Borderline';
        return 'Normal';
      case 'oxygenSaturation':
        if (value < 90) return 'Critical';
        if (value <= 94) return 'Borderline';
        return 'Normal';
      case 'painScore':
        if (value >= 7) return 'Critical';
        if (value >= 4) return 'Borderline';
        return 'Normal';
      case 'weightKg':
      case 'heightCm':
        return 'Normal';
      default:
        return null;
    }
  }

  private getFieldLabel(field: VitalFieldKey): string {
    const map: Record<VitalFieldKey, string> = {
      bloodPressureSystolic: 'Blood pressure systolic',
      bloodPressureDiastolic: 'Blood pressure diastolic',
      heartRate: 'Heart rate',
      respiratoryRate: 'Respiratory rate',
      painScore: 'Pain score',
      temperatureCelsius: 'Temperature',
      oxygenSaturation: 'Oxygen saturation',
      weightKg: 'Weight',
      heightCm: 'Height'
    };

    return map[field];
  }

  private getNormalRangeLabel(field: VitalFieldKey): string {
    switch (field) {
      case 'bloodPressureSystolic':
        return 'under 120';
      case 'bloodPressureDiastolic':
        return 'under 80';
      case 'heartRate':
        return '60-100 bpm';
      case 'respiratoryRate':
        return '12-20 breaths/min';
      case 'painScore':
        return '0-3';
      case 'temperatureCelsius':
        return '36.1-37.2°C';
      case 'oxygenSaturation':
        return '95-100%';
      case 'weightKg':
      case 'heightCm':
        return 'positive number';
    }
  }

  private computeCriticalAlerts(): CriticalAlert[] {
    const alerts: CriticalAlert[] = [];
    const entries: Array<[VitalFieldKey, string]> = [
      ['bloodPressureSystolic', 'Blood Pressure Systolic'],
      ['bloodPressureDiastolic', 'Blood Pressure Diastolic'],
      ['heartRate', 'Heart Rate'],
      ['respiratoryRate', 'Respiratory Rate'],
      ['temperatureCelsius', 'Temperature'],
      ['oxygenSaturation', 'Oxygen Saturation'],
      ['painScore', 'Pain Score']
    ];

    for (const [key, label] of entries) {
      if (this.computeStatus(key) === 'Critical') {
        alerts.push({
          key,
          label,
          value: String(this.form.get(key)?.value ?? '')
        });
      }
    }

    return alerts;
  }

  private toNumber(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private toInputValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value);
  }

  private calculateBmi(weightKg?: number, heightCm?: number): number | null {
    if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
      return null;
    }
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }
}
