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

  statusText = 'Completing sign in...';

  async ngOnInit(): Promise<void> {
    try {
      // Wait a tick for the Supabase client to process the OAuth hash fragment.
      // detectSessionInUrl: true runs during createClient, but we need the
      // session to be fully settled before proceeding.
      await new Promise((r) => setTimeout(r, 100));

      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (!data.session?.user) {
        // No session found — OAuth may not have completed.
        this.statusText = 'Sign in was not completed. Redirecting...';
        await new Promise((r) => setTimeout(r, 1500));
        void this.router.navigate(['/auth/login']);
        return;
      }

      this.statusText = 'Loading your account...';

      // loadAuthUser creates profile, assigns role, creates patient row
      const authUser = await this.authService.loadAuthUser(
        data.session.user,
        data.session
      );

      // Persist and set user in state
      this.authService.persistUser(authUser);
      this.authState.setUser(authUser);

      // Navigate to the correct portal
      this.authService.navigateByRole(authUser);
    } catch (err: unknown) {
      console.error('[AuthCallback] OAuth callback error:', err);
      this.statusText = err instanceof Error ? err.message : 'Sign in failed.';
      await new Promise((r) => setTimeout(r, 2000));
      this.authState.clearError();
      void this.router.navigate(['/auth/login']);
    }
  }
}
