import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { ClinicSettings, PaymentSettings } from '../models';
import { ApiService } from './api.service';
import { MockDataService } from './mock-data.service';

type NullableString = string | null | undefined;

interface PaymentSettingsDto {
  gcashQrImageUrl?: NullableString;
  gcashAccountName?: NullableString;
  gcashNumber?: NullableString;
  mayaQrImageUrl?: NullableString;
  mayaAccountName?: NullableString;
  mayaNumber?: NullableString;
  bankName?: NullableString;
  bankAccountName?: NullableString;
  bankAccountNumber?: NullableString;
}

interface ClinicSettingsDto
  extends Omit<
    ClinicSettings,
    'logoUrl' | 'address' | 'phone' | 'email' | 'facebookUrl' | 'instagramUrl' | 'privacyPolicyText' | 'paymentSettings'
  > {
  logoUrl?: NullableString;
  address?: NullableString;
  phone?: NullableString;
  email?: NullableString;
  facebookUrl?: NullableString;
  instagramUrl?: NullableString;
  privacyPolicyText?: NullableString;
  paymentSettings: PaymentSettingsDto;
}

@Injectable({ providedIn: 'root' })
export class ClinicSettingsService {
  private readonly apiService = inject(ApiService);
  private readonly mockData = inject(MockDataService);
  private readonly settingsSubject = new BehaviorSubject<ClinicSettings>(
    this.mockData.getClinicSettings()
  );
  private readonly loadingSubject = new BehaviorSubject(false);

  readonly settings$ = this.settingsSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();

  /** Returns the latest cached clinic configuration. */
  load(): ClinicSettings {
    return this.settingsSubject.value;
  }

  getSettings(): Observable<ClinicSettings> {
    this.loadingSubject.next(true);

    return this.apiService.get<ClinicSettingsDto>('/settings').pipe(
      map((dto) => mapToClinicSettings(dto)),
      tap((settings) => this.settingsSubject.next(settings)),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  updateSettings(data: Partial<ClinicSettings>): Observable<ClinicSettings> {
    this.loadingSubject.next(true);

    const request$ = this.apiService.put<ClinicSettingsDto>('/settings', data).pipe(
      map((dto) => mapToClinicSettings(dto)),
      tap((settings) => this.settingsSubject.next(settings)),
      finalize(() => this.loadingSubject.next(false)),
      shareReplay(1)
    );

    void request$.subscribe({ error: () => undefined });
    return request$;
  }

  bumpConsentVersion(): ClinicSettings {
    const updated = this.mockData.bumpConsentVersion();
    this.settingsSubject.next(updated);
    return updated;
  }
}

function mapToClinicSettings(dto: ClinicSettingsDto): ClinicSettings {
  return {
    id: dto.id,
    clinicName: dto.clinicName,
    logoUrl: normalizeOptionalString(dto.logoUrl),
    primaryColor: dto.primaryColor,
    secondaryColor: dto.secondaryColor,
    address: normalizeOptionalString(dto.address),
    phone: normalizeOptionalString(dto.phone),
    email: normalizeOptionalString(dto.email),
    facebookUrl: normalizeOptionalString(dto.facebookUrl),
    instagramUrl: normalizeOptionalString(dto.instagramUrl),
    operatingHours: dto.operatingHours,
    cancellationDeadlineHours: dto.cancellationDeadlineHours,
    patientPortalEnabled: dto.patientPortalEnabled,
    vaccinationReminderEnabled: dto.vaccinationReminderEnabled,
    followUpReminderEnabled: dto.followUpReminderEnabled,
    isPayAtClinicMode: dto.isPayAtClinicMode,
    payAtClinicNoShowWindowMinutes: dto.payAtClinicNoShowWindowMinutes,
    privacyPolicyText: normalizeOptionalString(dto.privacyPolicyText),
    consentVersion: dto.consentVersion,
    paymentSettings: mapToPaymentSettings(dto.paymentSettings)
  };
}

function mapToPaymentSettings(dto: PaymentSettingsDto): PaymentSettings {
  return {
    gcashQrImageUrl: normalizeOptionalString(dto.gcashQrImageUrl),
    gcashAccountName: normalizeOptionalString(dto.gcashAccountName),
    gcashNumber: normalizeOptionalString(dto.gcashNumber),
    mayaQrImageUrl: normalizeOptionalString(dto.mayaQrImageUrl),
    mayaAccountName: normalizeOptionalString(dto.mayaAccountName),
    mayaNumber: normalizeOptionalString(dto.mayaNumber),
    bankName: normalizeOptionalString(dto.bankName),
    bankAccountName: normalizeOptionalString(dto.bankAccountName),
    bankAccountNumber: normalizeOptionalString(dto.bankAccountNumber)
  };
}

function normalizeOptionalString(value: NullableString): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
