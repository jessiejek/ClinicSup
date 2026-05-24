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
  status: string; // 'Active' | 'Inactive' | 'Invited'
  isInvite: boolean;
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
          <p class="page-subtitle">Manage front desk accounts. Use "Invite Staff" to let them activate via Google/Facebook.</p>
        </div>
        <button class="btn-primary" type="button" (click)="openAddStaffForm()">Invite Staff</button>
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
                <ng-container *ngIf="!member.isInvite">
                  <button class="btn-ghost" type="button" (click)="toggle(member.id)" [disabled]="toggleBusy.has(member.id)">
                    {{ toggleBusy.has(member.id) ? '\u2026' : (member.status === 'Active' ? 'Deactivate' : 'Reactivate') }}
                  </button>
                </ng-container>
                <ng-container *ngIf="member.isInvite">
                  <button class="btn-ghost" type="button" (click)="revokeInvite(member.id)" [disabled]="busyRevoke">
                    {{ busyRevoke ? '\u2026' : 'Revoke' }}
                  </button>
                </ng-container>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- Empty state -->
      <app-empty-state *ngIf="!loading && !error && staff.length === 0" icon="person-add-outline" title="No staff accounts" description="Invite the first front desk staff member." ctaLabel="Invite Staff" (ctaClick)="openAddStaffForm()"></app-empty-state>

      <!-- Inline Invite Staff form -->
      <section *ngIf="showAddStaffForm" class="add-staff-panel">
        <h3>Invite Staff</h3>
        <p class="text-sm text-muted">The staff member will use this email to sign in with Google or Facebook. No password needed.</p>
        <form class="add-staff-form" (ngSubmit)="save()">
          <input class="filter-input" name="fullName" [(ngModel)]="draft.fullName" placeholder="Full Name" required />
          <input class="filter-input" name="email" type="email" [(ngModel)]="draft.email" placeholder="Email" required />
          <input class="filter-input" name="phone" [(ngModel)]="draft.phone" placeholder="Phone (optional)" />
          <p class="text-sm text-muted" *ngIf="addError">{{ addError }}</p>
          <div class="add-staff-actions">
            <button type="button" class="btn-ghost" (click)="closeAddStaffForm()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="addSubmitting">
              {{ addSubmitting ? 'Sending invite\u2026' : 'Send Invite' }}
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
  draft = { fullName: '', email: '', phone: '' };
  addError: string | null = null;
  addSubmitting = false;

  /** Track which staff IDs have an in-flight toggle request */
  toggleBusy = new Set<string>();
  busyRevoke = false;

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

      const staffRows: StaffRow[] = [];

      if (roles && roles.length > 0) {
        const userIds = roles.map(r => r.user_id);

        // Step 2: fetch profiles for those user_ids
        try {
          const { data: profiles, error: profilesError } = await this.supabase.client
            .from('profiles')
            .select('id, full_name, email, status')
            .in('id', userIds);

          if (profilesError) throw profilesError;
          if (profiles) {
            for (const p of profiles) {
              staffRows.push({
                id: p.id,
                fullName: p.full_name,
                email: p.email || '',
                role: 'Staff',
                status: (p.status === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
                isInvite: false,
              });
            }
          }
        } catch (_profileQueryErr: any) {
          // Column may not exist yet — retry without `status`
          console.warn('profiles.status column not found, falling back without it.');
          const { data: profiles, error: fallbackError } = await this.supabase.client
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

          if (fallbackError) throw new Error(fallbackError.message);
          if (profiles) {
            for (const p of profiles) {
              staffRows.push({
                id: p.id,
                fullName: p.full_name,
                email: p.email || '',
                role: 'Staff',
                status: 'Active',
                isInvite: false,
              });
            }
          }
        }
      }

      // Step 3: also load pending staff invites
      try {
        const { data: invites, error: invitesError } = await this.supabase.client
          .from('staff_invites')
          .select('id, email, full_name, status, created_at')
          .in('status', ['pending', 'accepted']);

        if (!invitesError && invites) {
          const activatedEmails = new Set(staffRows.map(s => s.email.toLowerCase()));
          for (const inv of invites) {
            // Only show pending invites (accepted ones are already in staffRows via profiles)
            if (inv.status === 'pending') {
              staffRows.push({
                id: inv.id,
                fullName: inv.full_name,
                email: inv.email,
                role: 'Staff',
                status: 'Invited',
                isInvite: true,
              });
            }
          }
        }
      } catch (_inviteErr: any) {
        // staff_invites table may not exist yet — that's fine, show only activated staff
        console.warn('staff_invites table not available yet. Deploy SUPABASE_REQUIRED_STAFF_INVITES_SQL.md.');
      }

      this.staff = staffRows;
    } catch (err: any) {
      console.error('Failed to load staff:', err);
      this.error = err?.message || 'Could not load staff accounts. Please try again.';
      this.staff = [];
    } finally {
      this.loading = false;
    }
  }

  openAddStaffForm(): void {
    this.draft = { fullName: '', email: '', phone: '' };
    this.addError = null;
    this.addSubmitting = false;
    this.showAddStaffForm = true;
  }

  closeAddStaffForm(): void {
    this.showAddStaffForm = false;
    this.draft = { fullName: '', email: '', phone: '' };
    this.addError = null;
    this.addSubmitting = false;
  }

  async save(): Promise<void> {
    this.addError = null;
    this.addSubmitting = true;

    try {
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

      const normalizedEmail = this.draft.email.trim().toLowerCase();

      // Insert pending staff invite
      const payload: Record<string, unknown> = {
        email: normalizedEmail,
        full_name: this.draft.fullName.trim(),
        phone: this.draft.phone.trim() || null,
        status: 'pending',
      };

      const { data, error } = await this.supabase.client
        .from('staff_invites')
        .insert(payload)
        .select('id, email, full_name')
        .single();

      if (error) {
        if (error.code === '42P01') {
          throw new Error(
            'The staff_invites table does not exist yet. ' +
            'Deploy SUPABASE_REQUIRED_STAFF_INVITES_SQL.md first, then try again.'
          );
        }
        // Handle duplicate email (unique index on pending emails)
        if (error.message?.toLowerCase().includes('duplicate') || error.message?.toLowerCase().includes('already exists')) {
          throw new Error(`An invite for '${normalizedEmail}' is already pending.`);
        }
        throw error;
      }

      const inviteResult = data as { id: string; email: string; full_name: string } | null;

      // Success — hide inline form and reload
      this.showAddStaffForm = false;
      await this.loadStaff();

      const toast = await this.toastCtrl.create({
        message: `Invite sent to ${inviteResult?.full_name || this.draft.fullName} (${normalizedEmail})`,
        duration: 4000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    } catch (err: any) {
      const message = err?.message || 'Could not send staff invite.';
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

  async revokeInvite(inviteId: string): Promise<void> {
    this.busyRevoke = true;
    try {
      const { error } = await this.supabase.client
        .from('staff_invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId);

      if (error) throw error;

      await this.loadStaff();

      const toast = await this.toastCtrl.create({
        message: 'Staff invite revoked.',
        duration: 3000,
        position: 'bottom',
        color: 'warning',
      });
      await toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err?.message || 'Could not revoke invite.',
        duration: 5000,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.busyRevoke = false;
    }
  }

  async toggle(id: string): Promise<void> {
    if (this.toggleBusy.has(id)) return;
    this.toggleBusy.add(id);

    try {
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
