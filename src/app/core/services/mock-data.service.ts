import { Injectable } from '@angular/core';
import {
  AdminDashboardStats,
  Announcement,
  Allergy,
  AuditLog,
  Booking,
  BookingStatus,
  ClinicSettings,
  Consultation,
  DayOfWeek,
  Doctor,
  DoctorBlockedDate,
  DoctorSchedule,
  FollowUp,
  LabRequest,
  LabResult,
  MockDrug,
  Notification,
  Patient,
  PaymentMode,
  PaymentSettings,
  PaymentStatus,
  Prescription,
  PrescriptionItem,
  ProofType,
  Review,
  Service,
  TimeSlot,
  VaccinationRecord
} from '../models';
import { MOCK_ANNOUNCEMENTS } from '../mock-data/mock-announcements.data';
import { buildMockBookings } from '../mock-data/mock-bookings.data';
import { MOCK_CLINIC_SETTINGS, MOCK_PAYMENT_SETTINGS } from '../mock-data/mock-clinic-settings.data';
import { MOCK_DOCTOR_SCHEDULES, MOCK_DOCTORS } from '../mock-data/mock-doctors.data';
import {
  MOCK_ALLERGIES,
  MOCK_CONSULTATIONS,
  MOCK_DRUG_LIST,
  MOCK_FOLLOW_UPS,
  MOCK_LAB_REQUESTS,
  MOCK_LAB_RESULTS,
  MOCK_PRESCRIPTIONS,
  MOCK_VACCINATIONS
} from '../mock-data/mock-medical-records.data';
import { MOCK_NOTIFICATIONS } from '../mock-data/mock-notifications.data';
import { MOCK_PATIENTS } from '../mock-data/mock-patients.data';
import {
  MOCK_DAILY_BOOKING_SUMMARY_ROWS,
  MOCK_PENDING_FOLLOW_UP_REPORT_ROWS,
  MOCK_UNPAID_COMPLETED_VISIT_REPORT_ROWS
} from '../mock-data/mock-reports.data';
import { MOCK_REVIEWS } from '../mock-data/mock-reviews.data';
import { MOCK_SERVICES } from '../mock-data/mock-services.data';
import { MOCK_SEED_USERS, SeedUser } from '../mock-data/mock-users.data';


@Injectable({ providedIn: 'root' })
export class MockDataService {
  private clone<T>(value: T): T {
    return structuredClone(value);
  }

  private readonly today = new Date();
  private _orSequence = 10;

  generateOrNumber(): string {
    this._orSequence++;
    return `OR-2025-${String(this._orSequence).padStart(5, '0')}`;
  }

  private _clinicSettings: ClinicSettings = this.clone(MOCK_CLINIC_SETTINGS);
  private _paymentSettings: PaymentSettings = this.clone(MOCK_PAYMENT_SETTINGS);
  private readonly _seedUsers: SeedUser[] = this.clone(MOCK_SEED_USERS);
  private readonly _doctors: Doctor[] = this.clone(MOCK_DOCTORS);
  private readonly _doctorSchedules: DoctorSchedule[] = this.clone(MOCK_DOCTOR_SCHEDULES);
  private _doctorBlockedDates: DoctorBlockedDate[] = [];
  private readonly _services: Service[] = this.clone(MOCK_SERVICES);
  private _patients: Patient[] = this.clone(MOCK_PATIENTS);
  private readonly _announcements: Announcement[] = this.clone(MOCK_ANNOUNCEMENTS);
  private readonly _notifications: Notification[] = this.clone(MOCK_NOTIFICATIONS);
  private _reviews: Review[] = this.clone(MOCK_REVIEWS);
  private _auditLogs: AuditLog[] = [];
  private readonly _unpaidCompletedVisitReportRows = this.clone(MOCK_UNPAID_COMPLETED_VISIT_REPORT_ROWS);
  private readonly _pendingFollowUpReportRows = this.clone(MOCK_PENDING_FOLLOW_UP_REPORT_ROWS);
  private readonly _dailyBookingSummaryRows = this.clone(MOCK_DAILY_BOOKING_SUMMARY_ROWS);
  private _consultations: Consultation[] = this.clone(MOCK_CONSULTATIONS);
  private _prescriptions: Prescription[] = this.clone(MOCK_PRESCRIPTIONS);
  private _allergies: Allergy[] = this.clone(MOCK_ALLERGIES);
  private _labRequests: LabRequest[] = this.clone(MOCK_LAB_REQUESTS);
  private _labResults: LabResult[] = this.clone(MOCK_LAB_RESULTS);
  private _vaccinations: VaccinationRecord[] = this.clone(MOCK_VACCINATIONS);
  private _followUps: FollowUp[] = this.clone(MOCK_FOLLOW_UPS);
  private readonly _mockDrugList: MockDrug[] = this.clone(MOCK_DRUG_LIST);
  private _bookings: Booking[] = [];

