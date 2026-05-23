export interface ClinicSettings {
  id: string;
  clinicName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  address?: string;
  phone?: string;
  email?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  operatingHours: OperatingHours;
  cancellationDeadlineHours: number;
  patientPortalEnabled: boolean;
  vaccinationReminderEnabled: boolean;
  followUpReminderEnabled: boolean;
  isPayAtClinicMode: boolean;
  payAtClinicNoShowWindowMinutes: number;
  privacyPolicyText?: string;
  consentVersion: string;
  paymentSettings: PaymentSettings;
}

export interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface PaymentSettings {
  gcashQrImageUrl?: string;
  gcashAccountName?: string;
  gcashNumber?: string;
  mayaQrImageUrl?: string;
  mayaAccountName?: string;
  mayaNumber?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
}

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  badgeCount?: number;
  section?: string;
}

export interface AuditLog {
  id: string;
  entityType: 'Booking' | 'Patient' | 'Doctor' | 'Payment' | 'Settings' | 'Consultation';
  entityId: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details?: string;
}

export interface AdminDashboardStats {
  todayAppointments: number;
  monthAppointments: number;
  revenueToday: number;
  pendingVerifications: number;
  onHoldBookings: number;
  unpaidCompleted: number;
  noShowsToday: number;
  upcomingFollowUps: number;
}
