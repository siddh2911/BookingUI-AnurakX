import { Booking, Room, BookingStatus } from '../types';

export const generateChartData = (
    type: 'revenue' | 'occupancy',
    range: 'daily' | 'weekly' | 'monthly' | 'yearly',
    offset: number,
    bookings: Booking[],
    rooms: Room[]
) => {
    const today = new Date();

    // Adjust 'today' based on offset
    // daily: 7 days per offset
    // weekly: 8 weeks per offset
    // monthly: 6 months per offset
    // yearly: 4 years per offset

    // Actually, we want to "shift" the window.
    // The generators below generate N items ending at 'referenceDate'.
    // So we just need to calculate the correct referenceDate.

    let referenceDate = new Date(today);

    if (range === 'daily') {
        referenceDate.setDate(today.getDate() - (offset * 7));
        return type === 'revenue'
            ? generateRevenueData(7, bookings, referenceDate)
            : generateOccupancyData(7, bookings, rooms, referenceDate);
    }

    if (range === 'weekly') {
        // 8 weeks per view
        referenceDate.setDate(today.getDate() - (offset * 7 * 8));
        return type === 'revenue'
            ? generateWeeklyRevenueData(8, bookings, referenceDate)
            : generateWeeklyOccupancyData(8, bookings, rooms, referenceDate);
    }

    if (range === 'monthly') {
        // 6 months per view
        referenceDate.setMonth(today.getMonth() - (offset * 6));
        return type === 'revenue'
            ? generateMonthlyRevenueData(6, bookings, referenceDate)
            : generateMonthlyOccupancyData(6, bookings, rooms, referenceDate);
    }

    if (range === 'yearly') {
        // 4 years per view
        referenceDate.setFullYear(today.getFullYear() - (offset * 4));
        return type === 'revenue'
            ? generateAnnualRevenueData(4, bookings, referenceDate)
            : generateAnnualOccupancyData(4, bookings, rooms, referenceDate);
    }

    return [];
};

// --- Generators ---

const generateRevenueData = (days: number, bookings: Booking[], endDate: Date) => {
    return Array.from({ length: days }, (_, i) => {
        const d = new Date(endDate); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        const nextD = new Date(d); nextD.setDate(nextD.getDate() + 1);

        const dayRevenue = bookings.filter(b => b.status !== BookingStatus.CANCELLED).reduce((sum, b) => {
            const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
            const checkOut = new Date(b.checkOutDate); checkOut.setHours(0, 0, 0, 0);

            if (checkIn <= d && d < checkOut) {
                const totalNights = Math.max(1, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                const dailyValue = (b.totalAmount || b.totalPaid || 0) / totalNights;
                return sum + dailyValue;
            }
            return sum;
        }, 0);

        const name = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        return { name, revenue: Math.round(dayRevenue), date: d };
    }).reverse();
};

const generateWeeklyRevenueData = (weeks: number, bookings: Booking[], refDate: Date) => {
    return Array.from({ length: weeks }, (_, i) => {
        const currentRef = new Date(refDate);
        // Find Monday of the reference week
        const day = currentRef.getDay();
        const diff = currentRef.getDate() - day + (day === 0 ? -6 : 1);
        const currentWeekMonday = new Date(currentRef.setDate(diff));
        currentWeekMonday.setHours(0, 0, 0, 0);

        const weekStart = new Date(currentWeekMonday);
        weekStart.setDate(weekStart.getDate() - (i * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekRevenue = bookings.filter(b => b.status !== BookingStatus.CANCELLED).reduce((sum, b) => {
            const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
            const checkOut = new Date(b.checkOutDate); checkOut.setHours(0, 0, 0, 0);

            const overlapStart = new Date(Math.max(weekStart.getTime(), checkIn.getTime()));
            const overlapEnd = new Date(Math.min(weekEnd.getTime(), checkOut.getTime()));

            if (overlapStart < overlapEnd) {
                const overlapNights = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
                const totalNights = Math.max(1, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                const dailyRate = (b.totalAmount || b.totalPaid || 0) / totalNights;
                return sum + (overlapNights * dailyRate);
            }
            return sum;
        }, 0);

        const sMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
        const sDay = weekStart.getDate();
        const eDay = weekEnd.getDate();
        const eMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });

        const label = sMonth === eMonth
            ? `${sMonth} ${sDay}-${eDay}`
            : `${sMonth} ${sDay}-${eMonth} ${eDay}`;

        return { name: label, revenue: Math.round(weekRevenue) };
    }).reverse();
};

const generateMonthlyRevenueData = (months: number, bookings: Booking[], refDate: Date) => {
    return Array.from({ length: months }, (_, i) => {
        const d = new Date(refDate); d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0, 0, 0, 0);
        const monthStart = new Date(d);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0); monthEnd.setHours(23, 59, 59, 999);

        const monthRevenue = bookings.filter(b => b.status !== BookingStatus.CANCELLED).reduce((sum, b) => {
            const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
            const checkOut = new Date(b.checkOutDate); checkOut.setHours(0, 0, 0, 0);

            const overlapStart = new Date(Math.max(monthStart.getTime(), checkIn.getTime()));
            const overlapEnd = new Date(Math.min(monthEnd.getTime(), checkOut.getTime()));

            if (overlapStart < overlapEnd) {
                const overlapNights = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
                const totalNights = Math.max(1, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                const dailyRate = (b.totalAmount || b.totalPaid || 0) / totalNights;
                return sum + (overlapNights * dailyRate);
            }
            return sum;
        }, 0);

        return { name: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), revenue: Math.round(monthRevenue) };
    }).reverse();
};

