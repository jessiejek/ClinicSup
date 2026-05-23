import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Announcement } from '../../../../core/models';
import { announcementDisplayDate } from '../../utils/time-format';

@Component({
  selector: 'app-announcement-card',
  standalone: true,
  imports: [NgIf],
  template: `
    <article class="announcement-card">
      <div class="announcement-card__img">
        <img *ngIf="announcement.imageUrl" [src]="announcement.imageUrl" [alt]="announcement.title" />
        <span *ngIf="!announcement.imageUrl" class="announcement-card__img-placeholder" aria-hidden="true"
          >📢</span
        >
      </div>
      <div class="announcement-card__body">
        <div class="announcement-card__date">{{ dateLabel }}</div>
        <h3 class="announcement-card__title">{{ announcement.title }}</h3>
        <p class="announcement-card__excerpt">{{ announcement.body }}</p>
      </div>
    </article>
  `,
  styleUrl: './announcement-card.component.scss'
})
export class AnnouncementCardComponent {
  @Input({ required: true }) announcement!: Announcement;

  get dateLabel(): string {
    return announcementDisplayDate(this.announcement.createdAt);
  }
}
