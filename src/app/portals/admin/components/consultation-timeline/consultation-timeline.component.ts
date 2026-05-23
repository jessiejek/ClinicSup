import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Consultation } from '../../../../core/models';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-consultation-timeline',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf, StatusBadgeComponent],
  template: `
    <section class="clinic-card section-card">
      <div class="section-card__head">
        <h3>Consultation Timeline</h3>
        <p>Chronological record of completed and draft consultations.</p>
      </div>

      <article class="timeline-item" *ngFor="let consultation of consultations">
        <div class="timeline-item__date">{{ consultation.consultationDate | date : 'MMM d, y' }}</div>
        <div class="timeline-item__body">
          <div class="timeline-item__top">
            <strong>{{ consultation.chiefComplaint }}</strong>
            <app-status-badge [status]="consultation.status"></app-status-badge>
          </div>
          <p>{{ consultation.assessment || 'No assessment recorded.' }}</p>
          <small *ngIf="consultation.followUpDate">Follow-up: {{ consultation.followUpDate }}</small>
        </div>
      </article>
    </section>
  `,
  styleUrl: './consultation-timeline.component.scss'
})
export class ConsultationTimelineComponent {
  @Input() consultations: Consultation[] = [];
}
