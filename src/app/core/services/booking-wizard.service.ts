import { Injectable } from '@angular/core';
import { BehaviorSubject, OperatorFunction, distinctUntilChanged, map } from 'rxjs';
import { PaymentMode } from '../models';

export interface BookingWizardState {
  currentStep: number;
  selectedDoctorId: string | null;
  selectedServiceId: string | null;
  selectedServiceIds: string[];
  selectedDate: string | null;
  selectedSlot: string | null;
  selectedSlotEnd: string | null;
  paymentMode: PaymentMode;
  bookingId: string | null;
  queueNumber: number | null;
  isLoading: boolean;
  error: string | null;
}

export const initialBookingWizardState: BookingWizardState = {
  currentStep: 1,
  selectedDoctorId: null,
  selectedServiceId: null,
  selectedServiceIds: [],
  selectedDate: null,
  selectedSlot: null,
  selectedSlotEnd: null,
  paymentMode: 'PayAtClinic',
  bookingId: null,
  queueNumber: null,
  isLoading: false,
  error: null
};

@Injectable({ providedIn: 'root' })
export class BookingWizardService {
  private readonly stateSubject = new BehaviorSubject<BookingWizardState>({
    ...initialBookingWizardState
  });

  readonly state$ = this.stateSubject.asObservable();
  readonly currentStep$ = this.state$.pipe(mapWizard((state) => state.currentStep));
  readonly isLoading$ = this.state$.pipe(mapWizard((state) => state.isLoading));
  readonly selectedDoctorId$ = this.state$.pipe(mapWizard((state) => state.selectedDoctorId));
  readonly selectedServiceId$ = this.state$.pipe(mapWizard((state) => state.selectedServiceId));
  readonly selectedServiceIds$ = this.state$.pipe(mapWizard((state) => state.selectedServiceIds));
  readonly selectedDate$ = this.state$.pipe(mapWizard((state) => state.selectedDate));
  readonly selectedSlot$ = this.state$.pipe(mapWizard((state) => state.selectedSlot));

  get snapshot(): BookingWizardState {
    return this.stateSubject.value;
  }

  patchState(partial: Partial<BookingWizardState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...partial });
  }

  selectDoctor(doctorId: string | null): void {
    this.patchState({
      selectedDoctorId: doctorId,
      selectedServiceId: null,
      selectedServiceIds: [],
      selectedDate: null,
      selectedSlot: null,
      selectedSlotEnd: null,
      error: null
    });
  }

  selectService(serviceId: string | null): void {
    this.patchState({
      selectedServiceId: serviceId,
      selectedServiceIds: serviceId ? [serviceId] : [],
      selectedDate: null,
      selectedSlot: null,
      selectedSlotEnd: null,
      error: null
    });
  }

  toggleService(serviceId: string): void {
    const current = this.snapshot.selectedServiceIds;
    const next = current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId];

    this.patchState({
      selectedServiceIds: next,
      selectedServiceId: next[0] ?? null,
      selectedDate: null,
      selectedSlot: null,
      selectedSlotEnd: null,
      error: null
    });
  }

  setSelectedServices(serviceIds: string[]): void {
    const normalized = [...new Set(serviceIds.filter((serviceId) => serviceId.trim().length > 0))];
    this.patchState({
      selectedServiceIds: normalized,
      selectedServiceId: normalized[0] ?? null,
      selectedDate: null,
      selectedSlot: null,
      selectedSlotEnd: null,
      error: null
    });
  }

  selectDate(date: string | null): void {
    this.patchState({ selectedDate: date, selectedSlot: null, selectedSlotEnd: null, error: null });
  }

  selectSlot(slot: string | null, slotEnd: string | null): void {
    this.patchState({ selectedSlot: slot, selectedSlotEnd: slotEnd, error: null });
  }

  selectPaymentMode(paymentMode: PaymentMode): void {
    this.patchState({ paymentMode });
  }

  nextStep(): void {
    this.patchState({ currentStep: Math.min(this.snapshot.currentStep + 1, 6) });
  }

  prevStep(): void {
    this.patchState({ currentStep: Math.max(this.snapshot.currentStep - 1, 1) });
  }

  setStep(step: number): void {
    this.patchState({ currentStep: Math.min(Math.max(step, 1), 6) });
  }

  reset(): void {
    this.stateSubject.next({ ...initialBookingWizardState });
  }
}

const mapWizard = <T>(project: (state: BookingWizardState) => T): OperatorFunction<BookingWizardState, T> =>
  (source) => source.pipe(map(project), distinctUntilChanged());
