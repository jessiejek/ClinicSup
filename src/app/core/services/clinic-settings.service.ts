import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { ClinicSettings, OperatingHours, PaymentSettings } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ClinicSettingsService {
  private readonly apiService = inject(ApiService);
  private readonly settingsSubject = new BehaviorSubject<ClinicSettings>(this.defaultSettings());
  private readonly loadingSubject = new BehaviorSubject(false);

  readonly settings$ = this.settingsSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();

  load(): ClinicSettings {
    return this.settingsSubject.value;
  }

  getSettings(): Observable<ClinicSettings> {
    this.loadingSubject.next(true);
    return this.apiService.get<any>('settings').pipe(
      map((data) => data ? this.mapRow(data) : this.settingsSubject.value),
      tap((settings) => this.settingsSubject.next(settings)),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  updateSettings(data: Partial<ClinicSettings>): Observable<ClinicSettings> {
    this.loadingSubject.next(true);
    return this.apiService.put<any>('settings', data).pipe(
      map((updated) => updated ? this.mapRow(updated) : this.settingsSubject.value),
      tap((settings) => this.settingsSubject.next(settings)),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  bumpConsentVersion(): ClinicSettings {
    const current = this.settingsSubject.value;
    const parts = (current.consentVersion || 'v1.0').replace('v', '').split('.');
    const major = parseInt(parts[0], 10) || 1;
    const minor = parseInt(parts[1], 10) || 0;
    const updated = { ...current, consentVersion: `v${major}.${minor + 1}` };
    this.settingsSubject.next(updated);
    return updated;
  }

  private mapRow(row: any): ClinicSettings {
    const hours = row.operating_hours || row.operatingHours || {};
    const payment = row.payment_settings || row.paymentSettings || {};

    return {
      id: row.id || '',
      clinicName: row.clinic_name || row.clinicName || '',
      logoUrl: row.logo_url || row.logoUrl,
      primaryColor: row.primary_color || row.primaryColor || '#5D3E8E',
      secondaryColor: row.secondary_color || row.secondaryColor || '#2563eb',
      address: row.address,
      phone: row.phone,
      email: row.email,
      facebookUrl: row.facebook_url || row.facebookUrl,
      instagramUrl: row.instagram_url || row.instagramUrl,
      operatingHours: {
        monday: hours.monday || { isOpen: true, openTime: '08:00', closeTime: '17:00' },
        tuesday: hours.tuesday || { isOpen: true, openTime: '08:00', closeTime: '17:00' },
        wednesday: hours.wednesday || { isOpen: true, openTime: '08:00', closeTime: '17:00' },
        thursday: hours.thursday || { isOpen: true, openTime: '08:00', closeTime: '17:00' },
        friday: hours.friday || { isOpen: true, openTime: '08:00', closeTime: '17:00' },
        saturday: hours.saturday || { isOpen: false, openTime: '08:00', closeTime: '12:00' },
        sunday: hours.sunday || { isOpen: false, openTime: '08:00', closeTime: '12:00' },
      },
      cancellationDeadlineHours: row.cancellation_deadline_hours ?? row.cancellationDeadlineHours ?? 24,
      patientPortalEnabled: row.patient_portal_enabled ?? row.patientPortalEnabled ?? true,
      vaccinationReminderEnabled: row.vaccination_reminder_enabled ?? row.vaccinationReminderEnabled ?? true,
      followUpReminderEnabled: row.follow_up_reminder_enabled ?? row.followUpReminderEnabled ?? true,
      isPayAtClinicMode: row.is_pay_at_clinic_mode ?? row.isPayAtClinicMode ?? false,
      payAtClinicNoShowWindowMinutes: row.pay_at_clinic_no_show_window_minutes ?? row.payAtClinicNoShowWindowMinutes ?? 30,
      privacyPolicyText: row.privacy_policy_text || row.privacyPolicyText,
      consentVersion: row.consent_version || row.consentVersion || 'v1.0',
      paymentSettings: {
        gcashQrImageUrl: payment.gcash_qr_image_url || payment.gcashQrImageUrl,
        gcashAccountName: payment.gcash_account_name || payment.gcashAccountName,
        gcashNumber: payment.gcash_number || payment.gcashNumber,
        mayaQrImageUrl: payment.maya_qr_image_url || payment.mayaQrImageUrl,
        mayaAccountName: payment.maya_account_name || payment.mayaAccountName,
        mayaNumber: payment.maya_number || payment.mayaNumber,
        bankName: payment.bank_name || payment.bankName,
        bankAccountName: payment.bank_account_name || payment.bankAccountName,
        bankAccountNumber: payment.bank_account_number || payment.bankAccountNumber,
      },
    };
  }

  private defaultSettings(): ClinicSettings {
    return {
      id: '',
      clinicName: '',
      primaryColor: '#5D3E8E',
      secondaryColor: '#2563eb',
      operatingHours: {
        monday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
        tuesday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
        wednesday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
        thursday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
        friday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
        saturday: { isOpen: false, openTime: '08:00', closeTime: '12:00' },
        sunday: { isOpen: false, openTime: '08:00', closeTime: '12:00' },
      },
      cancellationDeadlineHours: 24,
      patientPortalEnabled: true,
      vaccinationReminderEnabled: true,
      followUpReminderEnabled: true,
      isPayAtClinicMode: false,
      payAtClinicNoShowWindowMinutes: 30,
      consentVersion: 'v1.0',
      paymentSettings: {},
    };
  }
}
