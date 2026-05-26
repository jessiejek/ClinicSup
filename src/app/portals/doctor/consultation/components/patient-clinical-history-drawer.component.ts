import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientClinicalHistoryDto } from '../../../../core/models/patient-clinical-history.models';

@Component({
  selector: 'app-patient-clinical-history-drawer',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf, RouterLink],
  template: `
    <div class="pch-backdrop" *ngIf="isOpen" (click)="close.emit()"></div>
    <aside
      class="pch-drawer"
      [class.is-open]="isOpen"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId"
    >
      <div class="pch-head">
        <div>
          <h2 [id]="titleId">Clinical History - {{ patientName }}</h2>
          <p>Last 10 consultations, newest first.</p>
        </div>
        <button type="button" class="pch-close" (click)="close.emit()" aria-label="Close clinical history">&times;</button>
      </div>

      <ng-container *ngIf="history !== undefined; else loading">
        <ng-container *ngIf="history as clinicalHistory">
          <div class="pch-empty" *ngIf="clinicalHistory.consultations.length === 0; else historyList">
            No previous consultations on record.
          </div>

          <ng-template #historyList>
            <div class="pch-timeline">
              <article class="pch-entry" *ngFor="let consult of clinicalHistory.consultations; let i = index">
                <button type="button" class="pch-entry__toggle" (click)="toggle(i)" [attr.aria-expanded]="isOpenEntry(i)">
                  <span class="pch-entry__date">{{ consult.appointmentDate | date : 'MMMM d, y' }}</span>
                  <span class="pch-entry__meta">{{ consult.doctorName }}</span>
                  <i class="ti ti-chevron-down" [class.is-rotated]="isOpenEntry(i)"></i>
                </button>

                <div class="pch-entry__panel" *ngIf="isOpenEntry(i)">
                  <p><strong>Chief Complaint:</strong> {{ getSoapField(consult, 'chiefComplaint') || '-' }}</p>
                  <p><strong>Diagnoses:</strong> {{ consult.diagnosesSummary || '-' }}</p>
                  <p>
                    <strong>Prescriptions:</strong>
                    <span *ngIf="getPrescriptionItems(consult).length; else noRx">
                      <span *ngFor="let item of getPrescriptionItems(consult); let last = last">
                        {{ item.medicationName }} {{ item.strength || '' }}{{ last ? '' : '; ' }}
                      </span>
                    </span>
                  </p>
                  <p>
                    <strong>Lab Orders:</strong>
                    <span *ngIf="consult.labOrders.length > 0; else noLabs">
                      <span *ngFor="let order of consult.labOrders; let last = last">
                        {{ getLabOrderName(order) }}{{ last ? '' : '; ' }}
                      </span>
                    </span>
                  </p>
                  <p><strong>Follow-up date:</strong> {{ getFollowUpDate(consult) || '-' }}</p>
                  <p><strong>SOAP Summary:</strong> {{ getSoapSummary(consult) }}</p>
                  <a
                    class="pch-entry__link"
                    [routerLink]="['/doctor/appointments', consult.bookingId]"
                    target="_blank"
                    rel="noopener"
                  >
                    Jump to full record
                  </a>
                </div>
              </article>
            </div>
          </ng-template>
        </ng-container>
      </ng-container>

      <ng-template #loading>
        <div class="pch-loading">Loading clinical history...</div>
      </ng-template>
    </aside>

    <ng-template #noRx>-</ng-template>
    <ng-template #noLabs>-</ng-template>
  `,
  styleUrl: './patient-clinical-history-drawer.component.scss'
})
export class PatientClinicalHistoryDrawerComponent {
  @Input() isOpen = false;
  @Input() patientName = 'Patient';
  @Input() history: PatientClinicalHistoryDto | null | undefined = undefined;
  @Output() close = new EventEmitter<void>();

  readonly titleId = `pch-title-${Math.random().toString(36).slice(2, 10)}`;
  private openEntries = new Set<number>();

  toggle(index: number): void {
    if (this.openEntries.has(index)) {
      this.openEntries.delete(index);
      return;
    }
    this.openEntries.add(index);
  }

  isOpenEntry(index: number): boolean {
    return this.openEntries.has(index);
  }

  getSoapSummary(consult: PatientClinicalHistoryDto['consultations'][number]): string {
    const parts = [
      this.getSoapField(consult, 'chiefComplaint'),
      this.getSoapField(consult, 'subjective'),
      this.getSoapField(consult, 'objective'),
      this.getSoapField(consult, 'assessment'),
      this.getSoapField(consult, 'plan')
    ]
      .filter((part) => !!part?.trim())
      .map((part) => part!.trim().slice(0, 200));
    return parts.join(' | ') || '-';
  }

  getSoapField(
    consult: PatientClinicalHistoryDto['consultations'][number],
    field: 'chiefComplaint' | 'subjective' | 'objective' | 'assessment' | 'plan'
  ): string {
    return (consult.soap?.[field] ?? '').trim();
  }

  getPrescriptionItems(consult: PatientClinicalHistoryDto['consultations'][number]): Array<{ medicationName?: string; strength?: string | null }> {
    return (consult.prescription?.['items'] ?? []) as Array<{ medicationName?: string; strength?: string | null }>;
  }

  getLabOrderName(order: PatientClinicalHistoryDto['consultations'][number]['labOrders'][number]): string {
    return order.items[0]?.testName || 'Lab order';
  }

  getFollowUpDate(consult: PatientClinicalHistoryDto['consultations'][number]): string {
    return consult.followUp?.['followUpDate'] ?? '';
  }
}
