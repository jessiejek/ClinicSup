import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Doctor, DoctorSchedule } from '../../../core/models';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AdminDoctorsService } from '../services/admin-doctors.service';

@Component({
  selector: 'app-admin-doctors-page',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    IonIcon,
    IonSpinner,
    AvatarComponent,
    ConfirmModalComponent,
    EmptyStateComponent,
    StatusBadgeComponent
  ],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Doctors</h2>
          <p class="page-subtitle">Manage doctor profiles and availability.</p>
        </div>
        <button type="button" class="btn-primary" (click)="addDoctor()">Add Doctor</button>
      </div>

      <div class="page-loading" *ngIf="isLoading">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <ng-container *ngIf="!isLoading">
        <div class="clinic-card" *ngIf="doctors.length > 0; else emptyState">
          <div class="table-desktop">
            <table class="clinic-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Name</th>
                  <th>Specialization</th>
                  <th>Fee</th>
                  <th>Working Days</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let doctor of doctors"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="'Edit doctor ' + doctor.fullName"
                  (click)="!isBusy(doctor.id) && editDoctor(doctor.id)"
                  (keydown.enter)="!isBusy(doctor.id) && editDoctor(doctor.id)"
                >
                  <td><app-avatar [name]="doctor.fullName"></app-avatar></td>
                  <td>{{ doctor.fullName }}</td>
                  <td>{{ doctor.specialization }}</td>
                  <td>PHP {{ doctor.consultationFee }}</td>
                  <td>{{ workingDays(doctor.id) }}</td>
                  <td>
                    <app-status-badge [status]="doctor.status"></app-status-badge>
                  </td>
                  <td>
                    <div class="table-actions">
                      <button
                        type="button"
                        class="btn-icon"
                        [disabled]="isBusy(doctor.id)"
                        [attr.aria-label]="'Edit doctor ' + doctor.fullName"
                        (click)="editDoctor(doctor.id); $event.stopPropagation()"
                      >
                        <ion-icon name="edit-outline"></ion-icon>
                      </button>
                      <button
                        type="button"
                        class="btn-icon"
                        [disabled]="isBusy(doctor.id)"
                        [attr.aria-label]="'Deactivate doctor ' + doctor.fullName"
                        (click)="askDeactivate(doctor.id, $event)"
                      >
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-mobile">
            <article
              *ngFor="let doctor of doctors"
              class="mobile-card"
              tabindex="0"
              role="button"
              [attr.aria-label]="'Edit doctor ' + doctor.fullName"
              (click)="!isBusy(doctor.id) && editDoctor(doctor.id)"
              (keydown.enter)="!isBusy(doctor.id) && editDoctor(doctor.id)"
            >
              <div class="mobile-card__header">
                <div>
                  <div class="mobile-card__name">{{ doctor.fullName }}</div>
                  <div class="mobile-card__code">Doctor ID {{ doctor.id }}</div>
                </div>
                <app-status-badge [status]="doctor.status"></app-status-badge>
              </div>

              <div class="mobile-card__row">
                <span class="mobile-card__label">Specialization</span>
                <span>{{ doctor.specialization }}</span>
              </div>

              <div class="mobile-card__row">
                <span class="mobile-card__label">Fee</span>
                <span>PHP {{ doctor.consultationFee }}</span>
              </div>

              <div class="mobile-card__row">
                <span class="mobile-card__label">Working Days</span>
                <span>{{ workingDays(doctor.id) }}</span>
              </div>

              <div class="mobile-card__row">
                <span class="mobile-card__label">Actions</span>
                <span class="table-actions">
                  <button
                    type="button"
                    class="btn-icon"
                    [disabled]="isBusy(doctor.id)"
                    [attr.aria-label]="'Edit doctor ' + doctor.fullName"
                    (click)="editDoctor(doctor.id); $event.stopPropagation()"
                  >
                    <ion-icon name="edit-outline"></ion-icon>
                  </button>
                  <button
                    type="button"
                    class="btn-icon"
                    [disabled]="isBusy(doctor.id)"
                    [attr.aria-label]="'Deactivate doctor ' + doctor.fullName"
                    (click)="askDeactivate(doctor.id, $event)"
                  >
                    <ion-icon name="trash-outline"></ion-icon>
                  </button>
                </span>
              </div>
            </article>
          </div>
        </div>

        <ng-template #emptyState>
          <app-empty-state
            icon="medical-outline"
            title="No data found"
            description="Add the first doctor profile to start managing schedules."
            ctaLabel="Add Doctor"
            (ctaClick)="addDoctor()"
          ></app-empty-state>
        </ng-template>
      </ng-container>

      <app-confirm-modal
        [isOpen]="deleteOpen"
        title="Deactivate doctor?"
        message="This doctor will no longer appear publicly."
        confirmLabel="Deactivate"
        [isDanger]="true"
        (confirmed)="confirmDeactivate()"
        (cancelled)="cancelDeactivate()"
      ></app-confirm-modal>
    </section>
  `,
  styleUrl: './doctors.page.scss'
})
export class DoctorsPage implements OnInit {
  private readonly adminDoctorsService = inject(AdminDoctorsService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  doctors: Doctor[] = [];
  schedulesByDoctorId = new Map<string, DoctorSchedule[]>();
  busyDoctorIds = new Set<string>();
  isLoading = true;
  deleteOpen = false;
  pendingDeactivateDoctorId: string | null = null;

  constructor() {
    addIcons({ 'edit-outline': createOutline, trashOutline });
  }

  ngOnInit(): void {
    this.loadDoctors();
  }

  addDoctor(): void {
    void this.router.navigate(['/admin/doctors/new']);
  }

  editDoctor(id: string): void {
    void this.router.navigate(['/admin/doctors', id, 'edit']);
  }

  askDeactivate(id: string, event: Event): void {
    event.stopPropagation();
    if (this.isBusy(id)) {
      return;
    }
    this.pendingDeactivateDoctorId = id;
    this.deleteOpen = true;
  }

  cancelDeactivate(): void {
    this.deleteOpen = false;
    this.pendingDeactivateDoctorId = null;
  }

  confirmDeactivate(): void {
    const doctorId = this.pendingDeactivateDoctorId;
    if (!doctorId || this.isBusy(doctorId)) {
      this.cancelDeactivate();
      return;
    }

    this.deleteOpen = false;
    this.busyDoctorIds.add(doctorId);
    this.adminDoctorsService
      .deactivateDoctor(doctorId)
      .pipe(
        finalize(() => {
          this.busyDoctorIds.delete(doctorId);
          this.pendingDeactivateDoctorId = null;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          void this.presentToast('Doctor deactivated successfully.');
          this.loadDoctors();
        },
        error: (error: unknown) => {
          void this.presentToast(extractApiErrorMessage(error, 'Failed to deactivate doctor.'));
        }
      });
  }

  workingDays(doctorId: string): string {
    const days = (this.schedulesByDoctorId.get(doctorId) ?? [])
      .map((schedule) => schedule.dayOfWeek.slice(0, 3))
      .join(', ');
    return days || 'N/A';
  }

  isBusy(doctorId: string): boolean {
    return this.busyDoctorIds.has(doctorId);
  }

  private loadDoctors(): void {
    this.isLoading = true;

    this.adminDoctorsService
      .getAllDoctors()
      .pipe(
        catchError((error: unknown) => {
          void this.presentToast(extractApiErrorMessage(error, 'Failed to load doctors.'));
          return of([] as Doctor[]);
        }),
        switchMap((doctors) => {
          this.doctors = doctors;

          if (!doctors.length) {
            return of([] as Array<{ doctorId: string; schedules: DoctorSchedule[] }>);
          }

          return forkJoin(
            doctors.map((doctor) =>
              this.adminDoctorsService.getSchedule(doctor.id).pipe(
                catchError((error: unknown) => {
                  void this.presentToast(
                    extractApiErrorMessage(error, `Failed to load schedule for ${doctor.fullName}.`)
                  );
                  return of([] as DoctorSchedule[]);
                }),
                map((schedules) => ({ doctorId: doctor.id, schedules }))
              )
            )
          );
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((scheduleEntries) => {
        this.schedulesByDoctorId = new Map(scheduleEntries.map((entry) => [entry.doctorId, entry.schedules]));
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
