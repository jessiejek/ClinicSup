import { CommonModule, NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastController } from '@ionic/angular/standalone';
import { ClinicSettings } from '../../../core/models';
import { ClinicSettingsService } from '../../../core/services/clinic-settings.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { OperatingHoursEditorComponent } from '../components/operating-hours-editor/operating-hours-editor.component';
import { ColorPickerComponent } from '../components/color-picker/color-picker.component';

type SettingsTab = 'general' | 'hours' | 'payments' | 'privacy' | 'branding';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgFor,
    NgIf,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    EmptyStateComponent,
    SkeletonComponent,
    ConfirmModalComponent,
    OperatingHoursEditorComponent,
    ColorPickerComponent
  ],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Settings</h2>
          <p class="page-subtitle">Manage clinic configuration, branding, and consent settings.</p>
        </div>
        <button class="btn-primary" type="button" (click)="saveSettings()" [disabled]="isLoading || !draft">
          Save Settings
        </button>
      </div>

      <div class="settings-tabs">
        <button
          type="button"
          *ngFor="let tab of tabs"
          class="settings-tabs__tab"
          [class.is-active]="selectedTab === tab.id"
          (click)="selectedTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <app-skeleton *ngIf="isLoading" variant="card" [count]="2"></app-skeleton>

      <ng-container *ngIf="!isLoading && draft as settings">
        <div class="clinic-card settings-card" [ngSwitch]="selectedTab">
          <ng-container *ngSwitchCase="'general'">
            <div class="section-heading">General</div>
            <div class="settings-grid">
              <label class="field">
                <span>Clinic Name *</span>
                <input class="filter-input" [(ngModel)]="settings.clinicName" (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>Logo Upload</span>
                <input type="file" class="filter-input" (change)="onLogoSelected($event)" />
                <small>{{ logoFileName }}</small>
              </label>
              <label class="field field--full">
                <span>Address *</span>
                <textarea class="filter-input" rows="3" [(ngModel)]="settings.address" (ngModelChange)="markDirty()"></textarea>
              </label>
              <label class="field">
                <span>Phone *</span>
                <input class="filter-input" [(ngModel)]="settings.phone" (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>Email *</span>
                <input class="filter-input" type="email" [(ngModel)]="settings.email" (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>Facebook</span>
                <input class="filter-input" [(ngModel)]="settings.facebookUrl" (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>Instagram</span>
                <input class="filter-input" [(ngModel)]="settings.instagramUrl" (ngModelChange)="markDirty()" />
              </label>
            </div>
          </ng-container>

          <ng-container *ngSwitchCase="'hours'">
            <div class="section-heading">Operating Hours</div>
            <app-operating-hours-editor
              [hours]="settings.operatingHours"
              (hoursChange)="updateHours($event)"
            ></app-operating-hours-editor>
          </ng-container>

          <ng-container *ngSwitchCase="'payments'">
            <div class="section-heading">Payments</div>
            <div class="settings-grid">
              <label class="field">
                <span class="toggle-row">
                  <span>Pay at Clinic Mode</span>
                  <input type="checkbox" [(ngModel)]="settings.isPayAtClinicMode" (ngModelChange)="markDirty()" />
                </span>
              </label>
              <label class="field">
                <span>Cancellation Deadline Hours</span>
                <input class="filter-input" type="number" [(ngModel)]="settings.cancellationDeadlineHours" (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>Pay-at-clinic No-show Window (minutes)</span>
                <input class="filter-input" type="number" [(ngModel)]="settings.payAtClinicNoShowWindowMinutes" (ngModelChange)="markDirty()" />
              </label>
              <label class="field field--full">
                <span>GCash Account Name</span>
                <input class="filter-input" [(ngModel)]="settings.paymentSettings.gcashAccountName" (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>GCash Number</span>
                <input class="filter-input" [(ngModel)]="settings.paymentSettings.gcashNumber" (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>Maya Account Name</span>
                <input class="filter-input" [(ngModel)]="settings.paymentSettings.mayaAccountName" (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>Maya Number</span>
                <input class="filter-input" [(ngModel)]="settings.paymentSettings.mayaNumber" (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>Bank Name</span>
                <input class="filter-input" [(ngModel)]="settings.paymentSettings.bankName" (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>Bank Account Name</span>
                <input class="filter-input" [(ngModel)]="settings.paymentSettings.bankAccountName" (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>Bank Account Number</span>
                <input class="filter-input" [(ngModel)]="settings.paymentSettings.bankAccountNumber" (ngModelChange)="markDirty()" />
              </label>
            </div>
          </ng-container>

          <ng-container *ngSwitchCase="'privacy'">
            <div class="section-heading">Privacy & Consent</div>
            <div class="settings-grid">
              <label class="field field--full">
                <span>Privacy Policy</span>
                <textarea
                  class="filter-input"
                  rows="8"
                  [(ngModel)]="settings.privacyPolicyText"
                  (ngModelChange)="markDirty()"
                ></textarea>
              </label>
              <div class="field">
                <span>Current Consent Version</span>
                <strong class="consent-version">{{ settings.consentVersion }}</strong>
              </div>
            </div>
            <div class="warning-banner">
              Patients may be required to re-accept consent after a version bump.
            </div>
            <div class="settings-actions">
              <button type="button" class="btn-outline" (click)="openConsentModal()">Bump Consent Version</button>
            </div>
          </ng-container>

          <ng-container *ngSwitchCase="'branding'">
            <div class="section-heading">Branding</div>
            <div class="settings-grid">
              <app-color-picker
                label="Primary Color"
                [value]="settings.primaryColor"
                (valueChange)="setPrimaryColor($event)"
              ></app-color-picker>
              <app-color-picker
                label="Secondary Color"
                [value]="settings.secondaryColor"
                (valueChange)="setSecondaryColor($event)"
              ></app-color-picker>
              <div class="brand-preview">
                <span>Live swatches</span>
                <div class="brand-preview__swatches">
                  <span [style.background]="settings.primaryColor"></span>
                  <span [style.background]="settings.secondaryColor"></span>
                </div>
              </div>
            </div>
          </ng-container>
        </div>

        <div class="settings-footer">
          <button class="btn-primary" type="button" (click)="saveSettings()" [disabled]="isLoading">
            Save Settings
          </button>
        </div>
      </ng-container>
    </section>

    <app-confirm-modal
      [isOpen]="bumpConsentOpen"
      title="Bump Consent Version"
      message="This will update the consent version for patients."
      confirmLabel="Bump Version"
      cancelLabel="Cancel"
      [isDanger]="true"
      (confirmed)="bumpConsent()"
      (cancelled)="bumpConsentOpen = false"
    ></app-confirm-modal>
  `,
  styleUrl: './settings.page.scss'
})
export class SettingsPage implements OnInit {
  private readonly clinicSettingsService = inject(ClinicSettingsService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'hours', label: 'Operating Hours' },
    { id: 'payments', label: 'Payments' },
    { id: 'privacy', label: 'Privacy & Consent' },
    { id: 'branding', label: 'Branding' }
  ];

  selectedTab: SettingsTab = 'general';
  draft: ClinicSettings | null = null;
  logoFileName = 'No file selected';
  isLoading = true;
  bumpConsentOpen = false;
  dirty = false;

  ngOnInit(): void {
    this.clinicSettingsService.isLoading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loading) => (this.isLoading = loading));
    this.clinicSettingsService
      .getSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((settings) => {
      if (settings) {
        this.draft = this.cloneSettings(settings);
        this.logoFileName = settings.logoUrl ? settings.logoUrl.split('/').pop() ?? 'Uploaded logo' : 'No file selected';
        this.applyPrimaryColor(settings.primaryColor);
      }
    });
  }

  markDirty(): void {
    this.dirty = true;
  }

  updateHours(hours: ClinicSettings['operatingHours']): void {
    if (!this.draft) {
      return;
    }
    this.draft = {
      ...this.draft,
      operatingHours: hours
    };
    this.markDirty();
  }

  setPrimaryColor(value: string): void {
    if (!this.draft) {
      return;
    }
    this.draft = {
      ...this.draft,
      primaryColor: value
    };
    this.applyPrimaryColor(value);
    this.markDirty();
  }

  setSecondaryColor(value: string): void {
    if (!this.draft) {
      return;
    }
    this.draft = {
      ...this.draft,
      secondaryColor: value
    };
    this.markDirty();
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.draft) {
      return;
    }
    this.logoFileName = file.name;
    this.draft = {
      ...this.draft,
      logoUrl: `mock-upload://${file.name}`
    };
    this.markDirty();
  }

  saveSettings(): void {
    if (!this.draft || !this.validateDraft(this.draft)) {
      void this.presentToast('Please complete the required settings fields.', 'warning');
      return;
    }
    this.clinicSettingsService.updateSettings(this.cloneSettings(this.draft));
    this.dirty = false;
    void this.presentToast('Settings saved.');
  }

  openConsentModal(): void {
    this.bumpConsentOpen = true;
  }

  bumpConsent(): void {
    this.clinicSettingsService.bumpConsentVersion();
    this.bumpConsentOpen = false;
    void this.presentToast('Consent version bumped.');
  }

  private validateDraft(settings: ClinicSettings): boolean {
    return !!settings.clinicName.trim() && !!settings.address?.trim() && !!settings.phone?.trim() && !!settings.email?.trim();
  }

  private cloneSettings(settings: ClinicSettings): ClinicSettings {
    return JSON.parse(JSON.stringify(settings)) as ClinicSettings;
  }

  private applyPrimaryColor(value: string): void {
    document.documentElement.style.setProperty('--ion-color-primary', value);
  }

  private async presentToast(message: string, color: 'success' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
