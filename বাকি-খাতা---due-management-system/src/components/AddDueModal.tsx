import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Calendar, User, ShoppingBag, 
  DollarSign, CheckSquare, MessageSquare, AlertCircle, FileCheck
} from 'lucide-react';
import { api } from '../services/api.ts';
import { formatCurrency, POPULAR_PRODUCTS, PRODUCT_UNITS } from '../utils/formatters.ts';
import type { Customer, ShopSettings, Transaction } from '../types.ts';

interface AddDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  selectedCustomer: Customer | null;
  shopSettings: ShopSettings | null;
  onSuccess: (tx: Transaction, cust: Customer) => void;
}

interface FormProductItem {
  id: string;
  productName: string;
  quantity: number | string;
  unit: string;
  unitPrice: number | string;
  total: number;
}

export const AddDueModal: React.FC<AddDueModalProps> = ({
  isOpen,
  onClose,
  customers,
  selectedCustomer,
  shopSettings,
  onSuccess,
}) => {
  const currency = shopSettings?.currency || '৳';
  const defaultDueDays = shopSettings?.defaultDueDays || 5;

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<FormProductItem[]>([
    { id: '1', productName: 'ফটোকপি (A4 এক পিঠ)', quantity: 20, unit: 'পাতা', unitPrice: 3, total: 60 },
    { id: '2', productName: 'অনলাইন চাকরির আবেদন', quantity: 1, unit: 'টি', unitPrice: 150, total: 150 },
    { id: '3', productName: 'লেমিনেশন (A4 সাইজ)', quantity: 2, unit: 'পিস', unitPrice: 30, total: 60 },
  ]);
  const [paidAmount, setPaidAmount] = useState<number | string>(70);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'Bank'>('Cash');
  const [note, setNote] = useState('');
  const [sendSmsImmediately, setSendSmsImmediately] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize dates and selected customer
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);

      // Section 8 rule: Due Date = Due Created Date + 5 Days
      const d = new Date(today);
      d.setDate(d.getDate() + defaultDueDays);
      setDueDate(d.toISOString().split('T')[0]);

      if (selectedCustomer) {
        setCustomerId(selectedCustomer.id);
      } else if (customers.length > 0 && !customerId) {
        setCustomerId(customers[0].id);
      }
      setError(null);
    }
  }, [isOpen, selectedCustomer, customers, defaultDueDays]);

  // Recalculate due date whenever base date changes
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const d = new Date(newDate);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + defaultDueDays);
      setDueDate(d.toISOString().split('T')[0]);
    }
  };

  // Add new item row
  const handleAddItem = () => {
    const newItem: FormProductItem = {
      id: Date.now().toString(),
      productName: '',
      quantity: 1,
      unit: 'কেজি',
      unitPrice: '',
      total: 0,
    };
    setItems([...items, newItem]);
  };

  // Remove item row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
  };

  // Update item field
  const handleItemChange = (index: number, field: keyof FormProductItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    // Auto-calculate row total
    const qty = Number(current.quantity) || 0;
    const price = Number(current.unitPrice) || 0;
    current.total = qty * price;

    updated[index] = current;
    setItems(updated);
  };

  // Select quick product suggestion
  const handleQuickProductSelect = (index: number, prodName: string) => {
    const found = POPULAR_PRODUCTS.find(p => p.name === prodName);
    if (found) {
      const updated = [...items];
      const qty = Number(updated[index].quantity) || 1;
      updated[index] = {
        ...updated[index],
        productName: found.name,
        unit: found.unit,
        unitPrice: found.defaultPrice,
        total: qty * found.defaultPrice,
      };
      setItems(updated);
    } else {
      handleItemChange(index, 'productName', prodName);
    }
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const paid = Number(paidAmount) || 0;
  const remainingDue = Math.max(0, subtotal - paid);

  const activeCustomer = customers.find(c => c.id === customerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('অনুগ্রহ করে কাস্টমার নির্বাচন করুন');
      return;
    }

    const invalidItem = items.find(i => !i.productName.trim() || Number(i.quantity) <= 0);
    if (invalidItem) {
      setError('প্রতিটি পণ্যের নাম এবং পরিমাণ সঠিকভাবে পূরণ করুন');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerId,
        items: items.map(i => ({
          productName: i.productName.trim(),
          quantity: Number(i.quantity),
          unit: i.unit,
          unitPrice: Number(i.unitPrice),
        })),
        paidAmount: paid,
        paymentMethod,
        date,
        dueDate,
        note,
        sendSmsImmediately,
      };

      const res = await api.addDueTransaction(payload);
      onSuccess(res.transaction, res.customer);
      onClose();
    } catch (err: any) {
      setError(err.message || 'বাকি হিসাব সংরক্ষণ করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">নতুন বাকি রশিদ (Add Due Invoice)</h3>
              <p className="text-xs text-slate-500">পণ্য নির্বাচন, স্বয়ংক্রিয় হিসাব ও ৫ দিনের SMS রিমাইন্ডার</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 py-4 space-y-5 pr-1">
          {/* Customer & Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            {/* Customer select */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                কাস্টমার নির্বাচন করুন <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-due-customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile})
                  </option>
                ))}
              </select>
              {activeCustomer && (
                <div className="text-[11px] text-slate-500 mt-1">
                  বর্তমান বাকি: <strong className="text-rose-600 font-mono">{formatCurrency(activeCustomer.currentDue, currency)}</strong>
                </div>
              )}
            </div>

            {/* Created Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                বাকি নেওয়ার তারিখ
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>

            {/* 5-day Due Date (Section 8) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">পরিশোধের তারিখ</label>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                  +৫ দিন পর
                </span>
              </div>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
              <p className="text-[10px] text-indigo-700 mt-1">
                এই তারিখে কাস্টমারকে SMS রিমাইন্ডার পাঠানো হবে।
              </p>
            </div>
          </div>

          {/* Multi-product Item Table (Section 6 & 7) */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                  সেবা / পণ্যের বিবরণ (ফটোকপি ও অনলাইন সেবা)
                </h4>
                <p className="text-[11px] text-slate-500">দ্রুত যোগ করতে নিচের বাটনে ক্লিক করুন অথবা নাম লিখে সিলেক্ট করুন:</p>
              </div>
              <button
                type="button"
                id="btn-add-product-row"
                onClick={handleAddItem}
                className="self-start sm:self-auto inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ নতুন সারি যোগ করুন</span>
              </button>
            </div>

            {/* Quick Service Preset Chips */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200/80 rounded-xl">
              {[
                { name: 'ফটোকপি (A4 এক পিঠ)', price: 3, unit: 'পাতা' },
                { name: 'ফটোকপি (A4 দুই পিঠ)', price: 5, unit: 'পাতা' },
                { name: 'কম্পিউটার প্রিন্ট', price: 5, unit: 'পাতা' },
                { name: 'কালার প্রিন্ট', price: 10, unit: 'পাতা' },
                { name: 'পাসপোর্ট ছবি (৪ কপি)', price: 50, unit: 'সেট' },
                { name: 'অনলাইন চাকরির আবেদন', price: 150, unit: 'টি' },
                { name: 'NID প্রিন্ট / ডাউনলোড', price: 50, unit: 'টি' },
                { name: 'জন্ম নিবন্ধন আবেদন', price: 100, unit: 'টি' },
                { name: 'লেমিনেশন (A4)', price: 30, unit: 'পিস' },
                { name: 'টাইপিং / কম্পোজ', price: 30, unit: 'পাতা' },
                { name: 'বিদ্যুৎ বিল পেমেন্ট', price: 10, unit: 'টি' },
              ].map((svc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setItems(prev => [
                      ...prev,
                      {
                        id: Date.now().toString() + i,
                        productName: svc.name,
                        quantity: 1,
                        unit: svc.unit,
                        unitPrice: svc.price,
                        total: svc.price,
                      }
                    ]);
                  }}
                  className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg shadow-2xs transition"
                >
                  + {svc.name}
                </button>
              ))}
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 min-w-[180px]">সেবা / পণ্যের নাম</th>
                      <th className="px-3 py-2.5 w-24">পরিমাণ</th>
                      <th className="px-3 py-2.5 w-24">একক (Unit)</th>
                      <th className="px-3 py-2.5 w-28 text-right">একক মূল্য</th>
                      <th className="px-3 py-2.5 w-28 text-right">মোট টাকা</th>
                      <th className="px-2 py-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        {/* Product Name with suggestions */}
                        <td className="p-2">
                          <input
                            type="text"
                            required
                            list={`prod-suggestions-${index}`}
                            value={item.productName}
                            onChange={(e) => handleQuickProductSelect(index, e.target.value)}
                            placeholder="যেমন: ফটোকপি, কম্পিউটার প্রিন্ট, অনলাইন আবেদন..."
                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                          />
                          <datalist id={`prod-suggestions-${index}`}>
                            {POPULAR_PRODUCTS.map((p, i) => (
                              <option key={i} value={p.name} />
                            ))}
                          </datalist>
                        </td>

                        {/* Quantity */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            placeholder="1"
                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono text-center"
                          />
                        </td>

                        {/* Unit */}
                        <td className="p-2">
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                          >
                            {PRODUCT_UNITS.map((u, i) => (
                              <option key={i} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>

                        {/* Unit Price */}
                        <td className="p-2">
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              required
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              placeholder="0"
                              className="w-full text-xs pl-2 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono text-right"
                            />
                          </div>
                        </td>

                        {/* Auto-calculated Total */}
                        <td className="p-2 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {formatCurrency(item.total, currency)}
                        </td>

                        {/* Delete Row */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={items.length <= 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                            title="মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Subtotal, Paid Amount & Remaining Due Calculation (Section 6 & 7) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Note & Payment Method */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  নগদ জমার মাধ্যম (যদি পরিশোধ করে)
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {['Cash', 'bKash', 'Nagad'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method as any)}
                      className={`py-1.5 rounded-lg font-medium border transition ${
                        paymentMethod === method
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নোট / মন্তব্য</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="যেমন: সন্ধ্যার বাজার সদাই"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* SMS Checkbox */}
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={sendSmsImmediately}
                  onChange={(e) => setSendSmsImmediately(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="font-medium flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  সংরক্ষণের সাথে সাথে কাস্টমারকে SMS নোটিফিকেশন পাঠান
                </span>
              </label>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-white rounded-xl p-4 border border-slate-200/90 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>মোট পণ্যের মূল্য (Subtotal):</span>
                <span className="font-mono font-bold text-sm text-slate-900">{formatCurrency(subtotal, currency)}</span>
              </div>

              <div className="flex justify-between items-center text-emerald-700 pt-1 border-t border-slate-100">
                <span className="font-semibold">নগদ পরিশোধ (Paid Amount):</span>
                <div className="w-32">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                    className="w-full text-right font-mono font-bold text-xs sm:text-sm px-2.5 py-1 bg-emerald-50/50 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-rose-700 pt-2 border-t border-slate-200 text-sm font-bold">
                <span>অবশিষ্ট বাকি (Remaining Due):</span>
                <span className="font-mono text-base text-rose-600">{formatCurrency(remainingDue, currency)}</span>
              </div>

              {activeCustomer && (
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                  <span>নতুন মোট বাকি দাঁড়াবে:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrency(activeCustomer.currentDue + remainingDue, currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            id="btn-save-due-invoice"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition disabled:opacity-60"
          >
            <FileCheck className="w-4 h-4" />
            <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'বাকি সংরক্ষণ ও রসিদ তৈরি'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
