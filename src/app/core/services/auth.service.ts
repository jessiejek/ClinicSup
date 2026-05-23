import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { Observable, catchError, from, map, of, throwError } from 'rxjs';
import { AuthUser, Role } from '../models';
import { SupabaseService } from './supabase.service';
import { TokenService } from './token.service';

type SupabaseAppRole = 'patient' | 'doctor' | 'staff' | 'admin' | 'super_admin';

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_first_login: boolean | null;
  is_active: boolean | null;
}

interface UserRoleRow {
  role: SupabaseAppRole;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userStorageKey = 'clinic.auth.user';
  private readonly supabase = inject(SupabaseService).client;
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  login(email: string, password: string): Observable<AuthUser> {
    return from(this.loginAsync(email, password));
  }

  loginWithGoogle(_idToken: string): Observable<AuthUser> {
    return throwError(() => new Error('Google sign-in is deferred until Supabase OAuth is wired.'));
  }

  loginWithFacebook(_accessToken: string, _userId: string): Observable<AuthUser> {
    return throwError(() => new Error('Facebook sign-in is deferred until Supabase OAuth is wired.'));
  }

  registerPatient(
    firstName: string,
    middleName: string | undefined,
    lastName: string,
    email: string,
    password: string
  ): Observable<AuthUser> {
    return from(this.registerPatientAsync(firstName, middleName, lastName, email, password));
  }

  refreshTokens(): Observable<void> {
    return from(this.supabase.auth.refreshSession()).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }

        this.storeSessionTokens(data.session);
        return void 0;
      }),
      catchError((error: unknown) => {
        this.clearSession();
        return throwError(() => this.normalizeAuthError(error, 'Session refresh failed.'));
      })
    );
  }

  restoreSession(): Observable<AuthUser | null> {
    return from(this.restoreSessionAsync()).pipe(
      catchError((error: unknown) => {
        this.clearSession();
        return throwError(() => this.normalizeAuthError(error, 'Session restore failed.'));
      })
    );
  }

  setPassword(newPassword: string, confirmPassword: string): Observable<AuthUser> {
    if (newPassword !== confirmPassword) {
      return throwError(() => new Error('Passwords do not match.'));
    }

    return from(this.setPasswordAsync(newPassword));
  }

  logout(): void {
    from(this.supabase.auth.signOut()).pipe(
      catchError(() => of({ error: null }))
    ).subscribe(() => {
      this.clearSession();
      void this.router.navigate(['/auth/login']);
    });
  }

  persistUser(user: AuthUser): void {
    localStorage.setItem(this.userStorageKey, JSON.stringify(user));
  }

  clearSession(): void {
    this.tokenService.clearTokens();
    localStorage.removeItem(this.userStorageKey);
  }

  navigateByRole(user: AuthUser): void {
    // Supabase profile first-login handling is deferred for this migration pass.
    // Do not redirect to set-password; Supabase Auth already owns password state.
    switch (user.role) {
      case 'Admin':
        void this.router.navigate(['/admin/dashboard']);
        break;
      case 'Staff':
        void this.router.navigate(['/staff/dashboard']);
        break;
      case 'Doctor':
        void this.router.navigate(['/doctor/dashboard']);
        break;
      case 'Patient':
        void this.router.navigate(['/patient/dashboard']);
        break;
      default:
        void this.router.navigate(['/auth/login']);
    }
  }

  private async loginAsync(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Login succeeded but Supabase did not return a user.');
    }

    this.storeSessionTokens(data.session);
    return this.loadAuthUser(data.user, data.session);
  }

  private async registerPatientAsync(
    firstName: string,
    middleName: string | undefined,
    lastName: string,
    email: string,
    password: string
  ): Promise<AuthUser> {
    const fullName = [firstName, middleName, lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ');

    const { data, error } = await this.supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName.trim(),
          middle_name: middleName?.trim() || null,
          last_name: lastName.trim(),
          app_role: 'patient'
        }
      }
    });

    if (error) {
      throw error;
    }

    if (!data.session || !data.user) {
      throw new Error('Registration created. Please confirm your email, then log in.');
    }

    this.storeSessionTokens(data.session);

    // Full patient self-registration needs a dedicated Supabase RPC because patients
    // require DOB/sex and user_roles is protected. For now, login/session is Phase 0.
    throw new Error(
      'Registration auth account was created. Patient profile creation is deferred until the patient registration RPC/form is added.'
    );
  }

  private async restoreSessionAsync(): Promise<AuthUser | null> {
    const { data, error } = await this.supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (!data.session?.user) {
      this.clearSession();
      return null;
    }

    this.storeSessionTokens(data.session);
    return this.loadAuthUser(data.session.user, data.session);
  }

  private async setPasswordAsync(newPassword: string): Promise<AuthUser> {
    const { data, error } = await this.supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    const { data: sessionData } = await this.supabase.auth.getSession();
    this.storeSessionTokens(sessionData.session);

    if (!data.user) {
      throw new Error('Password updated, but Supabase did not return a user.');
    }

    return this.loadAuthUser(data.user, sessionData.session);
  }

  private async loadAuthUser(user: User, session: Session | null): Promise<AuthUser> {
    const [profile, role] = await Promise.all([
      this.loadProfile(user),
      this.loadPrimaryRole(user.id)
    ]);

    const authUser: AuthUser = {
      id: user.id,
      fullName:
        profile?.full_name ||
        readStringMetadata(user, 'full_name') ||
        user.email ||
        'Clinic User',
      email: profile?.email || user.email || '',
      role,
      avatarUrl: profile?.avatar_url ?? undefined,
      // Keep false during Supabase migration so users do not get forced into the old set-password flow.
      isFirstLogin: false
    };

    this.storeSessionTokens(session);
    this.persistUser(authUser);

    return authUser;
  }

  private async loadProfile(user: User): Promise<ProfileRow | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, is_first_login, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as ProfileRow | null;
  }

  private async loadPrimaryRole(userId: string): Promise<Role> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const roles = (data ?? []) as UserRoleRow[];
    const priority: SupabaseAppRole[] = ['super_admin', 'admin', 'staff', 'doctor', 'patient'];
    const resolved = priority.find((role) => roles.some((row) => row.role === role));

    if (!resolved) {
      throw new Error('Your account has no app role yet. Ask an admin to assign a role.');
    }

    return mapSupabaseRoleToAngularRole(resolved);
  }

  private storeSessionTokens(session: Session | null): void {
    if (!session) {
      return;
    }

    this.tokenService.setTokens(session.access_token, session.refresh_token);
  }

  private normalizeAuthError(error: unknown, fallback: string): Error {
    if (error instanceof AuthError) {
      return new Error(error.message || fallback);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(fallback);
  }
}

function mapSupabaseRoleToAngularRole(role: SupabaseAppRole): Role {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'Admin';
    case 'staff':
      return 'Staff';
    case 'doctor':
      return 'Doctor';
    case 'patient':
      return 'Patient';
  }
}

function readStringMetadata(user: User, key: string): string | undefined {
  const value = user.user_metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
