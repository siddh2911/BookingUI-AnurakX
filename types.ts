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
  INSTAGRAM = 'Instagram',
  MAKE_MY_TRIP = 'MakeMyTrip',
  AGODA = 'Agoda',
  GOIBIBO = 'Goibibo'
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
  date: string;
  method: PaymentMethod;
  type: PaymentType;
  bookingSource?: BookingSource | string;
  notes?: string;
}

export interface BookingSourceDetail {
  source: BookingSource | string;
  startDate?: string;
  endDate?: string;
  amount: number;
}

export interface Booking {
  id: string;
  roomId: number;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  sources: BookingSourceDetail[];
  status: BookingStatus;
  totalPaid?: number;
  totalAmount?: number;
  payments?: Payment[];
  pendingBalance?: number;
  additionalCharges?: { description: string; amount: number }[];
  mealPlan?: string;
  bookingPackage?: string;
  notes?: string;
  createdAt?: string;
}

export interface Room {
  id: number;
  number: string;
  type: RoomType;
  pricePerNight: number;
  status: RoomStatus;
  cleanStatus?: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'MAINTENANCE';
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
  role: 'Administrator' | 'Manager' | 'Receptionist' | 'Housekeeping' | 'View';
}


export interface MenuItem {
  id: string;
  name: string;
  category: 'Starters' | 'Mains' | 'Desserts' | 'Drinks';
  price: number;
  description: string;
  image: string;
  isVegetarian: boolean;
  isSpicy?: boolean;
}

export interface FoodOrder {
  id: string;
  roomId: string;
  items: {
    menuItem: MenuItem;
    quantity: number;
    notes?: string;
  }[];
  status: 'Pending' | 'Cooking' | 'Delivered' | 'Cancelled';
  totalAmount: number;
  timestamp: string;
}

export type HousekeepingStatus = 'Clean' | 'Dirty' | 'Cleaning in Progress' | 'Inspected';

export interface HousekeepingTask {
  id: string;
  roomId: number;
  status: HousekeepingStatus;
  assignedTo?: string;
  priority: 'Low' | 'Normal' | 'High';
  notes?: string;
  lastCleanedAt?: string;
}

export type MaintenanceCategory = 'Plumbing' | 'Electrical' | 'Appliance' | 'Furniture' | 'Other';
export type MaintenanceSeverity = 'Low' | 'Medium' | 'High';
export type MaintenanceStatus = 'Open' | 'In Progress' | 'Resolved';

export interface MaintenanceTicket {
  id: string;
  roomNumber: string;
  category: MaintenanceCategory;
  description: string;
  severity: MaintenanceSeverity;
  status: MaintenanceStatus;
  reportedAt: string;
  resolvedAt?: string;
}