const generateAnnualRevenueData = (years: number, bookings: Booking[], refDate: Date) => {
    const currentYear = refDate.getFullYear();
    // We want the 'years' window ending at currentYear + 1 usually? 
    // Original code: startYear = currentYear - 2, num = 4 => [current-2, current-1, current, current+1]
    // With offset, we shift this block.
    // Let's stick to simple "Last N Years" ending at currentYear for consistency if offset=0?
    // User liked "2024, 2025, 2026". That's [Current-1, Current, Current+1] basically.
    // Let's make it a 4-year sliding window ending at (Current + 1)

    const endYear = currentYear + 1;

    return Array.from({ length: years }, (_, i) => {
        const year = endYear - (years - 1) + i; // i=0 -> endYear-3, i=3 -> endYear
        // wait, Array.from length 4. i=0,1,2,3.
        // i=3 should be endYear.
        // year = endYear - 3 + i.

        // Example: 2026. years=4. 
        // i=0: 2023. i=1: 2024. i=2: 2025. i=3: 2026.

        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

        const yearRevenue = bookings.filter(b => b.status !== BookingStatus.CANCELLED).reduce((sum, b) => {
            const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
            const checkOut = new Date(b.checkOutDate); checkOut.setHours(0, 0, 0, 0);

            const overlapStart = new Date(Math.max(yearStart.getTime(), checkIn.getTime()));
            const overlapEnd = new Date(Math.min(yearEnd.getTime(), checkOut.getTime()));

            if (overlapStart < overlapEnd) {
                const overlapNights = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
                const totalNights = Math.max(1, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                const dailyRate = (b.totalAmount || b.totalPaid || 0) / totalNights;
                return sum + (overlapNights * dailyRate);
            }
            return sum;
        }, 0);

        return { name: year.toString(), revenue: Math.round(yearRevenue) };
    }); // No reverse needed if we construct in order
};


// --- Occupancy Generators ---

const generateOccupancyData = (days: number, bookings: Booking[], rooms: Room[], endDate: Date) => {
    return Array.from({ length: days }, (_, i) => {
        const d = new Date(endDate); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        const nextD = new Date(d); nextD.setDate(nextD.getDate() + 1);

        const totalRoomNights = rooms.length;
        if (totalRoomNights === 0) return { name: '', occupancy: 0, date: d };

        let occupiedCount = 0;
        bookings.forEach(b => {
            if (b.status === BookingStatus.CANCELLED) return;
            const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
            const checkOut = new Date(b.checkOutDate); checkOut.setHours(0, 0, 0, 0);
            if (checkIn <= d && d < checkOut) {
                occupiedCount++;
            }
        });

        const occupancyRate = Math.round((occupiedCount / totalRoomNights) * 100);
        const name = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        return { name, occupancy: occupancyRate, date: d };
    }).reverse();
};

const generateWeeklyOccupancyData = (weeks: number, bookings: Booking[], rooms: Room[], refDate: Date) => {
    return Array.from({ length: weeks }, (_, i) => {
        const currentRef = new Date(refDate);
        const day = currentRef.getDay();
        const diff = currentRef.getDate() - day + (day === 0 ? -6 : 1);
        const currentWeekMonday = new Date(currentRef.setDate(diff));
        currentWeekMonday.setHours(0, 0, 0, 0);

        const weekStart = new Date(currentWeekMonday);
        weekStart.setDate(weekStart.getDate() - (i * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const totalRoomNights = rooms.length * 7;
        if (totalRoomNights === 0) return { name: '', occupancy: 0 };

        let occupiedCount = 0;
        bookings.forEach(b => {
            if (b.status === BookingStatus.CANCELLED) return;
            const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
            const checkOut = new Date(b.checkOutDate); checkOut.setHours(0, 0, 0, 0);

            const overlapStart = new Date(Math.max(weekStart.getTime(), checkIn.getTime()));
            const overlapEnd = new Date(Math.min(weekEnd.getTime(), checkOut.getTime()));

            if (overlapStart < overlapEnd) {
                const overlapNights = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
                occupiedCount += overlapNights;
            }
        });

        const occupancyRate = Math.round((occupiedCount / totalRoomNights) * 100);

        const sMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
        const sDay = weekStart.getDate();
        const eDay = weekEnd.getDate();
        const eMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });

        const label = sMonth === eMonth
            ? `${sMonth} ${sDay}-${eDay}`
            : `${sMonth} ${sDay}-${eMonth} ${eDay}`;

        return { name: label, occupancy: occupancyRate };
    }).reverse();
};

const generateMonthlyOccupancyData = (months: number, bookings: Booking[], rooms: Room[], refDate: Date) => {
    return Array.from({ length: months }, (_, i) => {
        const d = new Date(refDate); d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0, 0, 0, 0);
        const monthStart = new Date(d);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0); monthEnd.setHours(23, 59, 59, 999);

        const daysInMonth = monthEnd.getDate();
        const totalRoomNights = rooms.length * daysInMonth; // Approx capacity
        if (totalRoomNights === 0) return { name: '', occupancy: 0 };

        let occupiedCount = 0;
        bookings.forEach(b => {
            if (b.status === BookingStatus.CANCELLED) return;
            const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
            const checkOut = new Date(b.checkOutDate); checkOut.setHours(0, 0, 0, 0);

            const overlapStart = new Date(Math.max(monthStart.getTime(), checkIn.getTime()));
            const overlapEnd = new Date(Math.min(monthEnd.getTime(), checkOut.getTime()));

            if (overlapStart < overlapEnd) {
                const overlapNights = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
                occupiedCount += overlapNights;
            }
        });

        const occupancyRate = Math.round((occupiedCount / totalRoomNights) * 100);
        return { name: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), occupancy: occupancyRate };
    }).reverse();
};

