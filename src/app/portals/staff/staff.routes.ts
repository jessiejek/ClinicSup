import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { NavItem } from '../../core/models';
import { PortalLayoutComponent } from '../../shared/components/portal-layout/portal-layout.component';

export const STAFF_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/staff/dashboard', icon: 'grid-outline', section: 'Main' },
  { label: 'Today Bookings', route: '/staff/bookings', icon: 'calendar-outline' },
  { label: 'Payments', route: '/staff/payments', icon: 'cash-outline' },
  { label: 'Walk-In', route: '/staff/walk-in', icon: 'walk-outline' },
  { label: 'Patients', route: '/staff/patients', icon: 'people-outline', section: 'Records' },
  { label: 'Doctor Status', route: '/staff/doctor-status', icon: 'medical-outline', section: 'Tools' },
  { label: 'My Profile', route: '/staff/profile', icon: 'person-outline', section: 'Account' }
];

export const STAFF_ROUTES: Routes = [
  {
    path: '',
    component: PortalLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Staff'], navItems: STAFF_NAV_ITEMS, portalLabel: 'Staff Portal', title: 'Dashboard' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/staff-dashboard.page').then((m) => m.StaffDashboardPage),
        data: { title: 'Dashboard' }
      },
      {
        path: 'bookings',
        loadComponent: () => import('./bookings/staff-bookings.page').then((m) => m.StaffBookingsPage),
        data: { title: 'Bookings' }
      },
      {
        path: 'payments',
        loadComponent: () => import('./payments/staff-payments.page').then((m) => m.StaffPaymentsPage),
        data: { title: 'Payments' }
      },
      {
        path: 'bookings/:id',
        loadComponent: () =>
          import('./booking-detail/staff-booking-detail.page').then((m) => m.StaffBookingDetailPage),
        data: { title: 'Booking Detail' }
      },
      {
        path: 'walk-in',
        loadComponent: () => import('./walk-in/staff-walk-in.page').then((m) => m.StaffWalkInPage),
        data: { title: 'Walk-In' }
      },
      {
        path: 'patients',
        loadComponent: () => import('./patients/staff-patients.page').then((m) => m.StaffPatientsPage),
        data: { title: 'Patients' }
      },
      {
        path: 'patients/:id',
        loadComponent: () =>
          import('./patient-detail/staff-patient-detail.page').then((m) => m.StaffPatientDetailPage),
        data: { title: 'Patient Detail' }
      },
      {
        path: 'doctor-status',
        loadComponent: () => import('./doctor-status/doctor-status.page').then((m) => m.DoctorStatusPage),
        data: { title: 'Doctor Availability' }
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/staff-profile.page').then((m) => m.StaffProfilePage),
        data: { title: 'My Profile' }
      },
      {
        path: '**',
        loadComponent: () => import('../../shared/pages/not-found/not-found.page').then((m) => m.NotFoundPage)
      }
    ]
  }
];
