export const MOCK_UNPAID_COMPLETED_VISIT_REPORT_ROWS: Array<{
    bookingId: string;
    patient: string;
    doctor: string;
    service: string;
    visitDate: string;
    amount: number;
    paymentStatus: string;
  }> = [
    {
      bookingId: 'BK-101',
      patient: 'Juan Dela Cruz',
      doctor: 'Dr. Santos',
      service: 'General Consultation',
      visitDate: new Date(new Date().getTime() - 86400000).toISOString().slice(0, 10),
      amount: 500,
      paymentStatus: 'Unpaid'
    },
    {
      bookingId: 'BK-102',
      patient: 'Maria Santos',
      doctor: 'Dr. Jose Reyes',
      service: 'Pediatric Checkup',
      visitDate: new Date(new Date().getTime() - 172800000).toISOString().slice(0, 10),
      amount: 600,
      paymentStatus: 'Unpaid'
    },
    {
      bookingId: 'BK-103',
      patient: 'Pedro Reyes',
      doctor: 'Dr. Ana Cruz',
      service: 'Prenatal Checkup',
      visitDate: new Date(new Date().getTime() - 259200000).toISOString().slice(0, 10),
      amount: 700,
      paymentStatus: 'Unpaid'
    },
    {
      bookingId: 'BK-104',
      patient: 'Ana Gomez',
      doctor: 'Dr. Santos',
      service: 'Annual Physical Exam',
      visitDate: new Date(new Date().getTime() - 345600000).toISOString().slice(0, 10),
      amount: 1000,
      paymentStatus: 'Unpaid'
    },
    {
      bookingId: 'BK-105',
      patient: 'Carlos Mendoza',
      doctor: 'Dr. Jose Reyes',
      service: 'General Consultation',
      visitDate: new Date(new Date().getTime() - 432000000).toISOString().slice(0, 10),
      amount: 500,
      paymentStatus: 'Unpaid'
    }
  ];

  export const MOCK_PENDING_FOLLOW_UP_REPORT_ROWS: Array<{
    patient: string;
    doctor: string;
    followUpDate: string;
    reason: string;
    status: string;
  }> = [
    {
      patient: 'Juan Dela Cruz',
      doctor: 'Dr. Santos',
      followUpDate: new Date(new Date().getTime() + 86400000 * 2).toISOString().slice(0, 10),
      reason: 'Review medication response',
      status: 'Pending'
    },
    {
      patient: 'Maria Santos',
      doctor: 'Dr. Jose Reyes',
      followUpDate: new Date(new Date().getTime() + 86400000 * 4).toISOString().slice(0, 10),
      reason: 'Pediatric follow-up check',
      status: 'Pending'
    },
    {
      patient: 'Ana Gomez',
      doctor: 'Dr. Ana Cruz',
      followUpDate: new Date(new Date().getTime() + 86400000 * 6).toISOString().slice(0, 10),
      reason: 'Prenatal monitoring',
      status: 'Pending'
    }
  ];

  export const MOCK_DAILY_BOOKING_SUMMARY_ROWS: Array<{
    date: string;
    totalBookings: number;
    completed: number;
    cancelled: number;
    noShow: number;
    revenue: number;
  }> = [
    {
      date: new Date(new Date().getTime() - 86400000 * 6).toISOString().slice(0, 10),
      totalBookings: 6,
      completed: 4,
      cancelled: 1,
      noShow: 1,
      revenue: 2600
    },
    {
      date: new Date(new Date().getTime() - 86400000 * 5).toISOString().slice(0, 10),
      totalBookings: 7,
      completed: 5,
      cancelled: 1,
      noShow: 1,
      revenue: 3200
    },
    {
      date: new Date(new Date().getTime() - 86400000 * 4).toISOString().slice(0, 10),
      totalBookings: 8,
      completed: 6,
      cancelled: 1,
      noShow: 1,
      revenue: 4100
    },
    {
      date: new Date(new Date().getTime() - 86400000 * 3).toISOString().slice(0, 10),
      totalBookings: 5,
      completed: 4,
      cancelled: 0,
      noShow: 1,
      revenue: 2100
    },
    {
      date: new Date(new Date().getTime() - 86400000 * 2).toISOString().slice(0, 10),
      totalBookings: 7,
      completed: 5,
      cancelled: 1,
      noShow: 1,
      revenue: 3600
    },
    {
      date: new Date(new Date().getTime() - 86400000).toISOString().slice(0, 10),
      totalBookings: 9,
      completed: 6,
      cancelled: 2,
      noShow: 1,
      revenue: 4500
    },
    {
      date: new Date(new Date().getTime()).toISOString().slice(0, 10),
      totalBookings: 8,
      completed: 5,
      cancelled: 1,
      noShow: 2,
      revenue: 3900
    }
  ];

