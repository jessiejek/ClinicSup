import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonTextarea } from '@ionic/angular/standalone';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor, NgIf, IonTextarea],
  template: `
    <div class="review-form">
      <div class="review-form__stars">
        <button
          type="button"
          class="star-button"
          *ngFor="let star of stars"
          [class.is-active]="star <= rating"
          (click)="setRating(star)"
          [disabled]="disabled"
        >
          ★
        </button>
      </div>
      <p class="review-form__error" *ngIf="touched && rating === 0">Rating is required.</p>
      <ion-textarea
        [(ngModel)]="comment"
        [disabled]="disabled"
        label="Comment"
        labelPlacement="stacked"
        placeholder="Share your experience (optional)"
        [autoGrow]="true"
      ></ion-textarea>
      <div class="review-form__actions">
        <button class="btn-primary" type="button" [disabled]="disabled || rating === 0" (click)="submit()">
          Submit Review
        </button>
      </div>
    </div>
  `,
  styleUrl: './review-form.component.scss'
})
export class ReviewFormComponent {
  @Input() disabled = false;
  @Output() submitted = new EventEmitter<{ rating: number; comment: string }>();

  stars = [1, 2, 3, 4, 5];
  rating = 0;
  comment = '';
  touched = false;

  setRating(value: number): void {
    this.rating = value;
    this.touched = true;
  }

  submit(): void {
    this.touched = true;
    if (this.rating === 0) {
      return;
    }
    this.submitted.emit({ rating: this.rating, comment: this.comment.trim() });
  }
}
