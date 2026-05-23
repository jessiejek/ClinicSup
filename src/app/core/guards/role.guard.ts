import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { Role } from '../models';
import { AuthStateService } from '../services/auth-state.service';

export const roleGuard: CanActivateFn = (route) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const allowedRoles = (route.data['roles'] ?? []) as Role[];
  return authState.userRole$.pipe(
    take(1),
    map((role) => {
      if (!role || !allowedRoles.includes(role)) {
        return router.createUrlTree(['/auth/login']);
      }
      return true;
    })
  );
};
