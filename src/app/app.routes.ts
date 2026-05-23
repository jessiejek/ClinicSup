import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { firstLoginGuard } from './core/guards/first-login.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'public', pathMatch: 'full' },
  {
    path: 'public',
    loadChildren: () => import('./portals/public/public.routes').then((m) => m.PUBLIC_ROUTES)
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then((m) => m.AUTH_ROUTES)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard, firstLoginGuard],
    data: { roles: ['Admin'] },
    loadChildren: () => import('./portals/admin/admin.routes').then((m) => m.ADMIN_ROUTES)
  },
  {
    path: 'staff',
    canActivate: [authGuard, roleGuard, firstLoginGuard],
    data: { roles: ['Staff'] },
    loadChildren: () => import('./portals/staff/staff.routes').then((m) => m.STAFF_ROUTES)
  },
  {
    path: 'doctor',
    canActivate: [authGuard, roleGuard, firstLoginGuard],
    data: { roles: ['Doctor'] },
    loadChildren: () => import('./portals/doctor/doctor.routes').then((m) => m.DOCTOR_ROUTES)
  },
  {
    path: 'patient',
    canActivate: [authGuard, roleGuard, firstLoginGuard],
    data: { roles: ['Patient'] },
    loadChildren: () => import('./portals/patient/patient.routes').then((m) => m.PATIENT_ROUTES)
  },
  {
    path: 'dev',
    loadChildren: () => import('./dev/dev.routes').then((m) => m.DEV_ROUTES)
  },
  {
    path: '**',
    loadComponent: () => import('./shared/pages/not-found/not-found.page').then((m) => m.NotFoundPage)
  }
];
