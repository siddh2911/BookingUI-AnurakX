import { Room, Booking, BookingStatus } from '../types';

export const API_BASE_URL = 'https://api.karunavillas.com';



import { z } from 'zod';
import { RoomSchema } from './schemas';




export const getAvailableRooms = async (
  options: { startDate: string, endDate: string }
): Promise<Room[]> => {
  const { startDate, endDate } = options;
  const url = new URL(`${API_BASE_URL}/available-rooms`);
  url.searchParams.append('startDate', startDate);
  url.searchParams.append('endDate', endDate);

  console.log(`Fetching available rooms from ${url.toString()}`);

  const response = await fetch(url.toString(), {
    redirect: 'manual'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch available rooms' }));
    throw new Error(errorData.message);
  }

  const data = await response.json();

  const mappedData: Room[] = data.map((room: any) => ({
    ...room,
    number: room.roomNumber,
  }));
  return mappedData;
};


export const getAvailabilityForecast = async (
  rooms: Room[],
  bookings: Booking[],
  forecastPage: number,
  today: string
): Promise<{ date: Date; availableRooms: Room[] }[]> => {
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const DAYS_PER_PAGE = 12;
  const startOffset = forecastPage * DAYS_PER_PAGE;

  const forecast = Array.from({ length: DAYS_PER_PAGE }, (_, i) => {
    const [year, month, day] = today.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + startOffset + i);
    const dateStr = formatLocalDate(d);

    const available = rooms.filter(room => {
      const isBooked = bookings.some(b => {
        const isStandardBooked = (b.checkInDate < dateStr && b.checkOutDate > dateStr) || (b.checkInDate === dateStr);

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


  await new Promise(resolve => setTimeout(resolve, 500));

  return Promise.resolve(forecast);
};

export const getRoomDetails = async (id: number): Promise<Room> => {
  const url = `${API_BASE_URL}/rooms/${id}`;

  console.log(`Fetching room details from ${url}`);
  const response = await fetch(url, {
    redirect: 'manual'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch room details' }));
    throw new Error(errorData.message);
  }

  const data = await response.json();

  return {
    ...data,
    number: data.roomNumber,
  };
};

export const updateRoomCleanStatus = async (roomNumber: string, status: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'MAINTENANCE'): Promise<void> => {
  const url = `${API_BASE_URL}/rooms/${roomNumber}/clean-status?status=${status}`;

  console.log(`Updating room ${roomNumber} clean status to ${status}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    redirect: 'manual'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update clean status' }));
    throw new Error(errorData.message || 'Failed to update clean status');
  }
};

export const fetchMaintenanceTickets = async (): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/maintenance`, {
    redirect: 'manual'
  });
  
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) throw new Error('Failed to fetch tickets');
  const data = await response.json();
  return data.map((t: any) => ({
    ...t,
    status: t.status === 'IN_PROGRESS' ? 'In Progress' : t.status === 'RESOLVED' ? 'Resolved' : 'Open'
  }));
};

export const createMaintenanceTicket = async (ticket: any): Promise<any> => {
  const payload = {
    ...ticket,
    status: ticket.status === 'In Progress' ? 'IN_PROGRESS' : ticket.status === 'Resolved' ? 'RESOLVED' : 'OPEN'
  };
  const response = await fetch(`${API_BASE_URL}/maintenance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'manual'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) throw new Error('Failed to create ticket');
  return response.json();
};

export const updateMaintenanceTicketStatus = async (id: string, status: string): Promise<void> => {
  const payloadStatus = status === 'In Progress' ? 'IN_PROGRESS' : status === 'Resolved' ? 'RESOLVED' : 'OPEN';
  const response = await fetch(`${API_BASE_URL}/maintenance/${id}/status?status=${payloadStatus}`, { 
    method: 'PUT',
    redirect: 'manual'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) throw new Error('Failed to update ticket status');
};

export const deleteMaintenanceTicket = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/maintenance/${id}`, { 
    method: 'DELETE',
    redirect: 'manual'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) throw new Error('Failed to delete ticket');
};
