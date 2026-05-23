import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Doctor, Prescription } from '../../../../core/models';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-prescription-card',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, StatusBadgeComponent],
  template: `
    <article class="prescription-card clinic-card">
      <div class="prescription-card__header">
        <div>
          <div class="prescription-card__date">{{ prescription.prescriptionDate | date : 'MMM d, y' }}</div>
          <h3>{{ doctor?.fullName || 'Doctor' }}</h3>
        </div>
        <app-status-badge [status]="prescription.status"></app-status-badge>
      </div>

      <ul class="prescription-card__items">
        <li *ngFor="let item of prescription.items">
          <div class="prescription-card__item-title">{{ item.medicineName || item.genericName }}</div>
          <div class="prescription-card__item-meta">
            {{ item.strength }} | {{ item.dosageForm }}
            <ng-container *ngIf="item.unitOfMeasure"> | {{ item.unitOfMeasure }}</ng-container>
            | Qty {{ item.quantity }}
          </div>
          <div class="prescription-card__item-sig">{{ item.sig }}</div>
        </li>
      </ul>

      <div class="prescription-card__note" *ngIf="prescription.notes">
        {{ prescription.notes }}
      </div>

      <div class="prescription-card__actions">
        <button type="button" class="btn-primary" (click)="download.emit(prescription.id)">
          Download PDF
        </button>
      </div>
    </article>
  `,
  styleUrl: './prescription-card.component.scss'
})
export class PrescriptionCardComponent {
  @Input({ required: true }) prescription!: Prescription;
  @Input() doctor?: Doctor;

  @Output() download = new EventEmitter<string>();
}
