import { DatePipe, NgSwitch, NgSwitchCase } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Booking, Patient } from '../../../../core/models';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

export type ConsultationHeaderMode = 'complete' | 'view' | 'amend';

@Component({
  selector: 'app-consultation-header',
  standalone: true,
  imports: [DatePipe, NgSwitch, NgSwitchCase, PageHeaderComponent],
  template: `
    <app-page-header
      title="Consultation"
      subtitle="Complete the medical record from the appointment"
      [showBackButton]="true"
      defaultBackHref="/doctor/appointments"
    ></app-page-header>

    <section class="consultation-header">
      <div class="consultation-header__copy">
        <h2>{{ patientName }}</h2>
        <p>
          Booking {{ booking.id }} &bull; {{ booking.appointmentDate | date : 'MMM d, y' }}
          {{ booking.slotStartTime }} - {{ booking.slotEndTime }}
        </p>
      </div>
      <div class="consultation-header__actions">
        <ng-container [ngSwitch]="mode">
          <ng-container *ngSwitchCase="'complete'">
            <button type="button" class="btn-ghost" [disabled]="saveDisabled" (click)="saveDraft.emit()">
              {{ isSavingDraft ? 'Saving Draft...' : 'Save Draft' }}
            </button>
            <button type="button" class="btn-primary" [disabled]="completeDisabled" (click)="completeTransaction.emit()">
              {{ isCompleting ? 'Completing...' : 'Complete Transaction' }}
            </button>
          </ng-container>

          <ng-container *ngSwitchCase="'view'">
            <button type="button" class="btn-primary" [disabled]="amendDisabled" (click)="enterAmendMode.emit()">
              Edit / Amend Consultation
            </button>
          </ng-container>

          <ng-container *ngSwitchCase="'amend'">
            <button type="button" class="btn-ghost" [disabled]="amendDisabled || isSavingAmendment" (click)="cancelAmendMode.emit()">
              Cancel
            </button>
            <button type="button" class="btn-primary" [disabled]="amendDisabled || isSavingAmendment" (click)="saveAmendment.emit()">
              {{ isSavingAmendment ? 'Saving Amendment...' : 'Save Amendment' }}
            </button>
          </ng-container>
        </ng-container>
      </div>
    </section>
  `,
  styles: [
    `
      .consultation-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        margin-bottom: var(--space-6);
      }

      .consultation-header__copy {
        flex: 1;
        min-width: 0;
      }

      .consultation-header__copy h2 {
        margin: 0;
        font-size: clamp(1.75rem, 2vw, 2.25rem);
        line-height: 1.1;
      }

      .consultation-header__copy p {
        margin: var(--space-2) 0 0;
        color: var(--clinic-text-secondary);
        overflow-wrap: anywhere;
      }

      .consultation-header__actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        justify-content: flex-end;
        flex-shrink: 0;
      }

      @media (max-width: 900px) {
        .consultation-header {
          flex-direction: column;
          align-items: stretch;
          margin-bottom: var(--space-4);
        }

        .consultation-header__actions {
          justify-content: flex-start;
        }
      }

      @media (max-width: 640px) {
        .consultation-header__actions button {
          width: 100%;
        }
      }
    `
  ]
})
export class ConsultationHeaderComponent {
  @Input({ required: true }) booking!: Booking;
  @Input({ required: true }) patient!: Patient;
  @Input() locked = false;
  @Input() mode: ConsultationHeaderMode = 'complete';
  @Input() saveDisabled = false;
  @Input() completeDisabled = false;
  @Input() amendDisabled = false;
  @Input() isSavingDraft = false;
  @Input() isCompleting = false;
  @Input() isSavingAmendment = false;

  @Output() saveDraft = new EventEmitter<void>();
  @Output() completeTransaction = new EventEmitter<void>();
  @Output() enterAmendMode = new EventEmitter<void>();
  @Output() cancelAmendMode = new EventEmitter<void>();
  @Output() saveAmendment = new EventEmitter<void>();

  get patientName(): string {
    return [this.patient.firstName, this.patient.lastName].filter(Boolean).join(' ') || 'Patient';
  }
}
