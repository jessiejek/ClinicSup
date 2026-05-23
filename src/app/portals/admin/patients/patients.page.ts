import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon, ModalController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, searchOutline } from 'ionicons/icons';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PatientSummary } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AdminPatientCreateModalComponent } from './admin-patient-create-modal.component';
import { AdminPatientsService } from '../services/admin-patients.service';

@Component({
  selector: 'app-admin-patients-page',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent, IonIcon],
  template: `
    <section class="page-shell patients-page">
      <div class="page-shell__header patients-header">
        <div class="patients-header__copy">
          <h2 class="page-title">Patients</h2>
          <p class="page-subtitle">Search records and register new patients.</p>
        </div>
      </div>

      <div class="patients-toolbar">
        <label class="patients-search" aria-label="Search patients">
          <ion-icon name="search-outline" aria-hidden="true" class="patients-search__icon"></ion-icon>
          <input
            class="filter-input patients-search__input"
            [formControl]="searchControl"
            placeholder="Search by name, code, contact, or email"
          />
        </label>

        <button class="btn-primary patients-toolbar__add" type="button" (click)="openAddPatientModal()">
          <ion-icon name="add-outline" aria-hidden="true"></ion-icon>
          <span>Add Patient</span>
        </button>
      </div>

      <div class="patients-meta" *ngIf="!isLoading">
        <span>{{ countLabel }}</span>
        <div class="patients-pagination" *ngIf="totalPages > 1">
          <button
            class="btn-ghost patients-pagination__button"
            type="button"
            (click)="previousPage()"
            [disabled]="!canPreviousPage"
          >
            Previous
          </button>
          <span class="patients-pagination__page">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <button
            class="btn-ghost patients-pagination__button"
            type="button"
            (click)="nextPage()"
            [disabled]="!canNextPage"
          >
            Next
          </button>
        </div>
      </div>

      <div class="clinic-card" *ngIf="!isLoading && patients.length > 0">
        <div class="table-scroll-wrap">
          <table class="clinic-table patients-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Full Name</th>
                <th>Contact</th>
                <th>DOB</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let patient of patients"
                tabindex="0"
                role="button"
                [attr.aria-label]="'Open patient record for ' + patientDisplayName(patient)"
                (click)="openDetail(patient.id)"
                (keydown.enter)="openDetail(patient.id)"
              >
                <td>
                  <span class="patient-code-chip">{{ patient.patientCode }}</span>
                </td>
                <td>
                  <strong>{{ patientDisplayName(patient) }}</strong>
                </td>
                <td>{{ patient.contactNumber || 'No phone provided' }}</td>
                <td class="data-mono">{{ patient.dateOfBirth }}</td>
                <td>
                  <app-status-badge
                    [status]="patientAccountStatus(patient)"
                    [labelOverride]="patientAccountLabel(patient)"
                  ></app-status-badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="patients-loading" *ngIf="isLoading">
        <app-skeleton variant="row" [count]="5"></app-skeleton>
      </div>

      <div class="patients-empty" *ngIf="!isLoading && patients.length === 0">
        <app-empty-state
          icon="people-outline"
          title="No patients found"
          description="Try adjusting your search or add a new patient."
          ctaLabel="Add Patient"
          (ctaClick)="openAddPatientModal()"
        ></app-empty-state>
      </div>
    </section>
  `,
  styleUrl: './patients.page.scss'
})
export class PatientsPage implements OnInit {
  private readonly adminPatientsService = inject(AdminPatientsService);
  private readonly modalCtrl = inject(ModalController);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    addIcons({ addOutline, searchOutline });
  }

  readonly pageSize = 20;
  searchControl = new FormControl('', { nonNullable: true });
  patients: PatientSummary[] = [];
  totalCount = 0;
  currentPage = 1;
  totalPages = 1;
  isLoading = false;
  private searchTerm = '';
  private loadToken = 0;

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchTerm = query.trim();
        this.loadPatients(1);
      });

    this.loadPatients(1);
  }

  get canPreviousPage(): boolean {
    return this.currentPage > 1 && !this.isLoading;
  }

  get canNextPage(): boolean {
    return this.currentPage < this.totalPages && !this.isLoading;
  }

  get rangeStart(): number {
    if (this.totalCount === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    if (this.totalCount === 0) {
      return 0;
    }

    return Math.min(this.totalCount, this.rangeStart + this.patients.length - 1);
  }

  get countLabel(): string {
    if (this.totalCount === 0) {
      return 'Showing 0 of 0 patients';
    }

    return `Showing ${this.rangeStart}-${this.rangeEnd} of ${this.totalCount} patients`;
  }

  openDetail(id: string): void {
    void this.router.navigate(['/admin/patients', id]);
  }

  async openAddPatientModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AdminPatientCreateModalComponent,
      cssClass: 'admin-patient-create-modal'
    });

    await modal.present();

    const result = await modal.onDidDismiss<{ created?: boolean }>();
    if (result.role === 'saved' || result.data?.created) {
      this.loadPatients(1);
    }
  }

  previousPage(): void {
    if (this.canPreviousPage) {
      this.loadPatients(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.canNextPage) {
      this.loadPatients(this.currentPage + 1);
    }
  }

  private loadPatients(page: number): void {
    const nextPage = Math.max(1, page);
    const token = ++this.loadToken;
    this.isLoading = true;

    this.adminPatientsService
      .getPatients(nextPage, this.pageSize, this.searchTerm)
      .pipe(
        finalize(() => {
          if (token === this.loadToken) {
            this.isLoading = false;
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          if (token !== this.loadToken) {
            return;
          }

          this.patients = result.items;
          this.totalCount = result.totalCount ?? result.total ?? 0;
          this.currentPage = Math.max(1, result.page || nextPage);
          this.totalPages = Math.max(1, result.totalPages || 1);
        },
        error: async () => {
          if (token !== this.loadToken) {
            return;
          }

          this.patients = [];
          this.totalCount = 0;
          this.currentPage = 1;
          this.totalPages = 1;
          await this.presentToast('Failed to load patients.', 'danger');
        }
      });
  }

  private async presentToast(message: string, color: 'success' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  patientDisplayName(patient: PatientSummary): string {
    return patient.fullName || [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ');
  }

  patientAccountStatus(patient: PatientSummary): 'LinkedAccount' | 'NoAccount' | 'AccountUnknown' {
    if (patient.hasAccount === true || Boolean(patient.userId?.trim())) {
      return 'LinkedAccount';
    }

    if (patient.hasAccount === false) {
      return 'NoAccount';
    }

    return 'AccountUnknown';
  }

  patientAccountLabel(patient: PatientSummary): string {
    switch (this.patientAccountStatus(patient)) {
      case 'LinkedAccount':
        return 'Account Linked';
      case 'NoAccount':
        return 'No Account';
      default:
        return 'Account Unknown';
    }
  }
}
