import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { AUTH_RETRY_ATTEMPTED, SKIP_AUTH_INTERCEPTOR } from './auth-http.tokens';

function isPublicAuthEndpoint(url: string): boolean {
  const normalizedUrl = url.toLowerCase();
  return [
    '/auth/login',
    '/auth/register',
    '/auth/register-patient',
    '/auth/google',
    '/auth/refresh',
    '/auth/logout'
  ].some((path) => normalizedUrl.includes(path));
}

function shouldAttachAuthHeader(url: string): boolean {
  return !isPublicAuthEndpoint(url);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (req.context.get(SKIP_AUTH_INTERCEPTOR)) {
    return next(req);
  }

  const accessToken = tokenService.getAccessToken();
  const request = accessToken && shouldAttachAuthHeader(req.url)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        req.context.get(AUTH_RETRY_ATTEMPTED) ||
        isPublicAuthEndpoint(req.url)
      ) {
        return throwError(() => error);
      }

      const refreshToken = tokenService.getRefreshToken();
      if (!refreshToken) {
        authService.clearSession();
        void router.navigate(['/auth/login']);
        return throwError(() => error);
      }

      return authService.refreshTokens().pipe(
        switchMap(() => {
          const refreshedToken = tokenService.getAccessToken();
          if (!refreshedToken) {
            authService.clearSession();
            void router.navigate(['/auth/login']);
            return throwError(() => error);
          }

          const retryRequest = req.clone({
            context: req.context.set(AUTH_RETRY_ATTEMPTED, true),
            setHeaders: { Authorization: `Bearer ${refreshedToken}` }
          });
          return next(retryRequest);
        }),
        catchError((refreshError) => {
          authService.clearSession();
          void router.navigate(['/auth/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
