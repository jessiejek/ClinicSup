import { DatePipe, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { catchError, combineLatest, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Booking, Patient } from '../../../core/models';
import { BookingService } from '../../../core/services/booking.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { ReviewFormComponent } from '../components/review-form/review-form.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PatientService } from '../services/patient.service';

@Component({
  selector: 'app-patient-reviews-page',
  standalone: true,
  imports: [DatePipe, NgIf, ReviewFormComponent, EmptyStateComponent],
  template: `
    <section class="page-shell" *ngIf="booking; else emptyTpl">
      <div class="page-shell__header">
        <div>
          <button type="button" class="btn-ghost" (click)="back()">Back to Booking</button>
          <h2 class="page-title">Leave a Review</h2>
          <p class="page-subtitle data-mono">{{ booking.id }}</p>
        </div>
      </div>

      <div class="clinic-card review-card" *ngIf="canReview; else blockedTpl">
        <div class="section-heading">How was your visit?</div>
        <app-review-form (submitted)="submitReview($event.rating, $event.comment)"></app-review-form>
      </div>

      <ng-template #blockedTpl>
        <app-empty-state
          icon="star-outline"
          title="Review unavailable"
          description="Only completed bookings without an existing review can be rated."
          ctaLabel="Back to Booking"
          (ctaClick)="back()"
        ></app-empty-state>
      </ng-template>
    </section>

    <ng-template #emptyTpl>
      <app-empty-state
        icon="calendar-outline"
        title="Booking not found"
        description="We could not load the booking you selected."
        ctaLabel="Back to Bookings"
        ctaRoute="/patient/bookings"
      ></app-empty-state>
    </ng-template>
  `,
  styleUrl: './patient-reviews.page.scss'
})
export class PatientReviewsPage implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mockData = inject(MockDataService);
  private readonly toastCtrl = inject(ToastController);
  private readonly patientService = inject(PatientService);
  private readonly destroyRef = inject(DestroyRef);

  booking: Booking | null = null;
  currentPatient: Patient | null = null;

  ngOnInit(): void {
    const bookingId = this.route.snapshot.paramMap.get('bookingId') ?? '';
    combineLatest([
      this.patientService.getMyProfile().pipe(catchError(() => of(undefined))),
      this.bookingService.getBookingById$(bookingId)
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([patient, booking]) => {
        this.currentPatient = patient ?? null;
        this.booking =
          booking && this.currentPatient && (!booking.patientId || booking.patientId === this.currentPatient.id)
            ? booking
            : null;
      });
  }

  get canReview(): boolean {
    return !!this.booking && this.booking.status === 'Completed' && !this.mockData.getReviews().some((review) => review.bookingId === this.booking?.id);
  }

  async submitReview(rating: number, comment: string): Promise<void> {
    if (!this.booking || !this.currentPatient) {
      return;
    }
    const patientName = `${this.currentPatient.firstName} ${this.currentPatient.lastName}`;
    this.mockData.saveReview({
      id: `rev-${Date.now()}`,
      bookingId: this.booking.id,
      doctorId: this.booking.doctorId,
      patientId: this.currentPatient.id,
      rating,
      comment,
      patientName,
      createdAt: new Date().toISOString()
    });
    await this.presentToast('Review submitted.');
    void this.router.navigate(['/patient/bookings', this.booking.id]);
  }

  back(): void {
    if (!this.booking) {
      void this.router.navigate(['/patient/bookings']);
      return;
    }
    void this.router.navigate(['/patient/bookings', this.booking.id]);
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
}
