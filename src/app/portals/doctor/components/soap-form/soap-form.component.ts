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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BannerComponent } from '../../../../shared/components/banner/banner.component';
import { IonInput, IonItem, IonLabel, IonTextarea } from '@ionic/angular/standalone';

export interface SoapFormValue {
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

@Component({
  selector: 'app-soap-form',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, BannerComponent, IonItem, IonInput, IonLabel, IonTextarea],
  template: `
    <section class="clinic-card section-card">
      <div class="section-card__head">
        <h3>SOAP Notes</h3>
        <p>Document the consultation in a structured format.</p>
      </div>

      <app-banner
        *ngIf="locked"
        variant="warning"
        message="This consultation is locked. Create an amendment for changes."
      ></app-banner>

      <form class="soap-grid" [formGroup]="form">
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Chief Complaint *</ion-label>
          <ion-input formControlName="chiefComplaint" placeholder="Required"></ion-input>
        </ion-item>
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Subjective</ion-label>
          <ion-textarea formControlName="subjective" autoGrow="true"></ion-textarea>
        </ion-item>
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Objective</ion-label>
          <ion-textarea formControlName="objective" autoGrow="true"></ion-textarea>
        </ion-item>
        <ion-item class="field" [disabled]="locked">
          <ion-label position="stacked">Assessment</ion-label>
          <ion-textarea formControlName="assessment" autoGrow="true"></ion-textarea>
        </ion-item>
        <ion-item class="field field--full" [disabled]="locked">
          <ion-label position="stacked">Plan</ion-label>
          <ion-textarea formControlName="plan" autoGrow="true"></ion-textarea>
        </ion-item>
      </form>
    </section>
  `,
  styleUrl: './soap-form.component.scss'
})
export class SoapFormComponent implements OnChanges {
  @Input() value: SoapFormValue | null = null;
  @Input() locked = false;

  @Output() soapChange = new EventEmitter<SoapFormValue>();
  @Output() validityChange = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    chiefComplaint: ['', Validators.required],
    subjective: [''],
    objective: [''],
    assessment: [''],
    plan: ['']
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
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
          chiefComplaint: this.value?.chiefComplaint ?? '',
          subjective: this.value?.subjective ?? '',
          objective: this.value?.objective ?? '',
          assessment: this.value?.assessment ?? '',
          plan: this.value?.plan ?? ''
        },
        { emitEvent: false }
      );
      this.emitValue();
    }

    if (changes['locked']) {
      if (this.locked) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    }
  }

  private emitValue(): void {
    this.soapChange.emit(this.form.getRawValue() as SoapFormValue);
    this.validityChange.emit(this.form.valid);
  }
}
