import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ToastController } from '@ionic/angular';
import { TimeSlot } from '../../../core/models';
import { BannerComponent } from '../banner/banner.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { TimeSlotPipe } from '../../pipes/time-slot.pipe';

@Component({
  selector: 'app-slot-grid',
  standalone: true,
  imports: [NgIf, NgFor, BannerComponent, EmptyStateComponent, TimeSlotPipe],
  template: `
    <ng-container *ngIf="isLoading">
      <div class="slot-grid">
        <div class="skeleton skeleton-row" *ngFor="let i of [1, 2, 3, 4, 5, 6, 7, 8]"></div>
      </div>
    </ng-container>

    <app-banner
      *ngIf="unavailableToday && !isLoading"
      variant="danger"
      message="Doctor is unavailable today. Please select a different date."
    ></app-banner>

    <app-banner
      *ngIf="runningLate && !unavailableToday && !isLoading"
      variant="warning"
      [message]="'Doctor is running approximately ' + runningLateMinutes + ' minutes late.'"
    ></app-banner>

    <app-empty-state
      *ngIf="!isLoading && !unavailableToday && slots.length === 0"
      icon="calendar-outline"
      title="No available slots"
      description="There are no appointment slots for this day. Please select another date."
    ></app-empty-state>

    <div class="slot-grid" *ngIf="!isLoading && !unavailableToday && slots.length > 0">
      <div
        *ngFor="let slot of slots"
        class="slot-cell"
        [class.slot-cell--available]="slot.status === 'available' && slot.time !== selectedSlot"
        [class.slot-cell--selected]="slot.time === selectedSlot"
        [class.slot-cell--full]="slot.status === 'full'"
        [class.slot-cell--pending]="slot.status === 'pending'"
        [class.slot-cell--disabled]="slot.status === 'disabled'"
        (click)="onSlotClick(slot)"
      >
        <span class="slot-time">{{ slot.time | timeSlot }}</span>
        <span class="slot-status-label" *ngIf="slot.status === 'full'">Full</span>
        <span class="slot-status-label" *ngIf="slot.status === 'pending'">Pending</span>
      </div>
    </div>
  `,
  styleUrl: './slot-grid.component.scss'
})
export class SlotGridComponent {
  @Input() slots: TimeSlot[] = [];
  @Input() selectedSlot: string | null = null;
  @Input() runningLate = false;
  @Input() runningLateMinutes = 0;
  @Input() unavailableToday = false;
  @Input() isLoading = false;

  @Output() slotSelected = new EventEmitter<{ slot: string; slotEnd: string }>();

  private readonly toastCtrl = inject(ToastController);

  async onSlotClick(slot: TimeSlot): Promise<void> {
    if (slot.status === 'full' || slot.status === 'pending' || slot.status === 'disabled') {
      const toast = await this.toastCtrl.create({
        message: 'This slot is not available.',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.slotSelected.emit({ slot: slot.time, slotEnd: slot.endTime });
  }
}