const generateAnnualOccupancyData = (years: number, bookings: Booking[], rooms: Room[], refDate: Date) => {
    const currentYear = refDate.getFullYear();
    const endYear = currentYear + 1; // consistent window

    return Array.from({ length: years }, (_, i) => {
        const year = endYear - (years - 1) + i;
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

        const daysInYear = ((year % 4 === 0 && year % 100 > 0) || year % 400 === 0) ? 366 : 365;
        const totalRoomNights = rooms.length * daysInYear;
        if (totalRoomNights === 0) return { name: year.toString(), occupancy: 0 };

        let occupiedCount = 0;
        bookings.forEach(b => {
            if (b.status === BookingStatus.CANCELLED) return;
            const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
            const checkOut = new Date(b.checkOutDate); checkOut.setHours(0, 0, 0, 0);

            const overlapStart = new Date(Math.max(yearStart.getTime(), checkIn.getTime()));
            const overlapEnd = new Date(Math.min(yearEnd.getTime(), checkOut.getTime()));

            if (overlapStart < overlapEnd) {
                const overlapNights = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
                occupiedCount += overlapNights;
            }
        });

        const occupancyRate = Math.round((occupiedCount / totalRoomNights) * 100);
        return { name: year.toString(), occupancy: occupancyRate };
    });
};
