import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthStateService } from '../services/auth-state.service';

export const authGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  return authState.isAuthenticated$.pipe(
    take(1),
    map((isAuth) => (isAuth ? true : router.createUrlTree(['/auth/login'])))
  );
};
