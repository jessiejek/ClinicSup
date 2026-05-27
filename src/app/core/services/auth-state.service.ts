import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, catchError, finalize, map, of, tap, throwError } from 'rxjs';
import { AuthUser, Role } from '../models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly authService = inject(AuthService);
  private readonly userSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly loadingSubject = new BehaviorSubject(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  readonly currentUser$ = this.userSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly isAuthenticated$ = this.currentUser$.pipe(map((user) => !!user));
  readonly userRole$ = this.currentUser$.pipe(map((user) => user?.role ?? null));

  readonly currentUser = toSignal(this.currentUser$, { initialValue: null });
  readonly isAuthenticated = toSignal(this.isAuthenticated$, { initialValue: false });
  readonly userRole = toSignal(this.userRole$, { initialValue: null });

  get snapshot(): AuthUser | null {
    return this.userSubject.value;
  }

  restoreSession(): Observable<AuthUser | null> {
    return this.authService.restoreSession().pipe(
      tap((user) => {
        this.userSubject.next(user);
        if (user) {
          this.authService.persistUser(user);
        }
      }),
      catchError((err: unknown) => {
        this.clearState();
        return of(null);
      })
    );
  }

  login(email: string, password: string): Observable<AuthUser> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.authService.login(email, password).pipe(
      tap((user) => {
        this.setUser(user);
        this.authService.navigateByRole(user);
      }),
      catchError((err: unknown) => this.handleAuthError(err, 'Login failed.')),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  loginWithGoogle(): Observable<AuthUser> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.authService.loginWithGoogle().pipe(
      tap((user) => {
        this.setUser(user);
        this.authService.navigateByRole(user);
      }),
      catchError((err: unknown) => this.handleAuthError(err, 'Google login failed.')),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  loginWithFacebook(): Observable<AuthUser> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.authService.loginWithFacebook().pipe(
      tap((user) => {
        this.setUser(user);
        this.authService.navigateByRole(user);
      }),
      catchError((err: unknown) => this.handleAuthError(err, 'Facebook login failed.')),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  register(
    firstName: string,
    middleName: string | undefined,
    lastName: string,
    email: string,
    password: string
  ): Observable<AuthUser> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.authService.registerPatient(firstName, middleName, lastName, email, password).pipe(
      tap((user) => {
        this.setUser(user);
        this.authService.navigateByRole(user);
      }),
      catchError((err: unknown) => this.handleAuthError(err, 'Registration failed.')),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  setPassword(newPassword: string, confirmPassword: string): Observable<AuthUser> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.authService.setPassword(newPassword, confirmPassword).pipe(
      tap((user) => {
        this.setUser(user);
      }),
      catchError((err: unknown) => this.handleAuthError(err, 'Password update failed.')),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  logout(): void {
    this.clearState();
    this.authService.logout();
  }

  /** @description Ensure a patients row exists for the logged-in user. .NET backend handles this on register. */
  async ensurePatientRecord(): Promise<void> {
    return; // .NET handles patient record creation server-side
  }

  setUser(user: AuthUser): void {
    this.userSubject.next(user);
    this.authService.persistUser(user);
  }

  patchUser(changes: Partial<AuthUser>): void {
    const current = this.userSubject.value;
    if (!current) {
      return;
    }

    this.setUser({ ...current, ...changes });
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  hasRole(roles: Role[]): Observable<boolean> {
    return this.currentUser$.pipe(map((user) => !!user && roles.includes(user.role)));
  }

  private clearState(): void {
    this.userSubject.next(null);
    this.errorSubject.next(null);
  }

  private handleAuthError(err: unknown, fallback: string): Observable<never> {
    const message = this.extractErrorMessage(err, fallback);
    this.errorSubject.next(message);
    return throwError(() => new Error(message));
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const errorBody = err.error as {
        message?: string;
        errors?: Record<string, string[] | string>;
      } | null;

      if (typeof errorBody?.message === 'string' && errorBody.message.trim()) {
        return errorBody.message;
      }

      if (errorBody?.errors) {
        for (const value of Object.values(errorBody.errors)) {
          const values = Array.isArray(value) ? value : [value];
          const firstValidationError = values.find((item) => typeof item === 'string' && item.trim().length > 0);
          if (typeof firstValidationError === 'string') {
            return firstValidationError;
          }
        }
      }

      if (typeof err.message === 'string' && err.message.trim()) {
        return err.message;
      }
    }

    if (err instanceof Error) {
      return err.message || fallback;
    }

    return fallback;
  }
}
