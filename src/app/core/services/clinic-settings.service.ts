import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { ClinicSettings, OperatingHours, PaymentSettings } from '../models';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ClinicSettingsService {
  private readonly supabase = inject(SupabaseService);
  private readonly settingsSubject = new BehaviorSubject<ClinicSettings>(this.defaultSettings());
  private readonly loadingSubject = new BehaviorSubject(false);

  readonly settings$ = this.settingsSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();

  load(): ClinicSettings {
    return this.settingsSubject.value;
  }

  getSettings(): Observable<ClinicSettings> {
    this.loadingSubject.next(true);
    return new Observable((observer) => {
      this.loadFromSupabase().then((settings) => {
        this.settingsSubject.next(settings);
        this.loadingSubject.next(false);
        observer.next(settings);
        observer.complete();
      }).catch(() => {
        this.loadingSubject.next(false);
        observer.next(this.settingsSubject.value);
        observer.complete();
      });
    });
  }

  updateSettings(data: Partial<ClinicSettings>): Observable<ClinicSettings> {
    this.loadingSubject.next(true);
    return new Observable((observer) => {
      this.updateInSupabase(data).then((settings) => {
        if (settings) this.settingsSubject.next(settings);
        this.loadingSubject.next(false);
        observer.next(this.settingsSubject.value);
        observer.complete();
      }).catch(() => {
        this.loadingSubject.next(false);
        observer.next(this.settingsSubject.value);
        observer.complete();
      });
    });
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

  private async loadFromSupabase(): Promise<ClinicSettings> {
    const { data, error } = await this.supabase.client
      .from('clinic_settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) return this.settingsSubject.value;
    return this.mapRow(data);
  }

  private async updateInSupabase(data: Partial<ClinicSettings>): Promise<ClinicSettings | null> {
    const existing = this.settingsSubject.value;
    if (!existing.id) return null;

    const payload: Record<string, unknown> = {};
    const fields: Array<keyof ClinicSettings> = [
      'clinicName', 'logoUrl', 'primaryColor', 'secondaryColor',
      'address', 'phone', 'email', 'facebookUrl', 'instagramUrl',
      'operatingHours', 'cancellationDeadlineHours',
      'patientPortalEnabled', 'vaccinationReminderEnabled', 'followUpReminderEnabled',
      'isPayAtClinicMode', 'payAtClinicNoShowWindowMinutes',
      'privacyPolicyText', 'consentVersion',
    ];
    for (const f of fields) {
      if (f in data) payload[this.toSnakeCase(f)] = data[f as keyof typeof data];
    }

    const { data: updated, error } = await this.supabase.client
      .from('clinic_settings')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error || !updated) return null;
    return this.mapRow(updated);
  }

  private mapRow(row: any): ClinicSettings {
    return {
      id: row.id,
      clinicName: row.clinic_name || '',
      logoUrl: row.logo_url || undefined,
      primaryColor: row.primary_color || '#5D3E8E',
      secondaryColor: row.secondary_color || '#2563EB',
      address: row.address || undefined,
      phone: row.phone || undefined,
      email: row.contact_email || undefined,
      facebookUrl: row.facebook_url || undefined,
      instagramUrl: row.instagram_url || undefined,
      operatingHours: this.parseOperatingHours(row.operating_hours_json),
      cancellationDeadlineHours: row.cancellation_deadline_hours ?? 24,
      patientPortalEnabled: row.patient_portal_enabled ?? true,
      vaccinationReminderEnabled: row.vaccination_reminder_enabled ?? true,
      followUpReminderEnabled: row.follow_up_reminder_enabled ?? true,
      isPayAtClinicMode: row.is_pay_at_clinic_mode ?? false,
      payAtClinicNoShowWindowMinutes: row.pay_at_clinic_no_show_window_minutes ?? 60,
      privacyPolicyText: row.privacy_policy_text || undefined,
      consentVersion: row.consent_version || 'v1.0',
      paymentSettings: {
        gcashQrImageUrl: row.gcash_qr_image_url || undefined,
        gcashAccountName: row.gcash_account_name || undefined,
        gcashNumber: row.gcash_number || undefined,
        mayaQrImageUrl: row.maya_qr_image_url || undefined,
        mayaAccountName: row.maya_account_name || undefined,
        mayaNumber: row.maya_number || undefined,
        bankName: row.bank_name || undefined,
        bankAccountName: row.bank_account_name || undefined,
        bankAccountNumber: row.bank_account_number || undefined,
      },
    };
  }

  private defaultSettings(): ClinicSettings {
    return {
      id: '',
      clinicName: 'Clinic',
      logoUrl: undefined,
      primaryColor: '#5D3E8E',
      secondaryColor: '#2563EB',
      address: undefined,
      phone: undefined,
      email: undefined,
      facebookUrl: undefined,
      instagramUrl: undefined,
      operatingHours: this.defaultOperatingHours(),
      cancellationDeadlineHours: 24,
      patientPortalEnabled: true,
      vaccinationReminderEnabled: true,
      followUpReminderEnabled: true,
      isPayAtClinicMode: false,
      payAtClinicNoShowWindowMinutes: 60,
      privacyPolicyText: undefined,
      consentVersion: 'v1.0',
      paymentSettings: {},
    };
  }

  private defaultOperatingHours(): OperatingHours {
    const day = { isOpen: true, openTime: '08:00', closeTime: '17:00' };
    return { monday: day, tuesday: day, wednesday: day, thursday: day, friday: day, saturday: day, sunday: { isOpen: false, openTime: '08:00', closeTime: '12:00' } };
  }

  private parseOperatingHours(json: string | null | undefined): OperatingHours {
    if (!json) return this.defaultOperatingHours();
    try {
      const parsed = JSON.parse(json);
      return { ...this.defaultOperatingHours(), ...parsed };
    } catch {
      return this.defaultOperatingHours();
    }
  }

  private toSnakeCase(key: string): string {
    return key.replace(/([A-Z])/g, '_$1').toLowerCase();
  }
}
