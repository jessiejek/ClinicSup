import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, Role } from '../models';
import { ApiService } from './api.service';
import { TokenService } from './token.service';

export interface AuthSessionDto {
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;
}

export interface AuthUserDto {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  isFirstLogin: boolean;
}

export interface RefreshTokenDto {
  accessToken: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userStorageKey = 'clinic.auth.user';
  private readonly api = inject(ApiService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  login(email: string, password: string): Observable<AuthUser> {
    return this.api.post<AuthSessionDto>('auth/login', {
      email: email.trim(),
      password
    }).pipe(
      tap((res) => this.storeTokens(res.accessToken, res.refreshToken)),
      map((res) => this.toAuthUser(res.user, res.accessToken))
    );
  }

  loginWithGoogle(idToken?: string): Observable<AuthUser> {
    if (!idToken) {
      // If no idToken provided, redirect to the backend's Google OAuth endpoint
      window.location.href = `${environment.apiUrl || environment.apiBaseUrl}/auth/google`;
      return throwError(() => new Error('Redirecting to Google...'));
    }
    return this.api.post<AuthSessionDto>('auth/google', {
      provider: 'Google',
      idToken,
      accessToken: null
    }).pipe(
      tap((res) => this.storeTokens(res.accessToken, res.refreshToken)),
      map((res) => this.toAuthUser(res.user, res.accessToken))
    );
  }

  loginWithFacebook(accessToken?: string, userId?: string): Observable<AuthUser> {
    if (!accessToken || !userId) {
      window.location.href = `${environment.apiUrl || environment.apiBaseUrl}/auth/facebook`;
      return throwError(() => new Error('Redirecting to Facebook...'));
    }
    return this.api.post<AuthSessionDto>('auth/facebook', {
      accessToken,
      userId
    }).pipe(
      tap((res) => this.storeTokens(res.accessToken, res.refreshToken)),
      map((res) => this.toAuthUser(res.user, res.accessToken))
    );
  }

  registerPatient(
    firstName: string,
    middleName: string | undefined,
    lastName: string,
    email: string,
    password: string
  ): Observable<AuthUser> {
    return this.api.post<AuthSessionDto>('auth/register', {
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.trim(),
      password
    }).pipe(
      tap((res) => this.storeTokens(res.accessToken, res.refreshToken)),
      map((res) => this.toAuthUser(res.user, res.accessToken))
    );
  }

  refreshTokens(): Observable<void> {
    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Session expired.'));
    }

    return this.api.post<RefreshTokenDto>('auth/refresh-token', { refreshToken }).pipe(
      tap((res) => this.storeTokens(res.accessToken, res.refreshToken)),
      map(() => void 0),
      catchError((error: unknown) => {
        this.clearSession();
        return throwError(() => error);
      })
    );
  }

  restoreSession(): Observable<AuthUser | null> {
    const hasTokens = this.tokenService.hasAccessToken() || this.tokenService.hasRefreshToken();
    if (!hasTokens) {
      this.clearSession();
      return of(null);
    }

    return this.api.get<AuthUserDto>('auth/me').pipe(
      map((user) => this.toAuthUser(user, this.tokenService.getAccessToken() ?? undefined)),
      catchError((error: unknown) => {
        this.clearSession();
        return throwError(() => error);
      })
    );
  }

  setPassword(newPassword: string, confirmPassword: string): Observable<AuthUser> {
    if (newPassword !== confirmPassword) {
      return throwError(() => new Error('Passwords do not match.'));
    }

    return this.api.post<AuthUserDto>('auth/set-password', { newPassword, confirmPassword }).pipe(
      map((user) => this.toAuthUser(user, this.tokenService.getAccessToken() ?? undefined))
    );
  }

  updateProfile(payload: { fullName?: string; avatarUrl?: string }): Observable<AuthUserDto> {
    return this.api.put<AuthUserDto>('auth/me', payload).pipe(
      tap((user) => {
        const current = this.getStoredUser();
        if (current) {
          this.persistUser({ ...current, fullName: user.fullName, avatarUrl: user.avatarUrl ?? undefined });
        }
      })
    );
  }

  logout(): void {
    const refreshToken = this.tokenService.getRefreshToken();
    const request$ = refreshToken
      ? this.api.post('auth/logout', { refreshToken }).pipe(catchError(() => of(void 0)))
      : of(void 0);

    request$.pipe(
      tap(() => this.clearSession()),
      tap(() => void this.router.navigate(['/auth/login'], { replaceUrl: true }))
    ).subscribe();
  }

  persistUser(user: AuthUser): void {
    localStorage.setItem(this.userStorageKey, JSON.stringify(user));
  }

  clearSession(): void {
    this.tokenService.clearTokens();
    localStorage.removeItem(this.userStorageKey);
  }

  navigateByRole(user: AuthUser): void {
    if (user.isFirstLogin) {
      void this.router.navigate(['/auth/set-password']);
      return;
    }

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

  private storeTokens(accessToken: string, refreshToken: string): void {
    this.tokenService.setTokens(accessToken, refreshToken);
  }

  private toAuthUser(user: AuthUserDto, accessToken?: string): AuthUser {
    const resolvedRole = this.resolveRole(user.role, accessToken);
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: resolvedRole,
      avatarUrl: user.avatarUrl ?? undefined,
      isFirstLogin: user.isFirstLogin
    };
  }

  private resolveRole(roleValue: unknown, accessToken?: string): Role {
    const normalized = normalizeRole(roleValue);
    if (normalized) return normalized;

    if (accessToken) {
      const fromToken = this.resolveRoleFromToken(accessToken);
      if (fromToken) return fromToken;
    }

    throw new Error('Unable to determine authenticated user role.');
  }

  private resolveRoleFromToken(token: string): Role | undefined {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      for (const key of ['role', 'Role', 'roles', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) {
        const candidate = payload[key];
        const resolved = normalizeRole(candidate);
        if (resolved) return resolved;
        if (Array.isArray(candidate)) {
          for (const value of candidate) {
            const r = normalizeRole(value);
            if (r) return r;
          }
        }
      }
    } catch { /* ignore */ }
    return undefined;
  }

  private getStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(this.userStorageKey);
      return raw ? JSON.parse(raw) as AuthUser : null;
    } catch {
      return null;
    }
  }
}

function normalizeRole(value: unknown): Role | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  const roles: Role[] = ['Admin', 'Staff', 'Doctor', 'Patient'];
  return roles.find((r) => r.toLowerCase() === normalized);
}
