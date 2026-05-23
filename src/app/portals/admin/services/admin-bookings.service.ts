import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Booking, BookingStatus } from '../../../core/models';
import { BookingService } from '../../../core/services/booking.service';

@Injectable({ providedIn: 'root' })
export class AdminBookingsService {
  private readonly bookingService = inject(BookingService);

  getBookings(): Observable<Booking[]> {
    return this.bookingService.getBookings();
  }

  getBookingById(id: string): Observable<Booking | undefined> {
    return this.bookingService.getBookingById$(id);
  }

  updateBookingStatus(id: string, status: BookingStatus): Observable<Booking | undefined> {
    switch (status) {
      case 'Confirmed':
        this.bookingService.confirmBooking(id);
        break;
      case 'Cancelled':
        this.bookingService.cancelBooking(id, 'Updated booking status.');
        break;
      case 'Completed':
        this.bookingService.completeBooking(id);
        break;
      case 'NoShow':
        this.bookingService.markNoShow(id);
        break;
      default:
        this.bookingService.updateBookingStatus(id, status);
        break;
    }

    return of(this.bookingService.getBookingById(id));
  }
}