  constructor() {
    const ymd = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const add = (d: Date, days: number): Date => {
      const x = new Date(d);
      x.setDate(x.getDate() + days);
      return x;
    };

    const todayStr = ymd(this.today);
    const tomorrowStr = ymd(add(this.today, 1));
    const yesterdayStr = ymd(add(this.today, -1));
    const twoDaysAgoStr = ymd(add(this.today, -2));
    const threeDaysAgoStr = ymd(add(this.today, -3));
    const nextWeekStr = ymd(add(this.today, 7));

    this._doctorBlockedDates = this.buildDoctorBlockedDates();

    this._bookings = buildMockBookings(
      this.makeBooking.bind(this),
      { todayStr, tomorrowStr, yesterdayStr, twoDaysAgoStr, threeDaysAgoStr, nextWeekStr }
    );

    for (const booking of this._bookings) {
      if (booking.status === 'Completed' && (booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Waived')) {
        booking.orNumber = this.generateOrNumber();
      }
    }

    this._notifications.push(
      ...this.buildNotificationsForUser('user-staff-1', [
        { title: 'Queue Updated', message: 'Walk-in queue has been updated for today.', isRead: false, minutesAgo: 12, navigateTo: '/staff/bookings' },
        { title: 'Booking Confirmed', message: 'A pending booking was confirmed successfully.', isRead: false, minutesAgo: 48, navigateTo: '/staff/bookings/BK-002' },
        { title: 'Proof Submitted', message: 'Payment proof is ready for verification.', isRead: false, minutesAgo: 65, navigateTo: '/staff/bookings/BK-003' },
        { title: 'Cancelled Visit', message: 'A booking was cancelled by the patient.', isRead: true, minutesAgo: 150 },
        { title: 'Doctor Available', message: 'Dr. Santos has checked in for the morning queue.', isRead: true, minutesAgo: 240 },
        { title: 'Walk-in Added', message: 'A new walk-in patient has been registered.', isRead: true, minutesAgo: 360 },
        { title: 'Follow-up Reminder', message: 'Two patients need follow-up reminders today.', isRead: true, minutesAgo: 720 },
        { title: 'Records Updated', message: 'A patient record was updated.', isRead: true, minutesAgo: 1440 },
        { title: 'Lab Request Logged', message: 'A lab request was added to a consultation.', isRead: true, minutesAgo: 2880 },
        { title: 'System Notice', message: 'Clinic schedule was refreshed for tomorrow.', isRead: true, minutesAgo: 4320 }
      ]),
      ...this.buildNotificationsForUser('user-doctor-1', [
        { title: 'Today\'s Queue', message: 'You have 4 patients in your queue today.', isRead: false, minutesAgo: 9, navigateTo: '/doctor/dashboard' },
        { title: 'New Booking', message: 'A new booking was assigned to your schedule.', isRead: false, minutesAgo: 34, navigateTo: '/doctor/appointments' },
        { title: 'Consultation Locked', message: 'A completed consultation has been locked.', isRead: false, minutesAgo: 58, navigateTo: '/doctor/patients' },
        { title: 'Follow-up Due', message: 'A patient follow-up is due this week.', isRead: true, minutesAgo: 120 },
        { title: 'Patient Review', message: 'A new patient review was posted.', isRead: true, minutesAgo: 240 },
        { title: 'Schedule Change', message: 'Your Friday schedule was updated.', isRead: true, minutesAgo: 480 },
        { title: 'Medical Record', message: 'A record was added for a recent visit.', isRead: true, minutesAgo: 960 },
        { title: 'Prescription Ready', message: 'A prescription is ready for review.', isRead: true, minutesAgo: 1920 },
        { title: 'No Show Note', message: 'A no-show has been recorded for today.', isRead: true, minutesAgo: 2880 },
        { title: 'Clinic Memo', message: 'Please check the updated clinic memo.', isRead: true, minutesAgo: 4320 }
      ]),
      ...this.buildNotificationsForUser('user-patient-1', [
        { title: 'Appointment Confirmed', message: 'Your booking was confirmed by the clinic.', isRead: false, minutesAgo: 15, navigateTo: '/patient/bookings/BK-001' },
        { title: 'Payment Received', message: 'Your payment has been marked as paid.', isRead: false, minutesAgo: 44, navigateTo: '/patient/bookings/BK-001' },
        { title: 'Review Request', message: 'You can now leave a review for your completed visit.', isRead: false, minutesAgo: 72, navigateTo: '/patient/bookings/BK-006' },
        { title: 'Follow-up Reminder', message: 'A follow-up visit is coming up soon.', isRead: true, minutesAgo: 144 },
        { title: 'Medical Record', message: 'Your medical record has been updated.', isRead: true, minutesAgo: 288 },
        { title: 'Prescription Ready', message: 'A prescription is available for viewing.', isRead: true, minutesAgo: 432 },
        { title: 'Clinic Notice', message: 'The clinic posted a new announcement.', isRead: true, minutesAgo: 576 },
        { title: 'Consent Update', message: 'Your privacy consent record was refreshed.', isRead: true, minutesAgo: 720 },
        { title: 'New Message', message: 'The clinic has a new update for you.', isRead: true, minutesAgo: 960 },
        { title: 'Booking Reminder', message: 'Your next appointment is coming soon.', isRead: true, minutesAgo: 1200 }
      ])
    );

    this._auditLogs = this.buildAuditLogs();
  }

  get clinicSettings(): ClinicSettings {
    return this._clinicSettings;
  }

  getClinicSettings(): ClinicSettings {
    return {
      ...this._clinicSettings,
      paymentSettings: { ...this._clinicSettings.paymentSettings }
    };
  }

  get paymentSettings(): PaymentSettings {
    return this._paymentSettings;
  }

  getPaymentSettings(): PaymentSettings {
    return { ...this._paymentSettings };
  }

  get seedUsers(): SeedUser[] {
    return [...this._seedUsers];
  }

  getDoctors(): Doctor[] {
    return [...this._doctors];
  }

  getDoctorById(id: string): Doctor | undefined {
    return this._doctors.find((doctor) => doctor.id === id);
  }

  get doctors(): Doctor[] {
    return [...this._doctors];
  }

  getDoctorSchedules(): DoctorSchedule[] {
    return [...this._doctorSchedules];
  }

  getDoctorSchedulesByDoctorId(doctorId: string): DoctorSchedule[] {
    return this._doctorSchedules.filter((schedule) => schedule.doctorId === doctorId);
  }

  get doctorSchedules(): DoctorSchedule[] {
    return [...this._doctorSchedules];
  }

  getDoctorBlockedDates(doctorId?: string): DoctorBlockedDate[] {
    if (!doctorId) {
      return [...this._doctorBlockedDates];
    }
    return this._doctorBlockedDates.filter((blockedDate) => blockedDate.doctorId === doctorId);
  }

  get services(): Service[] {
    return [...this._services];
  }

  getServices(): Service[] {
    return [...this._services];
  }

  getServiceById(id: string): Service | undefined {
    return this._services.find((service) => service.id === id);
  }

  get patients(): Patient[] {
    return [...this._patients];
  }

  getPatients(): Patient[] {
    return [...this._patients];
  }

  getPatientById(id: string): Patient | undefined {
    return this._patients.find((patient) => patient.id === id);
  }

  getBookings(): Booking[] {
    return [...this._bookings];
  }

  get bookings(): Booking[] {
    return [...this._bookings];
  }

  getConsultations(): Consultation[] {
    return [...this._consultations];
  }

  getConsultationById(id: string): Consultation | undefined {
    return this._consultations.find((consultation) => consultation.id === id);
  }

  getConsultationByBookingId(bookingId: string): Consultation | undefined {
    return this._consultations.find((consultation) => consultation.bookingId === bookingId);
  }

  getPrescriptions(): Prescription[] {
    return [...this._prescriptions];
  }

  getAllergies(): Allergy[] {
    return [...this._allergies];
  }

  getLabRequests(): LabRequest[] {
    return [...this._labRequests];
  }

  getLabResults(): LabResult[] {
    return [...this._labResults];
  }

  getVaccinations(): VaccinationRecord[] {
    return [...this._vaccinations];
  }

  getFollowUps(): FollowUp[] {
    return [...this._followUps];
  }

  getMockDrugList(): MockDrug[] {
    return [...this._mockDrugList];
  }

  saveConsultation(consultation: Consultation): Consultation {
    this._consultations = [...this._consultations.filter((item) => item.id !== consultation.id), consultation];
    return { ...consultation };
  }

  savePrescription(prescription: Prescription): Prescription {
    this._prescriptions = [...this._prescriptions.filter((item) => item.id !== prescription.id), prescription];
    return { ...prescription, items: prescription.items.map((item) => ({ ...item })) };
  }

  saveAllergy(allergy: Allergy): Allergy {
    this._allergies = [...this._allergies.filter((item) => item.id !== allergy.id), allergy];
    return { ...allergy };
  }

  removeAllergy(allergyId: string): void {
    this._allergies = this._allergies.filter((allergy) => allergy.id !== allergyId);
  }

  saveLabRequest(labRequest: LabRequest): LabRequest {
    this._labRequests = [...this._labRequests.filter((item) => item.id !== labRequest.id), labRequest];
    return { ...labRequest };
  }

  saveLabResult(labResult: LabResult): LabResult {
    this._labResults = [...this._labResults.filter((item) => item.id !== labResult.id), labResult];
    return { ...labResult };
  }

  saveVaccinationRecord(record: VaccinationRecord): VaccinationRecord {
    this._vaccinations = [...this._vaccinations.filter((item) => item.id !== record.id), record];
    return { ...record };
  }

  saveFollowUp(followUp: FollowUp): FollowUp {
    this._followUps = [...this._followUps.filter((item) => item.id !== followUp.id), followUp];
    return { ...followUp };
  }

  getBookingById(id: string): Booking | undefined {
    return this._bookings.find((booking) => booking.id === id);
  }

  get announcements(): Announcement[] {
    return [...this._announcements];
  }

  getAnnouncements(): Announcement[] {
    return [...this._announcements];
  }

  getAnnouncementById(id: string): Announcement | undefined {
    return this._announcements.find((announcement) => announcement.id === id);
  }

  getNotifications(): Notification[] {
    return [...this._notifications];
  }

  getUsers(): SeedUser[] {
    return [...this._seedUsers];
  }

  getReviews(): Review[] {
    return [...this._reviews];
  }

  get reviews(): Review[] {
    return [...this._reviews];
  }

  getAuditLogs(): AuditLog[] {
    return [...this._auditLogs];
  }

  getUnpaidCompletedVisitReportRows(): Array<{
    bookingId: string;
    patient: string;
    doctor: string;
    service: string;
    visitDate: string;
    amount: number;
    paymentStatus: string;
  }> {
    return [...this._unpaidCompletedVisitReportRows];
  }

  getPendingFollowUpReportRows(): Array<{
    patient: string;
    doctor: string;
    followUpDate: string;
    reason: string;
    status: string;
  }> {
    return [...this._pendingFollowUpReportRows];
  }

  getDailyBookingSummaryRows(): Array<{
    date: string;
    totalBookings: number;
    completed: number;
    cancelled: number;
    noShow: number;
    revenue: number;
  }> {
    return [...this._dailyBookingSummaryRows];
  }

  getAdminDashboardStats(): AdminDashboardStats {
    return {
      todayAppointments: 4,
      monthAppointments: 87,
      revenueToday: 2800,
      pendingVerifications: 1,
      onHoldBookings: 0,
      unpaidCompleted: 1,
      noShowsToday: 1,
      upcomingFollowUps: this._followUps.filter((item) => item.status === 'Pending').length
    };
  }

  generateMockSlots(doctorId: string, date: Date): TimeSlot[] {
    const schedules = this.getDoctorSchedules().filter((s) => s.doctorId === doctorId);
    const dayNames: DayOfWeek[] = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ];
    const dayName = dayNames[date.getDay()] as DayOfWeek;
    const schedule = schedules.find((s) => s.dayOfWeek === dayName);

    if (!schedule) {
      return [];
    }

    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    if (isPast) {
      return [];
    }

    const slots: TimeSlot[] = [];
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    const doctor = this.getDoctors().find((d) => d.id === doctorId);
    const duration = doctor?.slotDurationMinutes ?? 30;

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    let index = 0;

    while (currentMinutes + duration <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const endH = Math.floor((currentMinutes + duration) / 60);
      const endM = (currentMinutes + duration) % 60;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      let status: TimeSlot['status'] = 'available';
      if (index === 1) {
        status = 'full';
      }
      if (index === 2) {
        status = 'full';
      }
      if (index === 4) {
        status = 'pending';
      }

      slots.push({ time: timeStr, endTime: endTimeStr, status });
      currentMinutes += duration;
      index++;
    }

    return slots;
  }

