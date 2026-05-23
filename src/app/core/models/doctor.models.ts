export type DoctorStatus = 'Active' | 'Inactive' | 'OnLeave';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export type AvailabilityStatus = 'Available' | 'RunningLate' | 'UnavailableToday';

// ─── INTERFACES ─────────────────────────────────────────

export interface Doctor {
  id: string;
  userId: string;
  fullName: string;
  specialization: string;
  bio?: string;
  profilePhotoUrl?: string;
  licenseNumber?: string;
  ptrNumber?: string;
  s2Number?: string;
  consultationFee: number;
  slotDurationMinutes: number;
  slotCapacity: number;
  dailyPatientLimit: number | null;
  status: DoctorStatus;
  isActive?: boolean;
  workingDays?: string[];
  schedule?: Array<Pick<DoctorSchedule, 'dayOfWeek' | 'startTime' | 'endTime'>>;
  averageRating?: number;
  reviewCount?: number;
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface DoctorBlockedDate {
  id: string;
  doctorId: string;
  blockedDate: string;
  reason?: string;
}

export interface DoctorScheduleInput {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface UpsertSchedulesRequest {
  schedules: DoctorScheduleInput[];
}

export interface BlockDateRequest {
  blockedDate: string;
  reason?: string | null;
}

export interface DoctorDayStatus {
  id: string;
  doctorId: string;
  date: string;
  status: AvailabilityStatus;
  runningLateMinutes?: number;
}
