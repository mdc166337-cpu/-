import React, { useState } from 'react';
import { 
  User, Phone, Calendar, ArrowLeft, LogOut, CheckCircle2, 
  AlertCircle, Receipt, ShoppingBag, CreditCard, Store
} from 'lucide-react';
import { api, authStorage } from '../services/api.ts';
import { formatCurrency, formatDate, getWhatsAppLink } from '../utils/formatters.ts';
import type { Customer, Transaction } from '../types.ts';

interface CustomerPortalProps {
  onBackToAdmin: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ onBackToAdmin }) => {
  const [identifier, setIdentifier] = useState('01711223344');
  const [passcode, setPasscode] = useState('3344');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerData, setCustomerData] = useState<{
    customer: Customer;
    transactions: Transaction[];
    shop: any;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.customerLogin(identifier, passcode);
      authStorage.setToken(res.token);
      authStorage.setUser(res.user);

      // Fetch customer's own ledger
      const dueData = await api.getMyDue();
      setCustomerData(dueData);
    } catch (err: any) {
      setError(err.message || 'কাস্টমার লগইন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authStorage.clearToken();
    setCustomerData(null);
  };

  // If not logged in, show customer phone/ID entry
  if (!customerData) {
    return (
      <div id="customer-login-view" className="w-full max-w-md mx-auto">
        <div className="w-full">
          {/* Back button */}
          <button
            type="button"
            onClick={onBackToAdmin}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>এডমিন প্যানেলে ফিরুন</span>
          </button>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/30 mb-2">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">কাস্টমার বাকি পোর্টাল</h1>
            <p className="text-xs text-slate-400 mt-0.5">আপনার নিজের বাকি হিসাব ও পেমেন্ট হিস্ট্রি দেখুন</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  মোবাইল নম্বর অথবা কাস্টমার আইডি
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="customer-identifier-input"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="017XXXXXXXX বা CUST-1001"
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ৪-ডিজিট পিন কোড
                </label>
                <input
                  id="customer-pin-input"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="ডিফল্ট: আপনার মোবাইলের শেষ ৪ ডিজিট"
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono tracking-widest text-center"
                />
                <p className="text-[11px] text-slate-400 mt-1 text-center">
                  পিন ভুলে গেলে দোকানের সাথে যোগাযোগ করুন।
                </p>
              </div>

              <button
                type="submit"
                id="btn-customer-login-submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl text-sm shadow-md shadow-sky-600/20 focus:outline-none transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? 'যাচাই করা হচ্ছে...' : 'বাকি খাতা দেখুন'}
              </button>
            </form>

            <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">ডেমো কাস্টমার পরীক্ষা:</span>
              <div className="mt-1 flex items-center justify-between text-slate-500 font-mono text-[11px]">
                <span>মোবাইল: 01711223344</span>
                <span>পিন: 3344</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in Customer View: Shows ONLY their own information
  const { customer, transactions, shop } = customerData;
  const recentDueTx = transactions.find(t => t.type === 'due' && t.dueDate);

  return (
    <div id="customer-profile-view" className="min-h-screen bg-slate-50 text-slate-800">
      {/* Customer Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight">{shop.shopName}</h1>
              <p className="text-xs text-slate-500">গ্রাহক বাকি খতিয়ান</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>লগআউট</span>
            </button>
          </div>
        </div>
      </header>

      {/* Customer Main Content */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Customer Identity Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{customer.name}</h2>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {customer.id}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {customer.mobile}
                  </span>
                  {customer.address && <span>• {customer.address}</span>}
                </div>
              </div>
            </div>

            {/* Quick Contact Buttons */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:${shop.mobile}`}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition inline-flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>দোকানে কল করুন</span>
              </a>
              <a
                href={getWhatsAppLink(shop.mobile, `সালাম, আমি ${customer.name} (${customer.id})। আমার বাকি খাতার বিষয়ে জানতে যোগাযোগ করছি।`)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition inline-flex items-center gap-1 shadow-sm"
              >
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Due Balance Big Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-rose-50 to-rose-100/60 rounded-2xl border border-rose-200 p-5 shadow-sm">
            <span className="text-xs font-semibold text-rose-700">বর্তমান মোট বাকি</span>
            <div className="text-3xl font-extrabold text-rose-600 mt-1">
              {formatCurrency(customer.currentDue, shop.currency)}
            </div>
            {recentDueTx?.dueDate && (
              <div className="mt-2 text-xs font-medium text-rose-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>পরিশোধের নির্ধারিত তারিখ: {formatDate(recentDueTx.dueDate)}</span>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-2xl border border-emerald-200 p-5 shadow-sm">
            <span className="text-xs font-semibold text-emerald-700">মোট পরিশোধ করেছেন</span>
            <div className="text-3xl font-extrabold text-emerald-700 mt-1">
              {formatCurrency(customer.totalPaid, shop.currency)}
            </div>
            <p className="text-xs text-emerald-800 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>নিয়মিত লেনদেনের জন্য ধন্যবাদ</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100/60 rounded-2xl border border-sky-200 p-5 shadow-sm">
            <span className="text-xs font-semibold text-sky-700">সর্বমোট ক্রয়</span>
            <div className="text-3xl font-extrabold text-sky-700 mt-1">
              {formatCurrency(customer.totalPurchases, shop.currency)}
            </div>
            <p className="text-xs text-sky-800 mt-2 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" />
              <span>মোট লেনদেন: {transactions.length} টি</span>
            </p>
          </div>
        </div>

        {/* Transactions / Itemized Ledger */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">আপনার বিস্তারিত লেনদেনের খতিয়ান</h3>
              <p className="text-xs text-slate-500">কোন কোন পণ্য নিয়েছেন ও কত টাকা জমা দিয়েছেন</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                এখনো কোনো লেনদেন পাওয়া যায়নি
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        tx.type === 'due'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {tx.type === 'due' ? 'বাকি চালান' : 'টাকা জমা'}
                      </span>
                      <span className="font-mono text-xs text-slate-500 font-semibold">{tx.id}</span>
                      <span className="text-xs text-slate-400">• {formatDate(tx.date)}</span>
                    </div>

                    <div className="text-right">
                      {tx.type === 'due' ? (
                        <div className="flex items-baseline justify-end gap-2">
                          <span className="text-xs text-slate-400">বাকি:</span>
                          <span className="font-bold text-rose-600 text-base">
                            {formatCurrency(tx.remainingDue, shop.currency)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-end gap-2">
                          <span className="text-xs text-slate-400">জমা:</span>
                          <span className="font-bold text-emerald-600 text-base">
                            {formatCurrency(tx.paidAmount, shop.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* If Due Transaction with Multi-product items */}
                  {tx.items && tx.items.length > 0 && (
                    <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                        নেওয়া পণ্যের তালিকা:
                      </span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-200/60 pb-1">
                              <th className="pb-1 font-medium">পণ্যের নাম</th>
                              <th className="pb-1 font-medium text-center">পরিমাণ</th>
                              <th className="pb-1 font-medium text-right">একক মূল্য</th>
                              <th className="pb-1 font-medium text-right">মোট</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tx.items.map((item, idx) => (
                              <tr key={idx} className="py-1">
                                <td className="py-1.5 font-medium text-slate-800">{item.productName}</td>
                                <td className="py-1.5 text-center text-slate-600 font-mono">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="py-1.5 text-right text-slate-600 font-mono">
                                  {formatCurrency(item.unitPrice, shop.currency)}
                                </td>
                                <td className="py-1.5 text-right font-semibold text-slate-800 font-mono">
                                  {formatCurrency(item.total, shop.currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                        <span>মোট মূল্য: <strong className="font-mono">{formatCurrency(tx.subtotal, shop.currency)}</strong></span>
                        {tx.paidAmount > 0 && (
                          <span>নগদ পরিশোধ: <strong className="text-emerald-700 font-mono">{formatCurrency(tx.paidAmount, shop.currency)}</strong></span>
                        )}
                        <span>বাকি রসিদ: <strong className="text-rose-600 font-mono">{formatCurrency(tx.remainingDue, shop.currency)}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Payment details */}
                  {tx.type === 'payment' && (
                    <div className="text-xs text-slate-600 bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        <span>পরিশোধের মাধ্যম: <strong>{tx.paymentMethod || 'ক্যাশ'}</strong></span>
                      </span>
                      {tx.note && <span className="text-slate-500 italic">{tx.note}</span>}
                    </div>
                  )}

                  {tx.dueDate && tx.remainingDue > 0 && (
                    <div className="mt-2 text-[11px] text-amber-700 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>নির্ধারিত পরিশোধের তারিখ: {formatDate(tx.dueDate)}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