  updatePatient(patient: Patient): void {
    this._patients = this._patients.map((item) => (item.id === patient.id ? { ...patient } : item));
  }

  updatePatientConsent(patientId: string, consentVersion: string): void {
    this._patients = this._patients.map((patient) =>
      patient.id === patientId
        ? {
          ...patient,
            consentVersion,
            consentedAt: new Date().toISOString()
          }
        : patient
    );
  }

  updateClinicSettings(settings: ClinicSettings): ClinicSettings {
    this._clinicSettings = {
      ...settings,
      paymentSettings: { ...settings.paymentSettings }
    };
    this._paymentSettings = { ...settings.paymentSettings };
    return this.getClinicSettings();
  }

  bumpConsentVersion(): ClinicSettings {
    const current = this._clinicSettings.consentVersion.trim();
    const match = /^v(\d+)(?:\.(\d+))?$/i.exec(current);
    const major = Number(match?.[1] ?? 1);
    const minor = Number(match?.[2] ?? 0) + 1;
    const version = `v${major}.${minor}`;
    this._clinicSettings = {
      ...this._clinicSettings,
      consentVersion: version
    };
    return this.getClinicSettings();
  }

  submitBookingProof(bookingId: string, proofType: ProofType, proofValue: string): void {
    this._bookings = this._bookings.map((booking) =>
      booking.id === bookingId
        ? {
            ...booking,
            status: 'ProofSubmitted',
            proofType,
            proofValue,
            proofSubmittedAt: new Date().toISOString()
          }
        : booking
    );
  }

