import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  defer,
  finalize,
  from,
  map,
  of,
  switchMap,
  take,
  tap,
  throwError
} from 'rxjs';
import {
  Booking,
  BookingServiceItem,
  DoctorPatientSummaryDto,
  BookingStatus,
  Payment,
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
  ProofType,
  ReceiptData
} from '../models';
import { ApiService } from './api.service';
import { SupabaseService } from './supabase.service';

export interface BookingFilters {
  doctorId?: string;
  patientId?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  paymentMode?: PaymentMode;
  appointmentDate?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateBookingRequest {
  patientId?: string;
  doctorId: string;
  serviceId?: string;
  serviceIds?: string[];
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  paymentMode?: PaymentMode;
  notes?: string;
}

export interface CreateWalkInRequest extends CreateBookingRequest {}

export interface SubmitProofRequest {
  proofType: ProofType;
  proofValue: string;
}

export interface RescheduleBookingRequest {
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime?: string;
  notes?: string;
}

export interface CheckInBookingRequest {
  notes?: string;
}

export interface DoctorCompleteBookingRequest {
  finalAmount?: number;
  isProfessionalFeeWaived: boolean;
  professionalFeeWaivedReason?: string;
  doctorFeeStatus?: string | null;
  generalNotes?: string | null;
  vitalSigns?: {
    systolicBp?: number | null;
    diastolicBp?: number | null;
    heartRate?: number | null;
    respiratoryRate?: number | null;
    temperature?: number | null;
    oxygenSaturation?: number | null;
    weight?: number | null;
    height?: number | null;
    bmi?: number | null;
    painScore?: number | null;
    takenAt?: string | null;
  } | null;
  soap?: {
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
  } | null;
  diagnoses?: Array<{
    diagnosisText: string;
    diagnosisCode?: string | null;
    isPrimary: boolean;
    notes?: string | null;
  }>;
  prescription?: {
    notes?: string | null;
    items: Array<{
      medicationName: string;
      strength?: string | null;
      dosage?: string | null;
      route?: string | null;
      frequency?: string | null;
      duration?: string | null;
      quantity?: string | number | null;
      instructions?: string | null;
    }>;
  } | null;
  labOrders?: Array<{
    notes?: string | null;
    items: Array<{
      testName: string;
      testCode?: string | null;
      instructions?: string | null;
    }>;
  }>;
  followUp?: {
    followUpDate?: string | null;
    instructions?: string | null;
    reason?: string | null;
  } | null;
  soapNotes?: string;
  diagnosis?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  prescriptionItems?: unknown[];
  doctorFeeNotes?: string;
  notes?: string;
}

export interface ConsultationRecordUpdateRequest {
  generalNotes?: string | null;
  soapNotes?: string | null;
  doctorFeeNotes?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  followUpDate?: string | null;
  followUpInstructions?: string | null;
  vitalSigns?: DoctorCompleteBookingRequest['vitalSigns'];
  soap?: DoctorCompleteBookingRequest['soap'];
  diagnoses?: NonNullable<DoctorCompleteBookingRequest['diagnoses']>;
  prescription?: DoctorCompleteBookingRequest['prescription'];
  labOrders?: NonNullable<DoctorCompleteBookingRequest['labOrders']>;
  followUp?: DoctorCompleteBookingRequest['followUp'];
  prescriptionItems?: DoctorCompleteBookingRequest['prescriptionItems'];
}

export interface ConsultationRecordResponse {
  bookingId: string;
  consultationId?: string | null;
  patientId: string;
  doctorId: string;
  bookingStatus: BookingStatus | string;
  generalNotes?: string | null;
  vitalSigns?: DoctorCompleteBookingRequest['vitalSigns'];
  soap?: DoctorCompleteBookingRequest['soap'];
  diagnoses: Array<{
    id?: string;
    diagnosisText: string;
    diagnosisCode?: string | null;
    isPrimary: boolean;
    notes?: string | null;
  }>;
  prescription?: {
    id?: string;
    notes?: string | null;
    items: Array<{
      id?: string;
      medicationName: string;
      strength?: string | null;
      dosage?: string | null;
      route?: string | null;
      frequency?: string | null;
      duration?: string | null;
      quantity?: string | null;
      instructions?: string | null;
    }>;
  } | null;
  labOrders: Array<{
    id?: string;
    notes?: string | null;
    items: Array<{
      id?: string;
      testName: string;
      testCode?: string | null;
      instructions?: string | null;
    }>;
  }>;
  followUp?: {
    id?: string;
    followUpDate?: string | null;
    instructions?: string | null;
    reason?: string | null;
  } | null;
}

export interface MyBookingsPageResult {
  items: Booking[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface DoctorTodaySummary {
  bookedToday: number;
  checkedIn: number;
  waiting: number;
  completed: number;
  noShow: number;
  cancelled: number;
  items: Booking[];
}

export interface StaffTodayBookingsFilters {
  doctorId?: string;
  status?: BookingStatus | string;
  page?: number;
  pageSize?: number;
}

export interface StaffBookingsFilterParams {
  doctorId?: string;
  status?: string;
  appointmentDate?: string;
  page?: number;
  pageSize?: number;
}

export interface StaffForPaymentItem {
  bookingId: string;
  paymentId: string;
  patientName: string;
  doctorName: string;
  services: string[];
  appointmentDate: string;
  slotStartTime: string;
  queueNumber: number | null;
  amountDue: number;
  doctorCompletedAt?: string;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
}

export interface ConfirmPaymentRequest {
  paymentMethod: Exclude<PaymentMethod, 'PayAtClinic'>;
  amountReceived: number;
  referenceNumber?: string;
  notes?: string;
}

const BOOKING_STATUSES: BookingStatus[] = [
  'Pending',
  'ProofSubmitted',
  'Confirmed',
  'CheckedIn',
  'InProgress',
  'OnHold',
  'Cancelled',
  'Completed',
  'Expired',
  'NoShow',
  'Rescheduled'
];

const PAYMENT_STATUSES: PaymentStatus[] = ['Unpaid', 'Paid', 'Waived', 'Refunded'];
const PAYMENT_MODES: PaymentMode[] = ['Online', 'PayAtClinic'];
const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'GCash', 'Maya', 'BankTransfer', 'PayAtClinic'];
const PROOF_TYPES: ProofType[] = ['ReferenceNumber', 'Screenshot'];

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly apiService = inject(ApiService);
  private readonly supabase = inject(SupabaseService).client;
  private readonly bookingsSubject = new BehaviorSubject<Booking[]>([]);
  private readonly loadingSubject = new BehaviorSubject(false);
  private loadingCounter = 0;

  readonly bookings$ = this.bookingsSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();

  get snapshot(): Booking[] {
    return this.bookingsSubject.value;
  }

  refresh(filters?: BookingFilters): void {
    const replaceCache = !hasBookingFilters(filters);
    void this.requestBookings(filters, replaceCache).subscribe();
  }

  getBookings(filters?: BookingFilters): Observable<Booking[]> {
    const replaceCache = !hasBookingFilters(filters);
    void this.requestBookings(filters, replaceCache).subscribe();
    return this.bookings$.pipe(map((bookings) => applyBookingFilters(bookings, filters)));
  }

  getBookingById(id: string): Booking | undefined {
    return this.snapshot.find((booking) => booking.id === id);
  }

  getBookingById$(id: string): Observable<Booking | undefined> {
    if (!id) {
      return of(undefined);
    }

    void this.requestBookingById(id).subscribe();
    return this.bookings$.pipe(map((bookings) => bookings.find((booking) => booking.id === id)));
  }

  getBookingsByStatus(status: BookingStatus): Observable<Booking[]> {
    return this.getBookings({ status });
  }

  getBookingsByDoctorId(doctorId: string): Observable<Booking[]> {
    return this.getBookings({ doctorId });
  }

  getBookingsByPatientId(patientId: string): Observable<Booking[]> {
    return this.getBookings({ patientId });
  }

  getTodaysBookings(): Observable<Booking[]> {
    return this.getBookings({ appointmentDate: toLocalIsoDate() });
  }

  getTodaysBookingsByDoctorId(doctorId: string): Observable<Booking[]> {
    return this.getBookings({ doctorId, appointmentDate: toLocalIsoDate() }).pipe(
      map((bookings) => [...bookings].sort((a, b) => (a.queueNumber ?? 0) - (b.queueNumber ?? 0)))
    );
  }

  getUpcomingBookingsByDoctorId(doctorId: string): Observable<Booking[]> {
    return this.getBookings({ doctorId }).pipe(
      map((bookings) =>
        bookings
          .filter((booking) => booking.appointmentDate >= toLocalIsoDate())
          .sort((a, b) => bookingDateTime(a) - bookingDateTime(b))
      )
    );
  }

  getUpcomingBookingsByPatientId(patientId: string): Observable<Booking[]> {
    return this.getMyBookings(1, 100).pipe(
      map(({ items }) =>
        items
          .filter(
            (booking) =>
              (!booking.patientId || booking.patientId === patientId) &&
              ['Confirmed', 'CheckedIn'].includes(booking.status) &&
              bookingDateTime(booking) >= Date.now()
          )
          .sort((a, b) => bookingDateTime(a) - bookingDateTime(b))
      ),
      catchError(() => of([]))
    );
  }

  getPendingProofBookingsByPatientId(patientId: string): Observable<Booking[]> {
    return this.getMyBookings(1, 100).pipe(
      map(({ items }) =>
        items
          .filter(
            (booking) =>
              (!booking.patientId || booking.patientId === patientId) &&
              booking.status === 'Completed' &&
              booking.paymentStatus === 'Unpaid' &&
              (booking.finalAmount ?? null) !== null &&
              (booking.finalAmount ?? 0) > 0
          )
          .sort((a, b) => bookingDateTime(a) - bookingDateTime(b))
      ),
      catchError(() => of([]))
    );
  }

  getPendingVerification(): Observable<Booking[]> {
    void this.requestBookingList('/bookings/pending-verification', undefined, false).subscribe();
    return this.bookings$.pipe(
      map((bookings) => [...bookings].filter((booking) => booking.status === 'ProofSubmitted'))
    );
  }

  getPendingVerifications(): Observable<Booking[]> {
    return this.getPendingVerification();
  }

  getDoctorTodayQueue(): Observable<Booking[]> {
    return this.getDoctorTodaySummary().pipe(
      map((summary) =>
        [...summary.items].sort(
          (a, b) => (a.queueNumber ?? Number.MAX_SAFE_INTEGER) - (b.queueNumber ?? Number.MAX_SAFE_INTEGER)
        )
      )
    );
  }

  getDoctorUpcoming(): Observable<Booking[]> {
    return this.requestBookingList('/bookings/doctor/upcoming', undefined, false).pipe(
      map((bookings) => [...bookings].sort((a, b) => bookingDateTime(a) - bookingDateTime(b)))
    );
  }

  getDoctorPatients(): Observable<DoctorPatientSummaryDto[]> {
    return this.apiService.get<DoctorPatientSummaryDto[]>('/bookings/doctor/patients').pipe(
      catchError((err) => {
        console.warn('Failed to load doctor patients:', err);
        return of([]);
      })
    );
  }

