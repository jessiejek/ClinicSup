import { NgIf } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ModalController
} from '@ionic/angular/standalone';

export interface ConsultationCompleteModalPayload {
  finalAmount: number;
  isProfessionalFeeWaived: boolean;
  professionalFeeWaivedReason: string;
}

@Component({
  selector: 'app-consultation-complete-modal',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Complete Transaction</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" [disabled]="isSubmitting" (click)="close()">
            Close
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="clinic-card completion-modal__summary">
        <div class="section-heading">{{ patientName || 'Patient' }}</div>
        <p>{{ serviceLabel }}</p>
        <p>{{ scheduleLabel }}</p>
      </div>

      <div class="payment-mode-tabs">
        <button
          type="button"
          [class.active]="!isProfessionalFeeWaived"
          [disabled]="isSubmitting"
          (click)="setWaived(false)"
        >
          Charge PF
        </button>
        <button
          type="button"
          [class.active]="isProfessionalFeeWaived"
          [disabled]="isSubmitting"
          (click)="setWaived(true)"
        >
          Waive PF
        </button>
      </div>

      <form [formGroup]="form">
        <div class="clinic-card completion-modal__card" *ngIf="!isProfessionalFeeWaived">
          <label class="form-label" for="consultation-final-amount">Final Amount</label>
          <input
            id="consultation-final-amount"
            class="completion-modal__input"
            type="number"
            min="0"
            formControlName="finalAmount"
            [disabled]="isSubmitting"
          />
        </div>

        <div class="clinic-card completion-modal__card" *ngIf="isProfessionalFeeWaived">
          <label class="form-label" for="consultation-waive-reason">Waived Reason</label>
          <textarea
            id="consultation-waive-reason"
            class="completion-modal__input completion-modal__textarea"
            rows="3"
            formControlName="professionalFeeWaivedReason"
            [disabled]="isSubmitting"
          ></textarea>
        </div>
      </form>

      <div class="clinic-card completion-modal__note">
        Staff will see this booking in the payment queue after completion.
      </div>

      <div class="wizard-actions wizard-actions--split">
        <button type="button" class="btn-outline" [disabled]="isSubmitting" (click)="close()">
          Cancel
        </button>
        <button type="button" class="btn-primary" [disabled]="isSubmitting" (click)="submit()">
          {{ isSubmitting ? 'Completing...' : 'Complete Transaction' }}
        </button>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .completion-modal__summary,
      .completion-modal__card,
      .completion-modal__note {
        margin-bottom: var(--space-4);
      }

      .completion-modal__summary p {
        margin: var(--space-2) 0 0;
        color: var(--clinic-text-secondary);
      }

      .payment-mode-tabs {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-3);
        margin-bottom: var(--space-4);
      }

      .payment-mode-tabs button {
        border: 1.5px solid var(--clinic-border);
        background: white;
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        font-weight: var(--font-semibold);
        color: var(--clinic-text-secondary);
      }

      .payment-mode-tabs button.active {
        border-color: var(--ion-color-primary);
        background: var(--color-primary-50);
        color: var(--ion-color-primary);
      }

      .form-label {
        display: block;
        margin-bottom: var(--space-2);
        color: var(--clinic-text-secondary);
        font-size: var(--text-sm);
      }

      .completion-modal__input {
        width: 100%;
        min-height: 44px;
        padding: 0 14px;
        border: 1px solid var(--clinic-border);
        border-radius: 12px;
        background: white;
        color: var(--clinic-text-primary);
      }

      .completion-modal__textarea {
        min-height: 110px;
        padding: 14px;
        resize: vertical;
      }

      .completion-modal__note {
        color: var(--clinic-text-secondary);
      }

      .wizard-actions {
        display: flex;
        gap: var(--space-4);
        margin-top: var(--space-6);
      }

      .wizard-actions--split {
        justify-content: space-between;
      }

      @media (max-width: 640px) {
        .payment-mode-tabs {
          grid-template-columns: 1fr;
        }

        .wizard-actions {
          flex-direction: column-reverse;
        }
      }
    `
  ]
})
export class ConsultationCompleteModalComponent implements OnInit {
  @Input() initialFinalAmount = 0;
  @Input() initialIsProfessionalFeeWaived = false;
  @Input() initialProfessionalFeeWaivedReason = '';
  @Input() patientName = '';
  @Input() serviceLabel = '';
  @Input() scheduleLabel = '';
  @Input() submitHandler: ((payload: ConsultationCompleteModalPayload) => Promise<boolean> | boolean) | null = null;

  private readonly fb = inject(FormBuilder);
  private readonly modalCtrl = inject(ModalController);

  isProfessionalFeeWaived = false;
  isSubmitting = false;

  readonly form = this.fb.group({
    finalAmount: [0, [Validators.min(0)]],
    professionalFeeWaivedReason: ['']
  });

  ngOnInit(): void {
    this.isProfessionalFeeWaived = this.initialIsProfessionalFeeWaived;
    this.form.patchValue(
      {
        finalAmount: this.initialIsProfessionalFeeWaived ? 0 : this.initialFinalAmount,
        professionalFeeWaivedReason: this.initialProfessionalFeeWaivedReason
      },
      { emitEvent: false }
    );
  }

  setWaived(value: boolean): void {
    this.isProfessionalFeeWaived = value;
    if (value) {
      this.form.patchValue({ finalAmount: 0 }, { emitEvent: false });
    }
  }

  async close(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async submit(): Promise<void> {
    if (this.isSubmitting || typeof this.submitHandler !== 'function') {
      return;
    }

    this.isSubmitting = true;

    try {
      const completed = await this.submitHandler({
        finalAmount: this.getFinalAmount(),
        isProfessionalFeeWaived: this.isProfessionalFeeWaived,
        professionalFeeWaivedReason: this.getWaivedReason()
      });

      if (completed) {
        await this.modalCtrl.dismiss(null, 'completed');
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  private getFinalAmount(): number {
    const rawValue = this.form.get('finalAmount')?.value as string | number | null | undefined;
    if (rawValue === null || rawValue === undefined) {
      return NaN;
    }

    if (typeof rawValue === 'string' && rawValue.trim().length === 0) {
      return NaN;
    }

    const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    return Number.isFinite(numericValue) ? numericValue : NaN;
  }

  private getWaivedReason(): string {
    return String(this.form.get('professionalFeeWaivedReason')?.value ?? '').trim();
  }
}
