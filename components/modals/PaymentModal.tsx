import React from 'react';
import Modal from '../ui/Modal';
import { Booking, Payment, PaymentMethod, PaymentType } from '../../types'; // Import Payment type
import { format } from 'date-fns';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBooking: Booking | null;
  handleAddPayment: (e: React.FormEvent<HTMLFormElement>) => void;
  payments: Payment[]; // New prop for payments history
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, selectedBooking, handleAddPayment, payments }) => {
  if (!isOpen || !selectedBooking) return null;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0); // Calculate total paid from payments history
  const remainingAmount = selectedBooking.pendingBalance || 0; // Use pendingBalance from API

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Payment">
       <form onSubmit={handleAddPayment} className="space-y-4">
           <div>
               <p className="text-sm text-slate-600 mb-4">Adding payment for <span className="font-bold text-slate-800">{selectedBooking?.guestName}</span>. Total due: <span className="font-bold text-red-600">₹{remainingAmount.toLocaleString()}</span></p>
           </div>
           
           {/* Payments History Section */}
           {payments.length > 0 && (
             <div className="bg-white p-4 rounded-md border border-slate-200">
               <h3 className="text-xs font-bold text-slate-700 mb-2">Payment History</h3>
               <table className="w-full text-xs text-left">
                 <thead className="bg-slate-50 text-slate-500 uppercase">
                   <tr>
                     <th className="px-2 py-1">Date</th>
                     <th className="px-2 py-1">Amount</th>
                     <th className="px-2 py-1">Method</th>
                     <th className="px-2 py-1">Type</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {payments.map(p => (
                     <tr key={p.id}>
                       <td className="px-2 py-1">{format(new Date(p.date), 'MMM d, yyyy')}</td>
                       <td className="px-2 py-1">₹{p.amount.toLocaleString()}</td>
                       <td className="px-2 py-1">{p.method}</td>
                       <td className="px-2 py-1">{p.type}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               <div className="flex justify-end text-sm font-bold text-slate-800 mt-2">
                 Total Paid: ₹{totalPaid.toLocaleString()}
               </div>
             </div>
           )}

           <div className="grid grid-cols-2 gap-4">
               <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                   <input 
                       name="amount" 
                       type="number" 
                       step="0.01" 
                       required 
                       className="w-full border rounded-lg p-2 text-sm" 
                       defaultValue={remainingAmount > 0 ? remainingAmount : ''} // Use remainingAmount
                   />
               </div>
               <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Method</label>
                   <select name="method" required className="w-full border rounded-lg p-2 text-sm">
                       {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                   </select>
               </div>
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select name="type" required className="w-full border rounded-lg p-2 text-sm">
                 {Object.values(PaymentType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
           </div>
           <div className="flex justify-end gap-3 pt-4">
             <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
             <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Record Payment</button>
           </div>
       </form>
    </Modal>
  );
};

export default PaymentModal;
