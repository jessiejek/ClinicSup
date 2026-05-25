import { AsyncPipe, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [AsyncPipe, NgIf],
  template: `
    <div class="auth-callback">
      <div class="auth-callback__spinner"></div>
      <p>{{ statusText }}</p>
    </div>
  `,
  styles: [`
    .auth-callback {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      padding: 2rem;
      text-align: center;
      color: var(--ion-color-medium);
    }
    .auth-callback__spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--ion-color-light);
      border-top-color: var(--ion-color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AuthCallbackPage implements OnInit {
  private readonly supabase = inject(SupabaseService).client;
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  statusText = 'Completing sign in...';

  async ngOnInit(): Promise<void> {
    try {
      // Wait a tick for the Supabase client to process the OAuth hash fragment.
      await new Promise((r) => setTimeout(r, 100));

      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (!data.session?.user) {
        this.statusText = 'Sign in was not completed. Redirecting...';
        await new Promise((r) => setTimeout(r, 1500));
        void this.router.navigate(['/auth/login']);
        return;
      }

      this.statusText = 'Loading your account...';

      const accessToken = data.session.access_token;

      // loadAuthUser creates profile, assigns role (defaults to Patient), creates patient row
      const authUser = await this.authService.loadAuthUser(
        data.session.user,
        data.session
      );

      // ---- Social Login Activation: check for pending doctor or staff invite ----
      // Run both checks in parallel to minimize delay (each Edge Function cold-starts)
      let activeRole = authUser.role;
      if (activeRole === 'Patient') {
        this.statusText = 'Checking for invitations...';
        try {
          const [doctorResult, staffResult] = await Promise.all([
            this.tryActivateDoctorInvite(accessToken).catch((e: unknown) => {
              console.warn('[AuthCallback] Doctor activation check failed:', e);
              return null;
            }),
            this.tryActivateStaffInvite(accessToken).catch((e: unknown) => {
              console.warn('[AuthCallback] Staff activation check failed:', e);
              return null;
            }),
          ]);

          // Doctor invite has priority (checked first)
          if (doctorResult?.activated && doctorResult.role === 'doctor') {
            const refreshedSession = await this.supabase.auth.getSession();
            if (refreshedSession.data.session?.user) {
              const reloadedUser = await this.authService.loadAuthUser(
                refreshedSession.data.session.user,
                refreshedSession.data.session
              );
              this.authService.persistUser(reloadedUser);
              this.authState.setUser(reloadedUser);
              activeRole = 'Doctor';
              void this.router.navigate(['/doctor/dashboard']);
              return;
            }
          }

          // Staff invite checked second
          if (staffResult?.activated && staffResult.role === 'staff') {
            const refreshedSession = await this.supabase.auth.getSession();
            if (refreshedSession.data.session?.user) {
              const reloadedUser = await this.authService.loadAuthUser(
                refreshedSession.data.session.user,
                refreshedSession.data.session
              );
              this.authService.persistUser(reloadedUser);
              this.authState.setUser(reloadedUser);
              activeRole = 'Staff';
              void this.router.navigate(['/staff/dashboard']);
              return;
            }
          }
        } catch (activateErr: unknown) {
          console.warn('[AuthCallback] Both activation checks failed (non-fatal):', activateErr);
        }
      }

      // Persist and set user in state (if not already redirected as doctor/staff)
      if (activeRole !== 'Doctor' && activeRole !== 'Staff') {
        this.authService.persistUser(authUser);
        this.authState.setUser(authUser);
        this.authService.navigateByRole(authUser);
      }
    } catch (err: unknown) {
      console.error('[AuthCallback] OAuth callback error:', err);
      this.statusText = err instanceof Error ? err.message : 'Sign in failed.';
      await new Promise((r) => setTimeout(r, 2000));
      this.authState.clearError();
      void this.router.navigate(['/auth/login']);
    }
  }

  private async tryActivateDoctorInvite(accessToken: string): Promise<{ activated: boolean; role: string | null } | null> {
    const { data: funcData, error: funcError } = await this.supabase.functions.invoke(
      'activate-doctor-invite',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (funcError) {
      console.warn('[AuthCallback] activate-doctor-invite invocation error:', funcError);
      return null;
    }

    return funcData as { activated: boolean; role: string | null } | null;
  }

  private async tryActivateStaffInvite(accessToken: string): Promise<{ activated: boolean; role: string | null } | null> {
    const { data: funcData, error: funcError } = await this.supabase.functions.invoke(
      'activate-staff-invite',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (funcError) {
      console.warn('[AuthCallback] activate-staff-invite invocation error:', funcError);
      return null;
    }

    return funcData as { activated: boolean; role: string | null } | null;
  }
}
