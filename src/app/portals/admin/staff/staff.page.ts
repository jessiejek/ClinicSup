import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../../core/services/mock-data.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { IonModal } from '@ionic/angular/standalone';

interface StaffRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-admin-staff-page',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, EmptyStateComponent, StatusBadgeComponent, IonModal],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Staff Accounts</h2>
          <p class="page-subtitle">Mock staff management for front desk accounts.</p>
        </div>
        <button class="btn-primary" type="button" (click)="openModal()">Add Staff</button>
      </div>

      <div class="clinic-card" *ngIf="staff.length > 0">
        <div class="table-scroll-wrap">
        <table class="clinic-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr *ngFor="let member of staff">
              <td>{{ member.fullName }}</td>
              <td>{{ member.email }}</td>
              <td>{{ member.role }}</td>
              <td><app-status-badge [status]="member.status"></app-status-badge></td>
              <td><button class="btn-ghost" type="button" (click)="toggle(member.id)">{{ member.status === 'Active' ? 'Deactivate' : 'Reactivate' }}</button></td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <app-empty-state *ngIf="staff.length === 0" icon="person-add-outline" title="No staff accounts" description="Create the first front desk account to continue." ctaLabel="Add Staff" (ctaClick)="openModal()"></app-empty-state>
    </section>

    <ion-modal [isOpen]="modalOpen" (didDismiss)="modalOpen = false">
      <ng-template>
        <div class="modal-shell">
          <h3>Add Staff</h3>
          <form class="modal-form" (ngSubmit)="save()">
            <input class="filter-input" name="fullName" [(ngModel)]="draft.fullName" placeholder="Name" />
            <input class="filter-input" name="email" [(ngModel)]="draft.email" placeholder="Email" />
            <input class="filter-input" name="password" [(ngModel)]="draft.password" placeholder="Temporary Password" />
            <div class="modal-actions">
              <button type="button" class="btn-ghost" (click)="modalOpen = false">Cancel</button>
              <button type="submit" class="btn-primary">Save</button>
            </div>
          </form>
        </div>
      </ng-template>
    </ion-modal>
  `,
  styleUrl: './staff.page.scss'
})
export class StaffPage implements OnInit {
  private readonly mockData = inject(MockDataService);
  staff: StaffRow[] = [];
  modalOpen = false;
  draft = { fullName: '', email: '', password: '' };

  ngOnInit(): void {
    this.staff = this.mockData.getUsers().filter((user) => user.role === 'Staff').map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: 'Active'
    }));
  }

  openModal(): void {
    this.draft = { fullName: '', email: '', password: '' };
    this.modalOpen = true;
  }

  save(): void {
    this.staff = [...this.staff, { id: `staff-${Date.now()}`, fullName: this.draft.fullName, email: this.draft.email, role: 'Staff', status: 'Active' }];
    this.modalOpen = false;
  }

  toggle(id: string): void {
    this.staff = this.staff.map((member) =>
      member.id === id ? { ...member, status: member.status === 'Active' ? 'Inactive' : 'Active' } : member
    );
  }
}
