import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonIcon, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { Subscription, catchError, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import { Doctor } from '../../../../core/models/doctor.models';
import { Service } from '../../../../core/models';
import { ClinicDashboardRealtimeService } from '../../../../core/services/clinic-dashboard-realtime.service';
import { BookingWizardService } from '../../../../core/services/booking-wizard.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { DoctorSummary, PublicService } from '../../services/public.service';

@Component({
  selector: 'app-step-doctor-service',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    IonIcon,
    IonSpinner,
    AvatarComponent,
    StatusBadgeComponent,
    EmptyStateComponent
  ],
  template: `
    <section class="wizard-panel">
      <div class="wizard-panel__header">
        <div>
          <p class="section-heading">Step 1</p>
          <h2 class="wizard-title">Choose your doctor and services</h2>
          <p class="wizard-subtitle">
            Select the doctor you want to see, then choose one or more services for the visit.
          </p>
        </div>
      </div>

      <div class="wizard-loading" *ngIf="isLoading">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <ng-container *ngIf="!isLoading">
        <ng-container *ngIf="selectedDoctorId$ | async as selectedDoctorId; else doctorPhase">
          <div class="selected-doctor clinic-card clinic-card--accent-blue">
            <div class="selected-doctor__avatar">
              <app-avatar [name]="selectedDoctor?.fullName ?? ''" [size]="'lg'"></app-avatar>
            </div>
            <div class="selected-doctor__meta">
              <div class="selected-doctor__name">{{ selectedDoctor?.fullName }}</div>
              <div class="selected-doctor__spec">{{ selectedDoctor?.specialization }}</div>
              <app-status-badge [status]="selectedDoctor?.status ?? 'Active'"></app-status-badge>
            </div>
            <button type="button" class="btn-ghost" (click)="changeDoctor()">
              <ion-icon name="arrow-back-outline"></ion-icon>
              Change Doctor
            </button>
          </div>

          <div class="wizard-loading wizard-loading--compact" *ngIf="selectedDoctorLoading">
            <ion-spinner name="crescent"></ion-spinner>
          </div>

          <ng-container *ngIf="!selectedDoctorLoading">
            <app-empty-state
              *ngIf="selectedDoctorError; else servicesTpl"
              icon="medical-outline"
              title="Unable to load services"
              [description]="selectedDoctorError || 'Please try again.'"
            ></app-empty-state>

            <ng-template #servicesTpl>
              <div class="service-list">
                <div class="service-list__header">
                  <div>
                    <h3>Select one or more services</h3>
                    <p class="wizard-subtitle">Payment will be settled at the clinic after consultation.</p>
                  </div>
                </div>

                <ng-container *ngIf="selectedDoctorServices.length > 0; else noServiceState">
                  <button
                    *ngFor="let service of selectedDoctorServices"
                    type="button"
                    class="service-option"
                    [class.service-option--selected]="isServiceSelected(service.id)"
                    (click)="toggleService(service.id)"
                  >
                    <div>
                      <div class="service-option__name">{{ service.name }}</div>
                      <div class="service-option__desc">
                        {{ service.description || 'Clinic service available for this doctor.' }}
                      </div>
                      <div class="service-option__meta" *ngIf="service.estimatedDurationMinutes">
                        {{ service.estimatedDurationMinutes }} mins
                      </div>
                    </div>
                    <div class="service-option__right">
                      <div class="service-option__check">
                        <ion-icon name="checkmark-circle-outline" *ngIf="isServiceSelected(service.id)"></ion-icon>
                      </div>
                    </div>
                  </button>
                </ng-container>

                <ng-template #noServiceState>
                  <app-empty-state
                    icon="medical-outline"
                    title="No services available"
                    description="This doctor currently has no services assigned."
                  ></app-empty-state>
                </ng-template>
              </div>
            </ng-template>
          </ng-container>
        </ng-container>

        <ng-template #doctorPhase>
          <ng-container *ngIf="doctors.length > 0; else emptyState">
            <div class="doctor-grid">
              <button
                *ngFor="let doctor of doctors"
                type="button"
                class="doctor-card clinic-card"
                [class.doctor-card--selected]="doctor.id === (selectedDoctorId$ | async)"
                (click)="selectDoctor(doctor)"
              >
                <div class="doctor-card__avatar">
                  <app-avatar [name]="doctor.fullName" [size]="'xl'"></app-avatar>
                </div>
                <div class="doctor-card__name">{{ doctor.fullName }}</div>
                <div class="doctor-card__spec">{{ doctor.specialization }}</div>
                <app-status-badge [status]="doctor.status"></app-status-badge>
                <div class="doctor-card__cta">
                  Select Doctor
                  <ion-icon name="chevron-forward-outline"></ion-icon>
                </div>
              </button>
            </div>
          </ng-container>

          <ng-template #emptyState>
            <app-empty-state
              icon="medical-outline"
              title="No doctors available"
              description="No doctors are available right now."
            ></app-empty-state>
          </ng-template>
        </ng-template>

        <div class="wizard-actions">
          <button type="button" class="btn-primary" [disabled]="!canContinue" (click)="goNext()">
            Continue
          </button>
        </div>
      </ng-container>
    </section>
  `,
  styleUrl: './step-doctor-service.component.scss'
})
export class StepDoctorServiceComponent implements OnInit {
  private readonly wizardService = inject(BookingWizardService);
  private readonly publicService = inject(PublicService);
  private readonly realtime = inject(ClinicDashboardRealtimeService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);
  private readonly subscriptions = new Subscription();

