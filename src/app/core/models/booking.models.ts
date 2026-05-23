export type BookingStatus =
  | 'Pending'
  | 'ProofSubmitted'
  | 'Confirmed'
  | 'CheckedIn'
  | 'InProgress'
  | 'OnHold'
  | 'Cancelled'
  | 'Completed'
  | 'Expired'
  | 'NoShow'
  | 'Rescheduled';

export type PaymentStatus = 'Unpaid' | 'Paid' | 'Waived' | 'Refunded';

export type PaymentMode = 'Online' | 'PayAtClinic';

export type PaymentMethod = 'Cash' | 'GCash' | 'Maya' | 'BankTransfer' | 'PayAtClinic';

export type ServiceCategory = 'Consultation' | 'Procedure' | 'Laboratory' | 'Diagnostic';

export type ProofType = 'ReferenceNumber' | 'Screenshot';

export interface Service {
  id: string;
  name: string;
  description?: string;
  estimatedDurationMinutes: number;
  price: number;
  category: ServiceCategory;
  doctorIds: string[];
}

export interface BookingServiceItem {
  id: string;
  name: string;
  description?: string;
  estimatedDurationMinutes?: number;
  price?: number;
}

export interface BookingPatientInfo {
  id: string;
  patientCode?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  sex?: string;
  contactNumber?: string;
  email?: string;
  isGuest?: boolean;
}

export interface BookingDoctorInfo {
  id: string;
  userId?: string;
  fullName?: string;
  specialization?: string;
  consultationFee?: number;
  status?: string;
  profilePhotoUrl?: string;
}

export interface BookingCatalogService {
  id: string;
  name?: string;
  description?: string;
  category?: ServiceCategory | string;
  price?: number;
  estimatedDurationMinutes?: number;
  isActive?: boolean;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  proofImageUrl?: string;
  status: PaymentStatus;
  orNumber?: string;
  verifiedByUserId?: string;
  verifiedAt?: string;
  verifiedByName?: string;
  cashierName?: string;
  paidAt?: string;
  waivedByUserId?: string;
  waivedAt?: string;
  waivedByName?: string;
  waivedReason?: string;
  refundedByUserId?: string;
  refundedAt?: string;
  refundReason?: string;
}

export interface Booking {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  serviceId: string;
  serviceIds?: string[];
  serviceName?: string;
  serviceNames?: string[];
  services?: BookingServiceItem[];
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  queueNumber: number | null;
  totalFee: number;
  finalAmount?: number | null;
  amountDue?: number | null;
  consultationFeeSnapshot: number;
  serviceFeeSnapshot: number;
  isWalkIn: boolean;
  proofType?: ProofType;
  proofValue?: string;
  proofSubmittedAt?: string;
  cancellationReason?: string;
  notes?: string;
  rescheduledFromBookingId?: string;
  receiptUrl?: string;
  createdAt: string;
  orNumber?: string;
  checkedInAt?: string;
  doctorCompletedAt?: string;
  isProfessionalFeeWaived?: boolean;
  professionalFeeWaivedReason?: string;
  patient?: BookingPatientInfo;
  doctor?: BookingDoctorInfo;
  service?: BookingCatalogService;
  payment?: Payment;
}

export interface TimeSlot {
  time: string;
  endTime: string;
  status: 'available' | 'full' | 'pending' | 'selected' | 'disabled';
}

export interface ReceiptData {
  bookingId?: string;
  paymentId?: string;
  orNumber: string;
  patientName: string;
  doctorName: string;
  services?: string[];
  appointmentDate: string;
  slotStartTime?: string;
  doctorCompletedAt?: string;
  paidAt?: string;
  amountPaid?: number;
  paymentMethod: string;
  referenceNumber?: string;
  cashierName?: string;
  verifiedByName?: string;
  clinicName?: string;
  clinicAddress?: string;
  isWaived?: boolean;
  waivedReason?: string;
  waivedByName?: string;
  waivedAt?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  patientCode?: string;
  serviceName?: string;
  slotTime?: string;
  queueNumber?: number | null;
  consultationFee?: number;
  serviceFee?: number;
  totalFee?: number;
  paymentStatus?: PaymentStatus;
  isWalkIn?: boolean;
  printedBy?: string;
  printedAt?: string;
}