  getMyBookings(page = 1, pageSize = 20): Observable<MyBookingsPageResult> {
    return defer(() => {
      this.beginLoading();
      return from(this.fetchSupabaseMyBookingsPage(page, pageSize)).pipe(
        tap((result) => this.mergeBookings(result.items)),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to load bookings from Supabase.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  getDoctorTodaySummary(): Observable<DoctorTodaySummary> {
    return defer(() => {
      this.beginLoading();
      return from(this.fetchSupabaseDoctorTodaySummary()).pipe(
        tap((summary) => this.mergeBookings(summary.items)),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to load today summary from Supabase.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  getStaffTodayBookings(filters: StaffTodayBookingsFilters = {}): Observable<PagedResult<Booking>> {
    return defer(() => {
      this.beginLoading();
      return from(this.fetchSupabaseStaffTodayBookings(filters)).pipe(
        tap((result) => this.mergeBookings(result.items)),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to load today bookings from Supabase.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  getStaffBookings(filters: StaffBookingsFilterParams = {}): Observable<PagedResult<Booking>> {
    return defer(() => {
      this.beginLoading();
      return from(this.fetchSupabaseStaffBookings(filters)).pipe(
        tap((result) => this.mergeBookings(result.items)),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to load bookings from Supabase.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  getStaffForPayment(page = 1, pageSize = 20): Observable<PagedResult<StaffForPaymentItem>> {
    return defer(() => {
      this.beginLoading();
      return from(this.fetchSupabaseStaffForPayment(page, pageSize)).pipe(
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to load payment queue from Supabase.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  addBooking(booking: Booking): void {
    this.upsertBooking(booking);
  }

  updateBookingStatus(bookingId: string, status: BookingStatus): void {
    if (this.getBookingById(bookingId)) {
      this.patchBooking(bookingId, { status });
    }
  }

  submitProof(bookingId: string, dto: SubmitProofRequest): Observable<Booking> {
    return this.requestBookingUpdate(
      bookingId,
      this.apiService.post<unknown>(`/bookings/${encodeURIComponent(bookingId)}/proof`, dto),
      'Failed to submit proof.'
    );
  }

  submitBookingProof(bookingId: string, proofType: ProofType, proofValue: string): void {
    void this.submitProof(bookingId, { proofType, proofValue }).subscribe();
  }

  createBooking(dto: CreateBookingRequest): Observable<Booking> {
    return defer(() => {
      this.beginLoading();
      return from(this.createSupabaseBooking(dto)).pipe(
        tap((booking) => this.upsertBooking(booking)),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to create booking in Supabase.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  createWalkIn(dto: CreateWalkInRequest): Observable<Booking> {
    return defer(() => {
      this.beginLoading();
      return from(this.createSupabaseWalkInBooking(dto)).pipe(
        tap((booking) => this.upsertBooking(booking)),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to create walk-in booking in Supabase.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  checkInBooking(id: string, dto: CheckInBookingRequest = {}): Observable<Booking> {
    return this.requestBookingUpdate(
      id,
      from(this.runSupabaseBookingRpc(id, 'check_in_booking', { p_booking_id: id })),
      'Failed to check in booking.'
    );
  }

  undoCheckInBooking(id: string): Observable<Booking> {
    return this.requestBookingUpdate(
      id,
      from(this.runSupabaseBookingRpc(id, 'undo_check_in', { p_booking_id: id })),
      'Failed to undo check-in.'
    );
  }

  doctorCompleteBooking(id: string, dto: DoctorCompleteBookingRequest): Observable<Booking> {
    return this.requestBookingUpdate(
      id,
      from(this.saveSupabaseConsultationAndComplete(id, dto)),
      'Failed to complete booking.'
    );
  }

  fetchConsultationRecordByBookingId(bookingId: string): Observable<ConsultationRecordResponse> {
    return defer(() => {
      this.beginLoading();
      return from(this.fetchSupabaseConsultationRecord(bookingId)).pipe(
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to load consultation record from Supabase.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  updateConsultationRecord(
    bookingId: string,
    dto: ConsultationRecordUpdateRequest
  ): Observable<ConsultationRecordResponse> {
    return defer(() => {
      this.beginLoading();
      return from(this.saveSupabaseConsultationDraft(bookingId, dto)).pipe(
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to save consultation amendment.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  confirmBooking(bookingId: string): void {
    this.runVoidMutation(
      bookingId,
      { status: 'Confirmed' },
      from(this.runSupabaseBookingRpc(bookingId, 'confirm_booking', { p_booking_id: bookingId }))
    );
  }

  cancelBooking(bookingId: string, reason: string): void {
    this.runVoidMutation(
      bookingId,
      { status: 'Cancelled', cancellationReason: reason },
      from(
        this.supabase.rpc('cancel_booking', {
          p_booking_id: bookingId,
          p_reason: reason
        })
      ).pipe(map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data;
      }))
    );
  }

  completeBooking(bookingId: string): void {
    this.runVoidMutation(
      bookingId,
      { status: 'Completed' },
      from(this.runSupabaseBookingRpc(bookingId, 'complete_booking_basic', {
        p_booking_id: bookingId,
        p_final_amount: this.getBookingById(bookingId)?.finalAmount ?? 0,
        p_diagnosis: null,
        p_doctor_fee_notes: null,
        p_soap_notes: null,
        p_follow_up_date: null,
        p_follow_up_instructions: null
      }))
    );
  }

  markComplete(bookingId: string): void {
    this.completeBooking(bookingId);
  }

  markNoShow(bookingId: string): void {
    this.runVoidMutation(
      bookingId,
      { status: 'NoShow' },
      from(this.runSupabaseBookingRpc(bookingId, 'no_show_booking', { p_booking_id: bookingId }))
    );
  }

  rejectBooking(bookingId: string, reason: string): void {
    this.cancelBooking(bookingId, reason);
  }

  confirmPayment(paymentId: string, dto: ConfirmPaymentRequest): Observable<ReceiptData>;
  confirmPayment(bookingId: string): void;
  confirmPayment(id: string, dto?: ConfirmPaymentRequest): Observable<ReceiptData> | void {
    if (dto) {
      return defer(() => {
        this.beginLoading();
        return from(this.recordSupabasePayment(id, dto)).pipe(
          catchError((error: unknown) =>
            throwError(() => new Error(extractApiErrorMessage(error, 'Failed to confirm payment.')))
          ),
          finalize(() => this.endLoading())
        );
      });
    }

    const bookingId = id;
    const previous = this.getBookingById(bookingId);
    const amountDue = previous?.finalAmount ?? previous?.amountDue ?? previous?.totalFee ?? 0;

    if (previous) {
      this.patchBooking(bookingId, { paymentStatus: 'Paid' });
    }

    if (amountDue <= 0) {
      console.warn('Cannot confirm payment without a positive amount due.');
      if (previous) {
        this.upsertBooking(previous);
      }
      return;
    }

    this.beginLoading();
    from(
      this.recordSupabasePayment(bookingId, {
        paymentMethod: 'Cash',
        amountReceived: amountDue
      })
    )
      .pipe(
        tap(() => {
          void this.requestBookingById(bookingId, false).subscribe();
        }),
        catchError((error: unknown) => {
          if (previous) {
            this.upsertBooking(previous);
          }
          console.error('Failed to confirm payment.', error);
          return of(null);
        }),
        finalize(() => this.endLoading())
      )
      .subscribe();
  }

  waivePayment$(bookingId: string, reason: string): Observable<void> {
    const previous = this.getBookingById(bookingId);
    if (previous) {
      this.patchBooking(bookingId, { paymentStatus: 'Waived', finalAmount: 0, amountDue: 0 });
    }

    return defer(() => {
      this.beginLoading();
      return from(this.runSupabaseBookingRpc(bookingId, 'waive_professional_fee', {
        p_booking_id: bookingId,
        p_reason: reason
      })).pipe(
        tap(() => {
          void this.requestBookingById(bookingId, false).subscribe();
        }),
        map(() => void 0),
        catchError((error: unknown) => {
          if (previous) {
            this.upsertBooking(previous);
          }
          return throwError(() => new Error(extractApiErrorMessage(error, 'Failed to waive payment.')));
        }),
        finalize(() => this.endLoading())
      );
    });
  }

  getReceipt(paymentId: string): Observable<ReceiptData> {
    return defer(() => {
      this.beginLoading();
      return from(this.fetchSupabaseReceipt(paymentId)).pipe(
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to load receipt.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  waivePayment(bookingId: string, reason: string): void {
    void this.waivePayment$(bookingId, reason)
      .pipe(
        catchError((error: unknown) => {
          console.error('Failed to waive payment.', error);
          return of(void 0);
        })
      )
      .subscribe();
  }

  refundPayment(bookingId: string, reason: string): void {
    const previous = this.getBookingById(bookingId);
    if (previous) {
      this.patchBooking(bookingId, { paymentStatus: 'Refunded' });
    }

    this.beginLoading();
    from(this.runSupabaseBookingRpc(bookingId, 'refund_payment', {
      p_booking_id: bookingId,
      p_reason: reason
    }))
      .pipe(
        tap(() => {
          void this.requestBookingById(bookingId, false).subscribe();
        }),
        catchError((error: unknown) => {
          if (previous) {
            this.upsertBooking(previous);
          }
          console.error('Failed to refund payment.', error);
          return of(null);
        }),
        finalize(() => this.endLoading())
      )
      .subscribe();
  }

  rescheduleBooking(
    bookingId: string,
    dtoOrDate: RescheduleBookingRequest | string,
    newSlot?: string,
    newSlotEnd?: string
  ): void {
    const dto: RescheduleBookingRequest =
      typeof dtoOrDate === 'string'
        ? {
            appointmentDate: dtoOrDate,
            slotStartTime: newSlot ?? '',
            slotEndTime: newSlotEnd ?? newSlot
          }
        : dtoOrDate;

    const previous = this.getBookingById(bookingId);
    if (previous) {
      this.patchBooking(bookingId, {
        status: 'Rescheduled',
        appointmentDate: dto.appointmentDate,
        slotStartTime: dto.slotStartTime,
        slotEndTime: dto.slotEndTime ?? previous.slotEndTime
      });
    }

    this.beginLoading();
    this.apiService
      .patch<unknown>(`/bookings/${encodeURIComponent(bookingId)}/reschedule`, dto)
      .pipe(
        tap(() => {
          void this.requestBookingById(bookingId, false).subscribe();
        }),
        catchError((error: unknown) => {
          if (previous) {
            this.upsertBooking(previous);
          }
          console.error('Failed to reschedule booking.', error);
          return of(null);
        }),
        finalize(() => this.endLoading())
      )
      .subscribe();
  }

  getPayment(bookingId: string): Observable<Payment | undefined> {
    if (!bookingId) {
      return of(undefined);
    }

    const cached = this.getBookingById(bookingId)?.payment;
    if (cached?.id) {
      return of(cached);
    }

    return this.requestPaymentByBookingId(bookingId);
  }

  private async fetchSupabaseDoctorTodaySummary(): Promise<DoctorTodaySummary> {
    const [queue, summaryResponse] = await Promise.all([
      this.fetchSupabaseDoctorTodayQueue(),
      this.supabase.rpc('get_doctor_today_summary')
    ]);

    if (summaryResponse.error) {
      throw summaryResponse.error;
    }

    const row = Array.isArray(summaryResponse.data) && isRecord(summaryResponse.data[0])
      ? summaryResponse.data[0]
      : {};

    return {
      bookedToday: normalizeNumber(row['today_total'], queue.length),
      checkedIn: normalizeNumber(row['checked_in_count']),
      waiting:
        normalizeNumber(row['checked_in_count']) + normalizeNumber(row['in_progress_count']),
      completed: normalizeNumber(row['completed_count']),
      noShow: normalizeNumber(row['no_show_count']),
      cancelled: 0,
      items: queue
    };
  }

  private async fetchSupabaseDoctorTodayQueue(): Promise<Booking[]> {
    const { data, error } = await this.supabase
      .from('doctor_today_queue_view')
      .select('*')
      .order('queue_number', { ascending: true, nullsFirst: false })
      .order('slot_start_time', { ascending: true });

    if (error) {
      throw error;
    }

    return ((data ?? []) as Record<string, unknown>[])
      .map((row) => this.normalizeBooking(mapSupabaseBookingViewRow(row)))
      .filter((booking): booking is Booking => Boolean(booking));
  }

  private async fetchSupabaseStaffTodayBookings(
    filters: StaffTodayBookingsFilters = {}
  ): Promise<PagedResult<Booking>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.max(1, filters.pageSize ?? 20);
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    let query = this.supabase
      .from('staff_today_queue_view')
      .select('*', { count: 'exact' });

    if (filters.doctorId?.trim()) {
      query = query.eq('doctor_id', filters.doctorId.trim());
    }

    if (filters.status?.trim()) {
      query = query.eq('booking_status', filters.status.trim());
    }

    const { data, error, count } = await query
      .order('queue_number', { ascending: true, nullsFirst: false })
      .order('slot_start_time', { ascending: true })
      .range(fromIndex, toIndex);

    if (error) {
      throw error;
    }

    const items = ((data ?? []) as Record<string, unknown>[])
      .map((row) => this.normalizeBooking(mapSupabaseBookingViewRow(row)))
      .filter((booking): booking is Booking => Boolean(booking));

    return { items, totalCount: count ?? items.length, page, pageSize };
  }

  private async fetchSupabaseStaffBookings(
    filters: StaffBookingsFilterParams = {}
  ): Promise<PagedResult<Booking>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.max(1, filters.pageSize ?? 20);
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    let query = this.supabase
      .from('patient_bookings_view')
      .select('*', { count: 'exact' });

    if (filters.doctorId?.trim()) {
      query = query.eq('doctor_id', filters.doctorId.trim());
    }

    if (filters.status?.trim()) {
      query = query.eq('booking_status', filters.status.trim());
    }

    if (filters.appointmentDate?.trim()) {
      query = query.eq('appointment_date', filters.appointmentDate.trim());
    }

    const { data, error, count } = await query
      .order('appointment_date', { ascending: false })
      .order('slot_start_time', { ascending: false })
      .range(fromIndex, toIndex);

    if (error) {
      throw error;
    }

    const items = ((data ?? []) as Record<string, unknown>[])
      .map((row) => this.normalizeBooking(mapSupabaseBookingViewRow(row)))
      .filter((booking): booking is Booking => Boolean(booking));

    return { items, totalCount: count ?? items.length, page, pageSize };
  }

  private async fetchSupabaseStaffForPayment(page = 1, pageSize = 20): Promise<PagedResult<StaffForPaymentItem>> {
    const currentPage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const fromIndex = (currentPage - 1) * safePageSize;
    const toIndex = fromIndex + safePageSize - 1;

    const { data, error, count } = await this.supabase
      .from('patient_bookings_view')
      .select('*', { count: 'exact' })
      .eq('booking_status', 'Completed')
      .eq('payment_status', 'Unpaid')
      .gt('final_amount', 0)
      .order('doctor_completed_at', { ascending: true, nullsFirst: false })
      .range(fromIndex, toIndex);

    if (error) {
      throw error;
    }

    const items = ((data ?? []) as Record<string, unknown>[])
      .map((row) => this.normalizeStaffForPaymentViewRow(row))
      .filter((item): item is StaffForPaymentItem => Boolean(item));

    return {
      items,
      totalCount: count ?? items.length,
      page: currentPage,
      pageSize: safePageSize
    };
  }

  private normalizeStaffForPaymentViewRow(row: Record<string, unknown>): StaffForPaymentItem | undefined {
    const bookingId = trimOptionalString(row['booking_id']);
    if (!bookingId) {
      return undefined;
    }

    const serviceNames = Array.isArray(row['services'])
      ? (row['services'] as unknown[])
          .map((item) => (isRecord(item) ? trimOptionalString(item['service_name']) ?? trimOptionalString(item['name']) : undefined))
          .filter((value): value is string => Boolean(value))
      : [];

    return {
      bookingId,
      // The Supabase RPC uses booking_id for payment collection. Keep this field populated for existing UI code.
      paymentId: bookingId,
      patientName: trimOptionalString(row['patient_name']) ?? 'Patient',
      doctorName: trimOptionalString(row['doctor_name']) ?? 'Doctor',
      services: serviceNames,
      appointmentDate: normalizeDateOnly(row['appointment_date']),
      slotStartTime: normalizeTimeOnly(row['slot_start_time']),
      queueNumber: normalizeNullableNumber(row['queue_number']),
      amountDue: normalizeNumber(row['final_amount']),
      doctorCompletedAt: trimOptionalString(row['doctor_completed_at']),
      paymentStatus: normalizePaymentStatus(row['payment_status']) ?? 'Unpaid',
      status: normalizeBookingStatus(row['booking_status']) ?? 'Completed'
    };
  }

  private async runSupabaseBookingRpc(
    bookingId: string,
    rpcName: string,
    params: Record<string, unknown>
  ): Promise<Booking> {
    const { error } = await this.supabase.rpc(rpcName, params);
    if (error) {
      throw error;
    }

    const booking = await this.fetchSupabaseBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking update succeeded, but the updated booking could not be loaded.');
    }

    return booking;
  }

  private async saveSupabaseConsultationAndComplete(
    bookingId: string,
    dto: DoctorCompleteBookingRequest
  ): Promise<Booking> {
    const finalAmount = dto.isProfessionalFeeWaived ? 0 : dto.finalAmount ?? null;

    const { error } = await this.supabase.rpc('save_consultation_record', {
      p_booking_id: bookingId,
      p_chief_complaint: trimOptionalString(dto.diagnosis) ?? null,
      p_general_notes: trimOptionalString(dto.generalNotes ?? dto.notes ?? dto.doctorFeeNotes) ?? null,
      p_vitals: mapVitalsForSupabase(dto.vitalSigns),
      p_soap: mapSoapForSupabase(dto.soap, dto.soapNotes),
      p_diagnoses: mapDiagnosesForSupabase(dto),
      p_prescription: mapPrescriptionForSupabase(dto.prescription),
      p_lab_order: mapLabOrderForSupabase(dto.labOrders),
      p_follow_up: mapFollowUpForSupabase(dto),
      p_mark_completed: true,
      p_final_amount: finalAmount
    });

    if (error) {
      throw error;
    }

    if (dto.isProfessionalFeeWaived) {
      const waived = await this.supabase.rpc('waive_professional_fee', {
        p_booking_id: bookingId,
        p_reason: trimOptionalString(dto.professionalFeeWaivedReason) ?? 'Professional fee waived.'
      });
      if (waived.error) {
        throw waived.error;
      }
    }

    const booking = await this.fetchSupabaseBookingById(bookingId);
    if (!booking) {
      throw new Error('Consultation was saved, but the updated booking could not be loaded.');
    }

    return booking;
  }

  private async fetchSupabaseConsultationRecord(bookingId: string): Promise<ConsultationRecordResponse> {
    const { data, error } = await this.supabase
      .from('consultation_record_view')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        bookingId,
        patientId: this.getBookingById(bookingId)?.patientId ?? '',
        doctorId: this.getBookingById(bookingId)?.doctorId ?? '',
        bookingStatus: this.getBookingById(bookingId)?.status ?? 'CheckedIn',
        diagnoses: [],
        labOrders: []
      };
    }

    return mapSupabaseConsultationRecordRow(data as Record<string, unknown>);
  }

  private async saveSupabaseConsultationDraft(
    bookingId: string,
    dto: ConsultationRecordUpdateRequest
  ): Promise<ConsultationRecordResponse> {
    const { error } = await this.supabase.rpc('save_consultation_record', {
      p_booking_id: bookingId,
      p_chief_complaint: trimOptionalString(dto.diagnosis) ?? null,
      p_general_notes: trimOptionalString(dto.generalNotes ?? dto.notes ?? dto.doctorFeeNotes) ?? null,
      p_vitals: mapVitalsForSupabase(dto.vitalSigns),
      p_soap: mapSoapForSupabase(dto.soap, dto.soapNotes),
      p_diagnoses: mapDiagnosesForSupabase(dto),
      p_prescription: mapPrescriptionForSupabase(dto.prescription),
      p_lab_order: mapLabOrderForSupabase(dto.labOrders),
      p_follow_up: mapFollowUpForSupabase(dto),
      p_mark_completed: false,
      p_final_amount: null
    });

    if (error) {
      throw error;
    }

    return this.fetchSupabaseConsultationRecord(bookingId);
  }

  private async resolveBookingIdForPayment(id: string): Promise<string> {
    const cached = this.snapshot.find((booking) => booking.id === id || booking.payment?.id === id);
    if (cached) {
      return cached.id;
    }

    const byPaymentId = await this.supabase
      .from('payments')
      .select('booking_id')
      .eq('id', id)
      .maybeSingle();

    if (byPaymentId.error) {
      throw byPaymentId.error;
    }

    const bookingIdFromPayment = trimOptionalString((byPaymentId.data as Record<string, unknown> | null)?.['booking_id']);
    if (bookingIdFromPayment) {
      return bookingIdFromPayment;
    }

    return id;
  }

  private async recordSupabasePayment(id: string, dto: ConfirmPaymentRequest): Promise<ReceiptData> {
    const bookingId = await this.resolveBookingIdForPayment(id);
    const { data, error } = await this.supabase.rpc('record_payment', {
      p_booking_id: bookingId,
      p_amount: dto.amountReceived,
      p_payment_method: dto.paymentMethod,
      p_reference_number: trimOptionalString(dto.referenceNumber) ?? null,
      p_or_number: null
    });

    if (error) {
      throw error;
    }

    const booking = await this.fetchSupabaseBookingById(bookingId);
    if (booking) {
      this.upsertBooking(booking);
    }

    const row = Array.isArray(data) && isRecord(data[0]) ? data[0] : {};
    return buildReceiptFromBooking(booking, dto, row);
  }

  private async fetchSupabasePaymentByBookingId(bookingId: string): Promise<Payment | undefined> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? this.normalizePayment(mapSupabasePaymentRow(data as Record<string, unknown>)) : undefined;
  }

  private async fetchSupabaseReceipt(paymentId: string): Promise<ReceiptData> {
    const payment = await this.fetchSupabasePaymentById(paymentId);

    if (!payment) {
      return this.buildEmptyReceipt();
    }

    let booking: Booking | undefined;
    if (payment.bookingId) {
      booking = await this.fetchSupabaseBookingById(payment.bookingId);
    }

    return this.buildReceiptFromPaymentAndBooking(payment, booking);
  }

  private async fetchSupabasePaymentById(paymentId: string): Promise<Payment | undefined> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? this.normalizePayment(mapSupabasePaymentRow(data as Record<string, unknown>)) : undefined;
  }

  private buildEmptyReceipt(): ReceiptData {
    return {
      bookingId: '',
      paymentId: '',
      orNumber: '-',
      patientName: 'Patient',
      doctorName: 'Doctor',
      appointmentDate: '',
      paymentMethod: '',
    };
  }

  private buildReceiptFromPaymentAndBooking(
    payment: Payment,
    booking: Booking | undefined
  ): ReceiptData {
    const services = booking?.serviceNames?.length
      ? booking.serviceNames
      : booking?.serviceName
        ? [booking.serviceName]
        : [];

    return {
      bookingId: booking?.id ?? payment.bookingId ?? '',
      paymentId: payment.id ?? '',
      orNumber: payment.orNumber ?? '-',
      patientName: booking?.patientName ?? 'Patient',
      doctorName: booking?.doctorName ?? 'Doctor',
      services,
      appointmentDate: booking?.appointmentDate ?? '',
      slotStartTime: booking?.slotStartTime,
      doctorCompletedAt: booking?.doctorCompletedAt,
      paidAt: payment.paidAt,
      amountPaid: payment.amount,
      paymentMethod: payment.paymentMethod ?? 'Cash',
      referenceNumber: payment.referenceNumber,
      cashierName: payment.cashierName,
      verifiedByName: payment.verifiedByName,
      isWaived: payment.status === 'Waived',
      waivedReason: payment.waivedReason,
      waivedByName: payment.waivedByName,
      waivedAt: payment.waivedAt,
      totalFee: booking?.totalFee,
      consultationFee: booking?.consultationFeeSnapshot,
      serviceFee: booking?.serviceFeeSnapshot,
      queueNumber: booking?.queueNumber,
      paymentStatus: payment.status,
    };
  }

  private async createSupabaseBooking(dto: CreateBookingRequest): Promise<Booking> {
    const serviceIds = normalizeStringArray(dto.serviceIds);
    const legacyServiceId = trimOptionalString(dto.serviceId);
    const resolvedServiceIds = serviceIds.length > 0 ? serviceIds : legacyServiceId ? [legacyServiceId] : [];

    if (resolvedServiceIds.length === 0) {
      throw new Error('Please select at least one service.');
    }

    const { data, error } = await this.supabase.rpc('create_booking', {
      p_doctor_id: trimRequiredString(dto.doctorId),
      p_service_ids: resolvedServiceIds,
      p_appointment_date: trimRequiredString(dto.appointmentDate),
      p_slot_start_time: normalizeTimeForSupabase(dto.slotStartTime),
      p_slot_end_time: normalizeTimeForSupabase(dto.slotEndTime),
      p_patient_id: trimOptionalString(dto.patientId) ?? null,
      p_notes: trimOptionalString(dto.notes) ?? null
    });

    if (error) {
      throw error;
    }

    const createdRow = Array.isArray(data) && data.length > 0 && isRecord(data[0]) ? data[0] : undefined;
    const bookingId = trimOptionalString(createdRow?.['booking_id']);

    if (!bookingId) {
      throw new Error('Supabase create_booking did not return a booking id.');
    }

    const fetched = await this.fetchSupabaseBookingById(bookingId);
    if (fetched) {
      return fetched;
    }

    const fallback = this.normalizeBooking({
      bookingId,
      doctorId: dto.doctorId,
      serviceId: resolvedServiceIds[0],
      serviceIds: resolvedServiceIds,
      appointmentDate: dto.appointmentDate,
      slotStartTime: normalizeTimeForSupabase(dto.slotStartTime),
      slotEndTime: normalizeTimeForSupabase(dto.slotEndTime),
      status: trimOptionalString(createdRow?.['status']) ?? 'Confirmed',
      paymentStatus: trimOptionalString(createdRow?.['payment_status']) ?? 'Unpaid',
      paymentMode: 'PayAtClinic',
      queueNumber: normalizeNullableNumber(createdRow?.['queue_number']),
      totalFee: 0,
      consultationFeeSnapshot: 0,
      serviceFeeSnapshot: 0,
      isWalkIn: false,
      createdAt: new Date().toISOString(),
      notes: dto.notes
    });

    if (!fallback) {
      throw new Error('Unable to normalize created booking.');
    }

    return fallback;
  }

  private async createSupabaseWalkInBooking(dto: CreateWalkInRequest): Promise<Booking> {
    const booking = await this.createSupabaseBooking(dto);

    // Update walk-in specific fields
    const { error } = await this.supabase
      .from('bookings')
      .update({
        payment_mode: dto.paymentMode ?? 'PayAtClinic',
        is_walk_in: true,
      })
      .eq('id', booking.id);

    if (error) {
      console.error('Failed to mark booking as walk-in:', error);
      // Non-fatal: booking was created, just walk-in flag may be missing
    }

    const refreshed = await this.fetchSupabaseBookingById(booking.id);
    return refreshed ?? { ...booking, isWalkIn: true, paymentMode: dto.paymentMode ?? 'PayAtClinic' };
  }

  private async fetchSupabaseMyBookingsPage(page = 1, pageSize = 20): Promise<MyBookingsPageResult> {
    const currentPage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const fromIndex = (currentPage - 1) * safePageSize;
    const toIndex = fromIndex + safePageSize - 1;

    const { data, error, count } = await this.supabase
      .from('patient_bookings_view')
      .select('*', { count: 'exact' })
      .order('appointment_date', { ascending: false })
      .order('slot_start_time', { ascending: false })
      .range(fromIndex, toIndex);

    if (error) {
      throw error;
    }

    const items = ((data ?? []) as Record<string, unknown>[])
      .map((row) => this.normalizeBooking(mapSupabaseBookingViewRow(row)))
      .filter((booking): booking is Booking => Boolean(booking));

    return {
      items,
      totalCount: count ?? items.length,
      page: currentPage,
      pageSize: safePageSize
    };
  }

  private async fetchSupabaseBookingById(id: string): Promise<Booking | undefined> {
    const { data, error } = await this.supabase
      .from('patient_bookings_view')
      .select('*')
      .eq('booking_id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? this.normalizeBooking(mapSupabaseBookingViewRow(data as Record<string, unknown>)) : undefined;
  }

  private requestBookings(filters?: BookingFilters, replaceCache = false): Observable<Booking[]> {
    return defer(() => {
      this.beginLoading();
      return from(this.fetchSupabaseBookings(filters)).pipe(
        tap((bookings) => {
          if (replaceCache) {
            this.replaceBookings(bookings);
          } else {
            this.mergeBookings(bookings);
          }
        }),
        catchError((error: unknown) => {
          console.error('Failed to load bookings.', error);
          return of([]);
        }),
        finalize(() => this.endLoading())
      );
    });
  }

  private async fetchSupabaseBookings(filters?: BookingFilters): Promise<Booking[]> {
    let query = this.supabase
      .from('patient_bookings_view')
      .select('*')
      .order('appointment_date', { ascending: false })
      .order('slot_start_time', { ascending: false })
      .limit(500);

    if (filters?.doctorId) {
      query = query.eq('doctor_id', filters.doctorId);
    }
    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }
    if (filters?.appointmentDate) {
      query = query.eq('appointment_date', filters.appointmentDate);
    }
    if (filters?.status) {
      query = query.eq('booking_status', filters.status);
    }
    if (filters?.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus);
    }
    if (filters?.paymentMode) {
      query = query.eq('payment_mode', filters.paymentMode);
    }
    if (filters?.search) {
      query = query.or(`patient_name.ilike.%${filters.search}%,doctor_name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return ((data ?? []) as Record<string, unknown>[])
      .map((row) => this.normalizeBooking(row))
      .filter((b): b is Booking => Boolean(b));
  }

  private requestBookingById(id: string, trackLoading = true): Observable<Booking | undefined> {
    if (!id) {
      return of(undefined);
    }

    return defer(() => {
      if (trackLoading) {
        this.beginLoading();
      }

      return from(this.fetchSupabaseBookingById(id)).pipe(
        tap((booking) => {
          if (booking) {
            this.upsertBooking(booking);
          }
        }),
        catchError((error: unknown) => {
          console.error(`Failed to load booking ${id} from Supabase.`, error);
          return of(undefined);
        }),
        finalize(() => {
          if (trackLoading) {
            this.endLoading();
          }
        })
      );
    });
  }

  private requestBookingList(
    url: string,
    params?: HttpParams,
    replaceCache = false
  ): Observable<Booking[]> {
    return defer(() => {
      this.beginLoading();
      return this.apiService.get<unknown>(url, params ? { params } : undefined).pipe(
        map((payload) => this.normalizeBookingList(payload)),
        tap((bookings) => {
          if (replaceCache) {
            this.replaceBookings(bookings);
          } else {
            this.mergeBookings(bookings);
          }
        }),
        catchError((error: unknown) => {
          console.error(`Failed to load bookings from ${url}.`, error);
          return of([]);
        }),
        finalize(() => this.endLoading())
      );
    });
  }

  private requestMyBookingsPage(url: string, params?: HttpParams): Observable<MyBookingsPageResult> {
    return defer(() => {
      this.beginLoading();
      return this.apiService.get<unknown>(url, params ? { params } : undefined).pipe(
        map((payload) => this.normalizePagedBookings(payload)),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to load bookings.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  private requestPaymentByBookingId(bookingId: string): Observable<Payment | undefined> {
    return defer(() => {
      this.beginLoading();
      return from(this.fetchSupabasePaymentByBookingId(bookingId)).pipe(
        catchError((error: unknown) => {
          console.error(`Failed to load payment for booking ${bookingId} from Supabase.`, error);
          return of(undefined);
        }),
        finalize(() => this.endLoading())
      );
    });
  }

  private createBookingLike(
    url: string,
    dto: CreateBookingRequest,
    isWalkIn: boolean
  ): Observable<Booking> {
    const payload = this.normalizeCreateBookingRequest(dto, isWalkIn);

    return defer(() => {
      this.beginLoading();
      return this.apiService.post<unknown>(url, payload).pipe(
        map((response) => {
          const booking = this.normalizeBooking(response, {
            doctorId: dto.doctorId,
            serviceId: dto.serviceIds?.[0] ?? trimOptionalString(dto.serviceId) ?? '',
            serviceIds: normalizeStringArray(dto.serviceIds).length > 0
              ? normalizeStringArray(dto.serviceIds)
              : trimOptionalString(dto.serviceId)
                ? [trimOptionalString(dto.serviceId)!]
                : [],
            appointmentDate: dto.appointmentDate,
            slotStartTime: dto.slotStartTime,
            slotEndTime: dto.slotEndTime,
            paymentMode: dto.paymentMode ?? 'PayAtClinic',
            isWalkIn,
            status: 'Confirmed',
            paymentStatus: 'Unpaid'
          });

          if (!booking) {
            throw new Error('Booking response did not include a valid booking record.');
          }

          return booking;
        }),
        tap((booking) => {
          this.upsertBooking(booking);
        }),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'Failed to create booking.')))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  private requestBookingUpdate(
    bookingId: string,
    request$: Observable<unknown>,
    fallbackMessage: string
  ): Observable<Booking> {
    const fallbackBooking = this.getBookingById(bookingId) ?? ({ id: bookingId } as Partial<Booking>);

    return defer(() => {
      this.beginLoading();
      return request$.pipe(
        map((response) => {
          const booking = this.normalizeBooking(response, fallbackBooking);
          if (!booking) {
            throw new Error('Booking response did not include a valid booking record.');
          }
          return booking;
        }),
        tap((booking) => {
          this.upsertBooking(booking);
        }),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, fallbackMessage)))
        ),
        finalize(() => this.endLoading())
      );
    });
  }

  private runVoidMutation(bookingId: string, optimisticPatch: Partial<Booking>, request$: Observable<unknown>): void {
    const previous = this.getBookingById(bookingId);
    if (previous) {
      this.patchBooking(bookingId, optimisticPatch);
    }

    this.beginLoading();
    request$
      .pipe(
        tap(() => {
          void this.requestBookingById(bookingId, false).subscribe();
        }),
        catchError((error: unknown) => {
          if (previous) {
            this.upsertBooking(previous);
          }
          console.error('Booking update failed.', error);
          return of(null);
        }),
        finalize(() => this.endLoading())
      )
      .subscribe();
  }

  private normalizeCreateBookingRequest(dto: CreateBookingRequest, isWalkIn: boolean): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      doctorId: trimRequiredString(dto.doctorId),
      appointmentDate: trimRequiredString(dto.appointmentDate),
      slotStartTime: trimRequiredString(dto.slotStartTime),
      slotEndTime: trimRequiredString(dto.slotEndTime)
    };

    const serviceIds = normalizeStringArray(dto.serviceIds);
    const legacyServiceId = trimOptionalString(dto.serviceId);
    const resolvedServiceId = serviceIds[0] ?? legacyServiceId;

    if (isWalkIn) {
      if (resolvedServiceId) {
        payload['serviceId'] = resolvedServiceId;
      }
    } else if (serviceIds.length > 0) {
      payload['serviceIds'] = serviceIds;
    } else if (legacyServiceId) {
      payload['serviceIds'] = [legacyServiceId];
    }

    const notes = trimOptionalString(dto.notes);
    if (notes) {
      payload['notes'] = notes;
    }

    if (isWalkIn) {
      const patientId = trimOptionalString(dto.patientId);
      if (patientId) {
        payload['patientId'] = patientId;
      }

      const paymentMode = normalizePaymentMode(dto.paymentMode);
      if (paymentMode) {
        payload['paymentMode'] = paymentMode;
      }

      payload['isWalkIn'] = true;
    }

    return payload;
  }

  private normalizeDoctorTodaySummary(payload: unknown): DoctorTodaySummary {
    const source = isRecord(payload) ? payload : {};
    const items = extractArray(source['items'])
      .map((record) => this.normalizeBooking(record))
      .filter((booking): booking is Booking => Boolean(booking));

    return {
      bookedToday: normalizeNumber(source['bookedToday']),
      checkedIn: normalizeNumber(source['checkedIn']),
      waiting: normalizeNumber(source['waiting']),
      completed: normalizeNumber(source['completed']),
      noShow: normalizeNumber(source['noShow']),
      cancelled: normalizeNumber(source['cancelled']),
      items
    };
  }

  private normalizePagedBookings(payload: unknown): MyBookingsPageResult {
    return normalizePagedResult(payload, (item) => this.normalizeBooking(item));
  }

  private normalizeStaffForPaymentPage(payload: unknown): PagedResult<StaffForPaymentItem> {
    return normalizePagedResult(payload, (item) => this.normalizeStaffForPaymentItem(item));
  }

  private normalizeStaffForPaymentItem(payload: unknown): StaffForPaymentItem | undefined {
    if (!isRecord(payload)) {
      return undefined;
    }

    const paymentId =
      trimOptionalString(payload['paymentId']) ??
      trimOptionalString(extractNestedRecord(payload, ['payment'])?.['id']);
    const bookingId = trimOptionalString(payload['bookingId']) ?? trimOptionalString(payload['id']);
    if (!bookingId || !paymentId) {
      return undefined;
    }

    return {
      bookingId,
      paymentId,
      patientName: trimOptionalString(payload['patientName']) ?? 'Patient',
      doctorName: trimOptionalString(payload['doctorName']) ?? 'Doctor',
      services: normalizeStringArray(payload['services']),
      appointmentDate: trimOptionalString(payload['appointmentDate']) ?? '',
      slotStartTime: trimOptionalString(payload['slotStartTime']) ?? '',
      queueNumber: normalizeNullableNumber(payload['queueNumber']),
      amountDue: normalizeNumber(payload['amountDue']),
      doctorCompletedAt: trimOptionalString(payload['doctorCompletedAt']),
      paymentStatus: normalizePaymentStatus(payload['paymentStatus']) ?? 'Unpaid',
      status: normalizeBookingStatus(payload['status']) ?? 'Completed'
    };
  }

  private normalizeBooking(payload: unknown, fallback?: Partial<Booking>): Booking | undefined {
    const record = extractBookingRecord(payload);
    if (!record) {
      return undefined;
    }

    const source = record as Record<string, unknown>;
    const fallbackRecord = fallback ?? {};

    const id =
      trimOptionalString(source['id']) ??
      trimOptionalString(source['bookingId']) ??
      trimOptionalString(fallbackRecord.id);
    if (!id) {
      return undefined;
    }

    const services = normalizeBookingServices(source['services']);
    const patient = this.normalizeBookingPatient(source['patient']) ?? fallbackRecord.patient;
    const doctor = this.normalizeBookingDoctor(source['doctor']) ?? fallbackRecord.doctor;
    const catalogService = this.normalizeBookingCatalogService(source['service']) ?? fallbackRecord.service;
    const serviceNamesFromSource = normalizeStringArray(source['serviceNames']);
    const serviceIdsFromSource = normalizeStringArray(source['serviceIds']);
    const firstService = services[0];
    const serviceId =
      trimOptionalString(source['serviceId']) ??
      serviceIdsFromSource[0] ??
      catalogService?.id ??
      firstService?.id ??
      trimOptionalString(fallbackRecord.serviceId) ??
      '';
    const serviceName =
      trimOptionalString(source['serviceName']) ??
      serviceNamesFromSource[0] ??
      trimOptionalString(catalogService?.name) ??
      firstService?.name ??
      trimOptionalString(fallbackRecord.serviceName);
    const serviceIds =
      serviceIdsFromSource.length > 0
          ? serviceIdsFromSource
        : [
            ...services.map((service) => service.id).filter((value) => value.length > 0),
            ...(catalogService?.id ? [catalogService.id] : [])
          ].filter((value, index, values) => values.indexOf(value) === index);
    const serviceNames =
      serviceNamesFromSource.length > 0
        ? serviceNamesFromSource
        : [
            ...services
              .map((service) => service.name)
              .filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
            ...(catalogService?.name ? [catalogService.name] : []),
            ...(serviceName ? [serviceName] : [])
          ].filter((value, index, values) => values.indexOf(value) === index);

    const appointmentDate =
      trimOptionalString(source['appointmentDate']) ?? trimOptionalString(fallbackRecord.appointmentDate) ?? '';
    const slotStartTime =
      trimOptionalString(source['slotStartTime']) ?? trimOptionalString(fallbackRecord.slotStartTime) ?? '';
    const slotEndTime =
      trimOptionalString(source['slotEndTime']) ??
      trimOptionalString(fallbackRecord.slotEndTime) ??
      slotStartTime;
    const payment = this.normalizePayment(source['payment']);
    const finalAmount =
      normalizeNullableNumberPreserveUndefined(source['finalAmount']) ??
      normalizeNullableNumberPreserveUndefined(fallbackRecord.finalAmount);
    const amountDue =
      normalizeNullableNumberPreserveUndefined(source['amountDue']) ??
      finalAmount ??
      normalizeNullableNumberPreserveUndefined(fallbackRecord.amountDue);

    return {
      id,
      patientId: trimOptionalString(source['patientId']) ?? trimOptionalString(fallbackRecord.patientId) ?? '',
      patientName:
        trimOptionalString(source['patientName']) ??
        trimOptionalString(patient?.fullName) ??
        composePersonName(patient) ??
        trimOptionalString(fallbackRecord.patientName),
      doctorId: trimOptionalString(source['doctorId']) ?? trimOptionalString(fallbackRecord.doctorId) ?? '',
      doctorName:
        trimOptionalString(source['doctorName']) ??
        trimOptionalString(doctor?.fullName) ??
        trimOptionalString(fallbackRecord.doctorName),
      serviceId,
      serviceIds:
        serviceIds.length > 0
          ? serviceIds
          : fallbackRecord.serviceIds?.length
            ? fallbackRecord.serviceIds
            : serviceId
              ? [serviceId]
              : [],
      serviceName,
      serviceNames,
      services: services.length > 0 ? services : fallbackRecord.services,
      appointmentDate,
      slotStartTime,
      slotEndTime,
      status: normalizeBookingStatus(source['status']) ?? fallbackRecord.status ?? 'Pending',
      paymentStatus:
        normalizePaymentStatus(source['paymentStatus']) ??
        payment?.status ??
        fallbackRecord.paymentStatus ??
        'Unpaid',
      paymentMode: normalizePaymentMode(source['paymentMode']) ?? fallbackRecord.paymentMode ?? 'PayAtClinic',
      queueNumber: normalizeNullableNumber(source['queueNumber']) ?? fallbackRecord.queueNumber ?? null,
      totalFee: normalizeNumber(source['totalFee'], fallbackRecord.totalFee ?? 0),
      finalAmount,
      amountDue,
      consultationFeeSnapshot: normalizeNumber(
        source['consultationFeeSnapshot'],
        fallbackRecord.consultationFeeSnapshot ?? 0
      ),
      serviceFeeSnapshot: normalizeNumber(source['serviceFeeSnapshot'], fallbackRecord.serviceFeeSnapshot ?? 0),
      isWalkIn: normalizeBoolean(source['isWalkIn'], fallbackRecord.isWalkIn ?? false),
      proofType: normalizeProofType(source['proofType']) ?? fallbackRecord.proofType,
      proofValue: trimOptionalString(source['proofValue']) ?? fallbackRecord.proofValue,
      proofSubmittedAt: trimOptionalString(source['proofSubmittedAt']) ?? fallbackRecord.proofSubmittedAt,
      cancellationReason: trimOptionalString(source['cancellationReason']) ?? fallbackRecord.cancellationReason,
      notes: trimOptionalString(source['notes']) ?? fallbackRecord.notes,
      rescheduledFromBookingId:
        trimOptionalString(source['rescheduledFromBookingId']) ?? fallbackRecord.rescheduledFromBookingId,
      receiptUrl: trimOptionalString(source['receiptUrl']) ?? fallbackRecord.receiptUrl,
      createdAt:
        trimOptionalString(source['createdAt']) ??
        trimOptionalString(fallbackRecord.createdAt) ??
        new Date().toISOString(),
      orNumber: trimOptionalString(source['orNumber']) ?? payment?.orNumber ?? fallbackRecord.orNumber,
      checkedInAt: trimOptionalString(source['checkedInAt']) ?? fallbackRecord.checkedInAt,
      doctorCompletedAt: trimOptionalString(source['doctorCompletedAt']) ?? fallbackRecord.doctorCompletedAt,
      isProfessionalFeeWaived:
        normalizeBooleanOrUndefined(source['isProfessionalFeeWaived']) ??
        fallbackRecord.isProfessionalFeeWaived,
      professionalFeeWaivedReason:
        trimOptionalString(source['professionalFeeWaivedReason']) ?? fallbackRecord.professionalFeeWaivedReason,
      patient,
      doctor,
      service: catalogService,
      payment: payment ?? fallbackRecord.payment
    };
  }

  private normalizeBookingPatient(payload: unknown): Booking['patient'] | undefined {
    if (!isRecord(payload)) {
      return undefined;
    }

    const id = trimOptionalString(payload['id']);
    if (!id) {
      return undefined;
    }

    return {
      id,
      patientCode: trimOptionalString(payload['patientCode']),
      firstName: trimOptionalString(payload['firstName']),
      middleName: trimOptionalString(payload['middleName']),
      lastName: trimOptionalString(payload['lastName']),
      fullName: trimOptionalString(payload['fullName']),
      dateOfBirth: trimOptionalString(payload['dateOfBirth']),
      sex: trimOptionalString(payload['sex']),
      contactNumber: trimOptionalString(payload['contactNumber']),
      email: trimOptionalString(payload['email']),
      isGuest: normalizeBooleanOrUndefined(payload['isGuest'])
    };
  }

  private normalizeBookingDoctor(payload: unknown): Booking['doctor'] | undefined {
    if (!isRecord(payload)) {
      return undefined;
    }

    const id = trimOptionalString(payload['id']);
    if (!id) {
      return undefined;
    }

    return {
      id,
      userId: trimOptionalString(payload['userId']),
      fullName: trimOptionalString(payload['fullName']),
      specialization: trimOptionalString(payload['specialization']),
      consultationFee: normalizeNullableNumberPreserveUndefined(payload['consultationFee']) ?? undefined,
      status: trimOptionalString(payload['status']),
      profilePhotoUrl: trimOptionalString(payload['profilePhotoUrl'])
    };
  }

  private normalizeBookingCatalogService(payload: unknown): Booking['service'] | undefined {
    if (!isRecord(payload)) {
      return undefined;
    }

    const id = trimOptionalString(payload['id']);
    if (!id) {
      return undefined;
    }

    return {
      id,
      name: trimOptionalString(payload['name']),
      description: trimOptionalString(payload['description']),
      category: trimOptionalString(payload['category']),
      price: normalizeNullableNumberPreserveUndefined(payload['price']) ?? undefined,
      estimatedDurationMinutes:
        normalizeNullableNumberPreserveUndefined(payload['estimatedDurationMinutes']) ?? undefined,
      isActive: normalizeBooleanOrUndefined(payload['isActive'])
    };
  }

  private normalizeBookingList(payload: unknown): Booking[] {
    const records = extractBookingArray(payload);
    return records
      .map((record) => this.normalizeBooking(record))
      .filter((booking): booking is Booking => Boolean(booking));
  }

  private normalizePayment(payload: unknown): Payment | undefined {
    const record = extractPaymentRecord(payload);
    if (!record) {
      return undefined;
    }

    const source = record as Record<string, unknown>;
    const id = trimOptionalString(source['id']);
    const bookingId = trimOptionalString(source['bookingId']);
    if (!id || !bookingId) {
      return undefined;
    }

    return {
      id,
      bookingId,
      amount: normalizeNumber(source['amount']),
      paymentMethod: normalizePaymentMethod(source['paymentMethod']) ?? 'PayAtClinic',
      referenceNumber: trimOptionalString(source['referenceNumber']),
      proofImageUrl: trimOptionalString(source['proofImageUrl']),
      status: normalizePaymentStatus(source['status']) ?? 'Unpaid',
      orNumber: trimOptionalString(source['orNumber']),
      verifiedByUserId: trimOptionalString(source['verifiedByUserId']),
      verifiedAt: trimOptionalString(source['verifiedAt']),
      verifiedByName: trimOptionalString(source['verifiedByName']),
      cashierName: trimOptionalString(source['cashierName']),
      paidAt: trimOptionalString(source['paidAt']),
      waivedByUserId: trimOptionalString(source['waivedByUserId']),
      waivedAt: trimOptionalString(source['waivedAt']),
      waivedByName: trimOptionalString(source['waivedByName']),
      waivedReason: trimOptionalString(source['waivedReason']),
      refundedByUserId: trimOptionalString(source['refundedByUserId']),
      refundedAt: trimOptionalString(source['refundedAt']),
      refundReason: trimOptionalString(source['refundReason'])
    };
  }

  private normalizeReceipt(payload: unknown): ReceiptData {
    const source = extractReceiptRecord(payload);
    if (!source) {
      throw new Error('Receipt response did not include a valid receipt.');
    }

    const services = normalizeStringArray(source['services']);
    const legacyServiceName = trimOptionalString(source['serviceName']);

    return {
      bookingId: trimOptionalString(source['bookingId']) ?? '',
      paymentId: trimOptionalString(source['paymentId']) ?? '',
      orNumber: trimOptionalString(source['orNumber']) ?? '-',
      patientName: trimOptionalString(source['patientName']) ?? 'Patient',
      doctorName: trimOptionalString(source['doctorName']) ?? 'Doctor',
      services: services.length > 0 ? services : legacyServiceName ? [legacyServiceName] : [],
      appointmentDate: trimOptionalString(source['appointmentDate']) ?? '',
      slotStartTime: trimOptionalString(source['slotStartTime']) ?? trimOptionalString(source['slotTime']) ?? '',
      doctorCompletedAt: trimOptionalString(source['doctorCompletedAt']),
      paidAt: trimOptionalString(source['paidAt']),
      amountPaid: normalizeNumber(source['amountPaid']),
      paymentMethod: trimOptionalString(source['paymentMethod']) ?? 'Cash',
      referenceNumber: trimOptionalString(source['referenceNumber']),
      cashierName: trimOptionalString(source['cashierName']),
      verifiedByName: trimOptionalString(source['verifiedByName']),
      clinicName: trimOptionalString(source['clinicName']),
      clinicAddress: trimOptionalString(source['clinicAddress']),
      isWaived: normalizeBoolean(source['isWaived'], false),
      waivedReason: trimOptionalString(source['waivedReason']),
      waivedByName: trimOptionalString(source['waivedByName']),
      waivedAt: trimOptionalString(source['waivedAt']),
      serviceName: legacyServiceName,
      slotTime: trimOptionalString(source['slotTime']) ?? trimOptionalString(source['slotStartTime'])
    };
  }

  private normalizeConsultationRecord(payload: unknown): ConsultationRecordResponse {
    const source = isRecord(payload) ? payload : {};
    const diagnoses = extractArray(source['diagnoses'])
      .map((item) => this.normalizeConsultationDiagnosis(item))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const labOrders = extractArray(source['labOrders'])
      .map((item) => this.normalizeConsultationLabOrder(item))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return {
      bookingId: trimOptionalString(source['bookingId']) ?? '',
      consultationId: trimOptionalString(source['consultationId']),
      patientId: trimOptionalString(source['patientId']) ?? '',
      doctorId: trimOptionalString(source['doctorId']) ?? '',
      bookingStatus: normalizeBookingStatus(source['bookingStatus']) ?? trimOptionalString(source['bookingStatus']) ?? 'Completed',
      generalNotes: trimOptionalString(source['generalNotes']),
      vitalSigns: this.normalizeConsultationVitalSigns(source['vitalSigns']),
      soap: this.normalizeConsultationSoap(source['soap']),
      diagnoses,
      prescription: this.normalizeConsultationPrescription(source['prescription']),
      labOrders,
      followUp: this.normalizeConsultationFollowUp(source['followUp'])
    };
  }

  private normalizeConsultationVitalSigns(payload: unknown): ConsultationRecordResponse['vitalSigns'] {
    if (!isRecord(payload)) {
      return null;
    }

    return {
      systolicBp: normalizeNullableNumber(payload['systolicBp']),
      diastolicBp: normalizeNullableNumber(payload['diastolicBp']),
      heartRate: normalizeNullableNumber(payload['heartRate']),
      respiratoryRate: normalizeNullableNumber(payload['respiratoryRate']),
      temperature: normalizeNullableNumber(payload['temperature']),
      oxygenSaturation: normalizeNullableNumber(payload['oxygenSaturation']),
      weight: normalizeNullableNumber(payload['weight']),
      height: normalizeNullableNumber(payload['height']),
      bmi: normalizeNullableNumber(payload['bmi']),
      painScore: normalizeNullableNumber(payload['painScore']),
      takenAt: trimOptionalString(payload['takenAt'])
    };
  }

  private normalizeConsultationSoap(payload: unknown): ConsultationRecordResponse['soap'] {
    if (!isRecord(payload)) {
      return null;
    }

    const subjective = trimOptionalString(payload['subjective']);
    const objective = trimOptionalString(payload['objective']);
    const assessment = trimOptionalString(payload['assessment']);
    const plan = trimOptionalString(payload['plan']);

    if (!subjective && !objective && !assessment && !plan) {
      return null;
    }

    return {
      subjective,
      objective,
      assessment,
      plan
    };
  }

  private normalizeConsultationDiagnosis(payload: unknown): ConsultationRecordResponse['diagnoses'][number] | undefined {
    if (!isRecord(payload)) {
      return undefined;
    }

    const diagnosisText = trimOptionalString(payload['diagnosisText']);
    if (!diagnosisText) {
      return undefined;
    }

    return {
      id: trimOptionalString(payload['id']),
      diagnosisText,
      diagnosisCode: trimOptionalString(payload['diagnosisCode']),
      isPrimary: normalizeBoolean(payload['isPrimary'], false),
      notes: trimOptionalString(payload['notes'])
    };
  }

  private normalizeConsultationPrescription(payload: unknown): ConsultationRecordResponse['prescription'] {
    if (!isRecord(payload)) {
      return null;
    }

    const items = extractArray(payload['items'])
      .map((item) => this.normalizeConsultationPrescriptionItem(item))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (items.length === 0 && !trimOptionalString(payload['notes'])) {
      return null;
    }

    return {
      id: trimOptionalString(payload['id']),
      notes: trimOptionalString(payload['notes']),
      items
    };
  }

  private normalizeConsultationPrescriptionItem(
    payload: unknown
  ): ConsultationRecordResponse['prescription'] extends infer T
    ? T extends { items: Array<infer U> }
      ? U
      : never
    : never {
    if (!isRecord(payload)) {
      return undefined as never;
    }

    const medicationName = trimOptionalString(payload['medicationName']);
    if (!medicationName) {
      return undefined as never;
    }

    return {
      id: trimOptionalString(payload['id']),
      medicationName,
      strength: trimOptionalString(payload['strength']),
      dosage: trimOptionalString(payload['dosage']),
      route: trimOptionalString(payload['route']),
      frequency: trimOptionalString(payload['frequency']),
      duration: trimOptionalString(payload['duration']),
      quantity: trimOptionalString(payload['quantity']),
      instructions: trimOptionalString(payload['instructions'])
    } as never;
  }

  private normalizeConsultationLabOrder(payload: unknown): ConsultationRecordResponse['labOrders'][number] | undefined {
    if (!isRecord(payload)) {
      return undefined;
    }

    const items = extractArray(payload['items'])
      .map((item) => this.normalizeConsultationLabOrderItem(item))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const notes = trimOptionalString(payload['notes']);

    if (items.length === 0 && !notes) {
      return undefined;
    }

    return {
      id: trimOptionalString(payload['id']),
      notes,
      items
    };
  }

  private normalizeConsultationLabOrderItem(
    payload: unknown
  ): ConsultationRecordResponse['labOrders'][number] extends infer T
    ? T extends { items: Array<infer U> }
      ? U
      : never
    : never {
    if (!isRecord(payload)) {
      return undefined as never;
    }

    const testName = trimOptionalString(payload['testName']);
    if (!testName) {
      return undefined as never;
    }

    return {
      id: trimOptionalString(payload['id']),
      testName,
      testCode: trimOptionalString(payload['testCode']),
      instructions: trimOptionalString(payload['instructions'])
    } as never;
  }

  private normalizeConsultationFollowUp(payload: unknown): ConsultationRecordResponse['followUp'] {
    if (!isRecord(payload)) {
      return null;
    }

    const followUpDate = trimOptionalString(payload['followUpDate']);
    const instructions = trimOptionalString(payload['instructions']);
    const reason = trimOptionalString(payload['reason']);

    if (!followUpDate && !instructions && !reason) {
      return null;
    }

    return {
      id: trimOptionalString(payload['id']),
      followUpDate,
      instructions,
      reason
    };
  }

  private replaceBookings(bookings: Booking[]): void {
    this.bookingsSubject.next(bookings.map((booking) => ({ ...booking })));
  }

  private mergeBookings(bookings: Booking[]): void {
    bookings.forEach((booking) => this.upsertBooking(booking));
  }

  private patchBooking(bookingId: string, changes: Partial<Booking>): void {
    const current = this.getBookingById(bookingId);
    if (!current) {
      return;
    }

    this.upsertBooking({ ...current, ...changes });
  }

  private upsertBooking(booking: Booking): void {
    const current = this.bookingsSubject.value;
    const exists = current.some((item) => item.id === booking.id);
    const next = exists
      ? current.map((item) => (item.id === booking.id ? { ...item, ...booking } : item))
      : [...current, { ...booking }];

    this.bookingsSubject.next(next);
  }

  private beginLoading(): void {
    this.loadingCounter += 1;
    this.loadingSubject.next(true);
  }

  private endLoading(): void {
    this.loadingCounter = Math.max(0, this.loadingCounter - 1);
    this.loadingSubject.next(this.loadingCounter > 0);
  }
}

function hasBookingFilters(filters?: BookingFilters): boolean {
  if (!filters) {
    return false;
  }

  return Object.values(filters).some((value) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return typeof value === 'number' && Number.isFinite(value);
  });
}


function mapVitalsForSupabase(vitals: DoctorCompleteBookingRequest['vitalSigns']): Record<string, unknown> | null {
  if (!vitals) {
    return null;
  }

  return {
    systolic_bp: vitals.systolicBp ?? null,
    diastolic_bp: vitals.diastolicBp ?? null,
    heart_rate: vitals.heartRate ?? null,
    respiratory_rate: vitals.respiratoryRate ?? null,
    temperature_c: vitals.temperature ?? null,
    oxygen_saturation: vitals.oxygenSaturation ?? null,
    weight_kg: vitals.weight ?? null,
    height_cm: vitals.height ?? null,
    bmi: vitals.bmi ?? null,
    pain_score: vitals.painScore ?? null,
    notes: null
  };
}

function mapSoapForSupabase(
  soap: DoctorCompleteBookingRequest['soap'] | ConsultationRecordUpdateRequest['soap'],
  legacySoapNotes?: string | null
): Record<string, unknown> | null {
  if (soap) {
    return {
      subjective: soap.subjective ?? null,
      objective: soap.objective ?? null,
      assessment: soap.assessment ?? null,
      plan: soap.plan ?? null
    };
  }

  const notes = trimOptionalString(legacySoapNotes);
  if (!notes) {
    return null;
  }

  return {
    subjective: notes,
    objective: null,
    assessment: null,
    plan: null
  };
}

function mapDiagnosesForSupabase(
  dto: DoctorCompleteBookingRequest | ConsultationRecordUpdateRequest
): Array<Record<string, unknown>> {
  if (Array.isArray(dto.diagnoses) && dto.diagnoses.length > 0) {
    return dto.diagnoses
      .filter((item) => trimOptionalString(item.diagnosisText))
      .map((item) => ({
        diagnosis_text: trimOptionalString(item.diagnosisText),
        diagnosis_code: trimOptionalString(item.diagnosisCode),
        is_primary: item.isPrimary ?? false,
        notes: trimOptionalString(item.notes)
      }));
  }

  const legacyDiagnosis = trimOptionalString(dto.diagnosis);
  return legacyDiagnosis
    ? [
        {
          diagnosis_text: legacyDiagnosis,
          diagnosis_code: null,
          is_primary: true,
          notes: null
        }
      ]
    : [];
}

function mapPrescriptionForSupabase(
  prescription: DoctorCompleteBookingRequest['prescription'] | ConsultationRecordUpdateRequest['prescription']
): Record<string, unknown> | null {
  if (!prescription) {
    return null;
  }

  return {
    notes: trimOptionalString(prescription.notes),
    items: prescription.items
      .filter((item) => trimOptionalString(item.medicationName))
      .map((item) => ({
        medication_name: trimOptionalString(item.medicationName),
        strength: trimOptionalString(item.strength),
        dosage: trimOptionalString(item.dosage),
        route: trimOptionalString(item.route),
        frequency: trimOptionalString(item.frequency),
        duration: trimOptionalString(item.duration),
        quantity: item.quantity === null || item.quantity === undefined ? null : String(item.quantity),
        instructions: trimOptionalString(item.instructions)
      }))
  };
}

function mapLabOrderForSupabase(
  labOrders: DoctorCompleteBookingRequest['labOrders'] | ConsultationRecordUpdateRequest['labOrders']
): Record<string, unknown> | null {
  const firstLabOrder = Array.isArray(labOrders) && labOrders.length > 0 ? labOrders[0] : null;
  if (!firstLabOrder) {
    return null;
  }

  return {
    notes: trimOptionalString(firstLabOrder.notes),
    items: firstLabOrder.items
      .filter((item) => trimOptionalString(item.testName))
      .map((item) => ({
        test_name: trimOptionalString(item.testName),
        test_code: trimOptionalString(item.testCode),
        instructions: trimOptionalString(item.instructions)
      }))
  };
}

function mapFollowUpForSupabase(
  dto: DoctorCompleteBookingRequest | ConsultationRecordUpdateRequest
): Record<string, unknown> | null {
  const followUp = dto.followUp;
  const followUpDate = trimOptionalString(followUp?.followUpDate) ?? trimOptionalString(dto.followUpDate);
  const instructions = trimOptionalString(followUp?.instructions) ?? trimOptionalString(dto.followUpInstructions);
  const reason = trimOptionalString(followUp?.reason);

  if (!followUpDate && !instructions && !reason) {
    return null;
  }

  return {
    follow_up_date: followUpDate ?? null,
    reason: reason ?? null,
    instructions: instructions ?? null
  };
}

function mapSupabasePaymentRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: trimOptionalString(row['id']),
    bookingId: trimOptionalString(row['booking_id']),
    amount: normalizeNumber(row['amount']),
    paymentMethod: trimOptionalString(row['payment_method']) ?? 'PayAtClinic',
    referenceNumber: trimOptionalString(row['reference_number']),
    proofImageUrl: trimOptionalString(row['proof_image_url']),
    status: trimOptionalString(row['status']),
    orNumber: trimOptionalString(row['or_number']),
    verifiedByUserId: trimOptionalString(row['verified_by_user_id']),
    verifiedAt: trimOptionalString(row['verified_at']),
    paidAt: trimOptionalString(row['verified_at']),
    waivedByUserId: trimOptionalString(row['waived_by_user_id']),
    waivedAt: trimOptionalString(row['waived_at']),
    waivedReason: trimOptionalString(row['waived_reason']),
    refundedByUserId: trimOptionalString(row['refunded_by_user_id']),
    refundedAt: trimOptionalString(row['refunded_at']),
    refundReason: trimOptionalString(row['refund_reason'])
  };
}

function mapSupabaseConsultationRecordRow(row: Record<string, unknown>): ConsultationRecordResponse {
  const diagnoses = extractArray(row['diagnoses'])
    .filter(isRecord)
    .map((item) => ({
      id: trimOptionalString(item['id']),
      diagnosisText: trimOptionalString(item['diagnosis_text']) ?? '',
      diagnosisCode: trimOptionalString(item['diagnosis_code']),
      isPrimary: normalizeBoolean(item['is_primary'], false),
      notes: trimOptionalString(item['notes'])
    }))
    .filter((item) => item.diagnosisText.length > 0);

  const prescriptions = extractArray(row['prescriptions']).filter(isRecord);
  const firstPrescription = prescriptions[0];
  const prescription = firstPrescription
    ? {
        id: trimOptionalString(firstPrescription['id']),
        notes: trimOptionalString(firstPrescription['notes']),
        items: extractArray(firstPrescription['items'])
          .filter(isRecord)
          .map((item) => ({
            id: trimOptionalString(item['id']),
            medicationName: trimOptionalString(item['medication_name']) ?? '',
            strength: trimOptionalString(item['strength']),
            dosage: trimOptionalString(item['dosage']),
            route: trimOptionalString(item['route']),
            frequency: trimOptionalString(item['frequency']),
            duration: trimOptionalString(item['duration']),
            quantity: trimOptionalString(item['quantity']),
            instructions: trimOptionalString(item['instructions'])
          }))
          .filter((item) => item.medicationName.length > 0)
      }
    : null;

  const labOrders = extractArray(row['lab_orders'])
    .filter(isRecord)
    .map((order) => ({
      id: trimOptionalString(order['id']),
      notes: trimOptionalString(order['notes']),
      items: extractArray(order['items'])
        .filter(isRecord)
        .map((item) => ({
          id: trimOptionalString(item['id']),
          testName: trimOptionalString(item['test_name']) ?? '',
          testCode: trimOptionalString(item['test_code']),
          instructions: trimOptionalString(item['instructions'])
        }))
        .filter((item) => item.testName.length > 0)
    }));

  const followUpRows = extractArray(row['follow_ups']).filter(isRecord);
  const firstFollowUp = followUpRows[0];

  const soap = isRecord(row['soap_note'])
    ? {
        subjective: trimOptionalString(row['soap_note']['subjective']),
        objective: trimOptionalString(row['soap_note']['objective']),
        assessment: trimOptionalString(row['soap_note']['assessment']),
        plan: trimOptionalString(row['soap_note']['plan'])
      }
    : null;

  const vitalRows = extractArray(row['vital_signs']).filter(isRecord);
  const latestVitals = vitalRows[0];

  return {
    bookingId: trimOptionalString(row['booking_id']) ?? '',
    consultationId: trimOptionalString(row['consultation_id']),
    patientId: trimOptionalString(row['patient_id']) ?? '',
    doctorId: trimOptionalString(row['doctor_id']) ?? '',
    bookingStatus: normalizeBookingStatus(row['booking_status']) ?? trimOptionalString(row['booking_status']) ?? 'Completed',
    generalNotes: trimOptionalString(row['general_notes']),
    vitalSigns: latestVitals
      ? {
          systolicBp: normalizeNullableNumber(latestVitals['systolic_bp']),
          diastolicBp: normalizeNullableNumber(latestVitals['diastolic_bp']),
          heartRate: normalizeNullableNumber(latestVitals['heart_rate']),
          respiratoryRate: normalizeNullableNumber(latestVitals['respiratory_rate']),
          temperature: normalizeNullableNumber(latestVitals['temperature_c']),
          oxygenSaturation: normalizeNullableNumber(latestVitals['oxygen_saturation']),
          weight: normalizeNullableNumber(latestVitals['weight_kg']),
          height: normalizeNullableNumber(latestVitals['height_cm']),
          bmi: normalizeNullableNumber(latestVitals['bmi']),
          painScore: normalizeNullableNumber(latestVitals['pain_score']),
          takenAt: trimOptionalString(latestVitals['taken_at'])
        }
      : null,
    soap,
    diagnoses,
    prescription,
    labOrders,
    followUp: firstFollowUp
      ? {
          id: trimOptionalString(firstFollowUp['id']),
          followUpDate: trimOptionalString(firstFollowUp['follow_up_date']),
          instructions: trimOptionalString(firstFollowUp['instructions']),
          reason: trimOptionalString(firstFollowUp['reason'])
        }
      : null
  };
}

function buildReceiptFromBooking(
  booking: Booking | undefined,
  dto: ConfirmPaymentRequest,
  rpcRow: Record<string, unknown>
): ReceiptData {
  const now = new Date().toISOString();
  const services = booking?.serviceNames?.length
    ? booking.serviceNames
    : booking?.serviceName
      ? [booking.serviceName]
      : [];

  return {
    bookingId: booking?.id ?? trimOptionalString(rpcRow['booking_id']) ?? '',
    paymentId: booking?.payment?.id ?? booking?.id ?? trimOptionalString(rpcRow['booking_id']) ?? '',
    orNumber: trimOptionalString(rpcRow['or_number']) ?? booking?.orNumber ?? '-',
    patientName: booking?.patientName ?? 'Patient',
    doctorName: booking?.doctorName ?? 'Doctor',
    services,
    appointmentDate: booking?.appointmentDate ?? '',
    slotStartTime: booking?.slotStartTime,
    doctorCompletedAt: booking?.doctorCompletedAt,
    paidAt: now,
    amountPaid: dto.amountReceived,
    paymentMethod: dto.paymentMethod,
    referenceNumber: dto.referenceNumber,
    cashierName: 'Staff',
    verifiedByName: 'Staff',
    paymentStatus: 'Paid',
    totalFee: booking?.totalFee,
    consultationFee: booking?.consultationFeeSnapshot,
    serviceFee: booking?.serviceFeeSnapshot,
    isWalkIn: booking?.isWalkIn,
    queueNumber: booking?.queueNumber
  };
}

function buildBookingParams(filters?: BookingFilters): HttpParams | undefined {
  if (!filters) {
    return undefined;
  }

  let params = new HttpParams();
  let hasValue = false;

  const add = (key: string, value: string | number | undefined): void => {
    if (value === undefined || value === null) {
      return;
    }

    const text = String(value).trim();
    if (!text) {
      return;
    }

    params = params.set(key, text);
    hasValue = true;
  };

  add('doctorId', filters.doctorId);
  add('patientId', filters.patientId);
  add('status', filters.status);
  add('paymentStatus', filters.paymentStatus);
  add('paymentMode', filters.paymentMode);
  add('appointmentDate', filters.appointmentDate);
  add('fromDate', filters.fromDate);
  add('toDate', filters.toDate);
  add('search', filters.search);
  add('page', filters.page);
  add('pageSize', filters.pageSize);

  return hasValue ? params : undefined;
}

function buildStaffTodayParams(filters: StaffTodayBookingsFilters): HttpParams {
  let params = new HttpParams()
    .set('page', String(Math.max(1, filters.page ?? 1)))
    .set('pageSize', String(Math.max(1, filters.pageSize ?? 20)));

  if (filters.doctorId?.trim()) {
    params = params.set('doctorId', filters.doctorId.trim());
  }

  if (filters.status?.trim()) {
    params = params.set('status', filters.status.trim());
  }

  return params;
}

function buildStaffBookingsParams(filters: StaffBookingsFilterParams): HttpParams | undefined {
  let params = new HttpParams()
    .set('page', String(Math.max(1, filters.page ?? 1)))
    .set('pageSize', String(Math.max(1, filters.pageSize ?? 20)));

  let hasValue = false;

  const add = (key: string, value: string | undefined): void => {
    if (value?.trim()) {
      params = params.set(key, value.trim());
      hasValue = true;
    }
  };

  add('doctorId', filters.doctorId);
  add('status', filters.status);

  if (filters.appointmentDate?.trim()) {
    params = params.set('appointmentDate', filters.appointmentDate.trim());
    hasValue = true;
  }

  return hasValue ? params : undefined;
}

function applyBookingFilters(bookings: Booking[], filters?: BookingFilters): Booking[] {
  if (!filters) {
    return [...bookings];
  }

  const normalizedSearch = filters.search?.trim().toLowerCase() ?? '';
  const filtered = bookings.filter((booking) => {
    if (filters.doctorId && booking.doctorId !== filters.doctorId) {
      return false;
    }

    if (filters.patientId && booking.patientId !== filters.patientId) {
      return false;
    }

    if (filters.status && booking.status !== filters.status) {
      return false;
    }

    if (filters.paymentStatus && booking.paymentStatus !== filters.paymentStatus) {
      return false;
    }

    if (filters.paymentMode && booking.paymentMode !== filters.paymentMode) {
      return false;
    }

    if (filters.appointmentDate && booking.appointmentDate !== filters.appointmentDate) {
      return false;
    }

    if (filters.fromDate && booking.appointmentDate < filters.fromDate) {
      return false;
    }

    if (filters.toDate && booking.appointmentDate > filters.toDate) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      booking.id,
      booking.patientId,
      booking.patientName ?? '',
      booking.doctorId,
      booking.doctorName ?? '',
      booking.serviceId,
      booking.serviceName ?? '',
      ...(booking.serviceNames ?? []),
      booking.notes ?? '',
      booking.cancellationReason ?? '',
      booking.proofValue ?? ''
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const pageSize =
    typeof filters.pageSize === 'number' && Number.isFinite(filters.pageSize)
      ? Math.max(1, Math.floor(filters.pageSize))
      : null;
  if (!pageSize) {
    return filtered;
  }

  const page =
    typeof filters.page === 'number' && Number.isFinite(filters.page)
      ? Math.max(1, Math.floor(filters.page))
      : 1;
  const start = (page - 1) * pageSize;
  return filtered.slice(start, start + pageSize);
}

function normalizePagedResult<T>(
  payload: unknown,
  normalizeItem: (value: unknown) => T | undefined
): PagedResult<T> {
  const source = isRecord(payload) ? payload : {};
  const items = extractArray(source['items'] ?? source['data'] ?? source['results'])
    .map((item) => normalizeItem(item))
    .filter((item): item is T => item !== undefined);

  return {
    items,
    totalCount: normalizeNumber(source['totalCount'] ?? source['total'] ?? items.length, items.length),
    page: normalizeNumber(source['page'] ?? source['pageNumber'], 1) || 1,
    pageSize: normalizeNumber(source['pageSize'], items.length || 20) || (items.length || 20)
  };
}

function extractBookingArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of ['items', 'data', 'results']) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  const single = extractBookingRecord(payload);
  return single ? [single] : [];
}

function extractBookingRecord(payload: unknown): unknown | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  for (const key of ['booking', 'item', 'data', 'result']) {
    const candidate = payload[key];
    if (isRecord(candidate)) {
      return candidate;
    }
  }

  if (typeof payload['id'] === 'string' || typeof payload['bookingId'] === 'string') {
    return payload;
  }

  return undefined;
}

function extractPaymentRecord(payload: unknown): unknown | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  for (const key of ['payment', 'item', 'data', 'result']) {
    const candidate = payload[key];
    if (isRecord(candidate)) {
      return candidate;
    }
  }

  if (typeof payload['id'] === 'string' && typeof payload['bookingId'] === 'string') {
    return payload;
  }

  return undefined;
}

function extractReceiptRecord(payload: unknown): Record<string, unknown> | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  for (const key of ['receipt', 'item', 'data', 'result']) {
    const candidate = payload[key];
    if (isRecord(candidate)) {
      return candidate;
    }
  }

  if (typeof payload['paymentId'] === 'string' || typeof payload['bookingId'] === 'string') {
    return payload;
  }

  return undefined;
}

function extractNestedRecord(payload: Record<string, unknown>, keys: string[]): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (isRecord(value)) {
      return value;
    }
  }

  return undefined;
}

function extractArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function mapSupabaseBookingViewRow(row: Record<string, unknown>): Record<string, unknown> {
  const services = Array.isArray(row['services'])
    ? (row['services'] as unknown[]).map((item) => {
        if (!isRecord(item)) {
          return item;
        }

        return {
          id: trimOptionalString(item['service_id']) ?? trimOptionalString(item['id']) ?? '',
          serviceId: trimOptionalString(item['service_id']) ?? trimOptionalString(item['id']) ?? '',
          name: trimOptionalString(item['service_name']) ?? trimOptionalString(item['name']) ?? '',
          serviceName: trimOptionalString(item['service_name']) ?? trimOptionalString(item['name']) ?? ''
        };
      })
    : [];

  const serviceIds = services
    .map((item) => (isRecord(item) ? trimOptionalString(item['serviceId']) : undefined))
    .filter((value): value is string => Boolean(value));
  const serviceNames = services
    .map((item) => (isRecord(item) ? trimOptionalString(item['serviceName']) : undefined))
    .filter((value): value is string => Boolean(value));

  return {
    bookingId: trimOptionalString(row['booking_id']),
    id: trimOptionalString(row['booking_id']),
    patientId: trimOptionalString(row['patient_id']),
    patientName: trimOptionalString(row['patient_name']),
    doctorId: trimOptionalString(row['doctor_id']),
    doctorName: trimOptionalString(row['doctor_name']),
    serviceId: trimOptionalString(row['primary_service_id']) ?? serviceIds[0],
    serviceName: trimOptionalString(row['primary_service_name']) ?? serviceNames[0],
    serviceIds,
    serviceNames,
    services,
    appointmentDate: normalizeDateOnly(row['appointment_date']),
    slotStartTime: normalizeTimeOnly(row['slot_start_time']),
    slotEndTime: normalizeTimeOnly(row['slot_end_time']),
    queueNumber: normalizeNullableNumber(row['queue_number']),
    status: trimOptionalString(row['booking_status']),
    paymentStatus: trimOptionalString(row['payment_status']),
    paymentMode: trimOptionalString(row['payment_mode']) ?? 'PayAtClinic',
    totalFee: normalizeNumber(row['total_fee']),
    finalAmount: normalizeNullableNumberPreserveUndefined(row['final_amount']),
    isWalkIn: normalizeBoolean(row['is_walk_in'], false),
    proofType: trimOptionalString(row['proof_type']),
    proofSubmittedAt: trimOptionalString(row['proof_submitted_at']),
    checkedInAt: trimOptionalString(row['checked_in_at']),
    doctorCompletedAt: trimOptionalString(row['doctor_completed_at']),
    createdAt: trimOptionalString(row['created_at']),
    updatedAt: trimOptionalString(row['updated_at']),
    consultationFeeSnapshot: 0,
    serviceFeeSnapshot: 0,
    patient: {
      id: trimOptionalString(row['patient_id']) ?? '',
      patientCode: trimOptionalString(row['patient_code']),
      fullName: trimOptionalString(row['patient_name'])
    },
    doctor: {
      id: trimOptionalString(row['doctor_id']) ?? '',
      fullName: trimOptionalString(row['doctor_name']),
      specialization: trimOptionalString(row['doctor_specialization'])
    },
    service: trimOptionalString(row['primary_service_id'])
      ? {
          id: trimOptionalString(row['primary_service_id']) ?? '',
          name: trimOptionalString(row['primary_service_name'])
        }
      : undefined
  };
}

function normalizeDateOnly(value: unknown): string {
  const raw = trimOptionalString(value);
  if (!raw) {
    return '';
  }

  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function normalizeTimeOnly(value: unknown): string {
  const raw = trimOptionalString(value);
  if (!raw) {
    return '';
  }

  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

function normalizeTimeForSupabase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

function normalizeBookingServices(value: unknown): BookingServiceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const name = item.trim();
        return name ? { id: '', name } : undefined;
      }

      if (!isRecord(item)) {
        return undefined;
      }

      return {
        id: trimOptionalString(item['id']) ?? trimOptionalString(item['serviceId']) ?? '',
        name: trimOptionalString(item['serviceName']) ?? trimOptionalString(item['name']) ?? '',
        description: trimOptionalString(item['description']),
        estimatedDurationMinutes: normalizeNullableNumber(item['estimatedDurationMinutes']) ?? undefined,
        price: normalizeNullableNumber(item['price']) ?? undefined
      } satisfies BookingServiceItem;
    })
    .filter((item): item is BookingServiceItem => Boolean(item && (item.id || item.name)));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function composePersonName(
  value:
    | {
        firstName?: string;
        middleName?: string;
        lastName?: string;
      }
    | undefined
): string | undefined {
  if (!value) {
    return undefined;
  }

  const parts = [value.firstName, value.middleName, value.lastName]
    .map((item) => trimOptionalString(item))
    .filter((item): item is string => Boolean(item));
  return parts.length > 0 ? parts.join(' ') : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bookingDateTime(booking: Booking): number {
  return new Date(`${booking.appointmentDate}T${booking.slotStartTime}:00`).getTime();
}

function toLocalIsoDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function normalizeBookingStatus(value: unknown): BookingStatus | undefined {
  return normalizeEnum(value, BOOKING_STATUSES);
}

function normalizePaymentStatus(value: unknown): PaymentStatus | undefined {
  return normalizeEnum(value, PAYMENT_STATUSES);
}

function normalizePaymentMode(value: unknown): PaymentMode | undefined {
  return normalizeEnum(value, PAYMENT_MODES);
}

function normalizeProofType(value: unknown): ProofType | undefined {
  return normalizeEnum(value, PROOF_TYPES);
}

function normalizePaymentMethod(value: unknown): PaymentMethod | undefined {
  return normalizeEnum(value, PAYMENT_METHODS);
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return allowed.find((item) => item.toLowerCase() === normalized);
}

function trimRequiredString(value: string): string {
  return value.trim();
}

function trimOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
}

function normalizeBooleanOrUndefined(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeNullableNumberPreserveUndefined(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return normalizeNullableNumber(value);
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const errorBody = err.error as {
      message?: string;
      errors?: Record<string, string[] | string>;
    } | null;

    if (typeof errorBody?.message === 'string' && errorBody.message.trim()) {
      return errorBody.message;
    }

    if (errorBody?.errors) {
      for (const value of Object.values(errorBody.errors)) {
        const values = Array.isArray(value) ? value : [value];
        const firstValidationError = values.find((item) => typeof item === 'string' && item.trim().length > 0);
        if (typeof firstValidationError === 'string') {
          return firstValidationError;
        }
      }
    }

    if (typeof err.message === 'string' && err.message.trim()) {
      return err.message;
    }
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  return fallback;
}
