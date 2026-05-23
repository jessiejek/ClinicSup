import { Notification } from '../models';

export const MOCK_NOTIFICATIONS: Notification[] = [
    {
      id: 'n1',
      userId: 'user-admin-1',
      title: 'New Proof Submitted',
      message: 'Juan dela Cruz submitted payment proof for booking BK-003.',
      isRead: false,
      createdAt: new Date(Date.now() - 300000).toISOString(),
      navigateTo: '/admin/bookings/BK-003'
    },
    {
      id: 'n2',
      userId: 'user-admin-1',
      title: 'Booking Confirmed',
      message: 'Dr. Santos confirmed booking BK-001.',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      navigateTo: '/admin/bookings/BK-001'
    },
    {
      id: 'n3',
      userId: 'user-admin-1',
      title: 'Walk-in Added',
      message: 'Staff added a walk-in booking for Pedro Reyes.',
      isRead: false,
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'n4',
      userId: 'user-admin-1',
      title: 'No Show Recorded',
      message: 'Carlos Mendoza marked as no-show.',
      isRead: true,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'n5',
      userId: 'user-admin-1',
      title: 'Unpaid Completed Visit',
      message: 'Maria Santos has an unpaid completed visit.',
      isRead: true,
      createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: 'n6',
      userId: 'user-admin-1',
      title: 'Doctor Schedule Updated',
      message: 'Dr. Reyes schedule was updated for next week.',
      isRead: true,
      createdAt: new Date(Date.now() - 259200000).toISOString()
    },
    {
      id: 'n7',
      userId: 'user-admin-1',
      title: 'Service Created',
      message: 'A new laboratory service is now available.',
      isRead: true,
      createdAt: new Date(Date.now() - 345600000).toISOString()
    },
    {
      id: 'n8',
      userId: 'user-admin-1',
      title: 'Patient Registered',
      message: 'Ana Gomez registered a new patient account.',
      isRead: true,
      createdAt: new Date(Date.now() - 432000000).toISOString()
    },
    {
      id: 'n9',
      userId: 'user-admin-1',
      title: 'Announcement Published',
      message: 'Holiday schedule notice is now active.',
      isRead: true,
      createdAt: new Date(Date.now() - 518400000).toISOString()
    },
    {
      id: 'n10',
      userId: 'user-admin-1',
      title: 'Follow-up Reminder',
      message: 'Three patients are due for follow-up this week.',
      isRead: true,
      createdAt: new Date(Date.now() - 604800000).toISOString()
    }
  ];
