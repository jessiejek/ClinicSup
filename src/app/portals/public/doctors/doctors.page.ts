import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { IonSpinner, ToastController } from '@ionic/angular/standalone';
import { catchError, finalize, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Doctor } from '../../../core/models';
import { PublicService } from '../services/public.service';
import { DoctorCardComponent } from '../components/doctor-card/doctor-card.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-doctors-page',
  standalone: true,
  imports: [NgIf, NgFor, IonSpinner, DoctorCardComponent, EmptyStateComponent],
  template: `
    <div class="page-wrap">
      <div class="content-container">
        <header class="page-header">
          <h1 class="page-title">Our Doctors</h1>
          <p class="page-subtitle">Find the right specialist for you</p>
        </header>

        <div class="filter-row" *ngIf="specializations.length > 1">
          <button
            type="button"
            *ngFor="let spec of specializations"
            class="filter-pill"
            [class.filter-pill--active]="spec === selectedSpecialization"
            (click)="selectedSpecialization = spec"
          >
            {{ spec }}
          </button>
        </div>

        <div class="page-loading" *ngIf="isLoading">
          <ion-spinner name="crescent"></ion-spinner>
        </div>

        <ng-container *ngIf="!isLoading">
          <div class="empty-hint" *ngIf="!filteredDoctors.length">
            <app-empty-state
              icon="medical-outline"
              title="No data found"
              description="There are no doctors available for the selected filter."
            ></app-empty-state>
          </div>

          <div class="doctors-grid" *ngIf="filteredDoctors.length">
            <app-doctor-card *ngFor="let doc of filteredDoctors" [doctor]="doc" />
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styleUrl: './doctors.page.scss'
})
export class DoctorsPage implements OnInit {
  private readonly publicService = inject(PublicService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  isLoading = true;
  doctors: Doctor[] = [];
  selectedSpecialization = 'All';

  get specializations(): string[] {
    const uniq = [...new Set(this.doctors.map((d) => d.specialization))].sort();
    return ['All', ...uniq];
  }

  get filteredDoctors(): Doctor[] {
    if (this.selectedSpecialization === 'All') {
      return this.doctors;
    }
    return this.doctors.filter((d) => d.specialization === this.selectedSpecialization);
  }

  ngOnInit(): void {
    this.publicService
      .getDoctors()
      .pipe(
        catchError((error: unknown) => {
          void this.presentToast(extractApiErrorMessage(error, 'Failed to load doctors.'));
          return of([] as Doctor[]);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((list) => {
        this.doctors = list;
      });
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2400,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const body = (error as { error?: unknown }).error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
