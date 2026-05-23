import { Announcement } from '../models';

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
    {
      id: 'ann-1',
      title: 'Holiday Schedule Notice',
      body: 'Our clinic will be closed on June 12 (Independence Day). Regular schedule resumes on June 13.',
      isActive: true,
      createdAt: '2025-06-01T09:00:00Z'
    },
    {
      id: 'ann-2',
      title: 'New Pediatric Services Available',
      body: 'We are pleased to announce that Dr. Reyes is now offering adolescent health consultations...',
      isActive: true,
      createdAt: '2025-05-20T10:00:00Z'
    },
    {
      id: 'ann-3',
      title: 'COVID-19 Vaccination Drive',
      body: 'Free COVID-19 booster shots will be available every Saturday morning...',
      isActive: true,
      createdAt: '2025-05-10T08:00:00Z'
    },
    {
      id: 'ann-4',
      title: 'New Online Booking System',
      body: 'You can now book your appointments online through our patient portal...',
      isActive: true,
      createdAt: '2025-04-15T09:00:00Z'
    },
    {
      id: 'ann-5',
      title: 'Clinic Renovation Complete',
      body: 'We have finished our clinic renovation. Enjoy our new, modern facility!',
      isActive: false,
      createdAt: '2025-03-01T09:00:00Z'
    }
  ];
