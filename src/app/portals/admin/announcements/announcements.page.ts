import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../../core/services/mock-data.service';
import { Announcement } from '../../../core/models';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { IonModal } from '@ionic/angular/standalone';

@Component({
  selector: 'app-admin-announcements-page',
  standalone: true,
  imports: [DatePipe, FormsModule, NgFor, NgIf, ConfirmModalComponent, EmptyStateComponent, StatusBadgeComponent, IonModal],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Announcements</h2>
          <p class="page-subtitle">Create and manage clinic announcements.</p>
        </div>
        <button class="btn-primary" type="button" (click)="openModal()">Add Announcement</button>
      </div>

      <div class="clinic-card" *ngIf="announcements.length > 0">
        <div class="table-scroll-wrap">
        <table class="clinic-table">
          <thead><tr><th>Title</th><th>Status</th><th>Created Date</th><th>Actions</th></tr></thead>
          <tbody>
            <tr *ngFor="let ann of announcements">
              <td>{{ ann.title }}</td>
              <td><app-status-badge [status]="ann.isActive ? 'Active' : 'Inactive'"></app-status-badge></td>
              <td>{{ ann.createdAt | date:'mediumDate' }}</td>
              <td>
                <button class="btn-ghost" type="button" (click)="edit(ann)">Edit</button>
                <button class="btn-ghost" type="button" (click)="toggle(ann.id)">{{ ann.isActive ? 'Deactivate' : 'Activate' }}</button>
                <button class="btn-ghost" type="button" (click)="askDelete(ann.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <app-empty-state *ngIf="announcements.length === 0" icon="megaphone-outline" title="No announcements" description="Create your first announcement."></app-empty-state>
    </section>

    <ion-modal [isOpen]="modalOpen" (didDismiss)="modalOpen = false">
      <ng-template>
        <div class="modal-shell">
          <h3>{{ editingId ? 'Edit Announcement' : 'Add Announcement' }}</h3>
          <form class="modal-form" (ngSubmit)="save()">
            <input class="filter-input" name="title" [(ngModel)]="draft.title" placeholder="Title" />
            <textarea class="textarea" name="body" [(ngModel)]="draft.body" placeholder="Body"></textarea>
            <label><input type="checkbox" name="isActive" [(ngModel)]="draft.isActive" /> Active</label>
            <div class="modal-actions">
              <button type="button" class="btn-ghost" (click)="modalOpen = false">Cancel</button>
              <button type="submit" class="btn-primary">Save</button>
            </div>
          </form>
        </div>
      </ng-template>
    </ion-modal>

    <app-confirm-modal
      [isOpen]="deleteOpen"
      title="Delete Announcement"
      message="Delete this announcement?"
      confirmLabel="Delete"
      [isDanger]="true"
      (confirmed)="deleteConfirmed()"
      (cancelled)="deleteOpen = false"
    ></app-confirm-modal>
  `,
  styleUrl: './announcements.page.scss'
})
export class AnnouncementsPage implements OnInit {
  private readonly mockData = inject(MockDataService);
  announcements: Announcement[] = [];
  modalOpen = false;
  deleteOpen = false;
  editingId: string | null = null;
  deletingId: string | null = null;
  draft: Announcement = this.emptyDraft();

  ngOnInit(): void {
    this.announcements = this.mockData.getAnnouncements();
  }

  openModal(): void {
    this.editingId = null;
    this.draft = this.emptyDraft();
    this.modalOpen = true;
  }

  edit(announcement: Announcement): void {
    this.editingId = announcement.id;
    this.draft = { ...announcement };
    this.modalOpen = true;
  }

  save(): void {
    if (this.editingId) {
      this.announcements = this.announcements.map((announcement) => (announcement.id === this.editingId ? { ...this.draft } : announcement));
    } else {
      this.announcements = [...this.announcements, { ...this.draft, id: `ann-${Date.now()}`, createdAt: new Date().toISOString() }];
    }
    this.modalOpen = false;
  }

  toggle(id: string): void {
    this.announcements = this.announcements.map((announcement) =>
      announcement.id === id ? { ...announcement, isActive: !announcement.isActive } : announcement
    );
  }

  askDelete(id: string): void {
    this.deletingId = id;
    this.deleteOpen = true;
  }

  deleteConfirmed(): void {
    if (this.deletingId) {
      this.announcements = this.announcements.filter((announcement) => announcement.id !== this.deletingId);
    }
    this.deleteOpen = false;
  }

  private emptyDraft(): Announcement {
    return {
      id: '',
      title: '',
      body: '',
      isActive: true,
      createdAt: new Date().toISOString()
    };
  }
}
