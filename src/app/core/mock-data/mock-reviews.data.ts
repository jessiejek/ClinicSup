import { Review } from '../models';

export const MOCK_REVIEWS: Review[] = [
    {
      id: 'rev-1',
      bookingId: 'bk-1',
      doctorId: 'doc-1',
      patientId: 'pat-2',
      rating: 5,
      comment: 'Very thorough and compassionate.',
      patientName: 'Maria S.',
      createdAt: '2025-04-01T10:00:00Z'
    },
    {
      id: 'rev-2',
      bookingId: 'bk-2',
      doctorId: 'doc-1',
      patientId: 'pat-3',
      rating: 4,
      comment: 'Efficient and knowledgeable.',
      patientName: 'Pedro R.',
      createdAt: '2025-04-05T11:00:00Z'
    },
    {
      id: 'rev-3',
      bookingId: 'bk-3',
      doctorId: 'doc-1',
      patientId: 'pat-4',
      rating: 5,
      comment: 'Best GP in Cebu.',
      patientName: 'Ana G.',
      createdAt: '2025-04-10T12:00:00Z'
    },
    {
      id: 'rev-4',
      bookingId: 'bk-4',
      doctorId: 'doc-2',
      patientId: 'pat-1',
      rating: 5,
      comment: 'My kids love him!',
      patientName: 'Juan C.',
      createdAt: '2025-04-02T09:00:00Z'
    },
    {
      id: 'rev-5',
      bookingId: 'bk-5',
      doctorId: 'doc-2',
      patientId: 'pat-3',
      rating: 5,
      comment: 'Very patient with children.',
      patientName: 'Pedro R.',
      createdAt: '2025-04-06T14:00:00Z'
    },
    {
      id: 'rev-6',
      bookingId: 'bk-6',
      doctorId: 'doc-2',
      patientId: 'pat-5',
      rating: 4,
      comment: 'Professional and caring.',
      patientName: 'Carlos M.',
      createdAt: '2025-04-08T15:00:00Z'
    },
    {
      id: 'rev-7',
      bookingId: 'bk-7',
      doctorId: 'doc-3',
      patientId: 'pat-2',
      rating: 5,
      comment: 'Excellent prenatal care.',
      patientName: 'Maria S.',
      createdAt: '2025-04-03T08:00:00Z'
    },
    {
      id: 'rev-8',
      bookingId: 'bk-8',
      doctorId: 'doc-3',
      patientId: 'pat-1',
      rating: 4,
      comment: 'Very reassuring doctor.',
      patientName: 'Juan C.',
      createdAt: '2025-04-07T13:00:00Z'
    },
    {
      id: 'rev-9',
      bookingId: 'bk-9',
      doctorId: 'doc-3',
      patientId: 'pat-4',
      rating: 5,
      comment: 'Highly recommended OB.',
      patientName: 'Ana G.',
      createdAt: '2025-04-11T16:00:00Z'
    }
  ];
