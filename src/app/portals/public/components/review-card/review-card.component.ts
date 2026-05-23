import { NgFor } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, star } from 'ionicons/icons';
import { Review } from '../../../../core/models';
import { formatReviewDate } from '../../utils/time-format';

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [NgFor, IonIcon],
  template: `
    <article class="review-card">
      <div class="review-card__header">
        <div class="review-card__avatar" aria-hidden="true">
          <ion-icon name="person-outline"></ion-icon>
        </div>
        <div>
          <div class="review-card__name">{{ review.patientName }}</div>
          <div class="review-card__stars" role="img" [attr.aria-label]="starLabel">
            <ion-icon *ngFor="let _ of stars" name="star" class="star-icon"></ion-icon>
          </div>
        </div>
      </div>
      <p class="review-card__text">{{ review.comment || '—' }}</p>
      <div class="review-card__date">{{ formattedDate }}</div>
    </article>
  `,
  styleUrl: './review-card.component.scss'
})
export class ReviewCardComponent {
  @Input({ required: true }) review!: Review;

  constructor() {
    addIcons({ star, personOutline });
  }

  get stars(): unknown[] {
    const n = Math.min(5, Math.max(0, Math.round(this.review.rating)));
    return Array.from({ length: n });
  }

  get starLabel(): string {
    return `${this.review.rating} out of 5 stars`;
  }

  get formattedDate(): string {
    return formatReviewDate(this.review.createdAt);
  }
}
