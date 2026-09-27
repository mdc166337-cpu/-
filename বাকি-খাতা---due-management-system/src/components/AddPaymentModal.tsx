import React, { useState, useEffect } from 'react';
import { 
  X, ArrowDownCircle, DollarSign, Calendar, CreditCard, 
  MessageSquare, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api.ts';
import { formatCurrency } from '../utils/formatters.ts';
import type { Customer, ShopSettings, Transaction } from '../types.ts';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  selectedCustomer: Customer | null;
  shopSettings: ShopSettings | null;
  onSuccess: (tx: Transaction, cust: Customer) => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  customers,
  selectedCustomer,
  shopSettings,
  onSuccess,
}) => {
  const currency = shopSettings?.currency || '৳';

  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'Bank'>('Cash');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [sendSmsConfirmation, setSendSmsConfirmation] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      if (selectedCustomer) {
        setCustomerId(selectedCustomer.id);
        // Pre-fill full remaining due or let them type
        setAmount(selectedCustomer.currentDue > 0 ? selectedCustomer.currentDue : '');
      } else if (customers.length > 0 && !customerId) {
        setCustomerId(customers[0].id);
        setAmount('');
      }
      setError(null);
    }
  }, [isOpen, selectedCustomer, customers]);

  const activeCustomer = customers.find(c => c.id === customerId);
  const paymentAmountNum = Number(amount) || 0;
  const currentDue = activeCustomer?.currentDue || 0;
  const remainingDue = Math.max(0, currentDue - paymentAmountNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('কাস্টমার নির্বাচন করুন');
      return;
    }

    if (paymentAmountNum <= 0) {
      setError('সঠিক জমার পরিমাণ লিখুন (০ থেকে বড় হতে হবে)');
      return;
    }

    setLoading(true);

    try {
      const res = await api.addPaymentTransaction({
        customerId,
        amount: paymentAmountNum,
        paymentMethod,
        date,
        note,
        sendSmsConfirmation,
      });

      onSuccess(res.transaction, res.customer);
      onClose();
    } catch (err: any) {
      setError(err.message || 'টাকা জমা রেকর্ড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">টাকা জমা গ্রহণ (Add Payment)</h3>
              <p className="text-xs text-slate-500">বাকি কমাতে কাস্টমারের নগদ পরিশোধ রেকর্ড করুন</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Customer select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              কাস্টমার নির্বাচন করুন <span className="text-rose-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                const found = customers.find(c => c.id === e.target.value);
                if (found && found.currentDue > 0) {
                  setAmount(found.currentDue);
                }
              }}
              className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mobile}) - বাকি: {formatCurrency(c.currentDue, currency)}
                </option>
              ))}
            </select>
          </div>

          {/* Current Due Highlight Banner */}
          {activeCustomer && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-rose-700 font-semibold">বর্তমানে দোকানে মোট বাকি:</span>
              <span className="font-mono font-extrabold text-base text-rose-700">
                {formatCurrency(currentDue, currency)}
              </span>
            </div>
          )}

          {/* Payment Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                জমার পরিমাণ (টাকা) <span className="text-rose-500">*</span>
              </label>
              {activeCustomer && activeCustomer.currentDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(activeCustomer.currentDue)}
                  className="text-[11px] text-emerald-700 hover:underline font-semibold"
                >
                  সব বাকি পরিশোধ
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-sm">{currency}</span>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-3 py-2 text-sm sm:text-base font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono text-slate-900"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              পরিশোধের মাধ্যম
            </label>
            <div className="grid grid-cols-5 gap-1 text-xs">
              {['Cash', 'bKash', 'Nagad', 'Rocket', 'Bank'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method as any)}
                  className={`py-1.5 rounded-lg font-medium border text-center transition ${
                    paymentMethod === method
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য / বিবরণ</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="যেমন: কিস্তি জমা"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Real-time remaining balance preview */}
          {activeCustomer && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-emerald-800 font-semibold">জমা নেওয়ার পর অবশিষ্ট বাকি থাকবে:</span>
              <span className="font-mono font-bold text-sm text-emerald-800">
                {formatCurrency(remainingDue, currency)}
              </span>
            </div>
          )}

          {/* SMS Confirmation Checkbox */}
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={sendSmsConfirmation}
              onChange={(e) => setSendSmsConfirmation(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="font-medium flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              কাস্টমারকে SMS-এ জমা রশিদ ও বাকি আপডেট পাঠান
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition disabled:opacity-60"
            >
              {loading ? 'রেকর্ড হচ্ছে...' : 'টাকা জমা নিশ্চিত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
