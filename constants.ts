import { Room, RoomType, RoomStatus, Booking, BookingStatus, BookingSource, PaymentMethod, PaymentType } from './types';

export const INITIAL_ROOMS: Room[] = [
  { id: 101, number: '101', type: RoomType.SINGLE, pricePerNight: 3500, status: RoomStatus.AVAILABLE, amenities: ['WiFi', 'TV'] },
  { id: 102, number: '102', type: RoomType.SINGLE, pricePerNight: 3500, status: RoomStatus.AVAILABLE, amenities: ['WiFi', 'TV'] },
  { id: 201, number: '201', type: RoomType.SUITE, pricePerNight: 3500, status: RoomStatus.AVAILABLE, amenities: ['WiFi', 'TV', 'Mini Bar', 'Jacuzzi', 'Balcony'] },
];

export const INITIAL_BOOKINGS: Booking[] = [];

export const MOCK_USER = {
  id: 'u_1',
  name: 'Sanjeev Kumar Singh',
  role: 'View' as const
};

import { HousekeepingTask, MaintenanceTicket } from './types';

export const INITIAL_HOUSEKEEPING_TASKS: HousekeepingTask[] = [
  { id: 'hk_1', roomId: 101, status: 'Dirty', priority: 'High', notes: 'VIP Guest arriving early' },
  { id: 'hk_2', roomId: 102, status: 'Clean', priority: 'Normal', lastCleanedAt: new Date().toISOString() },
  { id: 'hk_3', roomId: 201, status: 'Cleaning in Progress', assignedTo: 'Maria', priority: 'Normal' },
];

export const INITIAL_MAINTENANCE_TICKETS: MaintenanceTicket[] = [
  { id: 'mt_1', roomId: 101, category: 'Appliance', description: 'AC unit is making a loud noise', severity: 'Medium', status: 'Open', reportedAt: new Date().toISOString() },
  { id: 'mt_2', roomId: 201, category: 'Plumbing', description: 'Leaky faucet in master bath', severity: 'Low', status: 'Resolved', reportedAt: new Date(Date.now() - 86400000).toISOString(), resolvedAt: new Date().toISOString() },
];