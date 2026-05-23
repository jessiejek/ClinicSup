import { ClinicSettings, PaymentSettings } from '../models';

export const MOCK_CLINIC_SETTINGS: ClinicSettings = {
    id: 'settings-1',
    clinicName: 'Dr. Grace E. Gavino Medical Clinic',
    logoUrl: undefined,
    primaryColor: '#5D3E8E',
    secondaryColor: '#2563EB',
    address: 'Zone 1, 3 M.L. Quezon National Highway, Buaya, Lapu-Lapu, 6015 Cebu',
    phone: '0928 561 2976',
    email: 'info@gavino.clinic',
    facebookUrl: 'https://facebook.com/gavinoclinic',
    instagramUrl: 'https://instagram.com/gavinoclinic',
    operatingHours: {
      monday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      friday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      saturday: { isOpen: true, openTime: '08:00', closeTime: '12:00' },
      sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' }
    },
    cancellationDeadlineHours: 24,
    patientPortalEnabled: true,
    vaccinationReminderEnabled: true,
    followUpReminderEnabled: true,
    isPayAtClinicMode: false,
    payAtClinicNoShowWindowMinutes: 60,
    privacyPolicyText:
      'This clinic collects and processes your personal health information in accordance with Republic Act No. 10173 (Data Privacy Act of 2012)...',
    consentVersion: 'v1.0',
    paymentSettings: {
      gcashAccountName: 'Dr. Grace E. Gavino',
      gcashNumber: '09285612976',
      mayaAccountName: 'Dr. Grace E. Gavino',
      mayaNumber: '09285612976',
      bankName: 'BDO Unibank',
      bankAccountName: 'Grace E. Gavino',
      bankAccountNumber: '00123456789'
    }
  };

export const MOCK_PAYMENT_SETTINGS: PaymentSettings = {
  ...MOCK_CLINIC_SETTINGS.paymentSettings
};