  doctors: DoctorSummary[] = [];
  selectedDoctorServices: Service[] = [];
  isLoading = true;
  selectedDoctorLoading = false;
  selectedDoctorError: string | null = null;

  selectedDoctorId$ = this.wizardService.selectedDoctorId$;
  private latestSelectedDoctorId: string | null = null;
  private latestSelectedServiceIds: string[] = [];

  get selectedDoctor(): DoctorSummary | undefined {
    return this.doctors.find((doctor) => doctor.id === this.latestSelectedDoctorId);
  }

  get canContinue(): boolean {
    return Boolean(this.latestSelectedDoctorId && this.latestSelectedServiceIds.length > 0);
  }

  constructor() {
    addIcons({ arrowBackOutline, chevronForwardOutline, checkmarkCircleOutline });

    this.subscriptions.add(
      this.selectedDoctorId$
        .pipe(
          distinctUntilChanged(),
          switchMap((doctorId) => {
            this.latestSelectedDoctorId = doctorId;
            this.selectedDoctorServices = [];
            this.selectedDoctorError = null;

            if (!doctorId) {
              this.selectedDoctorLoading = false;
              return of([]);
            }

            this.selectedDoctorLoading = true;
            return this.loadDoctorServices(doctorId);
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((services) => {
          this.selectedDoctorServices = services;
          if (services.length > 0) {
            this.selectedDoctorError = null;
          }
        })
    );

    this.subscriptions.add(
      this.wizardService.selectedServiceIds$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((serviceIds) => {
          this.latestSelectedServiceIds = serviceIds;
        })
    );
  }

  ngOnInit(): void {
    void this.realtime.ensureConnected();
    this.publicService
      .refreshDoctors()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (doctors) => {
          this.doctors = doctors;
          this.isLoading = false;
        },
        error: (error: unknown) => {
          this.doctors = [];
          this.isLoading = false;
          void this.presentToast(extractApiErrorMessage(error, 'Failed to load doctors.'));
        }
      });

    this.realtime.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (
          event.eventName === 'DoctorServicesUpdated' &&
          this.latestSelectedDoctorId &&
          (!event.doctorId || event.doctorId === this.latestSelectedDoctorId)
        ) {
          this.selectedDoctorLoading = true;
          this.loadDoctorServices(this.latestSelectedDoctorId).subscribe((services) => {
            this.selectedDoctorServices = services;
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  selectDoctor(doctor: Doctor): void {
    this.wizardService.selectDoctor(doctor.id);
  }

  toggleService(serviceId: string): void {
    this.wizardService.toggleService(serviceId);
  }

  changeDoctor(): void {
    this.wizardService.selectDoctor(null);
  }

  isServiceSelected(serviceId: string): boolean {
    return this.latestSelectedServiceIds.includes(serviceId);
  }

  goNext(): void {
    if (this.canContinue) {
      this.wizardService.nextStep();
    }
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

  private loadDoctorServices(doctorId: string) {
    return this.publicService.getDoctorServices(doctorId).pipe(
      catchError((error: unknown) => {
        this.selectedDoctorError = extractApiErrorMessage(error, 'Failed to load doctor services.');
        void this.presentToast(this.selectedDoctorError);
        return of([]);
      }),
      finalize(() => {
        this.selectedDoctorLoading = false;
      })
    );
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
