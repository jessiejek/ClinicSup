import { ResolveFn, Routes } from '@angular/router';
import { of } from 'rxjs';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { NavItem } from '../../core/models';
import { PatientLayoutComponent } from './components/patient-layout/patient-layout.component';

export const PATIENT_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/patient/dashboard', icon: 'grid-outline' },
  { label: 'Doctors', route: '/patient/doctors', icon: 'medical-outline' },
  { label: 'Bookings', route: '/patient/bookings', icon: 'calendar-outline' },
  { label: 'My Documents', route: '/patient/documents', icon: 'document-text-outline', section: 'Records' },
  { label: 'My Lab Results', route: '/patient/lab-results', icon: 'medkit-outline' },
  { label: 'Medical Records', route: '/patient/medical-records', icon: 'medical-outline' },
  { label: 'Prescriptions', route: '/patient/prescriptions', icon: 'document-text-outline' },
  { label: 'Vaccinations', route: '/patient/vaccinations', icon: 'shield-checkmark-outline' },
  { label: 'Profile', route: '/patient/profile', icon: 'person-outline' }
];

const preloadPatientData: ResolveFn<boolean> = () => {
  return of(true);
};

export const PATIENT_ROUTES: Routes = [
  {
    path: '',
    component: PatientLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['Patient'],
      navItems: PATIENT_NAV_ITEMS,
      portalLabel: 'Patient Portal',
      title: 'Dashboard'
    },
    resolve: { preload: preloadPatientData },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/patient-dashboard.page').then((m) => m.PatientDashboardPage),
        data: { title: 'Dashboard' }
      },
      {
        path: 'doctors',
        loadComponent: () =>
          import('./doctors/patient-doctors.page').then((m) => m.PatientDoctorsPage),
        data: { title: 'Doctors' }
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./bookings/patient-bookings.page').then((m) => m.PatientBookingsPage),
        data: { title: 'Bookings' }
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./documents/patient-documents.page').then((m) => m.PatientDocumentsPage),
        data: { title: 'My Documents' }
      },
      {
        path: 'lab-results',
        loadComponent: () =>
          import('./lab-results/patient-lab-results.page').then((m) => m.PatientLabResultsPage),
        data: { title: 'My Lab Results' }
      },
      {
        path: 'labs',
        loadComponent: () =>
          import('./labs-redirect/patient-labs-redirect.page').then((m) => m.PatientLabsRedirectPage)
      },
      {
        path: 'bookings/:id',
        loadComponent: () =>
          import('./booking-detail/patient-booking-detail.page').then(
            (m) => m.PatientBookingDetailPage
          ),
        data: { title: 'Booking Detail' }
      },
      {
        path: 'medical-records',
        loadComponent: () =>
          import('./medical-records/patient-medical-records.page').then(
            (m) => m.PatientMedicalRecordsPage
          ),
        data: { title: 'Medical Records' }
      },
      {
        path: 'prescriptions',
        loadComponent: () =>
          import('./prescriptions/patient-prescriptions.page').then(
            (m) => m.PatientPrescriptionsPage
          ),
        data: { title: 'Prescriptions' }
      },
      {
        path: 'vaccinations',
        loadComponent: () =>
          import('./vaccinations/patient-vaccinations.page').then(
            (m) => m.PatientVaccinationsPage
          ),
        data: { title: 'My Vaccinations' }
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/patient-profile.page').then((m) => m.PatientProfilePage),
        data: { title: 'Profile' }
      },
      {
        path: 'reviews/:bookingId',
        loadComponent: () =>
          import('./reviews/patient-reviews.page').then((m) => m.PatientReviewsPage),
        data: { title: 'Leave Review' }
      },
      {
        path: 'privacy-consent',
        loadComponent: () =>
          import('./privacy-consent/patient-privacy-consent.page').then(
            (m) => m.PatientPrivacyConsentPage
          ),
        data: { title: 'Privacy Consent' }
      },
      {
        path: '**',
        loadComponent: () => import('../../shared/pages/not-found/not-found.page').then((m) => m.NotFoundPage)
      }
    ]
  }
];
