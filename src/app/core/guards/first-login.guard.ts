import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthStateService } from '../services/auth-state.service';

export const firstLoginGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  return authState.currentUser$.pipe(
    take(1),
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/auth/login']);
      }
      if (user.isFirstLogin) {
        return router.createUrlTree(['/auth/set-password']);
      }
      return true;
    })
  );
};
