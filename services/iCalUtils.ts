import { Booking, BookingSource, BookingStatus } from '../types';

export const generateICal = (bookings: Booking[], roomName: string): string => {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Karuna Villa//NONSGML v1.0//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Karuna Villa - ${roomName}
X-WR-TIMEZONE:UTC
`;

    bookings.forEach(booking => {
        // Basic date formatting suitable for iCal (YYYYMMDD)
        // Assuming checkInDate/checkOutDate are YYYY-MM-DD
        const start = booking.checkInDate.replace(/-/g, '');
        const end = booking.checkOutDate.replace(/-/g, '');

        ical += `BEGIN:VEVENT
UID:${booking.id}@karunavilla.com
DTSTAMP:${now}
DTSTART;VALUE=DATE:${start}
DTEND;VALUE=DATE:${end}
SUMMARY:${booking.guestName} (${booking.sources?.[0]?.source || 'Unknown'})
DESCRIPTION:Booking ID: ${booking.id}\\nSource: ${booking.sources?.[0]?.source || 'Unknown'}\\nStatus: ${booking.status}
STATUS:CONFIRMED
END:VEVENT
`;
    });

    ical += 'END:VCALENDAR';
    return ical;
};

// Simple parser for demo purposes. 
// Real-world iCal parsing is complex due to timezones/recurrence.
export const parseICal = (icalContent: string, source: BookingSource): Partial<Booking>[] => {
    const bookings: Partial<Booking>[] = [];
    const events = icalContent.split('BEGIN:VEVENT');

    events.slice(1).forEach(eventBlock => {
        const dtStartMatch = eventBlock.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
        const dtEndMatch = eventBlock.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);
        const summaryMatch = eventBlock.match(/SUMMARY:(.*)/);
        const uidMatch = eventBlock.match(/UID:(.*)/);

        if (dtStartMatch && dtEndMatch) {
            const startStr = dtStartMatch[1];
            const endStr = dtEndMatch[1];

            // Format from YYYYMMDD to YYYY-MM-DD
            const formattedStart = `${startStr.substring(0, 4)}-${startStr.substring(4, 6)}-${startStr.substring(6, 8)}`;
            const formattedEnd = `${endStr.substring(0, 4)}-${endStr.substring(4, 6)}-${endStr.substring(6, 8)}`;

            bookings.push({
                id: uidMatch ? uidMatch[1].trim() : Math.random().toString(36).substr(2, 9),
                sources: [{ source: source, amount: 0 }],
                status: BookingStatus.CONFIRMED,
                guestName: summaryMatch ? summaryMatch[1].trim() : 'External Guest',
                checkInDate: formattedStart,
                checkOutDate: formattedEnd,
                // Default values for external bookings
                totalAmount: 0,
                paidAmount: 0,
            } as any);
        }
    });

    return bookings;
};
