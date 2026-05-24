import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastController } from '@ionic/angular/standalone';
import { SupabaseService } from '../../../core/services/supabase.service';
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

      <app-empty-state *ngIf="announcements.length === 0 && !isLoading && !loadError" icon="megaphone-outline" title="No announcements" description="Create your first announcement."></app-empty-state>

      <app-empty-state *ngIf="loadError" icon="cloud-offline-outline" title="Announcements unavailable" [description]="loadErrorDescription"></app-empty-state>

      <p *ngIf="announcements.length === 0 && isLoading" class="muted" style="text-align:center;padding:var(--space-8)">Loading announcements…</p>
    </section>

    <ion-modal [isOpen]="modalOpen" (didDismiss)="modalOpen = false">
      <ng-template>
        <div class="modal-shell">
          <h3>{{ editingId ? 'Edit Announcement' : 'Add Announcement' }}</h3>
          <p *ngIf="saveError" class="error-message" style="color:var(--color-danger);margin-bottom:var(--space-2)">{{ saveError }}</p>
          <form class="modal-form" (ngSubmit)="save()">
            <input class="filter-input" name="title" [(ngModel)]="draft.title" placeholder="Title" />
            <textarea class="textarea" name="body" [(ngModel)]="draft.body" placeholder="Body"></textarea>
            <label><input type="checkbox" name="isActive" [(ngModel)]="draft.isActive" /> Active</label>
            <div class="modal-actions">
              <button type="button" class="btn-ghost" (click)="modalOpen = false" [disabled]="isSaving">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="isSaving">{{ isSaving ? 'Saving…' : 'Save' }}</button>
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
  private readonly supabase = inject(SupabaseService).client;
  private readonly toastCtrl = inject(ToastController);

  announcements: Announcement[] = [];
  isLoading = false;
  isSaving = false;
  loadError = false;
  loadErrorDescription = '';
  saveError = '';
  modalOpen = false;
  deleteOpen = false;
  editingId: string | null = null;
  deletingId: string | null = null;
  draft: Announcement = this.emptyDraft();

  ngOnInit(): void {
    this.loadAnnouncements();
  }

  private async loadAnnouncements(): Promise<void> {
    this.isLoading = true;
    this.loadError = false;

    const { data, error } = await this.supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error && isTableMissing(error)) {
      this.loadError = true;
      this.loadErrorDescription = 'The announcements table has not been created yet. An administrator needs to apply the database migration.';
      console.warn('[AnnouncementsPage] announcements table not available:', error.message);
      this.announcements = [];
    } else if (error) {
      this.loadError = true;
      this.loadErrorDescription = 'Failed to load announcements. Please try again.';
      console.error('[AnnouncementsPage] Error loading announcements:', error.message);
      this.announcements = [];
    } else {
      this.announcements = ((data ?? []) as Record<string, unknown>[]).map(mapSupabaseRow);
    }
    this.isLoading = false;
  }

  openModal(): void {
    this.editingId = null;
    this.draft = this.emptyDraft();
    this.saveError = '';
    this.modalOpen = true;
  }

  edit(announcement: Announcement): void {
    this.editingId = announcement.id;
    this.draft = { ...announcement };
    this.saveError = '';
    this.modalOpen = true;
  }

  async save(): Promise<void> {
    this.isSaving = true;
    this.saveError = '';

    if (this.editingId) {
      const { error } = await this.supabase
        .from('announcements')
        .update({ title: this.draft.title, body: this.draft.body, is_active: this.draft.isActive })
        .eq('id', this.editingId);

      if (error) {
        this.isSaving = false;
        this.saveError = 'Failed to save announcement. The database may not be ready yet.';
        console.error('[AnnouncementsPage] Failed to update announcement:', error.message);
        return;
      }

      this.announcements = this.announcements.map((announcement) =>
        announcement.id === this.editingId ? { ...this.draft } : announcement
      );
      this.modalOpen = false;
    } else {
      const { data, error } = await this.supabase
        .from('announcements')
        .insert({ title: this.draft.title, body: this.draft.body, is_active: this.draft.isActive })
        .select()
        .single();

      if (error) {
        this.isSaving = false;
        this.saveError = 'Failed to create announcement. The database may not be ready yet.';
        console.error('[AnnouncementsPage] Failed to insert announcement:', error.message);
        return;
      }

      const inserted = data as Record<string, unknown>;
      this.announcements = [
        {
          id: String(inserted['id'] ?? ''),
          title: this.draft.title,
          body: this.draft.body,
          isActive: this.draft.isActive,
          createdAt: String(inserted['created_at'] ?? new Date().toISOString())
        },
        ...this.announcements
      ];
      this.modalOpen = false;
    }
    this.isSaving = false;
  }

  async toggle(id: string): Promise<void> {
    const target = this.announcements.find((a) => a.id === id);
    if (!target) { return; }

    const newActive = !target.isActive;
    const { error } = await this.supabase
      .from('announcements')
      .update({ is_active: newActive })
      .eq('id', id);

    if (error) {
      console.error('[AnnouncementsPage] Failed to toggle announcement:', error.message);
      await this.presentToast('Failed to update announcement status. The database may not be ready yet.', 'danger');
      return;
    }

    this.announcements = this.announcements.map((announcement) =>
      announcement.id === id ? { ...announcement, isActive: newActive } : announcement
    );
  }

  askDelete(id: string): void {
    this.deletingId = id;
    this.deleteOpen = true;
  }

  async deleteConfirmed(): Promise<void> {
    if (this.deletingId) {
      const { error } = await this.supabase
        .from('announcements')
        .delete()
        .eq('id', this.deletingId);

      if (error) {
        console.error('[AnnouncementsPage] Failed to delete announcement:', error.message);
        this.deleteOpen = false;
        await this.presentToast('Failed to delete announcement. The database may not be ready yet.', 'danger');
        return;
      }

      this.announcements = this.announcements.filter((announcement) => announcement.id !== this.deletingId);
    }
    this.deleteOpen = false;
  }

  private async presentToast(message: string, color: 'success' | 'danger' = 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
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

function mapSupabaseRow(row: Record<string, unknown>): Announcement {
  return {
    id: String(row['id'] ?? ''),
    title: String(row['title'] ?? ''),
    body: String(row['body'] ?? ''),
    imageUrl: row['image_url'] ? String(row['image_url']) : undefined,
    isActive: Boolean(row['is_active'] ?? true),
    createdAt: String(row['created_at'] ?? new Date().toISOString())
  };
}

function isTableMissing(error: { code?: string; message?: string }): boolean {
  const msg = (error?.message ?? '').toLowerCase();
  return msg.includes('relation') || msg.includes('does not exist') || error?.code === '42P01';
}
