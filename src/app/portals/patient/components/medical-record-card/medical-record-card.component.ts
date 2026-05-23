import { DatePipe, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Consultation, Doctor } from '../../../../core/models';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-medical-record-card',
  standalone: true,
  imports: [NgIf, DatePipe, StatusBadgeComponent],
  template: `
    <article class="record-card clinic-card">
      <div class="record-card__header">
        <div>
          <div class="record-card__date">{{ consultation.consultationDate | date : 'MMM d, y' }}</div>
          <h3>{{ doctor?.fullName || 'Doctor' }}</h3>
        </div>
        <app-status-badge [status]="recordStatus"></app-status-badge>
      </div>

      <div class="record-card__grid">
        <div>
          <span>Chief Complaint</span>
          <p>{{ consultation.chiefComplaint }}</p>
        </div>
        <div>
          <span>Assessment</span>
          <p>{{ consultation.assessment || 'No assessment recorded.' }}</p>
        </div>
        <div>
          <span>Plan</span>
          <p>{{ consultation.plan || 'No plan recorded.' }}</p>
        </div>
      </div>

      <div class="record-card__actions">
        <button type="button" class="btn-outline" (click)="viewDetails.emit(consultation.id)">
          View Details
        </button>
      </div>
    </article>
  `,
  styleUrl: './medical-record-card.component.scss'
})
export class MedicalRecordCardComponent {
  @Input({ required: true }) consultation!: Consultation;
  @Input() doctor?: Doctor;

  @Output() viewDetails = new EventEmitter<string>();

  get recordStatus(): string {
    return this.consultation.isLocked ? 'Completed' : 'Draft';
  }
}
