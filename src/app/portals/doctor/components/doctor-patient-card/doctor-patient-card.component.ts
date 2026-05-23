import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Patient } from '../../../../core/models';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';

@Component({
  selector: 'app-doctor-patient-card',
  standalone: true,
  imports: [AvatarComponent],
  template: `
    <article class="clinic-card patient-card">
      <app-avatar [name]="fullName" size="lg"></app-avatar>

      <div class="patient-card__content">
        <div class="patient-card__head">
          <div>
            <div class="patient-card__name">{{ fullName }}</div>
            <div class="patient-card__code">{{ patient.patientCode }}</div>
          </div>
          <button type="button" class="btn-ghost" (click)="viewPatient.emit(patient.id)">View</button>
        </div>

        <div class="patient-card__meta">
          <span>{{ ageLabel }}</span>
          <span>{{ patient.sex }}</span>
          <span>Last visit: {{ lastVisit || 'No prior visit' }}</span>
          <span>Upcoming: {{ upcomingAppointmentsCount }}</span>
        </div>
      </div>
    </article>
  `,
  styleUrl: './doctor-patient-card.component.scss'
})
export class DoctorPatientCardComponent {
  @Input({ required: true }) patient!: Patient;
  @Input() lastVisit = '';
  @Input() upcomingAppointmentsCount = 0;

  @Output() viewPatient = new EventEmitter<string>();

  get fullName(): string {
    return `${this.patient.firstName} ${this.patient.lastName}`;
  }

  get ageLabel(): string {
    const birthDate = new Date(this.patient.dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) {
      return 'Age unavailable';
    }
    const age = new Date().getFullYear() - birthDate.getFullYear();
    return `${age} years old`;
  }
}
