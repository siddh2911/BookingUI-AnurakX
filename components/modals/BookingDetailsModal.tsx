import React, { useEffect } from 'react';
import Modal from '../ui/Modal';
import { Booking, BookingStatus, Payment } from '../../types';
import { CreditCard, Calendar, Download, MessageCircle, Receipt, AlertCircle, CheckCircle2, LogOut, XCircle, UserX } from 'lucide-react';
import { generateInvoice } from '../../services/pdfGenerator';
import PlatformIcon from '../common/PlatformIcon';

interface BookingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking;
    payments?: Payment[];
    isLoadingPayments?: boolean;
    paymentsError?: string | null;
    onLoadPayments?: () => void;
    onAddPayment: () => void;
    onUpdateStatus?: (status: BookingStatus) => Promise<void> | void;
    onSendReviewRequest?: (booking: Booking) => void;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
    isOpen,
    onClose,
    booking,
    payments = [],
    isLoadingPayments = false,
    paymentsError = null,
    onLoadPayments,
    onAddPayment,
    onUpdateStatus,
    onSendReviewRequest,
}) => {
    useEffect(() => {
        if (isOpen && booking?.id && onLoadPayments) {
            onLoadPayments();
        }
    }, [isOpen, booking?.id]);

    const totalAmount = booking.totalAmount ?? 0;
    const totalPaid = booking.totalPaid ?? 0;
    const pendingBalance = booking.pendingBalance ?? Math.max(0, totalAmount - totalPaid);

    const statusBadgeClass =
        booking.status === BookingStatus.CONFIRMED ? 'bg-green-100 text-green-700' :
        booking.status === BookingStatus.CHECKED_IN ? 'bg-blue-100 text-blue-700' :
        booking.status === BookingStatus.CHECKED_OUT ? 'bg-slate-100 text-slate-700' :
        booking.status === BookingStatus.CANCELLED ? 'bg-rose-100 text-rose-700' :
        booking.status === BookingStatus.NO_SHOW ? 'bg-amber-100 text-amber-800' :
        'bg-slate-100 text-slate-700';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Booking Details">
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{booking.guestName}</h3>
                        <p className="text-slate-600 text-sm font-semibold">Room {booking.roomId}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
                            <PlatformIcon source={booking.sources?.[0]?.source || 'Direct'} className="w-3.5 h-3.5" />
                            <span>{booking.sources?.[0]?.source || 'Unknown'}</span>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeClass}`}>
                        {booking.status}
                    </span>
                </div>

                {/* Lifecycle Quick Actions */}
                {onUpdateStatus && (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.CHECKED_IN) && (
                    <div className="flex flex-wrap gap-2">
                        {booking.status === BookingStatus.CONFIRMED && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => onUpdateStatus(BookingStatus.CHECKED_IN)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                                >
                                    <CheckCircle2 size={14} /> Check In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUpdateStatus(BookingStatus.NO_SHOW)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                                >
                                    <UserX size={14} /> No Show
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUpdateStatus(BookingStatus.CANCELLED)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
                                >
                                    <XCircle size={14} /> Cancel
                                </button>
                            </>
                        )}
                        {booking.status === BookingStatus.CHECKED_IN && (
                            <button
                                type="button"
                                onClick={() => onUpdateStatus(BookingStatus.CHECKED_OUT)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
                            >
                                <LogOut size={14} /> Check Out
                            </button>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/10 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <Calendar size={14} /> <span className="text-xs uppercase font-bold">Check In</span>
                        </div>
                        <p className="font-semibold text-slate-800">{booking.checkInDate}</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <Calendar size={14} /> <span className="text-xs uppercase font-bold">Check Out</span>
                        </div>
                        <p className="font-semibold text-slate-800">{booking.checkOutDate}</p>
                    </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-3 p-4 border border-slate-200/70 bg-slate-50/70 rounded-xl">
                    <div>
                        <p className="text-[11px] uppercase font-bold text-slate-500">Total</p>
                        <p className="text-base font-bold text-slate-900">₹{totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-[11px] uppercase font-bold text-slate-500">Paid</p>
                        <p className="text-base font-bold text-emerald-700">₹{totalPaid.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-[11px] uppercase font-bold text-slate-500">Balance</p>
                        <p className={`text-base font-bold ${pendingBalance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                            ₹{pendingBalance.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Payment History Ledger */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Receipt size={14} /> Payment History
                        </h4>
                        <span className="text-xs text-slate-400">{payments.length} transaction{payments.length === 1 ? '' : 's'}</span>
                    </div>

                    {isLoadingPayments ? (
                        <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/70">
                            Loading payment history...
                        </div>
                    ) : paymentsError ? (
                        <div className="p-3 flex items-center gap-2 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
                            <AlertCircle size={14} />
                            <span>{paymentsError}</span>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            No payments recorded yet.
                        </div>
                    ) : (
                        <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white">
                            {payments.map((p) => {
                                const isRefund = String(p.type || '').toLowerCase() === 'refund';
                                return (
                                    <div key={p.id} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                                    isRefund ? 'bg-rose-100 text-rose-700' :
                                                    String(p.type || '').toLowerCase() === 'advance' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {p.type}
                                                </span>
                                                <span className="font-medium text-slate-700">{p.method}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {p.date ? new Date(p.date).toLocaleDateString() : ''}
                                                {p.notes ? ` • ${p.notes}` : ''}
                                            </p>
                                        </div>
                                        <span className={`font-bold text-sm ${isRefund ? 'text-rose-600' : 'text-emerald-700'}`}>
                                            {isRefund ? '-' : '+'}₹{Number(p.amount || 0).toLocaleString()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                        <button
                            onClick={onAddPayment}
                            className="flex-1 flex justify-center items-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-sm"
                        >
                            <CreditCard size={16} />
                            Add Payment
                        </button>
                        <button
                            onClick={async () => await generateInvoice(booking)}
                            className="flex-1 flex justify-center items-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm"
                        >
                            <Download size={18} />
                            Receipt
                        </button>
                    </div>
                    {onSendReviewRequest && (
                        <button
                            onClick={() => {
                                onSendReviewRequest(booking);
                                onClose();
                            }}
                            className="w-full flex justify-center items-center gap-2 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 transition shadow-sm"
                        >
                            <MessageCircle size={18} />
                            Send WhatsApp Review Request
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default BookingDetailsModal;
