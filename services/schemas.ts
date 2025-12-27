import { z } from 'zod';
import {
    BookingSource,
    BookingStatus,
    PaymentMethod,
    PaymentType,
    RoomStatus,
    RoomType,
} from '../types';

export const RoomSchema = z.object({
    id: z.number(),
    roomNumber: z.string(), // API returns roomNumber, mapped to number in api.ts
    type: z.nativeEnum(RoomType),
    pricePerNight: z.number(),
    status: z.nativeEnum(RoomStatus),
    amenities: z.array(z.string()),
});

export const PaymentSchema = z.object({
    id: z.string(),
    bookingId: z.string(),
    amount: z.number(),
    date: z.string(),
    method: z.nativeEnum(PaymentMethod),
    type: z.nativeEnum(PaymentType),
    notes: z.string().optional(),
});

export const BookingSchema = z.object({
    id: z.string(),
    roomId: z.number(),
    guestName: z.string(),
    guestEmail: z.string().optional(),
    guestPhone: z.string().optional(),
    checkInDate: z.string(),
    checkOutDate: z.string(),
    source: z.nativeEnum(BookingSource),
    status: z.nativeEnum(BookingStatus),
    totalPaid: z.number().optional(),
    totalAmount: z.number().optional(),
    payments: z.array(PaymentSchema).optional(),
    pendingBalance: z.number().optional(),
    additionalCharges: z
        .array(
            z.object({
                description: z.string(),
                amount: z.number(),
            })
        )
        .optional(),
    notes: z.string().optional(),
    createdAt: z.string().optional(),
});
