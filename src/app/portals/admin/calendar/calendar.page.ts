import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Booking, Doctor } from '../../../core/models';
import { BookingService } from '../../../core/services/booking.service';
import { DoctorStateService } from '../../../core/services/doctor-state.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-admin-calendar-page',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, EmptyStateComponent, SkeletonComponent],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Calendar</h2>
          <p class="page-subtitle">Weekly overview of appointments grouped by doctor.</p>
        </div>
        <div class="week-nav">
          <button type="button" class="btn-ghost" (click)="shiftWeek(-1)">&lt; Prev Week</button>
          <strong>{{ weekLabel }}</strong>
          <button type="button" class="btn-ghost" (click)="shiftWeek(1)">Next Week &gt;</button>
        </div>
      </div>

      <app-skeleton *ngIf="isLoading" variant="card" [count]="2"></app-skeleton>

      <app-empty-state
        *ngIf="!isLoading && weekBookings.length === 0"
        icon="calendar-outline"
        title="No bookings this week"
        description="There are no appointments in the selected week."
      ></app-empty-state>

      <div class="calendar" *ngIf="!isLoading && weekBookings.length > 0">
        <div class="calendar__head">
          <div>Doctor</div>
          <div *ngFor="let day of weekDays">{{ day.label }}</div>
        </div>
        <div class="calendar__row" *ngFor="let doctor of doctors">
          <div class="calendar__doctor">{{ doctor.fullName }}</div>
          <div class="calendar__cell" *ngFor="let day of weekDays">
            <div class="calendar__booking" *ngFor="let booking of bookingsForCell(doctor.id, day.date)">
              <strong>{{ booking.patientName }}</strong>
              <span>{{ booking.slotStartTime }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrl: './calendar.page.scss'
})
export class CalendarPage implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly doctorState = inject(DoctorStateService);

  bookings: Booking[] = [];
  doctors: Doctor[] = [];
  isLoading = false;
  currentWeekStart = this.startOfWeek(new Date());

  ngOnInit(): void {
    this.bookingService.getBookings().subscribe((bookings) => (this.bookings = bookings));
    this.bookingService.isLoading$.subscribe((loading) => (this.isLoading = loading));
    this.doctorState.getDoctors().subscribe((doctors) => (this.doctors = doctors));
  }

  get weekDays(): Array<{ label: string; date: string }> {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(this.currentWeekStart);
      date.setDate(date.getDate() + index);
      return { label: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), date: this.isoDate(date) };
    });
  }

  get weekLabel(): string {
    const end = new Date(this.currentWeekStart);
    end.setDate(end.getDate() + 6);
    return `${this.currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  get weekBookings(): Booking[] {
    const start = this.isoDate(this.currentWeekStart);
    const end = new Date(this.currentWeekStart);
    end.setDate(end.getDate() + 6);
    const endIso = this.isoDate(end);
    return this.bookings.filter((booking) => booking.appointmentDate >= start && booking.appointmentDate <= endIso);
  }

  shiftWeek(offset: number): void {
    this.currentWeekStart = new Date(this.currentWeekStart);
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + offset * 7);
    this.currentWeekStart = this.startOfWeek(this.currentWeekStart);
  }

  bookingsForCell(doctorId: string, day: string): Booking[] {
    return this.weekBookings.filter((booking) => booking.doctorId === doctorId && booking.appointmentDate === day);
  }

  private startOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private isoDate(date: Date): string {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }
}
