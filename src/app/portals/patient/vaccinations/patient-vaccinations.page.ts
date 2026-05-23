import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { IonSearchbar, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { PatientVaccinationDto } from '../../../core/models/vaccination.models';
import { PatientVaccinationsService } from '../../../core/services/patient-vaccinations.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-patient-vaccinations-page',
  standalone: true,
  imports: [DatePipe, NgFor, NgIf, IonSearchbar, IonSpinner, EmptyStateComponent],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">My Vaccinations</h2>
          <p class="page-subtitle">View your vaccination records from the clinic.</p>
        </div>
      </div>

      <ion-searchbar
        class="page-search"
        placeholder="Search by vaccine name, manufacturer, or notes"
        [value]="searchTerm"
        (ionInput)="onSearchChange($event.detail.value ?? '')"
      ></ion-searchbar>

      <div class="page-summary" *ngIf="!loading && !error">
        Showing {{ filteredVaccinations.length }} of {{ vaccinations.length }} vaccination records
      </div>

      <div class="page-loading" *ngIf="loading">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading vaccination records...</p>
      </div>

      <div class="page-error" *ngIf="error">
        <div class="page-error__title">{{ errorTitle }}</div>
        <p>{{ error }}</p>
        <button type="button" class="btn-primary" (click)="loadVaccinations()">Retry</button>
      </div>

      <ng-container *ngIf="!loading && !error">
        <ng-container *ngIf="filteredVaccinations.length > 0; else emptyTpl">
          <article class="vac-card clinic-card" *ngFor="let v of filteredVaccinations">
            <div class="vac-card__header">
              <div class="vac-card__title">
                <h3>{{ v.vaccineName }}</h3>
                <span class="vac-card__source">{{ formatSource(v.source) }}</span>
              </div>
              <div class="vac-card__date">{{ v.administeredDate | date:'MMM d, y' }}</div>
            </div>

            <div class="vac-card__grid">
              <div *ngIf="v.manufacturer">
                <span>Manufacturer</span>
                <p>{{ v.manufacturer }}</p>
              </div>
              <div *ngIf="v.lotNumber">
                <span>Lot Number</span>
                <p>{{ v.lotNumber }}</p>
              </div>
              <div *ngIf="v.doseNumber">
                <span>Dose</span>
                <p>{{ v.doseNumber }}{{ v.doseAmount ? ' (' + v.doseAmount + ' ' + (v.doseUnit || '') + ')' : '' }}</p>
              </div>
              <div>
                <span>Status</span>
                <p>{{ v.status }}</p>
              </div>
              <div *ngIf="v.route">
                <span>Route</span>
                <p>{{ v.route }}</p>
              </div>
              <div *ngIf="v.site">
                <span>Site</span>
                <p>{{ v.site }}</p>
              </div>
              <div *ngIf="v.nextDueDate">
                <span>Next Due Date</span>
                <p>{{ v.nextDueDate | date:'MMM d, y' }}</p>
              </div>
              <div *ngIf="v.expirationDate">
                <span>Expiration</span>
                <p>{{ v.expirationDate | date:'MMM d, y' }}</p>
              </div>
            </div>

            <div class="vac-card__notes" *ngIf="v.notes || v.reactionNotes">
              <div *ngIf="v.notes">
                <span>Notes</span>
                <p>{{ v.notes }}</p>
              </div>
              <div *ngIf="v.reactionNotes">
                <span>Reaction Notes</span>
                <p>{{ v.reactionNotes }}</p>
              </div>
            </div>

            <div class="vac-card__meta">
              <span>Recorded {{ v.createdAt | date:'MMM d, y, h:mm a' }}</span>
            </div>
          </article>
        </ng-container>
      </ng-container>

      <ng-template #emptyTpl>
        <app-empty-state
          icon="shield-checkmark-outline"
          title="No vaccination records yet"
          description="Vaccination records from your clinic visits will appear here once added by your doctor."
        ></app-empty-state>
      </ng-template>
    </section>
  `,
  styles: [`
    .vac-card{margin-bottom:var(--space-4)}
    .vac-card__header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-3);gap:var(--space-3)}
    .vac-card__title h3{font-size:var(--text-lg);margin:0 0 4px}
    .vac-card__source{font-size:var(--text-xs);color:#6b21a8;background:#ede9fe;padding:2px 8px;border-radius:var(--radius-sm);display:inline-block}
    .vac-card__date{font-size:var(--text-sm);color:#64748b;white-space:nowrap;padding-top:2px}
    .vac-card__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-3);margin-bottom:var(--space-3)}
    .vac-card__grid div span{display:block;font-size:var(--text-xs);font-weight:600;color:#475569;text-transform:uppercase;margin-bottom:2px}
    .vac-card__grid div p{font-size:var(--text-sm);color:var(--clinic-text-primary);margin:0}
    .vac-card__notes{border-top:1px solid #e2e8f0;padding-top:var(--space-3);margin-bottom:var(--space-3);display:grid;gap:var(--space-2)}
    .vac-card__notes span{font-size:var(--text-xs);font-weight:600;color:#475569;text-transform:uppercase}
    .vac-card__notes p{font-size:var(--text-sm);margin:2px 0 0;color:#475569}
    .vac-card__meta span{font-size:var(--text-xs);color:#94a3b8}
    @media(max-width:640px){.vac-card__header{flex-direction:column}}
  `]
})
export class PatientVaccinationsPage implements OnInit {
  private readonly vaccinationService = inject(PatientVaccinationsService);
  private readonly toastCtrl = inject(ToastController);

  vaccinations: PatientVaccinationDto[] = [];
  filteredVaccinations: PatientVaccinationDto[] = [];
  loading = false;
  error = '';
  errorTitle = 'Unable to load records';
  searchTerm = '';

  ngOnInit(): void {
    this.loadVaccinations();
  }

  loadVaccinations(): void {
    this.loading = true;
    this.error = '';

    this.vaccinationService.getMyVaccinations().subscribe({
      next: (vaccinations) => {
        this.vaccinations = vaccinations;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        this.vaccinations = [];
        this.filteredVaccinations = [];
        this.loading = false;
        this.error = extractMessage(err, 'Unable to load vaccination records. Please try again.');
        this.errorTitle = normalizeErrorTitle(this.error);
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applyFilter();
  }

  formatSource(source: string): string {
    switch (source) {
      case 'AdministeredInClinic': return 'Administered In Clinic';
      case 'PatientReported': return 'Patient Reported';
      case 'ExternalRecord': return 'External Record';
      default: return source;
    }
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredVaccinations = [...this.vaccinations];
      return;
    }

    this.filteredVaccinations = this.vaccinations.filter((v) => {
      const haystack = [
        v.vaccineName,
        v.manufacturer,
        v.lotNumber,
        v.notes,
        v.reactionNotes,
        v.status,
        v.administeredDate
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }
}

function extractMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as { error?: { message?: unknown }; message?: unknown };
    const direct = apiError.error?.message ?? apiError.message;
    if (typeof direct === 'string' && direct.trim()) {
      return direct;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function normalizeErrorTitle(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('not linked') || lower.includes('patient profile not found')) {
    return 'Patient profile not linked';
  }
  if (lower.includes('unauthorized') || lower.includes('forbidden')) {
    return 'Please sign in again';
  }
  return 'Unable to load records';
}
