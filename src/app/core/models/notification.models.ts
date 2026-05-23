export interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  doctorId: string;
  patientId: string;
  rating: number;
  comment?: string;
  patientName: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  navigateTo?: string;
}