  cancelBooking(bookingId: string, reason: string): void {
    this._bookings = this._bookings.map((booking) =>
      booking.id === bookingId
        ? {
            ...booking,
            status: 'Cancelled',
            cancellationReason: reason
          }
        : booking
    );
  }

  confirmBooking(bookingId: string): void {
    this._bookings = this._bookings.map((booking) =>
      booking.id === bookingId ? { ...booking, status: 'Confirmed' } : booking
    );
  }

  confirmPayment(bookingId: string): void {
    this._bookings = this._bookings.map((booking) =>
      booking.id === bookingId ? { ...booking, status: 'Confirmed', paymentStatus: 'Paid' } : booking
    );
  }

  markComplete(bookingId: string): void {
    this._bookings = this._bookings.map((booking) =>
      booking.id === bookingId ? { ...booking, status: 'Completed' } : booking
    );
  }

  markNoShow(bookingId: string): void {
    this._bookings = this._bookings.map((booking) =>
      booking.id === bookingId ? { ...booking, status: 'NoShow' } : booking
    );
  }

  waivePayment(bookingId: string, reason: string): Booking | undefined {
    let updated: Booking | undefined;
    this._bookings = this._bookings.map((booking) => {
      if (booking.id !== bookingId) {
        return booking;
      }
      updated = {
        ...booking,
        paymentStatus: 'Waived'
      };
      return updated;
    });
    if (updated) {
      this.addAuditLog({
        entityType: 'Payment',
        entityId: bookingId,
        action: 'Waived payment',
        performedBy: 'Dr. Grace E. Gavino',
        performedAt: new Date().toISOString(),
        details: reason
      });
    }
    return updated;
  }

