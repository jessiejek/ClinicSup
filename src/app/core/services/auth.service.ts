import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { Observable, catchError, from, map, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, ClinicalRole, Role } from '../models';
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

  loginWithGoogle(): Observable<never> {
    return from(this.loginWithGoogleAsync()).pipe(
      switchMap(() => throwError(() => new Error('Redirecting to Google...')))
    );
  }

  loginWithFacebook(): Observable<never> {
    return from(this.loginWithFacebookAsync()).pipe(
      switchMap(() => throwError(() => new Error('Redirecting to Facebook...')))
    );
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
      void this.router.navigate(['/auth/login'], { replaceUrl: true });
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
        void this.router.navigate(['/admin']);
        break;
      case 'Staff':
        void this.router.navigate(['/staff']);
        break;
      case 'Doctor':
        void this.router.navigate(['/doctor']);
        break;
      case 'Patient':
        void this.router.navigate(['/patient']);
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

  private async loginWithGoogleAsync(): Promise<void> {
    const redirectUrl = `${environment.siteUrl || window.location.origin}/auth/callback`;
    console.log('[Auth] Google OAuth redirectTo:', redirectUrl);
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) {
      throw error;
    }
    // The page will redirect to Google, then back to the app with the OAuth session.
  }

  private async loginWithFacebookAsync(): Promise<void> {
    const redirectUrl = `${environment.siteUrl || window.location.origin}/auth/callback`;
    console.log('[Auth] Facebook OAuth redirectTo:', redirectUrl);
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) {
      throw error;
    }
    // The page will redirect to Facebook, then back to the app with the OAuth session.
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
      // No session returned — email confirmation may be required or identity already exists.
      // The user can log in manually after confirming.
      throw new Error('Registration created. Please confirm your email, then log in.');
    }

    // Session returned immediately — auto-login and create profile/role/patient row
    this.storeSessionTokens(data.session);
    return this.loadAuthUser(data.user, data.session);
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

  async loadAuthUser(user: User, session: Session | null): Promise<AuthUser> {
    const profile = await this.loadProfile(user);
    const resolvedProfile = profile ?? await this.ensureProfileRow(user);

    let role: Role;
    try {
      role = await this.loadPrimaryRole(user.id);
    } catch {
      role = await this.ensureRole(user);
    }

    const clinicalRole = resolveClinicalRoleHint(user, role);

    // If patient role, ensure a patients row exists
    if (role === 'Patient') {
      void this.ensurePatientRow(user, resolvedProfile).catch((error: unknown) => {
        console.warn('Patient row sync failed during login (non-blocking):', error);
      });
    }

    const authUser: AuthUser = {
      id: user.id,
      fullName:
        resolvedProfile?.full_name ||
        readStringMetadata(user, 'full_name') ||
        user.email ||
        'Clinic User',
      email: resolvedProfile?.email || user.email || '',
      role,
      clinicalRole,
      avatarUrl: resolvedProfile?.avatar_url ?? undefined,
      isFirstLogin: false
    };

    this.storeSessionTokens(session);
    this.persistUser(authUser);

    return authUser;
  }

  private async ensureProfileRow(user: User): Promise<ProfileRow> {
    const fullName = readStringMetadata(user, 'full_name') ||
      [readStringMetadata(user, 'first_name'), readStringMetadata(user, 'last_name')]
        .filter(Boolean)
        .join(' ') ||
      user.email ||
      'Clinic User';

    const { data, error } = await this.supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName,
        email: user.email,
        avatar_url: user.user_metadata?.['avatar_url'] ?? user.user_metadata?.['picture'] ?? null,
        is_first_login: true,
        is_active: true,
      }, { onConflict: 'id' })
      .select('id, full_name, email, avatar_url, is_first_login, is_active')
      .single();

    if (error) throw error;
    return data as ProfileRow;
  }

  private async ensureRole(user: User): Promise<Role> {
    const roleErrorMsg = 'Your account has no app role yet. Ask an admin to assign a role.';

    // First check if role exists (might have been created by another request)
    const { data: existingRoles } = await this.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const existingRole = (existingRoles as UserRoleRow[] | null)?.[0]?.role;
    if (existingRole) {
      return mapSupabaseRoleToAngularRole(existingRole);
    }

    // No role exists — insert default 'patient'
    const { error } = await this.supabase
      .from('user_roles')
      .insert({ user_id: user.id, role: 'patient' });

    if (error) {
      // Role insert may fail if user_roles RLS blocks anon inserts.
      // In that case, an admin needs to assign the role manually.
      console.error('Failed to auto-assign patient role:', error);
      return 'Patient';
    }

    return 'Patient';
  }

  /** @description Public helper — any component can call this before booking. */
  async ensurePatientRecord(): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;
    const profile = await this.loadProfile(user);
    const resolvedProfile = profile ?? await this.ensureProfileRow(user);
    await this.ensurePatientRow(user, resolvedProfile);
  }

  private async ensurePatientRow(user: User, profile: ProfileRow): Promise<void> {
    // Check if patient already exists linked to this user
    const { data: existingByUser } = await this.supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingByUser) return;

    // Check by email as fallback (column is `email`, not `contact_email`)
    if (user.email) {
      const { data: existingByEmail } = await this.supabase
        .from('patients')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();
      if (existingByEmail) {
        await this.supabase.from('patients').update({ user_id: user.id }).eq('id', existingByEmail.id);
        return;
      }
    }

    // Generate a unique patient code
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const patientCode = `PAT-${ts}${rand}`;

    // Parse first/last name from profile
    const fullName = profile.full_name || user.email || 'New Patient';
    const firstSpace = fullName.indexOf(' ');
    const firstName = firstSpace === -1 ? fullName : fullName.substring(0, firstSpace);
    const lastName = firstSpace === -1 ? '' : fullName.substring(firstSpace + 1).trim();

    const { error: insertError } = await this.supabase.from('patients').insert({
      patient_code: patientCode,
      user_id: user.id,
      first_name: firstName || fullName,
      last_name: lastName || '.',
      date_of_birth: '2000-01-01',   // TODO: Make nullable via SQL; placeholder until patient completes profile
      sex: 'rather-not-say',          // TODO: Make nullable via SQL; placeholder until patient completes profile
      email: user.email,
      is_guest: false,
    });

    if (insertError) {
      console.warn('Patient row insert failed:', insertError.message);
    }
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

function resolveClinicalRoleHint(user: User, legacyRole: Role): ClinicalRole {
  const hint = [
    user.user_metadata?.['clinical_role'],
    user.user_metadata?.['app_role'],
    user.user_metadata?.['job_title'],
    user.user_metadata?.['position'],
    user.user_metadata?.['role_label']
  ]
    .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
    .find((value) => value.length > 0) ?? '';

  if (hint.includes('physician') || hint.includes('doctor') || hint.includes('md')) {
    return 'physician';
  }

  if (hint.includes('nurse') || hint.includes('rn')) {
    return 'nurse';
  }

  if (hint.includes('assistant') || hint.includes('ma')) {
    return 'medical_assistant';
  }

  if (hint.includes('reception') || hint.includes('front desk') || hint.includes('frontdesk')) {
    return 'receptionist';
  }

  if (hint.includes('admin')) {
    return 'admin';
  }

  switch (legacyRole) {
    case 'Doctor':
      return 'physician';
    case 'Admin':
      return 'admin';
    case 'Staff':
      return 'receptionist';
    default:
      return 'receptionist';
  }
}

function readStringMetadata(user: User, key: string): string | undefined {
  const value = user.user_metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
