export enum RoomType {
  SINGLE = 'Single',
  DOUBLE = 'Double',
  SUITE = 'Suite',
  DELUXE = 'Deluxe',
}

export enum RoomStatus {
  AVAILABLE = 'Available',
  OCCUPIED = 'Occupied',
  DIRTY = 'Dirty',
  MAINTENANCE = 'Maintenance',
}

export enum BookingSource {
  DIRECT = 'Direct Website',
  WALK_IN = 'Walk-in',
  BOOKING_COM = 'Booking.com',
  AIRBNB = 'Airbnb',
  EXPEDIA = 'Expedia',
}

export enum BookingStatus {
  CONFIRMED = 'Confirmed',
  CHECKED_IN = 'Checked In',
  CHECKED_OUT = 'Checked Out',
  CANCELLED = 'Cancelled',
}

export enum PaymentMethod {
  CASH = 'Cash',
  CREDIT_CARD = 'Credit Card',
  BANK_TRANSFER = 'Bank Transfer',
  ONLINE = 'Online Gateway',
}

export enum PaymentType {
  ADVANCE = 'Advance',
  SETTLEMENT = 'Settlement',
  REFUND = 'Refund',
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  date: string; // ISO Date string
  method: PaymentMethod;
  type: PaymentType;
  notes?: string;
}

export interface Booking {
  id: string;
  roomId: number;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  source: BookingSource;
  status: BookingStatus;
  totalPaid?: number; // Replaced advanceAmount with totalPaid as per user's clarification
  totalAmount?: number; // Made optional as API provides balance
  payments?: Payment[]; // Made optional as API provides balance
  pendingBalance?: number; // New field for balance from /allBooking API
  notes?: string;
  createdAt?: string; // Made optional as API doesn't provide
}

export interface Room {
  id: number;
  number: string;
  type: RoomType;
  pricePerNight: number;
  status: RoomStatus;
  amenities: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
}

export interface User {
  id: string;
  name: string;
  role: 'Manager' | 'Receptionist' | 'Housekeeping';
}
