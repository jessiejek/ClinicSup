import { NgFor } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon, IonPopover } from '@ionic/angular/standalone';

export interface BookingActionItem {
  label: string;
  value: string;
  danger?: boolean;
}

@Component({
  selector: 'app-booking-actions-menu',
  standalone: true,
  imports: [NgFor, IonIcon, IonPopover],
  template: `
    <button [id]="triggerId" type="button" class="actions-menu__button" aria-label="Open booking actions">
      <ion-icon name="ellipsis-vertical"></ion-icon>
    </button>

    <ion-popover [trigger]="triggerId" triggerAction="click" side="bottom" alignment="end">
      <ng-template>
        <div class="actions-menu">
          <button
            *ngFor="let action of actions"
            type="button"
            class="actions-menu__item"
            [class.actions-menu__item--danger]="action.danger"
            (click)="actionSelected.emit(action.value)"
          >
            {{ action.label }}
          </button>
        </div>
      </ng-template>
    </ion-popover>
  `,
  styleUrl: './booking-actions-menu.component.scss'
})
export class BookingActionsMenuComponent {
  @Input() actions: BookingActionItem[] = [
    { label: 'View', value: 'view' },
    { label: 'Confirm', value: 'confirm' },
    { label: 'Confirm Payment', value: 'confirm-payment' },
    { label: 'Waive Payment', value: 'waive-payment' },
    { label: 'Refund Payment', value: 'refund-payment', danger: true },
    { label: 'Reject', value: 'reject', danger: true }
  ];

  @Output() actionSelected = new EventEmitter<string>();

  readonly triggerId = `booking-actions-${Math.random().toString(36).slice(2)}`;
}
