import { Room, Booking, BookingStatus } from '../types';
import { API_BASE_URL } from '../constants/api';
import { csrfHeaders } from './csrf';



import { z } from 'zod';
import { RoomSchema } from './schemas';




export const getAvailableRooms = async (
  options: { startDate: string, endDate: string, hotelId?: number }
): Promise<Room[]> => {
  const { startDate, endDate, hotelId } = options;
  const url = new URL(`${API_BASE_URL}/available-rooms`);
  url.searchParams.append('startDate', startDate);
  url.searchParams.append('endDate', endDate);
  if (hotelId != null) {
    url.searchParams.append('hotelId', String(hotelId));
  }

  console.log(`Fetching available rooms from ${url.toString()}`);

  const response = await fetch(url.toString(), {
    redirect: 'manual',
    credentials: 'include'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch available rooms' }));
    throw new Error(errorData.message);
  }

  const data = await response.json();

  const mappedData: Room[] = data.map((room: any) => ({
    ...room,
    hotelId: room.hotelId ?? room.hotel?.id,
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
    redirect: 'manual',
    credentials: 'include'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
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
    headers: csrfHeaders({
      'Content-Type': 'application/json'
    }),
    redirect: 'manual',
    credentials: 'include'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update clean status' }));
    throw new Error(errorData.message || 'Failed to update clean status');
  }
};

export const fetchMaintenanceTickets = async (): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/maintenance`, {
    redirect: 'manual',
    credentials: 'include'
  });
  
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
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
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    redirect: 'manual',
    credentials: 'include'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) throw new Error('Failed to create ticket');
  return response.json();
};

export const updateMaintenanceTicketStatus = async (id: string, status: string): Promise<void> => {
  const payloadStatus = status === 'In Progress' ? 'IN_PROGRESS' : status === 'Resolved' ? 'RESOLVED' : 'OPEN';
  const response = await fetch(`${API_BASE_URL}/maintenance/${id}/status?status=${payloadStatus}`, { 
    method: 'PUT',
    headers: csrfHeaders(),
    redirect: 'manual',
    credentials: 'include'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) throw new Error('Failed to update ticket status');
};

export const deleteMaintenanceTicket = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/maintenance/${id}`, { 
    method: 'DELETE',
    headers: csrfHeaders(),
    redirect: 'manual',
    credentials: 'include'
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) throw new Error('Failed to delete ticket');
};

export const syncRoomTv = async (options: {
  roomNumber: string;
  hotelId?: number;
  welcomeMessage?: string;
}): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/tv/sync`, {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      roomNumber: options.roomNumber,
      hotelId: options.hotelId,
      welcomeMessage: options.welcomeMessage?.trim() || undefined,
    }),
    redirect: 'manual',
    credentials: 'include',
  });

  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to sync room TV' }));
    throw new Error(errorData.error || errorData.message || 'Failed to sync room TV');
  }

  return response.json();
};

export interface LinkedTv {
  id: string;
  name: string;
  deviceName?: string;
  roomNumber: string;
  roomName?: string;
  linkedAt?: string;
}

export const listLinkedTvs = async (): Promise<LinkedTv[]> => {
  const response = await fetch(`${API_BASE_URL}/api/tvs`, {
    redirect: 'manual',
    credentials: 'include',
  });
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  if (!response.ok) throw new Error('Failed to load linked TVs');
  return response.json();
};

export const linkRoomTv = async (roomNumber: string, code: string, name?: string): Promise<LinkedTv> => {
  const response = await fetch(`${API_BASE_URL}/api/rooms/${encodeURIComponent(roomNumber)}/tvs`, {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ code: code.trim().toUpperCase(), name: name?.trim() || undefined }),
    redirect: 'manual',
    credentials: 'include',
  });
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to pair TV' }));
    if (err.error === 'code_not_found') {
      throw new Error('No TV is showing that pairing code right now. Check the 6-character code on the TV screen.');
    }
    throw new Error(err.error || err.message || 'Failed to pair TV');
  }
  return response.json();
};

export const unlinkRoomTv = async (tvId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/tvs/${encodeURIComponent(tvId)}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
    redirect: 'manual',
    credentials: 'include',
  });
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  if (!response.ok) throw new Error('Failed to unlink TV');
};

export interface TvSettings {
  area?: string;
  hostFirstName?: string;
  whatsapp?: string;
  template?: string;
  timeZone?: string;
  propertyNameOverride?: string;
  guestNameOverride?: string;
  tagline?: string;
  wifiName?: string;
  wifiPassword?: string;
  wifiSecurity?: string;
  checkInTime?: string;
  checkoutTime?: string;
  quietHoursFrom?: string;
  quietHoursTo?: string;
  welcomeMessage?: string;
  checkoutMessage?: string;
  betweenStaysMessage?: string;
  contactNote?: string;
  amenities?: string[];
  houseRules?: string[];
  checkoutSteps?: string[];
  musicUrl?: string;
  musicEnabled?: boolean;
  musicVolume?: number;
}

export const getTvSettings = async (roomNumber?: string): Promise<TvSettings> => {
  const qs = roomNumber ? `?roomNumber=${encodeURIComponent(roomNumber)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/tv/settings${qs}`, {
    redirect: 'manual',
    credentials: 'include',
  });
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  if (!response.ok) throw new Error('Failed to load TV settings');
  return response.json();
};

export const saveTvSettings = async (settings: TvSettings, roomNumber?: string): Promise<TvSettings> => {
  const qs = roomNumber ? `?roomNumber=${encodeURIComponent(roomNumber)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/tv/settings${qs}`, {
    method: 'PUT',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(settings),
    redirect: 'manual',
    credentials: 'include',
  });
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  if (!response.ok) throw new Error('Failed to save TV settings');
  return response.json();
};

export interface IcalEventPreview {
  uid: string;
  summary: string;
  guestName: string;
  source: string;
  checkInDate: string;
  checkOutDate: string;
}

export interface IcalExistingBooking {
  id: number;
  guestName: string;
  bookingSource: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalAmount: number;
  externalId?: string | null;
}

export interface IcalConflictPreview extends IcalEventPreview {
  existingBookings: IcalExistingBooking[];
}

export interface IcalPreviewResponse {
  roomNumber: string;
  source: string;
  totalEvents: number;
  ready: IcalEventPreview[];
  alreadySynced: IcalEventPreview[];
  conflicts: IcalConflictPreview[];
}

export interface IcalImportResult {
  roomNumber: string;
  source: string;
  importedCount: number;
  overriddenCount: number;
  skippedConflicts: number;
  alreadySyncedCount: number;
  syncedAt: string;
}

export const previewRoomIcalImport = async (
  roomNumber: string,
  payload: { url?: string; icsContent?: string; source: string }
): Promise<IcalPreviewResponse> => {
  const response = await fetch(`${API_BASE_URL}/rooms/${encodeURIComponent(roomNumber)}/ical/preview`, {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    redirect: 'manual',
    credentials: 'include',
  });
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  const data = await response.json().catch(() => ({ error: 'Failed to fetch iCal calendar' }));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to preview iCal calendar');
  }
  return data;
};

export const confirmRoomIcalImport = async (
  roomNumber: string,
  payload: { url?: string; icsContent?: string; source: string; overrideUids: string[]; saveUrl?: boolean }
): Promise<IcalImportResult> => {
  const response = await fetch(`${API_BASE_URL}/rooms/${encodeURIComponent(roomNumber)}/ical/import`, {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    redirect: 'manual',
    credentials: 'include',
  });
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  const data = await response.json().catch(() => ({ error: 'Failed to import iCal calendar' }));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to import iCal calendar');
  }
  return data;
};

export interface StructuredReservationInput {
  confirmationCode?: string;
  guestName?: string;
  phone?: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount?: number;
  source?: string;
  notes?: string;
}

export const previewStructuredReservations = async (
  roomNumber: string,
  payload: { source: string; reservations: StructuredReservationInput[] }
): Promise<IcalPreviewResponse> => {
  const response = await fetch(`${API_BASE_URL}/rooms/${encodeURIComponent(roomNumber)}/reservations/preview`, {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    redirect: 'manual',
    credentials: 'include',
  });
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  const data = await response.json().catch(() => ({ error: 'Failed to preview reservations' }));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to preview reservations');
  }
  return data;
};

export const confirmStructuredReservations = async (
  roomNumber: string,
  payload: { source: string; reservations: StructuredReservationInput[]; overrideUids: string[] }
): Promise<IcalImportResult> => {
  const response = await fetch(`${API_BASE_URL}/rooms/${encodeURIComponent(roomNumber)}/reservations/import`, {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    redirect: 'manual',
    credentials: 'include',
  });
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  const data = await response.json().catch(() => ({ error: 'Failed to import reservations' }));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to import reservations');
  }
  return data;
};
