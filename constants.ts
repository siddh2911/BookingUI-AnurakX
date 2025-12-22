import { Room, RoomType, RoomStatus, Booking, BookingStatus, BookingSource, PaymentMethod, PaymentType } from './types';

export const INITIAL_ROOMS: Room[] = [
  { id: '101', number: '101', type: RoomType.SINGLE, pricePerNight: 80, status: RoomStatus.AVAILABLE, amenities: ['WiFi', 'TV'] },
  { id: '102', number: '102', type: RoomType.SINGLE, pricePerNight: 80, status: RoomStatus.AVAILABLE, amenities: ['WiFi', 'TV'] },
  { id: '201', number: '201', type: RoomType.SUITE, pricePerNight: 200, status: RoomStatus.AVAILABLE, amenities: ['WiFi', 'TV', 'Mini Bar', 'Jacuzzi', 'Balcony'] },
];

export const INITIAL_BOOKINGS: Booking[] = [];

export const MOCK_USER = {
  id: 'u_1',
  name: 'Alex Admin',
  role: 'Manager' as const
};