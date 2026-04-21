import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Booking, Room } from '../types';

export const generateInvoice = async (booking: Booking, room?: Room) => {
    const doc = new jsPDF();

    // --- Design Tokens (Midnight Slate Theme) ---
    const primaryColor: [number, number, number] = [15, 23, 42];    // Midnight Slate
    const secondaryColor: [number, number, number] = [71, 85, 105];  // Slate-600
    const accentColor: [number, number, number] = [79, 70, 229];      // Indigo-600 (for highlights)
    const successColor: [number, number, number] = [5, 150, 105];    // Emerald-600
    const errorColor: [number, number, number] = [220, 38, 38];      // Red-600
    const lightFill: [number, number, number] = [248, 250, 252];     // Slate-50 background // Light fill

    // --- Data Pre-processing ---
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    const amount = booking.totalAmount || (booking.sources?.reduce((sum, s) => sum + (s.amount || 0), 0)) || 0;
    const paid = booking.totalPaid || 0;
    const balance = Math.max(0, amount - paid);
    const ratePerNight = amount / nights;

    // --- 1. Header (Letterhead Mode) ---
    doc.setFontSize(28);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('KARUNA VILLA', 14, 28);
    
    // Sub-brand line
    doc.setFontSize(10);
    doc.setTextColor(...accentColor);
    doc.setFont('helvetica', 'bold');
    doc.text('PREMIUM STAY & RETREAT', 14, 34);

    // Property Contact Info
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('KARUNA VILLA VARANASI', 196, 20, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    const contactLines = [
        'VDA Colony, Phase-1, Badalalpur',
        'Varanasi, Uttar Pradesh 221002',
        'karunavillastay@gmail.com',
        '+91 99999 99999'
    ];
    contactLines.forEach((line, i) => {
        doc.text(line, 196, 25 + (i * 4.5), { align: 'right' });
    });

    // --- 2. Receipt Meta ---
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.line(14, 46, 196, 46);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('PAYMENT RECEIPT', 14, 56);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text(`RECEIPT NO: `, 196, 53, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`#INV-${String(booking.id).substring(0, 8).toUpperCase()}`, 196, 58, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(`DATE ISSUED: `, 196, 63, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 196, 68, { align: 'right' });

    doc.setLineWidth(0.1);
    doc.line(14, 73, 196, 73);

    // --- 3. High-Density Info Cards ---
    const cardsStartY = 80;
    const cardH = 46;
    
    doc.setFillColor(...lightFill);
    doc.roundedRect(14, cardsStartY, 95, cardH, 4, 4, 'F'); 
    doc.roundedRect(114, cardsStartY, 82, cardH, 4, 4, 'F'); 

    // Left Card: Guest Details
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLED TO', 20, cardsStartY + 8);

    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.text(booking.guestName.toUpperCase(), 20, cardsStartY + 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    if (booking.guestPhone) doc.text(`Phone: ${booking.guestPhone}`, 20, cardsStartY + 28);
    doc.text(`Email: ${booking.guestEmail || 'Not Provided'}`, 20, cardsStartY + 34);

    // Right Card: Stay Details
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('STAY INFORMATION', 120, cardsStartY + 8);

    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text(`Check-In:`, 120, cardsStartY + 18);
    doc.text(`Check-Out:`, 120, cardsStartY + 24);
    doc.text(`Duration:`, 120, cardsStartY + 30);
    doc.text(`Room Type:`, 120, cardsStartY + 36);

    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(checkIn.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 150, cardsStartY + 18);
    doc.text(checkOut.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 150, cardsStartY + 24);
    doc.text(`${nights} Night${nights > 1 ? 's' : ''}`, 150, cardsStartY + 30);
    doc.text(room ? `Room ${room.number}` : 'N/A', 150, cardsStartY + 36);

    // --- 4. Detailed Ledger ---
    autoTable(doc, {
        startY: cardsStartY + 55,
        theme: 'plain', 
        head: [['DESCRIPTION', 'QTY', 'RATE/NIGHT', 'TOTAL']],
        body: [
            ['Accommodation Charges', `${nights} Nights`, `INR ${ratePerNight.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, `INR ${amount.toLocaleString('en-IN')}`]
        ],
        headStyles: {
            fillColor: lightFill,
            textColor: primaryColor,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: 6
        },
        bodyStyles: {
            textColor: [51, 65, 85],
            fontSize: 10,
            halign: 'left',
            cellPadding: 6
        },
        columnStyles: {
            0: { halign: 'left', cellWidth: 80 },
            1: { halign: 'center', cellWidth: 30 },
            2: { halign: 'right', cellWidth: 36 },
            3: { halign: 'right', cellWidth: 36 }
        },
        margin: { left: 14, right: 14 },
    });
    
    const afterTableY = (doc as any).lastAutoTable.finalY + 2;
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.2);
    doc.line(14, afterTableY, 196, afterTableY);

    // --- 5. Financial Summary with QR ---
    const summaryStartY = afterTableY + 12;
    
    // QR Code Section
    const qrWidth = 42;
    const qrX = 14; 
    
    try {
        const upiID = 'karunavillastay@oksbi'; // Configure real UPI ID here
        const upiName = 'Karuna Villa';
        const qrAmount = balance > 0 ? balance : amount;
        const upiUrl = `upi://pay?pa=${upiID}&pn=${encodeURIComponent(upiName)}${balance > 0 ? '&am=' + qrAmount : ''}&cu=INR`;
        
        const qrDataUrl = await QRCode.toDataURL(upiUrl, { 
            width: 200, 
            margin: 0, 
            color: { dark: '#0f172a', light: '#ffffff' } 
        });
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(qrX, summaryStartY, qrWidth + 16, qrWidth + 24, 4, 4, 'FD');
        
        doc.addImage(qrDataUrl, 'PNG', qrX + 8, summaryStartY + 8, qrWidth, qrWidth);
        
        doc.setFontSize(8);
        doc.setTextColor(...primaryColor);
        doc.setFont('helvetica', 'bold');
        if (balance > 0) {
            doc.text('SCAN TO PAY BALANCE', qrX + (qrWidth + 16)/2, summaryStartY + qrWidth + 16, { align: 'center' });
            doc.setFontSize(7);
            doc.setTextColor(...secondaryColor);
            doc.setFont('helvetica', 'normal');
            doc.text('Accepted on all UPI Apps', qrX + (qrWidth + 16)/2, summaryStartY + qrWidth + 20, { align: 'center' });
        } else {
            doc.text('VERIFIED & PAID', qrX + (qrWidth + 16)/2, summaryStartY + qrWidth + 16, { align: 'center' });
            doc.setFontSize(7);
            doc.setTextColor(...successColor);
            doc.text('Thank you!', qrX + (qrWidth + 16)/2, summaryStartY + qrWidth + 20, { align: 'center' });
        }
    } catch (e) {
        console.error("QR Code generation failed", e);
    }

    // Summary Box Section
    const boxWidth = 100;
    const boxX = 196 - boxWidth;
    
    doc.setFillColor(...lightFill);
    doc.roundedRect(boxX, summaryStartY, boxWidth, 48, 4, 4, 'F');

    const labelX = boxX + 8;
    const valueX = boxX + boxWidth - 8;
    let lineY = summaryStartY + 12;

    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Grand Total', labelX, lineY);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`INR ${amount.toLocaleString('en-IN')}`, valueX, lineY, { align: 'right' });

    lineY += 10;
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Amount Paid', labelX, lineY);
    doc.setTextColor(...successColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`INR ${paid.toLocaleString('en-IN')}`, valueX, lineY, { align: 'right' });

    lineY += 10;
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.2);
    doc.line(boxX + 8, lineY - 4, boxX + boxWidth - 8, lineY - 4);

    lineY += 4;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    if (balance > 0) {
        doc.setTextColor(...errorColor);
        doc.text('Balance Due', labelX, lineY);
        doc.text(`INR ${balance.toLocaleString('en-IN')}`, valueX, lineY, { align: 'right' });
    } else {
        doc.setTextColor(...successColor);
        doc.text('Total Balance', labelX, lineY);
        doc.text(`INR 0`, valueX, lineY, { align: 'right' });
    }

    // --- 6. Terms & Footer ---
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS', 14, pageHeight - 40);

    doc.setFontSize(7);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');
    const terms = [
        '1. Standard check-in time is 12:00 PM and check-out time is 11:00 AM.',
        '2. This is a computer-generated invoice and does not require a physical signature.',
        '3. For payment queries, please contact karunavillastay@gmail.com'
    ];
    terms.forEach((line, index) => {
        doc.text(line, 14, pageHeight - 35 + (index * 4));
    });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 18, 196, pageHeight - 18);

    doc.setFontSize(9);
    doc.setTextColor(...accentColor);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing Karuna Villa. We hope to welcome you again!', 105, pageHeight - 10, { align: 'center' });

    // --- Direct Download ---
    const safeGuestName = booking.guestName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
    doc.save(`KarunaVilla_Receipt_${safeGuestName}_${String(booking.id).substring(0, 5)}.pdf`);
};
