import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonTextarea } from '@ionic/angular/standalone';

export type ProfessionalFeePaymentMode = 'Cash' | 'Card' | 'PayMClinic' | 'HMO' | 'Waived';

@Component({
  selector: 'app-professional-fee-decision-form',
  standalone: true,
  imports: [
    DecimalPipe,
    NgFor,
    NgIf,
    ReactiveFormsModule,
    IonInput,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonTextarea
  ],
  template: `
    <section *ngIf="visible" class="clinic-card section-card" [class.section-card--locked]="locked" aria-labelledby="pf-decision-heading">
      <div class="section-card__head">
        <h3 id="pf-decision-heading">PF Decision <i *ngIf="locked" class="ti ti-lock section-card__lock"></i></h3>
        <p>Confirm the professional fee before finalizing the consultation.</p>
      </div>

      <div class="pfd-summary">
        <div class="pfd-summary__item">
          <span class="pfd-summary__label">Current consultation fee</span>
          <strong>PHP {{ currentConsultationFee | number : '1.0-0' }}</strong>
        </div>
      </div>

      <form class="pfd-grid" [formGroup]="form">
        <ion-item class="field">
          <ion-label position="stacked">Professional Fee *</ion-label>
          <ion-input type="number" min="0" formControlName="professionalFee" [disabled]="locked"></ion-input>
        </ion-item>
        <ion-item class="field">
          <ion-label position="stacked">Payment Mode *</ion-label>
          <ion-select formControlName="paymentMode" [interface]="selectInterface" [disabled]="locked">
            <ion-select-option *ngFor="let mode of paymentModes" [value]="mode">{{ mode }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item class="field field--full">
          <ion-label position="stacked">Notes</ion-label>
          <ion-textarea
            formControlName="notes"
            autoGrow="true"
            [disabled]="locked"
            placeholder="Fee adjustment reason, if any"
          ></ion-textarea>
        </ion-item>
      </form>

      <p class="pfd-note">This section must be acknowledged before completing the consultation.</p>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        scroll-margin-top: 128px;
      }

      .section-card {
        display: grid;
        gap: var(--space-4);
      }

      .section-card__head h3 {
        margin: 0;
      }

      .section-card__head p {
        margin: 4px 0 0;
        color: var(--clinic-text-secondary);
      }

      .pfd-summary {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
      }

      .pfd-summary__item {
        display: grid;
        gap: 4px;
        padding: 12px 14px;
        border-radius: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .pfd-summary__label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #94a3b8;
        font-weight: 800;
      }

      .pfd-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-3);
      }

      .field {
        --background: transparent;
        --border-radius: var(--radius-lg);
      }

      .field--full {
        grid-column: 1 / -1;
      }

      .pfd-note {
        margin: 0;
        color: #64748b;
        font-size: 0.8rem;
      }

      @media (max-width: 900px) {
        .pfd-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 767px) {
        .field {
          min-height: 48px;
        }
      }
    `
  ]
})
export class ProfessionalFeeDecisionFormComponent implements OnChanges {
  @Input() currentConsultationFee = 0;
  @Input() professionalFee = 0;
  @Input() paymentMode: ProfessionalFeePaymentMode = 'Cash';
  @Input() notes = '';
  @Input() locked = false;
  @Input() visible = true;

  @Output() professionalFeeChange = new EventEmitter<number>();
  @Output() paymentModeChange = new EventEmitter<ProfessionalFeePaymentMode>();
  @Output() notesChange = new EventEmitter<string>();
  @Output() validityChange = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly paymentModes: ProfessionalFeePaymentMode[] = ['Cash', 'Card', 'PayMClinic', 'HMO', 'Waived'];
  get selectInterface(): 'action-sheet' | 'popover' {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'action-sheet' : 'popover';
  }

  readonly form = this.fb.group({
    professionalFee: [0, [Validators.required, Validators.min(0)]],
    paymentMode: ['Cash' as ProfessionalFeePaymentMode, Validators.required],
    notes: ['']
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
    if (changes['professionalFee'] || changes['paymentMode'] || changes['notes']) {
      this.form.patchValue(
        {
          professionalFee: this.professionalFee,
          paymentMode: this.paymentMode,
          notes: this.notes
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
    const value = this.form.getRawValue();
    this.professionalFeeChange.emit(this.toNumber(value.professionalFee));
    this.paymentModeChange.emit((value.paymentMode as ProfessionalFeePaymentMode) || 'Cash');
    this.notesChange.emit(String(value.notes ?? '').trim());
    this.validityChange.emit(this.form.valid);
  }

  private toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }
}
