import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ToastController } from '@ionic/angular/standalone';
import { SupabaseService } from '../../../core/services/supabase.service';

interface StaffRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
}

interface CreateStaffResponse {
  userId: string;
  email: string;
  fullName: string;
  role: string;
}

interface UpdateStatusResponse {
  userId: string;
  status: 'Active' | 'Inactive';
  banned: boolean;
}

@Component({
  selector: 'app-admin-staff-page',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent],
  template: `
    <section class="page-shell">
      <div class="page-shell__header">
        <div>
          <h2 class="page-title">Staff Accounts</h2>
          <p class="page-subtitle">Manage front desk accounts.</p>
        </div>
        <button class="btn-primary" type="button" (click)="openAddStaffForm()">Add Staff</button>
      </div>

      <!-- Loading state -->
      <app-skeleton variant="row" [count]="5" *ngIf="loading"></app-skeleton>

      <!-- Error state -->
      <div class="notice notice--error" *ngIf="error && !loading">
        <p>{{ error }}</p>
        <button class="btn-ghost" type="button" (click)="ngOnInit()">Try again</button>
      </div>

      <!-- Staff table -->
      <div class="clinic-card" *ngIf="!loading && !error && staff.length > 0">
        <div class="table-scroll-wrap">
        <table class="clinic-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr *ngFor="let member of staff">
              <td>{{ member.fullName }}</td>
              <td>{{ member.email }}</td>
              <td>{{ member.role }}</td>
              <td><app-status-badge [status]="member.status"></app-status-badge></td>
              <td>
                <button class="btn-ghost" type="button" (click)="toggle(member.id)" [disabled]="toggleBusy.has(member.id)">
                  {{ toggleBusy.has(member.id) ? '\u2026' : (member.status === 'Active' ? 'Deactivate' : 'Reactivate') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- Empty state -->
      <app-empty-state *ngIf="!loading && !error && staff.length === 0" icon="person-add-outline" title="No staff accounts" description="Create the first front desk account to continue." ctaLabel="Add Staff" (ctaClick)="openAddStaffForm()"></app-empty-state>

      <!-- Inline Add Staff form -->
      <section *ngIf="showAddStaffForm" class="add-staff-panel">
        <h3>Add Staff</h3>
        <form class="add-staff-form" (ngSubmit)="save()">
          <input class="filter-input" name="fullName" [(ngModel)]="draft.fullName" placeholder="Full Name" required />
          <input class="filter-input" name="email" type="email" [(ngModel)]="draft.email" placeholder="Email" required />
          <input class="filter-input" name="password" [(ngModel)]="draft.password" placeholder="Temporary Password (optional)" />
          <p class="text-sm text-muted" *ngIf="addError">{{ addError }}</p>
          <div class="add-staff-actions">
            <button type="button" class="btn-ghost" (click)="closeAddStaffForm()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="addSubmitting">
              {{ addSubmitting ? 'Creating\u2026' : 'Create Staff' }}
            </button>
          </div>
        </form>
      </section>
    </section>
  `,
  styleUrl: './staff.page.scss'
})
export class StaffPage implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly toastCtrl = inject(ToastController);

  staff: StaffRow[] = [];
  loading = true;
  error: string | null = null;

  showAddStaffForm = false;
  draft = { fullName: '', email: '', password: '' };
  addError: string | null = null;
  addSubmitting = false;

  /** Track which staff IDs have an in-flight toggle request */
  toggleBusy = new Set<string>();

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.error = null;
    await this.loadStaff();
  }

  private async loadStaff(): Promise<void> {
    try {
      // Step 1: fetch user_ids from user_roles where role = 'staff'
      const { data: roles, error: rolesError } = await this.supabase.client
        .from('user_roles')
        .select('user_id')
        .eq('role', 'staff');

      if (rolesError) throw new Error(rolesError.message);

      if (!roles || roles.length === 0) {
        this.staff = [];
        return;
      }

      const userIds = roles.map(r => r.user_id);

      // Step 2: fetch profiles for those user_ids
      // The `status` column requires the SQL migration in SUPABASE_EDGE_FUNCTIONS_DEPLOY.md.
      // If it does not exist yet, the query will fail — we catch and fall back.
      let profiles: { id: string; full_name: string; email: string | null; status?: string | null }[] = [];

      try {
        const { data, error: profilesError } = await this.supabase.client
          .from('profiles')
          .select('id, full_name, email, status')
          .in('id', userIds);

        if (profilesError) throw profilesError;
        profiles = data || [];
      } catch (_profileQueryErr: any) {
        // Column may not exist yet — retry without `status`
        console.warn('profiles.status column not found, falling back without it. Run the SQL migration in SUPABASE_EDGE_FUNCTIONS_DEPLOY.md');
        const { data, error: fallbackError } = await this.supabase.client
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (fallbackError) throw new Error(fallbackError.message);
        profiles = (data || []).map(p => ({ ...p, status: null }));
      }

      this.staff = profiles.map(p => ({
        id: p.id,
        fullName: p.full_name,
        email: p.email || '',
        role: 'Staff',
        status: (p.status === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
      }));
    } catch (err: any) {
      console.error('Failed to load staff:', err);
      this.error = err?.message || 'Could not load staff accounts. Please try again.';
      this.staff = [];
    } finally {
      this.loading = false;
    }
  }

  openAddStaffForm(): void {
    this.draft = { fullName: '', email: '', password: '' };
    this.addError = null;
    this.addSubmitting = false;
    this.showAddStaffForm = true;
    console.log('[AdminStaff] Add Staff form opened');
  }

  closeAddStaffForm(): void {
    this.showAddStaffForm = false;
    this.draft = { fullName: '', email: '', password: '' };
    this.addError = null;
    this.addSubmitting = false;
  }

  async save(): Promise<void> {
    this.addError = null;
    this.addSubmitting = true;

    try {
      // Explicitly get session and access token
      const { data: sessionData } = await this.supabase.client.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        const msg = 'Your admin session expired. Please log in again.';
        this.addError = msg;
        const toast = await this.toastCtrl.create({
          message: msg,
          duration: 5000,
          position: 'bottom',
          color: 'danger',
        });
        await toast.present();
        return;
      }

      const bodyPayload: Record<string, unknown> = {
        fullName: this.draft.fullName.trim(),
        email: this.draft.email.trim(),
      };
      const pw = this.draft.password.trim();
      if (pw) {
        bodyPayload['password'] = pw;
      }

      const { data, error } = await this.supabase.client.functions.invoke<CreateStaffResponse>(
        'create-staff',
        {
          body: bodyPayload,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (error) {
        console.error('[AdminStaff] create-staff failed:', error);
        const httpStatus = (error as any)?.context?.status ?? '';
        const msg = error.message || 'Failed to create staff account.';
        throw new Error(httpStatus ? `Error ${httpStatus}: ${msg}` : msg);
      }

      if (!data?.userId) {
        throw new Error('No user ID returned from create-staff function.');
      }

      // Success — hide inline form and reload
      this.showAddStaffForm = false;
      await this.loadStaff();

      const toast = await this.toastCtrl.create({
        message: `Staff account created for ${data.fullName} (${data.email})`,
        duration: 4000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    } catch (err: any) {
      const message = err?.message || 'Could not create staff account.';
      this.addError = message;

      const toast = await this.toastCtrl.create({
        message,
        duration: 5000,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.addSubmitting = false;
    }
  }

  async toggle(id: string): Promise<void> {
    if (this.toggleBusy.has(id)) return;
    this.toggleBusy.add(id);

    try {
      // Explicitly get session token
      const { data: sessionData } = await this.supabase.client.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        const msg = 'Your admin session expired. Please log in again.';
        const toast = await this.toastCtrl.create({
          message: msg,
          duration: 5000,
          position: 'bottom',
          color: 'danger',
        });
        await toast.present();
        return;
      }

      const member = this.staff.find(s => s.id === id);
      if (!member) return;

      const action = member.status === 'Active' ? 'ban' : 'unban';

      const { data, error } = await this.supabase.client.functions.invoke<UpdateStatusResponse>(
        'update-staff-status',
        {
          body: { userId: id, action },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (error) {
        console.error('[AdminStaff] update-staff-status failed:', error);
        const httpStatus = (error as any)?.context?.status ?? '';
        const msg = error.message || `Failed to ${action} staff member.`;
        throw new Error(httpStatus ? `Error ${httpStatus}: ${msg}` : msg);
      }

      // Reload the list to reflect updated status
      await this.loadStaff();

      const toast = await this.toastCtrl.create({
        message: data?.status === 'Active'
          ? 'Staff account reactivated.'
          : 'Staff account deactivated.',
        duration: 3000,
        position: 'bottom',
        color: data?.status === 'Active' ? 'success' : 'warning',
      });
      await toast.present();
    } catch (err: any) {
      const message = err?.message || 'Could not update staff status.';

      const toast = await this.toastCtrl.create({
        message,
        duration: 5000,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.toggleBusy.delete(id);
    }
  }
}
