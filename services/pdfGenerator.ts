import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking, Room } from '../types';

export const generateInvoice = async (booking: Booking, room?: Room) => {
    const doc = new jsPDF();

    // --- Design Tokens (Midnight Slate Theme) ---
    const primaryColor: [number, number, number] = [15, 23, 42];    // Midnight Slate
    const secondaryColor: [number, number, number] = [71, 85, 105];  // Slate-600
    const accentColor: [number, number, number] = [49, 46, 129];      // Indigo-900 (for borders/headers)
    const successColor: [number, number, number] = [5, 150, 105];    // Emerald-600
    const errorColor: [number, number, number] = [220, 38, 38];      // Red-600
    const lightFill: [number, number, number] = [248, 250, 252];    // Slate-50 background

    // --- Data Pre-processing ---
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    // Fallback: If totalAmount is missing, sum the amounts from individual sources
    const amount = booking.totalAmount || (booking.sources?.reduce((sum, s) => sum + (s.amount || 0), 0)) || 0;
    const paid = booking.totalPaid || 0;
    const balance = Math.max(0, amount - paid);
    const ratePerNight = amount / nights;

    // --- 1. Header (Letterhead Mode) ---
    // A high-end typographic branding approach
    doc.setFontSize(22);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('KARUNA VILLA', 14, 28);

    // Property Contact Info (Right Aligned, refined positioning)
    doc.setFontSize(8.5);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('KARUNA VILLA VARANASI', 196, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    const contactLines = [
        'VDA Colony, Phase-1, Badalalpur',
        'Varanasi, Uttar Pradesh 221002',
        'karunavillastay@gmail.com'
    ];
    contactLines.forEach((line, i) => {
        doc.text(line, 196, 23 + (i * 4.5), { align: 'right' });
    });

    // --- 2. Editorial Invoice Meta (Restored Spacing) ---
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.1);
    doc.line(14, 45, 196, 45); // Subtle hairline separator

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('OFFICIAL BOOKING INVOICE', 105, 55, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text(`Invoice ID: #INV-${String(booking.id).substring(0, 8).toUpperCase()}`, 14, 62);
    doc.text(`Issued Date: ${new Date().toLocaleDateString('en-IN')}`, 196, 62, { align: 'right' });

    doc.setLineWidth(0.1);
    doc.line(14, 68, 196, 68); // Closing hairline for header section

    // --- 3. High-Density Info Cards (Restored Air) ---
    const cardsStartY = 80;
    const cardH = 42;
    // Background blocks for visual separation
    doc.setFillColor(...lightFill);
    doc.roundedRect(14, cardsStartY, 90, cardH, 3, 3, 'F'); // Guest Card
    doc.roundedRect(106, cardsStartY, 90, cardH, 3, 3, 'F'); // Stay Card

    // Left Card: Guest Details
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('GUEST DETAILS', 20, cardsStartY + 8);

    doc.setTextColor(...primaryColor);
    doc.setFontSize(11);
    doc.text(booking.guestName.toUpperCase(), 20, cardsStartY + 17);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    if (booking.guestPhone) doc.text(`Phone: ${booking.guestPhone}`, 20, cardsStartY + 25);
    doc.text(`Email: ${booking.guestEmail || 'Not Provided'}`, 20, cardsStartY + 31);

    // Right Card: Stay Details
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('STAY SUMMARY', 112, cardsStartY + 8);

    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text(`Check-In:`, 112, cardsStartY + 17);
    doc.text(`Check-Out:`, 112, cardsStartY + 23);
    doc.text(`Duration:`, 112, cardsStartY + 29);
    doc.text(`Room Type:`, 112, cardsStartY + 35);

    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(checkIn.toLocaleDateString('en-IN'), 145, cardsStartY + 17);
    doc.text(checkOut.toLocaleDateString('en-IN'), 145, cardsStartY + 23);
    doc.text(`${nights} Night${nights > 1 ? 's' : ''}`, 145, cardsStartY + 29);
    doc.text(room ? `${room.number} (${room.type})` : 'N/A', 145, cardsStartY + 35);

    // --- 4. Detailed Ledger (Premium Grid Table) ---
    autoTable(doc, {
        startY: cardsStartY + 52,
        theme: 'grid', // grid provides clean lines for premium look
        head: [['SN.', 'DESCRIPTION', 'QTY', 'RATE/NIGHT', 'TOTAL']],
        body: [
            ['01', 'Accommodation Charges', `${nights} Nights`, `INR ${ratePerNight.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, `INR ${amount.toLocaleString('en-IN')}`]
        ],
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'center',
            lineWidth: 0.2,
            cellPadding: 4
        },
        bodyStyles: {
            fillColor: lightFill,
            textColor: [51, 65, 85],
            fontSize: 10,
            halign: 'right',
            cellPadding: 4
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'left', cellWidth: 82 },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'right', cellWidth: 30 },
            4: { halign: 'right', cellWidth: 30 }
        },
        margin: { top: 10, left: 14, right: 14 },
        tableLineColor: primaryColor,
        tableLineWidth: 0.3
    });
    // Title for the ledger
    const ledgerTitleY = cardsStartY + 48;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Statement of Account', 14, ledgerTitleY);
    // Add a subtle divider after the table
    const afterTableY = (doc as any).lastAutoTable.finalY + 5;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.line(14, afterTableY, 196, afterTableY);


    // --- 5. Financial Summary (Boxed Statement) ---
    const summaryStartY = (doc as any).lastAutoTable.finalY + 15;
    const boxX = 14;
    const boxWidth = 182;
    const boxHeight = 38;
    // Draw a subtle background for the summary
    doc.setFillColor(...lightFill);
    doc.rect(boxX, summaryStartY, boxWidth, boxHeight, 'F');

    // Title inside the box
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Account Summary', boxX + 8, summaryStartY + 12);

    const labelX = 30;
    const valueX = 170;
    let lineY = summaryStartY + 22;
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Grand Total', labelX, lineY);
    doc.setTextColor(...primaryColor);
    doc.text(`INR ${amount.toLocaleString('en-IN')}`, valueX, lineY, { align: 'right' });

    lineY += 8;
    doc.setTextColor(...secondaryColor);
    doc.text('Amount Paid', labelX, lineY);
    doc.setTextColor(...successColor);
    doc.text(`INR ${paid.toLocaleString('en-IN')}`, valueX, lineY, { align: 'right' });

    lineY += 8;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(boxX + 5, lineY, boxX + boxWidth - 5, lineY);

    lineY += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    if (balance > 0) {
        doc.setTextColor(...errorColor);
        doc.text('Balance Amount', labelX, lineY);
        doc.text(`INR ${balance.toLocaleString('en-IN')}`, valueX, lineY, { align: 'right' });
    } else {
        doc.setTextColor(...successColor);
        doc.text('Fully Paid / Settled', labelX, lineY);
        doc.text(`INR 0`, valueX, lineY, { align: 'right' });
    }

    // --- 6. Terms & Footer ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 55, 196, pageHeight - 55);

    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('POLICIES & GUIDELINES', 14, pageHeight - 48);

    doc.setFontSize(7);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');
    const terms = [
        '1. Guests are responsible for their own baggage and personal items; the owner/management is not liable for any losses.',
        '2. Standard check-in time is 12:00 PM and check-out time is 11:00 AM.',
        '3. This is a computer-generated invoice and doesn\'t require a physical signature.',
        '4. All disputes are subject to Varanasi Jurisdiction only.'
    ];
    terms.forEach((line, index) => {
        doc.text(line, 14, pageHeight - 42 + (index * 4));
    });

    // Signature section
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signature:', 14, pageHeight - 20);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.2);
    doc.line(55, pageHeight - 20, 120, pageHeight - 20);

    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for staying at Karuna Villa!', 105, pageHeight - 10, { align: 'center' });

    // --- Direct Download ---
    const safeGuestName = booking.guestName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
    doc.save(`KarunaVilla_Invoice_${safeGuestName}_${String(booking.id).substring(0, 5)}.pdf`);
};
