import { DatePipe, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonCheckbox, IonItem, IonLabel, ToastController } from '@ionic/angular/standalone';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { AuthUser, ClinicSettings, Patient } from '../../../core/models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ClinicSettingsService } from '../../../core/services/clinic-settings.service';
import { PatientService } from '../services/patient.service';

@Component({
  selector: 'app-patient-privacy-consent-page',
  standalone: true,
  imports: [NgIf, DatePipe, FormsModule, IonItem, IonLabel, IonCheckbox, IonButton],
  template: `
    <section class="page-shell" *ngIf="currentPatient && settings">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Privacy Consent</h2>
          <p class="page-subtitle">Review the clinic's privacy policy and accept the latest version.</p>
        </div>
      </div>

      <div class="clinic-card consent-card">
        <div class="section-heading">Clinic Privacy Policy</div>
        <p class="consent-text">{{ settings.privacyPolicyText }}</p>

        <div class="consent-meta">
          <div><span>Consent Version</span><strong>{{ settings.consentVersion }}</strong></div>
          <div><span>Last Updated</span><strong>{{ currentPatient.consentedAt ? (currentPatient.consentedAt | date : 'MMMM d, y (EEE)') : 'Not yet accepted' }}</strong></div>
        </div>

        <ion-item class="consent-checkbox" lines="none">
          <ion-checkbox slot="start" [(ngModel)]="accepted"></ion-checkbox>
          <ion-label>I have read and accept the clinic privacy consent.</ion-label>
        </ion-item>

        <ion-button type="button" expand="block" color="primary" [disabled]="!accepted" (click)="acceptConsent()">
          Accept Consent
        </ion-button>
      </div>
    </section>
  `,
  styleUrl: './patient-privacy-consent.page.scss'
})
export class PatientPrivacyConsentPage implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly patientService = inject(PatientService);
  private readonly clinicSettingsService = inject(ClinicSettingsService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  currentUser: AuthUser | null = null;
  currentPatient: Patient | null = null;
  settings: ClinicSettings | null = null;
  accepted = false;

  ngOnInit(): void {
    this.settings = this.clinicSettingsService.load();

    this.authState.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.patientService
          .getMyProfile()
          .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
          .subscribe((patient) => {
            this.currentPatient = patient ?? null;
          });
      }
    });
  }

  async acceptConsent(): Promise<void> {
    if (!this.currentPatient || !this.settings || !this.accepted) {
      return;
    }

    this.patientService
      .submitConsent(this.settings.consentVersion)
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe(async (updated) => {
        if (!updated) {
          const errorToast = await this.toastCtrl.create({
            message: 'Unable to submit privacy consent.',
            duration: 2200,
            color: 'danger',
            position: 'top'
          });
          await errorToast.present();
          return;
        }

        this.currentPatient = updated;
        const toast = await this.toastCtrl.create({
          message: 'Privacy consent accepted.',
          duration: 2200,
          color: 'success',
          position: 'top'
        });
        await toast.present();
        void this.router.navigate(['/patient/dashboard']);
      });
  }
}
