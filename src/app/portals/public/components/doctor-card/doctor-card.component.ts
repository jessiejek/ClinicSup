import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline } from 'ionicons/icons';
import { Doctor } from '../../../../core/models';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { PesoPipe } from '../../../../shared/pipes/peso.pipe';

@Component({
  selector: 'app-doctor-card',
  standalone: true,
  imports: [RouterLink, IonIcon, AvatarComponent, StatusBadgeComponent, PesoPipe],
  template: `
    <article class="doctor-card">
      <div class="doctor-card__avatar">
        <div class="doctor-card__avatar-ring">
          <app-avatar
            [name]="doctor.fullName"
            [imageUrl]="doctor.profilePhotoUrl"
            size="xl"
          />
        </div>
      </div>
      <div class="doctor-card__name">{{ doctor.fullName }}</div>
      <div class="doctor-card__spec">{{ doctor.specialization }}</div>
      <div class="doctor-card__status">
        <app-status-badge [status]="doctor.status"></app-status-badge>
      </div>
      <div class="doctor-card__fee">{{ doctor.consultationFee | peso }}</div>
      <div class="doctor-card__rating">
        <span class="star" aria-hidden="true">★</span>
        <span>{{ doctor.averageRating ?? '—' }}</span>
        <span>({{ doctor.reviewCount ?? 0 }} reviews)</span>
      </div>
      <div class="doctor-card__actions">
        <a
          class="btn-book"
          [routerLink]="['/public/booking']"
          [queryParams]="{ doctorId: doctor.id }"
        >
          Book Now
        </a>
        <a
          class="btn-profile"
          [routerLink]="['/public/doctors', doctor.id]"
          aria-label="View profile"
        >
          <ion-icon name="person-outline"></ion-icon>
        </a>
      </div>
    </article>
  `,
  styleUrl: './doctor-card.component.scss'
})
export class DoctorCardComponent {
  @Input({ required: true }) doctor!: Doctor;

  constructor() {
    addIcons({ personOutline });
  }
}
