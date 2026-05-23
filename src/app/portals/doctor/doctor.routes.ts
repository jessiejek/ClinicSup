import { ResolveFn, Routes } from '@angular/router';
import { of } from 'rxjs';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { NavItem } from '../../core/models';
import { PortalLayoutComponent } from '../../shared/components/portal-layout/portal-layout.component';

export const DOCTOR_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/doctor/dashboard', icon: 'grid-outline', section: 'Main' },
  { label: 'Appointments', route: '/doctor/appointments', icon: 'calendar-outline' },
  { label: 'Patients', route: '/doctor/patients', icon: 'people-outline', section: 'Records' },
  { label: 'Schedule', route: '/doctor/schedule', icon: 'time-outline', section: 'Tools' },
  { label: 'My Profile', route: '/doctor/profile', icon: 'person-outline', section: 'Account' }
];

const preloadDoctorData: ResolveFn<boolean> = () => {
  return of(true);
};

export const DOCTOR_ROUTES: Routes = [
  {
    path: '',
    component: PortalLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['Doctor'],
      navItems: DOCTOR_NAV_ITEMS,
      portalLabel: 'Doctor Portal',
      title: 'Dashboard'
    },
    resolve: { preload: preloadDoctorData },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/doctor-dashboard.page').then((m) => m.DoctorDashboardPage),
        data: { title: 'Dashboard' }
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./appointments/doctor-appointments.page').then((m) => m.DoctorAppointmentsPage),
        data: { title: 'Appointments' }
      },
      {
        path: 'appointments/:id',
        loadComponent: () =>
          import('./appointment-detail/doctor-appointment-detail.page').then(
            (m) => m.DoctorAppointmentDetailPage
          ),
        data: { title: 'Appointment Detail' }
      },
      {
        path: 'patients',
        loadComponent: () => import('./patients/doctor-patients.page').then((m) => m.DoctorPatientsPage),
        data: { title: 'Patients' }
      },
      {
        path: 'patients/:id',
        loadComponent: () =>
          import('./patient-detail/doctor-patient-detail.page').then((m) => m.DoctorPatientDetailPage),
        data: { title: 'Patient Detail' }
      },
      {
        path: 'schedule',
        loadComponent: () => import('./schedule/doctor-schedule.page').then((m) => m.DoctorSchedulePage),
        data: { title: 'Schedule' }
      },
      {
        path: 'consultation/:bookingId',
        loadComponent: () =>
          import('./consultation/doctor-consultation.page').then(
            (m) => m.DoctorConsultationPage
          ),
        data: { title: 'Consultation Form' }
      },
      {
        path: 'my-profile',
        loadComponent: () => import('./profile/doctor-profile.page').then((m) => m.DoctorProfilePage),
        data: { title: 'My Profile' }
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/doctor-profile.page').then((m) => m.DoctorProfilePage),
        data: { title: 'My Profile' }
      },
      {
        path: '**',
        loadComponent: () => import('../../shared/pages/not-found/not-found.page').then((m) => m.NotFoundPage)
      }
    ]
  }
];
