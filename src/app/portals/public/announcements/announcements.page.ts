import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Announcement } from '../../../core/models';
import { PublicService } from '../services/public.service';
import { AnnouncementCardComponent } from '../components/announcement-card/announcement-card.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-announcements-page',
  standalone: true,
  imports: [NgIf, NgFor, AnnouncementCardComponent, SkeletonComponent],
  template: `
    <div class="page-wrap">
      <div class="content-container">
        <header class="page-header">
          <h1 class="page-title">Announcements</h1>
          <p class="page-subtitle">Updates and news from our clinic.</p>
        </header>

        <div class="skeleton-grid" *ngIf="isLoading">
          <app-skeleton *ngFor="let _ of skeletonPlaceholders" variant="card" />
        </div>

        <div *ngIf="!isLoading && !announcements.length" class="empty-hint">
          No active announcements right now. Check back soon.
        </div>

        <div class="announcements-grid" *ngIf="!isLoading && announcements.length">
          <app-announcement-card *ngFor="let ann of announcements" [announcement]="ann" />
        </div>
      </div>
    </div>
  `,
  styleUrl: './announcements.page.scss'
})
export class AnnouncementsPage implements OnInit {
  private readonly publicService = inject(PublicService);

  isLoading = true;
  announcements: Announcement[] = [];
  readonly skeletonPlaceholders = [0, 1, 2];

  ngOnInit(): void {
    this.publicService.getAnnouncements().subscribe((list) => {
      this.announcements = list;
      this.isLoading = false;
    });
  }
}