  refundPayment(bookingId: string, reason: string): Booking | undefined {
    let updated: Booking | undefined;
    this._bookings = this._bookings.map((booking) => {
      if (booking.id !== bookingId) {
        return booking;
      }
      updated = {
        ...booking,
        paymentStatus: 'Refunded'
      };
      return updated;
    });
    if (updated) {
      this.addAuditLog({
        entityType: 'Payment',
        entityId: bookingId,
        action: 'Refunded payment',
        performedBy: 'Dr. Grace E. Gavino',
        performedAt: new Date().toISOString(),
        details: reason
      });
    }
    return updated;
  }

  saveReview(review: Review): Review {
    this._reviews = [...this._reviews.filter((item) => item.id !== review.id), review];
    this.recalculateDoctorReviewStats(review.doctorId);
    return { ...review };
  }

  addAuditLog(log: Omit<AuditLog, 'id'> & { id?: string }): AuditLog {
    const entry: AuditLog = {
      id: log.id ?? `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      performedBy: log.performedBy,
      performedAt: log.performedAt,
      details: log.details
    };
    this._auditLogs = [entry, ...this._auditLogs].slice(0, 50);
    return { ...entry };
  }

  private buildNotificationsForUser(
    userId: string,
    seeds: Array<{
      title: string;
      message: string;
      isRead: boolean;
      minutesAgo: number;
      navigateTo?: string;
    }>
  ): Notification[] {
    return seeds.map((seed, index) => ({
      id: `n-${userId}-${index + 1}`,
      userId,
      title: seed.title,
      message: seed.message,
      isRead: seed.isRead,
      createdAt: new Date(Date.now() - seed.minutesAgo * 60000).toISOString(),
      navigateTo: seed.navigateTo
    }));
  }

  private buildAuditLogs(): AuditLog[] {
    const seeds: Array<Omit<AuditLog, 'id'>> = [
      {
        entityType: 'Booking',
        entityId: 'BK-001',
        action: 'Confirmed booking',
        performedBy: 'Ana Gomez',
        performedAt: new Date(Date.now() - 15 * 60000).toISOString(),
        details: 'Booking confirmed by staff.'
      },
      {
        entityType: 'Booking',
        entityId: 'BK-003',
        action: 'Marked proof submitted',
        performedBy: 'Ana Gomez',
        performedAt: new Date(Date.now() - 30 * 60000).toISOString(),
        details: 'Payment proof queued for verification.'
      },
      {
        entityType: 'Payment',
        entityId: 'BK-006',
        action: 'Marked paid',
        performedBy: 'Dr. Grace E. Gavino',
        performedAt: new Date(Date.now() - 45 * 60000).toISOString(),
        details: 'Payment verified in clinic.'
      },
      {
        entityType: 'Patient',
        entityId: 'pat-1',
        action: 'Updated patient profile',
        performedBy: 'Maria Fernandez',
        performedAt: new Date(Date.now() - 60 * 60000).toISOString(),
        details: 'Contact number updated.'
      },
      {
        entityType: 'Doctor',
        entityId: 'doc-2',
        action: 'Updated schedule',
        performedBy: 'Maria Fernandez',
        performedAt: new Date(Date.now() - 75 * 60000).toISOString(),
        details: 'Wednesday clinic hours adjusted.'
      },
      {
        entityType: 'Settings',
        entityId: 'settings-1',
        action: 'Updated clinic branding',
        performedBy: 'Dr. Grace E. Gavino',
        performedAt: new Date(Date.now() - 90 * 60000).toISOString(),
        details: 'Primary color changed for demo.'
      },
      {
        entityType: 'Consultation',
        entityId: 'consult-1',
        action: 'Completed consultation',
        performedBy: 'Dr. Santos',
        performedAt: new Date(Date.now() - 105 * 60000).toISOString(),
        details: 'SOAP notes finalized.'
      },
      {
        entityType: 'Booking',
        entityId: 'BK-007',
        action: 'Waived payment',
        performedBy: 'Dr. Grace E. Gavino',
        performedAt: new Date(Date.now() - 120 * 60000).toISOString(),
        details: 'Patient hardship waiver applied.'
      },
      {
        entityType: 'Payment',
        entityId: 'BK-009',
        action: 'Refunded payment',
        performedBy: 'Dr. Grace E. Gavino',
        performedAt: new Date(Date.now() - 135 * 60000).toISOString(),
        details: 'Refund processed after cancellation.'
      },
      {
        entityType: 'Patient',
        entityId: 'pat-4',
        action: 'Added review',
        performedBy: 'Juan Dela Cruz',
        performedAt: new Date(Date.now() - 150 * 60000).toISOString(),
        details: 'Five-star review submitted.'
      },
      {
        entityType: 'Booking',
        entityId: 'BK-010',
        action: 'Completed visit',
        performedBy: 'Dr. Jose Reyes',
        performedAt: new Date(Date.now() - 165 * 60000).toISOString(),
        details: 'Visit closed with prescription.'
      },
      {
        entityType: 'Consultation',
        entityId: 'consult-2',
        action: 'Added diagnosis',
        performedBy: 'Dr. Ana Cruz',
        performedAt: new Date(Date.now() - 180 * 60000).toISOString(),
        details: 'Primary diagnosis encoded.'
      },
      {
        entityType: 'Settings',
        entityId: 'settings-1',
        action: 'Bumped consent version',
        performedBy: 'Dr. Grace E. Gavino',
        performedAt: new Date(Date.now() - 195 * 60000).toISOString(),
        details: 'Patients may need to re-accept consent.'
      },
      {
        entityType: 'Booking',
        entityId: 'BK-011',
        action: 'Rescheduled booking',
        performedBy: 'Ana Gomez',
        performedAt: new Date(Date.now() - 210 * 60000).toISOString(),
        details: 'Moved to next available day.'
      },
      {
        entityType: 'Patient',
        entityId: 'pat-5',
        action: 'Created patient record',
        performedBy: 'Maria Fernandez',
        performedAt: new Date(Date.now() - 225 * 60000).toISOString(),
        details: 'New record created from walk-in.'
      },
      {
        entityType: 'Doctor',
        entityId: 'doc-1',
        action: 'Updated consultation fee',
        performedBy: 'Dr. Grace E. Gavino',
        performedAt: new Date(Date.now() - 240 * 60000).toISOString(),
        details: 'Consultation fee reviewed.'
      },
      {
        entityType: 'Booking',
        entityId: 'BK-012',
        action: 'Marked no-show',
        performedBy: 'Ana Gomez',
        performedAt: new Date(Date.now() - 255 * 60000).toISOString(),
        details: 'Patient did not arrive for the appointment.'
      },
      {
        entityType: 'Payment',
        entityId: 'BK-002',
        action: 'Recorded payment',
        performedBy: 'Ana Gomez',
        performedAt: new Date(Date.now() - 270 * 60000).toISOString(),
        details: 'On-site payment registered.'
      },
      {
        entityType: 'Consultation',
        entityId: 'consult-3',
        action: 'Added lab request',
        performedBy: 'Dr. Santos',
        performedAt: new Date(Date.now() - 285 * 60000).toISOString(),
        details: 'CBC and urinalysis requested.'
      },
      {
        entityType: 'Settings',
        entityId: 'settings-1',
        action: 'Updated payment details',
        performedBy: 'Dr. Grace E. Gavino',
        performedAt: new Date(Date.now() - 300 * 60000).toISOString(),
        details: 'Payment channels refreshed.'
      }
    ];

    return seeds.map((seed, index) => ({
      ...seed,
      id: `audit-${index + 1}`
    }));
  }

  private recalculateDoctorReviewStats(doctorId: string): void {
    const doctorReviews = this._reviews.filter((review) => review.doctorId === doctorId);
    const doctor = this._doctors.find((item) => item.id === doctorId);
    if (!doctor || doctorReviews.length === 0) {
      return;
    }
    const averageRating =
      doctorReviews.reduce((total, review) => total + review.rating, 0) / doctorReviews.length;
    doctor.reviewCount = doctorReviews.length;
    doctor.averageRating = Math.round(averageRating * 10) / 10;
  }

  private makeBooking(
    id: string,
    patientId: string,
    doctorId: string,
    serviceId: string,
    appointmentDate: string,
    slotStartTime: string,
    status: BookingStatus,
    paymentStatus: PaymentStatus,
    queueNumber: number | null,
    totalFee: number,
    isWalkIn: boolean,
    paymentMode: PaymentMode,
    consultationFeeSnapshot: number,
    serviceFeeSnapshot: number
  ): Booking {
    const svc = this._services.find((s) => s.id === serviceId);
    const duration = svc?.estimatedDurationMinutes ?? 30;
    return {
      id,
      patientId,
      doctorId,
      serviceId,
      appointmentDate,
      slotStartTime,
      slotEndTime: this.addMinutesToTime(slotStartTime, duration),
      status,
      paymentStatus,
      paymentMode,
      queueNumber,
      totalFee,
      consultationFeeSnapshot,
      serviceFeeSnapshot,
      isWalkIn,
      createdAt: `${appointmentDate}T00:00:00Z`
    };
  }

  private stripTime(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private minutesFromMidnight(hhmm: string): number {
    const [h, m] = hhmm.split(':').map((x) => Number(x));
    return h * 60 + m;
  }

  private minutesToHHmm(total: number): string {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private addMinutesToTime(start: string, minutes: number): string {
    return this.minutesToHHmm(this.minutesFromMidnight(start) + minutes);
  }

  private buildDoctorBlockedDates(): DoctorBlockedDate[] {
    const blockedDates: DoctorBlockedDate[] = [];
    const dayNames: DayOfWeek[] = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ];

    this._doctors.forEach((doctor) => {
      const scheduleDays = this._doctorSchedules
        .filter((schedule) => schedule.doctorId === doctor.id)
        .map((schedule) => schedule.dayOfWeek);
      const upcomingDates = this.getUpcomingWorkingDates(scheduleDays, 3);

      upcomingDates.forEach((blockedDate, index) => {
        const dayLabel = dayNames[new Date(`${blockedDate}T00:00:00`).getDay()];
        blockedDates.push({
          id: `blocked-${doctor.id}-${index + 1}`,
          doctorId: doctor.id,
          blockedDate,
          reason: `Unavailable on ${dayLabel}`
        });
      });
    });

    return blockedDates;
  }

  private getUpcomingWorkingDates(days: DayOfWeek[], count: number): string[] {
    const results: string[] = [];
    const start = this.stripTime(new Date());
    for (let offset = 1; results.length < count && offset <= 90; offset++) {
      const date = new Date(start);
      date.setDate(date.getDate() + offset);
      const dayName = this.dayNames()[date.getDay()];
      if (days.includes(dayName)) {
        results.push(this.toIsoDate(date));
      }
    }
    return results;
  }

  private dayNames(): DayOfWeek[] {
    return [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ];
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
