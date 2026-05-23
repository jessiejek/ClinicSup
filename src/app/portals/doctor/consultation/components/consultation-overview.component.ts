import { Component, Input } from '@angular/core';
import { Allergy, Consultation, FollowUp, Patient, Prescription } from '../../../../core/models';

@Component({
  selector: 'app-consultation-overview',
  standalone: true,
  template: `
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

      @media (max-width: 900px) {
        .summary-grid {
          grid-template-columns: 1fr;
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
}
