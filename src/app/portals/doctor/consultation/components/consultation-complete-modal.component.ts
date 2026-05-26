import { NgFor, NgIf } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ModalController
} from '@ionic/angular/standalone';

export interface ConsultationChecklistItem {
  label: string;
  detail?: string;
  complete: boolean;
}

export interface ConsultationSummaryLine {
  label: string;
  value: string | string[];
}

@Component({
  selector: 'app-consultation-complete-modal',
  standalone: true,
  imports: [NgFor, NgIf, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Complete Consultation</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" [disabled]="isSubmitting" (click)="close()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="completion-wizard">
        <div class="completion-wizard__stepper">
          <span class="completion-wizard__step" [class.is-active]="step === 1">1. Checklist</span>
          <span class="completion-wizard__step" [class.is-active]="step === 2">2. Summary</span>
        </div>

        <section class="clinic-card completion-panel" *ngIf="step === 1">
          <div class="completion-panel__head">
            <div class="section-heading">Completion Checklist</div>
            <p>Review every required item before moving to the summary.</p>
          </div>

          <div class="checklist">
            <div class="checklist__item" *ngFor="let item of checklistItems">
              <span class="checklist__icon" [class.checklist__icon--complete]="item.complete" [class.checklist__icon--missing]="!item.complete">
                {{ item.complete ? '✓' : '✕' }}
              </span>
              <div class="checklist__body">
                <strong>{{ item.label }}</strong>
                <span *ngIf="item.detail">{{ item.detail }}</span>
              </div>
            </div>
          </div>

          <div class="wizard-actions wizard-actions--split">
            <button type="button" class="btn-ghost" [disabled]="isSubmitting" (click)="close()">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="hasMissingChecklistItems() || isSubmitting" (click)="goToSummary()">
              Review Summary
            </button>
          </div>
        </section>

        <section class="clinic-card completion-panel" *ngIf="step === 2">
          <div class="completion-panel__head">
            <div class="section-heading">Consultation Summary</div>
            <p>Read-only review before finalizing the consultation record.</p>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <span class="summary-card__label">Patient</span>
              <strong>{{ patientName }}</strong>
              <span>{{ patientDob }}</span>
              <span>{{ patientMrn }}</span>
            </div>

            <div class="summary-card">
              <span class="summary-card__label">Visit date and time</span>
              <strong>{{ visitDateTime }}</strong>
            </div>

            <div class="summary-card summary-card--wide" *ngFor="let line of summaryLines">
              <span class="summary-card__label">{{ line.label }}</span>
              <strong *ngIf="!isArrayValue(line.value); else listTpl">{{ line.value }}</strong>
              <ng-template #listTpl>
                <div class="summary-list">
                  <span *ngFor="let item of toArrayValue(line.value)">{{ item }}</span>
                </div>
              </ng-template>
            </div>
          </div>

          <div class="wizard-actions wizard-actions--split">
            <button type="button" class="btn-ghost" [disabled]="isSubmitting" (click)="goBack()">Go Back</button>
            <button type="button" class="btn-primary" [disabled]="isSubmitting" (click)="finalize()">
              {{ isSubmitting ? 'Finalizing...' : 'Finalize Consultation' }}
            </button>
          </div>
        </section>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .completion-wizard {
        display: grid;
        gap: var(--space-4);
      }

      .completion-wizard__stepper {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .completion-wizard__step {
        padding: 6px 10px;
        border-radius: 999px;
        background: #f1f5f9;
        color: #64748b;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .completion-wizard__step.is-active {
        background: #ede9fe;
        color: #5b21b6;
      }

      .completion-panel {
        display: grid;
        gap: var(--space-4);
      }

      .completion-panel__head p {
        margin: var(--space-2) 0 0;
        color: var(--clinic-text-secondary);
      }

      .checklist {
        display: grid;
        gap: var(--space-3);
      }

      .checklist__item {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: 12px 14px;
        border-radius: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .checklist__icon {
        width: 28px;
        height: 28px;
        min-width: 28px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        line-height: 1;
      }

      .checklist__icon--complete {
        background: #dcfce7;
        color: #166534;
      }

      .checklist__icon--missing {
        background: #fee2e2;
        color: #b91c1c;
      }

      .checklist__body {
        display: grid;
        gap: 4px;
      }

      .checklist__body strong {
        color: #0f172a;
      }

      .checklist__body span {
        color: #64748b;
        font-size: 0.82rem;
      }

      .summary-grid {
        display: grid;
        gap: var(--space-3);
      }

      .summary-card {
        display: grid;
        gap: 4px;
        padding: 12px 14px;
        border-radius: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .summary-card--wide {
        grid-column: 1 / -1;
      }

      .summary-card__label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #94a3b8;
        font-weight: 800;
      }

      .summary-card strong {
        color: #0f172a;
      }

      .summary-list {
        display: grid;
        gap: 4px;
      }

      .summary-list span {
        color: #334155;
      }

      .wizard-actions {
        display: flex;
        gap: var(--space-4);
      }

      .wizard-actions--split {
        justify-content: space-between;
      }

      @media (max-width: 640px) {
        .wizard-actions {
          flex-direction: column-reverse;
        }
      }
    `
  ]
})
export class ConsultationCompleteModalComponent implements OnInit {
  @Input() patientName = '';
  @Input() patientDob = '';
  @Input() patientMrn = '';
  @Input() visitDateTime = '';
  @Input() checklistItems: ConsultationChecklistItem[] = [];
  @Input() summaryLines: ConsultationSummaryLine[] = [];
  @Input() submitHandler: (() => Promise<boolean> | boolean) | null = null;

  private readonly modalCtrl = inject(ModalController);

  step: 1 | 2 = 1;
  isSubmitting = false;

  ngOnInit(): void {
    this.step = 1;
  }

  hasMissingChecklistItems(): boolean {
    return this.checklistItems.some((item) => !item.complete);
  }

  goToSummary(): void {
    if (this.hasMissingChecklistItems() || this.isSubmitting) {
      return;
    }
    this.step = 2;
  }

  goBack(): void {
    if (this.isSubmitting) {
      return;
    }
    this.step = 1;
  }

  async finalize(): Promise<void> {
    if (this.isSubmitting || typeof this.submitHandler !== 'function') {
      return;
    }

    this.isSubmitting = true;
    try {
      const completed = await this.submitHandler();
      if (completed) {
        await this.modalCtrl.dismiss(null, 'completed');
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  async close(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  isArrayValue(value: string | string[]): value is string[] {
    return Array.isArray(value);
  }

  toArrayValue(value: string | string[]): string[] {
    return Array.isArray(value) ? value : [value];
  }
}
