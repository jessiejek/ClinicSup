import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ServiceCategory } from '../../../core/models';
import { PublicService } from '../services/public.service';
import { AnnouncementCardComponent } from '../components/announcement-card/announcement-card.component';
import { DoctorCardComponent } from '../components/doctor-card/doctor-card.component';
import { HeroSectionComponent } from '../components/hero-section/hero-section.component';
import { OperatingHoursBarComponent } from '../components/operating-hours-bar/operating-hours-bar.component';
import { ServiceCategoryCardComponent } from '../components/service-category-card/service-category-card.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    RouterLink,
    HeroSectionComponent,
    OperatingHoursBarComponent,
    DoctorCardComponent,
    ServiceCategoryCardComponent,
    AnnouncementCardComponent
  ],
  template: `
    <app-hero-section />
    <ng-container *ngIf="settings$ | async as settings">
      <app-operating-hours-bar [settings]="settings" />
    </ng-container>

    <section class="home-section">
      <div class="content-container">
        <p class="section-heading">Our Specialists</p>
        <h2 class="section-title">Meet Our Doctors</h2>
        <p class="section-subtitle">Experienced professionals dedicated to your health</p>
        <div class="doctors-grid" *ngIf="doctors$ | async as doctors">
          <app-doctor-card *ngFor="let doc of doctors" [doctor]="doc"></app-doctor-card>
        </div>
        <div class="view-all-link">
          <a routerLink="/public/doctors" class="btn-outline">View All Doctors →</a>
        </div>
      </div>
    </section>

    <section class="home-section home-section--alt">
      <div class="content-container">
        <p class="section-heading">What We Offer</p>
        <h2 class="section-title">Our Services</h2>
        <div class="services-grid" *ngIf="services$ | async as services">
          <app-service-category-card
            *ngFor="let row of categoryRows"
            [category]="row.key"
            [count]="countFor(services, row.key)"
            [description]="row.description"
            (selected)="onCategorySelect($event)"
          />
        </div>
      </div>
    </section>

    <section class="home-section">
      <div class="content-container">
        <p class="section-heading">Latest Updates</p>
        <h2 class="section-title">Clinic Announcements</h2>
        <div class="announcements-grid" *ngIf="announcements$ | async as announcements">
          <app-announcement-card
            *ngFor="let ann of announcements.slice(0, 3)"
            [announcement]="ann"
          />
        </div>
      </div>
    </section>
  `,
  styleUrl: './home.page.scss'
})
export class HomePage {
  private readonly publicService = inject(PublicService);
  private readonly router = inject(Router);

  readonly doctors$ = this.publicService.getDoctors();
  readonly services$ = this.publicService.getServices();
  readonly announcements$ = this.publicService.getAnnouncements();
  readonly settings$ = this.publicService.getClinicSettings();

  readonly categoryRows: { key: ServiceCategory; description: string }[] = [
    {
      key: 'Consultation',
      description: 'Primary care, follow-ups, and medical advice tailored to you.'
    },
    {
      key: 'Procedure',
      description: 'Minor procedures performed safely in-clinic by our specialists.'
    },
    {
      key: 'Laboratory',
      description: 'Blood work and lab tests with reliable turnaround times.'
    },
    {
      key: 'Diagnostic',
      description: 'Imaging and screening to support accurate diagnosis.'
    }
  ];

  countFor(services: { category: ServiceCategory }[], cat: ServiceCategory): number {
    return services.filter((s) => s.category === cat).length;
  }

  onCategorySelect(category: ServiceCategory): void {
    this.router.navigate(['/public/services'], { queryParams: { category } });
  }
}
