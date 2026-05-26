import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { Allergy, Consultation, FollowUp, Patient, Prescription } from '../../../../core/models';

@Component({
  selector: 'app-consultation-overview',
  standalone: true,
  imports: [NgIf],
  template: `
    <article class="clinic-card summary-card summary-card--mobile" [class.is-expanded]="mobileExpanded">
      <button type="button" class="summary-card__toggle" (click)="mobileExpanded = !mobileExpanded">
        <div>
          <h3>Patient Summary</h3>
          <p class="summary-card__preview">{{ summaryPreview }}</p>
        </div>
        <span class="summary-card__chevron">{{ mobileExpanded ? '▴' : '▾' }}</span>
      </button>

      <div class="summary-card__body" *ngIf="mobileExpanded">
        <p><strong>Age / Sex:</strong> {{ ageLabel }} / {{ patient.sex }}</p>
        <p><strong>Allergies:</strong> {{ allergySummary }}</p>
        <p><strong>Last Visit:</strong> {{ lastVisit }}</p>
        <p><strong>Existing Conditions:</strong> {{ conditionSummary }}</p>
        <p><strong>Consultation:</strong> {{ consultation?.status || 'Draft' }}</p>
        <p><strong>Locked:</strong> {{ consultation?.isLocked ? 'Yes' : 'No' }}</p>
        <p><strong>Prescriptions:</strong> {{ existingPrescription ? 1 : 0 }}</p>
        <p><strong>Follow-Ups:</strong> {{ followUps.length }}</p>
      </div>
    </article>

    <section class="summary-grid">
      <article class="clinic-card summary-card">
        <h3>Patient Summary</h3>
        <p><strong>Age / Sex:</strong> {{ ageLabel }} / {{ patient.sex }}</p>
        <p><strong>Allergies:</strong> {{ allergySummary }}</p>
        <p><strong>Last Visit:</strong> {{ lastVisit }}</p>
        <p><strong>Existing Conditions:</strong> {{ conditionSummary }}</p>
      </article>

      <article class="clinic-card summary-card">
        <h3>Record Status</h3>
        <p><strong>Consultation:</strong> {{ consultation?.status || 'Draft' }}</p>
        <p><strong>Locked:</strong> {{ consultation?.isLocked ? 'Yes' : 'No' }}</p>
        <p><strong>Prescriptions:</strong> {{ existingPrescription ? 1 : 0 }}</p>
        <p><strong>Follow-Ups:</strong> {{ followUps.length }}</p>
      </article>
    </section>
  `,
  styles: [
    `
      .summary-card--mobile {
        display: none;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-4);
        margin-bottom: var(--space-4);
      }

      .summary-card {
        display: grid;
        gap: var(--space-2);
      }

      .summary-card h3 {
        margin: 0;
      }

      .summary-card__toggle {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
        border: none;
        background: transparent;
        text-align: left;
        padding: 0;
        color: inherit;
        cursor: pointer;
      }

      .summary-card__preview {
        margin: 4px 0 0;
        color: var(--clinic-text-secondary);
        font-size: 0.8rem;
      }

      .summary-card__body {
        display: grid;
        gap: 4px;
        padding-top: 8px;
      }

      @media (max-width: 900px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 767px) {
        .summary-grid {
          display: none;
        }

        .summary-card--mobile {
          display: grid;
        }
      }
    `
  ]
})
export class ConsultationOverviewComponent {
  @Input({ required: true }) patient!: Patient;
  @Input() consultation: Consultation | null = null;
  @Input() existingPrescription: Prescription | null = null;
  @Input() allergies: Allergy[] = [];
  @Input() followUps: FollowUp[] = [];
  @Input() recentConsultations: Consultation[] = [];
  mobileExpanded = false;

  get ageLabel(): string {
    const birthDate = new Date(this.patient.dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) {
      return 'Age unavailable';
    }
    const years = new Date().getFullYear() - birthDate.getFullYear();
    return `${years} years old`;
  }

  get allergySummary(): string {
    return this.allergies.length > 0
      ? this.allergies.map((allergy) => allergy.allergen).join(', ')
      : 'None recorded';
  }

  get lastVisit(): string {
    return this.recentConsultations[0]?.consultationDate || 'No prior visit';
  }

  get conditionSummary(): string {
    const diagnoses = this.recentConsultations.flatMap((consultation) =>
      consultation.diagnoses.map((diagnosis) => diagnosis.description)
    );
    const unique = [...new Set(diagnoses)];
    return unique.length > 0 ? unique.slice(0, 3).join(', ') : 'No existing conditions';
  }

  get summaryPreview(): string {
    return `${this.ageLabel} / ${this.patient.sex || '--'} • ${this.consultation?.status || 'Draft'} • ${this.lastVisit}`;
  }
}
