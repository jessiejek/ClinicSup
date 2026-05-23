import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './components/public-layout/public-layout.component';
import { HomePage } from './home/home.page';
import { DoctorsPage } from './doctors/doctors.page';
import { DoctorProfilePage } from './doctor-profile/doctor-profile.page';
import { ServicesPage } from './services/services.page';
import { AnnouncementsPage } from './announcements/announcements.page';
import { BookingPage } from './booking/booking.page';
import { BookingConfirmationPage } from './booking-confirmation/booking-confirmation.page';
import { PrivacyPolicyPage } from './privacy-policy/privacy-policy.page';

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomePage },
      { path: 'doctors', component: DoctorsPage },
      { path: 'doctors/:id', component: DoctorProfilePage },
      { path: 'services', component: ServicesPage },
      { path: 'announcements', component: AnnouncementsPage },
      { path: 'booking', component: BookingPage },
      { path: 'booking-confirmation/:bookingId', component: BookingConfirmationPage },
      { path: 'privacy-policy', component: PrivacyPolicyPage },
      {
        path: '**',
        loadComponent: () => import('../../shared/pages/not-found/not-found.page').then((m) => m.NotFoundPage)
      }
    ]
  }
];
