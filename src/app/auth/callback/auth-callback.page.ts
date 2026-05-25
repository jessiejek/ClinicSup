import { AsyncPipe, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { SupabaseService } from '../../core/services/supabase.service';

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
  private readonly sessionTimeoutMs = 12000;
  private readonly accountLoadTimeoutMs = 12000;
  private readonly inviteCheckTimeoutMs = 8000;

  statusText = 'Completing sign in...';

  async ngOnInit(): Promise<void> {
    try {
      const session = await this.resolveOAuthSession();

      if (!session?.user) {
        this.statusText = 'Sign in was not completed. Redirecting...';
        await new Promise((r) => setTimeout(r, 1500));
        void this.router.navigate(['/auth/login']);
        return;
      }

      this.statusText = 'Checking your account...';

      try {
        const doctorActivation = await this.tryActivateInviteFunction(
          'activate-doctor-invite',
          session.access_token
        );

        if (doctorActivation?.activated && doctorActivation.role === 'doctor') {
          await this.finishActivatedLogin('/doctor');
          return;
        }

        const staffActivation = await this.tryActivateInviteFunction(
          'activate-staff-invite',
          session.access_token
        );

        if (staffActivation?.activated && staffActivation.role === 'staff') {
          await this.finishActivatedLogin('/staff');
          return;
        }
      } catch (activateErr: unknown) {
        console.warn('[AuthCallback] Invite activation check failed (non-fatal):', activateErr);
      }

      this.statusText = 'Loading your account...';

      // loadAuthUser creates profile, resolves role, and only creates a patient row when needed.
      const authUser = await this.withTimeout(
        this.authService.loadAuthUser(session.user, session),
        this.accountLoadTimeoutMs,
        'Loading your account is taking longer than expected.'
      );

      this.authService.persistUser(authUser);
      this.authState.setUser(authUser);
      this.authService.navigateByRole(authUser);
    } catch (err: unknown) {
      console.error('[AuthCallback] OAuth callback error:', err);
      this.statusText = err instanceof Error ? err.message : 'Sign in failed.';
      await new Promise((r) => setTimeout(r, 2000));
      this.authState.clearError();
      void this.router.navigate(['/auth/login']);
    }
  }

  private async finishActivatedLogin(portalRoute: '/doctor' | '/staff'): Promise<void> {
    const refreshedSession = await this.withTimeout(
      this.supabase.auth.getSession(),
      this.sessionTimeoutMs,
      'Session refresh timed out.'
    );

    if (!refreshedSession.data.session?.user) {
      throw new Error('Your account was activated, but the session could not be refreshed.');
    }

    const reloadedUser = await this.withTimeout(
      this.authService.loadAuthUser(
        refreshedSession.data.session.user,
        refreshedSession.data.session
      ),
      this.accountLoadTimeoutMs,
      'Reloading your account timed out.'
    );

    this.authService.persistUser(reloadedUser);
    this.authState.setUser(reloadedUser);
    void this.router.navigate([portalRoute]);
  }

  private async tryActivateInviteFunction(
    functionName: 'activate-doctor-invite' | 'activate-staff-invite',
    accessToken: string
  ): Promise<{ activated: boolean; role: string | null } | null> {
    const { data, error } = await this.withTimeout(
      Promise.resolve(
        this.supabase.functions.invoke<{ activated: boolean; role: string | null }>(
          functionName,
          {
            method: 'POST',
            body: {},
            headers: {
              Authorization: `Bearer ${accessToken}`
            },
            timeout: this.inviteCheckTimeoutMs
          }
        )
      ),
      this.inviteCheckTimeoutMs + 1000,
      `${functionName} timed out.`
    );

    if (error) {
      console.warn(`[AuthCallback] ${functionName} failed:`, error);
      return null;
    }

    return data ?? null;
  }

  private async resolveOAuthSession() {
    const oauthUrl = new URL(window.location.href);
    const code = oauthUrl.searchParams.get('code');

    if (code) {
      const { data, error } = await this.withTimeout(
        this.supabase.auth.exchangeCodeForSession(code),
        this.sessionTimeoutMs,
        'OAuth code exchange timed out.'
      );

      if (error) {
        throw error;
      }

      if (data.session) {
        return data.session;
      }
    }

    const sessionAttempts = [0, 250, 500, 1000];
    for (const delayMs of sessionAttempts) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const { data, error } = await this.withTimeout(
        this.supabase.auth.getSession(),
        this.sessionTimeoutMs,
        'Fetching the Supabase session timed out.'
      );

      if (error) {
        throw error;
      }

      if (data.session?.user) {
        return data.session;
      }
    }

    return null;
  }

  private async withTimeout<T>(
    promise: PromiseLike<T> | Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race<T>([
        Promise.resolve(promise),
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        })
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

}
