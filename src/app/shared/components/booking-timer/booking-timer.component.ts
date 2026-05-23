import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, timeOutline } from 'ionicons/icons';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-booking-timer',
  standalone: true,
  imports: [NgIf, IonIcon],
  template: `
    <div class="booking-timer banner banner--warning" *ngIf="!isExpired">
      <ion-icon name="time-outline"></ion-icon>
      <span
        >Your slot is reserved for
        <strong class="timer-countdown">{{ formattedTime }}</strong></span
      >
    </div>

    <div class="booking-timer-expired banner banner--danger" *ngIf="isExpired">
      <ion-icon name="alert-circle-outline"></ion-icon>
      <span>Your slot reservation has expired. Please select a new time slot.</span>
    </div>
  `,
  styleUrl: './booking-timer.component.scss'
})
export class BookingTimerComponent implements OnInit, OnDestroy {
  @Input() durationSeconds = 600;
  @Output() timerExpired = new EventEmitter<void>();

  remaining = this.durationSeconds;
  isExpired = false;

  private subscription?: Subscription;

  constructor() {
    addIcons({ timeOutline, alertCircleOutline });
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.remaining / 60);
    const seconds = this.remaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  ngOnInit(): void {
    this.remaining = this.durationSeconds;
    this.subscription = interval(1000).subscribe(() => {
      this.remaining -= 1;
      if (this.remaining <= 0) {
        this.remaining = 0;
        this.isExpired = true;
        this.subscription?.unsubscribe();
        this.timerExpired.emit();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
