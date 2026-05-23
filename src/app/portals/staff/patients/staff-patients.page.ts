import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { PatientSummary } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { StaffService } from '../services/staff.service';

@Component({
  selector: 'app-staff-patients-page',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent],
  template: `
    <section class="ps">
      <div class="psh">
        <div>
          <h2 class="pt">Patients</h2>
          <p class="psub">Search records and review patient profiles.</p>
        </div>
      </div>

      <div class="sc">
        <input class="fi" [formControl]="searchControl" placeholder="Search by name, code, contact, or email" aria-label="Search patients" />
        <button *ngIf="searchControl.value" type="button" class="btn-ghost" (click)="searchControl.setValue(''); $event.stopPropagation()">Clear</button>
      </div>

      <div class="pm" *ngIf="!isLoading">
        <span>{{ countLabel }}</span>
      </div>

      <div class="tc" *ngIf="!isLoading && patients.length > 0">
        <div class="tw">
          <table class="pt">
            <thead>
              <tr>
                <th>Code</th>
                <th>Full Name</th>
                <th>Sex</th>
                <th>DOB</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let patient of patients" tabindex="0" role="button" [attr.aria-label]="'Open patient record for ' + patientDisplayName(patient)" (click)="openDetail(patient.id)" (keydown.enter)="openDetail(patient.id)">
                <td class="pc">{{ patient.patientCode }}</td>
                <td class="pn">{{ patientDisplayName(patient) }}</td>
                <td>{{ patient.sex }}</td>
                <td>{{ patient.dateOfBirth }}</td>
                <td>{{ patient.contactNumber || 'No phone provided' }}</td>
                <td>{{ patient.email || 'No email provided' }}</td>
                <td><app-status-badge [status]="patientAccountStatus(patient)" [labelOverride]="patientAccountLabel(patient)"></app-status-badge></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="ml">
          <div class="mc" *ngFor="let patient of patients" tabindex="0" role="button" [attr.aria-label]="'Open patient record for ' + patientDisplayName(patient)" (click)="openDetail(patient.id)" (keydown.enter)="openDetail(patient.id)">
            <div class="mch">
              <div class="mci">
                <strong>{{ patientDisplayName(patient) }}</strong>
                <span class="mc-c">{{ patient.patientCode }}</span>
              </div>
              <div class="mcb"><app-status-badge [status]="patientAccountStatus(patient)" [labelOverride]="patientAccountLabel(patient)"></app-status-badge></div>
            </div>
            <dl class="mcd">
              <div><dt>Sex</dt><dd>{{ patient.sex }}</dd></div>
              <div><dt>DOB</dt><dd>{{ patient.dateOfBirth }}</dd></div>
              <div><dt>Contact</dt><dd>{{ patient.contactNumber || 'No phone provided' }}</dd></div>
              <div><dt>Email</dt><dd>{{ patient.email || 'No email provided' }}</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <app-skeleton *ngIf="isLoading" variant="row" [count]="5"></app-skeleton>

      <app-empty-state
        *ngIf="!isLoading && patients.length === 0"
        icon="people-outline"
        title="No patients found"
        description="Try adjusting your search or register a new patient from Walk-In."
      ></app-empty-state>
    </section>
  `,
  styleUrl: './staff-patients.page.scss'
})
export class StaffPatientsPage implements OnInit {
  private readonly staffService = inject(StaffService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

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
    void this.router.navigate(['/staff/patients', id]);
  }

  patientDisplayName(patient: PatientSummary): string {
    return patient.fullName || [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
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

  private loadPatients(page: number): void {
    const nextPage = Math.max(1, page);
    const token = ++this.loadToken;
    this.isLoading = true;

    this.staffService
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
        error: () => {
          if (token !== this.loadToken) {
            return;
          }

          this.patients = [];
          this.totalCount = 0;
          this.currentPage = 1;
          this.totalPages = 1;
        }
      });
  }
}
