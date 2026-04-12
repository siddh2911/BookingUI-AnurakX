import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking, Room } from '../types';

export const generateInvoice = (booking: Booking, room?: Room) => {
    // A4 landscape or portrait (default is portrait A4)
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [30, 58, 138]; // Slate/blue-900

    // --- Header Section ---
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('KARUNA VILLA', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont('helvetica', 'normal');
    doc.text('123 Luxury Avenue, Varanasi, Uttar Pradesh, India', 14, 30);
    doc.text('Phone: +91 98765 43210 | Email: bookings@karunavilla.in', 14, 35);
    doc.text('GSTIN: 09AAACA1234A1Z5', 14, 40);

    // --- Invoice Meta Data ---
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 160, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 160, 30);
    doc.text(`Invoice #: INV-${String(booking.id).substring(0, 8).toUpperCase()}`, 160, 35);

    // Divider Line
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(14, 46, 196, 46);

    // --- Guest Details Section ---
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Billed To:', 14, 56);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(`Guest Name: ${booking.guestName}`, 14, 63);
    if (booking.guestPhone) doc.text(`Phone: ${booking.guestPhone}`, 14, 69);
    const sourceName = booking.sources && booking.sources.length > 0 ? booking.sources[0].source : 'Direct';
    doc.text(`Source: ${sourceName}`, 14, 75);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Booking Information:', 120, 56);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Check-In: ${new Date(booking.checkInDate).toLocaleDateString('en-IN')}`, 120, 63);
    doc.text(`Check-Out: ${new Date(booking.checkOutDate).toLocaleDateString('en-IN')}`, 120, 69);
    if (room) doc.text(`Room: ${room.number} (${room.type})`, 120, 75);

    // --- Pricing Table ---
    const checkIn = new Date(booking.checkInDate); checkIn.setHours(0, 0, 0, 0);
    const checkOut = new Date(booking.checkOutDate); checkOut.setHours(0, 0, 0, 0);
    const calculatedNights = Math.max(1, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const finalNights = calculatedNights;

    // Derive average room rate mathematically
    const rate = booking.totalAmount / finalNights;

    autoTable(doc, {
        startY: 85,
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        bodyStyles: { textColor: 50 },
        alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate-50
        head: [['Description', 'Nights', 'Nightly Rate', 'Total']],
        body: [
            ['Accommodation Charges', `${finalNights}`, `Rs. ${rate.toFixed(2)}`, `Rs. ${(finalNights * rate).toFixed(2)}`],
        ],
        margin: { top: 10 }
    });

    // We can extract the final Y coordinate to position the summary correctly
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // --- Financial Summary ---
    // Right align the finances
    autoTable(doc, {
        startY: finalY,
        margin: { left: 110 },
        tableWidth: 86,
        theme: 'plain',
        body: [
            ['Total Amount:', `Rs. ${booking.totalAmount.toLocaleString('en-IN')}`],
            ['Amount Paid:', `Rs. ${booking.totalPaid.toLocaleString('en-IN')}`],
        ],
        foot: [
            ['Pending Balance:', `Rs. ${(booking.totalAmount - booking.totalPaid).toLocaleString('en-IN')}`]
        ],
        bodyStyles: { textColor: 71, halign: 'right' },
        footStyles: { textColor: [220, 38, 38], halign: 'right', fontStyle: 'bold', fontSize: 12 },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', textColor: 15 },
        }
    });

    finalY = (doc as any).lastAutoTable.finalY + 30;

    // --- Footer ---
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(14, finalY, 196, finalY);

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing Karuna Villa! We hope to see you again.', 105, finalY + 10, { align: 'center' });
    doc.text('This is a computer generated invoice and requires no signature.', 105, finalY + 16, { align: 'center' });

    // --- Download PDF ---
    const cleanGuestName = booking.guestName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
    const cleanInvoiceId = String(booking.id).substring(0, 5).toUpperCase();
    doc.save(`KarunaVilla_Invoice_${cleanGuestName}_${cleanInvoiceId}.pdf`);
};
