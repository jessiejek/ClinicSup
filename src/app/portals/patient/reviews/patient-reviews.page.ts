import { DatePipe, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { catchError, combineLatest, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Booking, Patient } from '../../../core/models';
import { BookingService } from '../../../core/services/booking.service';
import { SupabaseService } from '../../../core/services/supabase.service';
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
        <p *ngIf="submitError" class="error-message" style="color:var(--color-danger);margin-bottom:var(--space-2)">{{ submitError }}</p>
        <app-review-form (submitted)="submitReview($event.rating, $event.comment)" [disabled]="isSubmitting"></app-review-form>
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
  private readonly supabase = inject(SupabaseService).client;
  private readonly toastCtrl = inject(ToastController);
  private readonly patientService = inject(PatientService);
  private readonly destroyRef = inject(DestroyRef);

  booking: Booking | null = null;
  currentPatient: Patient | null = null;
  hasExistingReview = false;
  isSubmitting = false;
  submitError = '';

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
        if (this.booking) {
          this.checkExistingReview(this.booking.id);
        }
      });
  }

  private async checkExistingReview(bookingId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', bookingId);

    if (error) {
      console.warn('[PatientReviewsPage] reviews table not available — assuming no existing review so submission is attempted.');
      this.hasExistingReview = false;
      return;
    }
    this.hasExistingReview = (data ?? []).length > 0;
  }

  get canReview(): boolean {
    return !!this.booking && this.booking.status === 'Completed' && !this.hasExistingReview;
  }

  async submitReview(rating: number, comment: string): Promise<void> {
    if (!this.booking || !this.currentPatient) {
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';

    const patientName = `${this.currentPatient.firstName} ${this.currentPatient.lastName}`;

    const { error } = await this.supabase
      .from('reviews')
      .insert({
        booking_id: this.booking.id,
        doctor_id: this.booking.doctorId,
        patient_id: this.currentPatient.id,
        rating,
        comment: comment || null,
        patient_name: patientName
      });

    if (error) {
      this.isSubmitting = false;
      this.submitError = 'Could not submit your review. The reviews database table may not be ready yet. Please try again later.';
      console.warn('[PatientReviewsPage] Could not save review:', error.message);
      return;
    }

    this.isSubmitting = false;
    const toast = await this.toastCtrl.create({
      message: 'Review submitted.',
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
    void this.router.navigate(['/patient/bookings', this.booking.id]);
  }

  back(): void {
    if (!this.booking) {
      void this.router.navigate(['/patient/bookings']);
      return;
    }
    void this.router.navigate(['/patient/bookings', this.booking.id]);
  }
}
