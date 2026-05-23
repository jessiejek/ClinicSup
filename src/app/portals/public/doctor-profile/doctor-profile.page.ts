import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { addIcons } from 'ionicons';
import { alertCircleOutline, personOutline, warningOutline } from 'ionicons/icons';
import { Review, Service, ServiceCategory } from '../../../core/models';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { BannerComponent } from '../../../shared/components/banner/banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PesoPipe } from '../../../shared/pipes/peso.pipe';
import { ReviewCardComponent } from '../components/review-card/review-card.component';
import { DoctorDetail, PublicService } from '../services/public.service';
import { formatDoctorScheduleLines } from '../utils/time-format';
import { DoctorStateService } from '../../../core/services/doctor-state.service';
import { DoctorDayStatus } from '../../../core/models';

@Component({
  selector: 'app-doctor-profile-page',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    RouterLink,
    BannerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    AvatarComponent,
    PesoPipe,
    ReviewCardComponent
  ],
  template: `
    <div class="profile-loading" *ngIf="isLoading">Loading…</div>

    <ng-container *ngIf="!isLoading && !doctor">
      <div class="content-container profile-empty">
        <app-empty-state
          icon="person-outline"
          title="Doctor not found"
          description="We could not find this clinician. Try the doctors directory."
          ctaLabel="View doctors"
          ctaRoute="/public/doctors"
        />
      </div>
    </ng-container>

    <ng-container *ngIf="doctor as d">
      <section class="profile-banner">
        <div class="content-container profile-banner__inner">
          <div class="profile-banner__left">
            <div class="profile-avatar-wrap">
              <app-avatar [name]="d.fullName" [imageUrl]="d.profilePhotoUrl" size="2xl" />
            </div>
            <div>
              <h1 class="profile-name">{{ d.fullName }}</h1>
              <div class="profile-meta">
                <span class="profile-spec-badge">{{ d.specialization }}</span>
                <app-status-badge [status]="d.status"></app-status-badge>
              </div>
              <app-banner
                *ngIf="dayStatus?.status === 'RunningLate'"
                variant="warning"
                [message]="
                  'Dr. ' +
                  d.fullName +
                  ' is running approximately ' +
                  (dayStatus?.runningLateMinutes ?? 15) +
                  ' minutes late today.'
                "
              ></app-banner>
              <app-banner
                *ngIf="dayStatus?.status === 'UnavailableToday'"
                variant="danger"
                [message]="'Dr. ' + d.fullName + ' is not available today. Please book a different date.'"
              ></app-banner>
              <p class="profile-fee">{{ d.consultationFee | peso }} <span>per consultation</span></p>
              <a
                class="profile-book-btn"
                [routerLink]="['/public/booking']"
                [queryParams]="{ doctorId: d.id }"
              >
                Book Appointment with {{ d.fullName }}
              </a>
            </div>
          </div>
        </div>
      </section>

      <div class="content-container profile-body">
        <div class="clinic-card about-card">
          <h3>About {{ d.fullName }}</h3>
          <p class="bio">{{ d.bio }}</p>
          <div class="detail-row" *ngIf="d.licenseNumber">
            <span>License: {{ d.licenseNumber }}</span>
          </div>
          <div class="detail-row" *ngIf="d.ptrNumber">
            <span>PTR: {{ d.ptrNumber }}</span>
          </div>
        </div>

        <div class="clinic-card">
          <h3>Services Offered</h3>
          <ul class="service-list" *ngIf="services.length">
            <li *ngFor="let svc of services" class="service-row">
              <div>
                <strong>{{ svc.name }}</strong>
                <span class="badge" [ngClass]="badgeClass(svc.category)">{{ svc.category }}</span>
                <p class="service-row__desc" *ngIf="svc.description">{{ svc.description }}</p>
              </div>
              <div class="service-row__meta">
                <span *ngIf="svc.estimatedDurationMinutes != null">Duration: {{ svc.estimatedDurationMinutes }} min</span>
                <span class="svc-fee" *ngIf="svc.price != null">{{ svc.price | peso }}</span>
              </div>
            </li>
          </ul>
          <p *ngIf="!services.length" class="muted">No services listed.</p>
        </div>

        <div class="clinic-card">
          <h3>Clinic Schedule</h3>
          <ul class="schedule-list">
            <li *ngFor="let line of scheduleLines">{{ line }}</li>
          </ul>
        </div>

        <div class="clinic-card">
          <h3>Patient Reviews</h3>
          <div class="rating-summary" *ngIf="d.averageRating != null">
            <span class="star-lg" aria-hidden="true">★</span>
            <span class="rating-num">{{ d.averageRating }}</span>
            <span class="muted">({{ reviews.length }} reviews)</span>
          </div>
          <div class="reviews-list">
            <app-review-card *ngFor="let r of reviews" [review]="r" />
          </div>
          <p class="review-total muted">Total: {{ reviews.length }} reviews</p>
        </div>
      </div>
    </ng-container>
  `,
  styleUrl: './doctor-profile.page.scss'
})
export class DoctorProfilePage implements OnInit {
  private readonly doctorState = inject(DoctorStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly publicService = inject(PublicService);

  isLoading = true;
  doctor?: DoctorDetail;
  reviews: Review[] = [];
  services: Service[] = [];
  scheduleLines: string[] = [];
  dayStatus?: DoctorDayStatus;

  constructor() {
    addIcons({ alertCircleOutline, personOutline, warningOutline });
  }

  badgeClass(cat: ServiceCategory): string {
    const kebab = cat.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    return `badge--${kebab}`;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading = false;
      return;
    }
    this.doctorState.getDoctorDayStatus(id).subscribe((status) => (this.dayStatus = status));
    forkJoin({
      doctor: this.publicService.getDoctorById(id),
      reviews: this.publicService.getDoctorReviews(id),
      schedules: this.publicService.getDoctorSchedules(id)
    }).subscribe(({ doctor, reviews, schedules }) => {
      this.doctor = doctor;
      this.reviews = reviews;
      this.services = doctor?.services ?? [];
      this.scheduleLines = formatDoctorScheduleLines(schedules);
      this.isLoading = false;
    });
  }
}
