import { NgIf } from '@angular/common';
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
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VitalSigns } from '../../../../core/models';
import { IonInput, IonItem, IonLabel, IonNote } from '@ionic/angular/standalone';

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

@Component({
  selector: 'app-vital-signs-form',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, IonItem, IonInput, IonLabel, IonNote],
  template: `
    <section class="clinic-card section-card" [class.section-card--locked]="locked">
      <div class="section-card__head">
        <h3>Vital Signs</h3>
        <p>Capture the latest measurements for this visit.</p>
      </div>

      <form class="form-grid" [formGroup]="form">
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Blood Pressure Systolic</ion-label>
          <ion-input type="number" formControlName="bloodPressureSystolic" placeholder="e.g. 120"></ion-input>
        </ion-item>
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Blood Pressure Diastolic</ion-label>
          <ion-input type="number" formControlName="bloodPressureDiastolic" placeholder="e.g. 80"></ion-input>
        </ion-item>
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Heart Rate</ion-label>
          <ion-input type="number" formControlName="heartRate" placeholder="bpm"></ion-input>
        </ion-item>
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Respiratory Rate</ion-label>
          <ion-input type="number" formControlName="respiratoryRate" placeholder="breaths/min"></ion-input>
        </ion-item>
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Pain Score</ion-label>
          <ion-input type="number" formControlName="painScore" placeholder="0 - 10"></ion-input>
        </ion-item>
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Temperature Celsius</ion-label>
          <ion-input type="number" formControlName="temperatureCelsius" placeholder="e.g. 36.8"></ion-input>
        </ion-item>
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Oxygen Saturation</ion-label>
          <ion-input type="number" formControlName="oxygenSaturation" placeholder="0 - 100"></ion-input>
        </ion-item>
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Weight Kg</ion-label>
          <ion-input type="number" formControlName="weightKg" placeholder="kg"></ion-input>
        </ion-item>
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Height Cm</ion-label>
          <ion-input type="number" formControlName="heightCm" placeholder="cm"></ion-input>
        </ion-item>
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
