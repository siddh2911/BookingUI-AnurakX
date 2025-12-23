import { Room, Booking, BookingStatus } from '../types';

/**
 * Fetches available rooms from the API.
 * @param options - An object with startDate and endDate.
 * @returns A promise that resolves to an array of available rooms.
 */
export const getAvailableRooms = async (
  options: { startDate: string, endDate: string }
): Promise<Room[]> => {
  const { startDate, endDate } = options;
  const url = new URL('https://booking-anurakx.onrender.com/available-rooms');
  url.searchParams.append('startDate', startDate);
  url.searchParams.append('endDate', endDate);

  console.log(`Fetching available rooms from ${url.toString()}`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch available rooms' }));
    throw new Error(errorData.message);
  }

  const data = await response.json();
  return data as Room[];
};

/**
 * Simulates an API call to get the availability forecast.
 * @param rooms - All rooms in the hotel.
 * @param bookings - All bookings in the hotel.
 * @param forecastPage - The page number for the forecast.
 * @returns A promise that resolves to the forecast data.
 */
export const getAvailabilityForecast = async (
  rooms: Room[],
  bookings: Booking[],
  forecastPage: number,
  today: string
): Promise<{ date: Date; availableRooms: Room[] }[]> => {
  const DAYS_PER_PAGE = 12;
  const startOffset = forecastPage * DAYS_PER_PAGE;
  
  const forecast = Array.from({ length: DAYS_PER_PAGE }, (_, i) => {
    const [year, month, day] = today.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + startOffset + i);
    const dateStr = d.toISOString().split('T')[0];

    const available = rooms.filter(room => {
      const isBooked = bookings.some(b => {
        const isStandardBooked = b.checkInDate <= dateStr && b.checkOutDate > dateStr;

        const match = b.roomId === room.id &&
          b.status !== BookingStatus.CANCELLED &&
          b.status !== BookingStatus.CHECKED_OUT &&
          isStandardBooked;
        
        return match;
      });
      return !isBooked;
    });
    return { date: d, availableRooms: available };
  });

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return Promise.resolve(forecast);
};
