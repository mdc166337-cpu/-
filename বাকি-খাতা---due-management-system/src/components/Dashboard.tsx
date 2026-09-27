import React from 'react';
import { 
  Users, DollarSign, Calendar, AlertTriangle, TrendingUp, 
  CheckCircle2, Clock, PlusCircle, ArrowDownCircle, ArrowUpRight, 
  Receipt, MessageSquare, Printer, Eye
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import type { DashboardStats, Transaction, ShopSettings } from '../types.ts';

interface DashboardProps {
  stats: DashboardStats;
  recentTransactions: Transaction[];
  shopSettings: ShopSettings | null;
  onOpenAddDue: () => void;
  onOpenAddPayment: () => void;
  onOpenAddCustomer: () => void;
  onNavigateToSms: () => void;
  onNavigateToCustomers: () => void;
  onViewInvoice: (tx: Transaction) => void;
  onViewCustomer: (customerId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  recentTransactions,
  shopSettings,
  onOpenAddDue,
  onOpenAddPayment,
  onOpenAddCustomer,
  onNavigateToSms,
  onNavigateToCustomers,
  onViewInvoice,
  onViewCustomer,
}) => {
  const currency = shopSettings?.currency || '৳';

  return (
    <div id="admin-dashboard-view" className="space-y-6 pb-16 md:pb-6">
      {/* Top Banner: Quick Actions & Today's Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">দোকানের সার্বিক বাকি ড্যাশবোর্ড</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            আজকের তারিখ: <span className="font-medium text-slate-700">{formatDate(new Date().toISOString())}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddDue}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ বাকি চালান</span>
          </button>

          <button
            onClick={onOpenAddPayment}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>+ টাকা জমা</span>
          </button>

          <button
            onClick={onOpenAddCustomer}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Users className="w-4 h-4" />
            <span>+ নতুন কাস্টমার</span>
          </button>
        </div>
      </div>

      {/* 5-Day SMS Reminder Alert Banner */}
      {(stats.dueSoonCount > 0 || stats.overdueCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-900">
                {stats.dueSoonCount > 0 ? `${stats.dueSoonCount} জন কাস্টমারের আগামী ৫ দিনের মধ্যে বাকি পরিশোধের তারিখ!` : ''}
                {stats.overdueCount > 0 ? ` (${stats.overdueCount} জনের মেয়াদ শেষ)` : ''}
              </h3>
              <p className="text-[11px] text-amber-700 mt-0.5">
                অটোমেটিক ৫ দিনের SMS রিমাইন্ডার পাঠিয়ে দ্রুত বাকি আদায় নিশ্চিত করুন।
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToSms}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>SMS রিমাইন্ডার সেন্টার</span>
          </button>
        </div>
      )}

      {/* Section 4 Metric Cards (All 8 mandatory cards clearly presented) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: মোট Customer */}
        <div
          onClick={onNavigateToCustomers}
          className="cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 hover:border-slate-300 shadow-xs transition hover:shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">মোট Customer</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight font-mono">
            {stats.totalCustomers} <span className="text-xs font-sans text-slate-500 font-normal">জন</span>
          </div>
          <p className="text-[11px] text-blue-600 font-medium mt-1 flex items-center gap-1">
            <span>সকল কাস্টমার তালিকা</span>
            <ArrowUpRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 2: মোট বাকি */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-200/80 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-semibold">মোট বাকি</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight font-mono">
            {formatCurrency(stats.totalDue, currency)}
          </div>
          <p className="text-[11px] text-rose-600 font-medium mt-1">দোকানের বর্তমান বাকি পাওনা</p>
        </div>

        {/* Card 3: আজকের বাকি */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">আজকের বাকি</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 tracking-tight font-mono">
            {formatCurrency(stats.todayDue, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">আজকে নতুন দেওয়া বাকি</p>
        </div>

        {/* Card 4: আজকে পরিশোধ */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold">আজকে পরিশোধ</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight font-mono">
            {formatCurrency(stats.todayPaid, currency)}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">আজকের মোট নগদ আদায়</p>
        </div>

        {/* Card 5: আগামী ৫ দিনের মধ্যে পরিশোধযোগ্য */}
        <div
          onClick={onNavigateToSms}
          className="cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200/80 shadow-xs bg-indigo-50/20 hover:border-indigo-300 transition"
        >
          <div className="flex items-center justify-between text-indigo-700 mb-2">
            <span className="text-xs font-semibold">আগামী ৫ দিনে পরিশোধযোগ্য</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-700 tracking-tight font-mono">
            {formatCurrency(stats.dueNext5Days, currency)}
          </div>
          <p className="text-[11px] text-indigo-600 font-medium mt-1">
            {stats.dueSoonCount} জন কাস্টমার • SMS পাঠান
          </p>
        </div>

        {/* Card 6: মেয়াদ শেষ হওয়া বাকি */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-red-200 shadow-xs bg-red-50/30">
          <div className="flex items-center justify-between text-red-700 mb-2">
            <span className="text-xs font-semibold">মেয়াদ শেষ হওয়া বাকি</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-700 tracking-tight font-mono">
            {formatCurrency(stats.overdueAmount, currency)}
          </div>
          <p className="text-[11px] text-red-600 font-medium mt-1">
            {stats.overdueCount} জন গ্রাহক মেয়াদোত্তীর্ণ
          </p>
        </div>

        {/* Card 7: মোট বিক্রয় */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">মোট বিক্রয়</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight font-mono">
            {formatCurrency(stats.totalSales, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">দোকানের সর্বমোট রেকর্ডকৃত বিক্রি</p>
        </div>

        {/* Card 8: মোট আদায় */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/90 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold">মোট আদায়</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight font-mono">
            {formatCurrency(stats.totalCollection, currency)}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">সর্বমোট সংগৃহীত পেমেন্ট</p>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">সাম্প্রতিক লেনদেন (Recent Transactions)</h3>
            <p className="text-xs text-slate-500">সর্বশেষ বাকি ভাউচার ও আদায়ের হিসাব</p>
          </div>
          <button
            onClick={onNavigateToCustomers}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            সব দেখুন →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-3">ভাউচার আইডি / তারিখ</th>
                <th className="px-4 py-3">কাস্টমার</th>
                <th className="px-4 py-3">লেনদেনের ধরন</th>
                <th className="px-4 py-3">মালামাল / বিবরণ</th>
                <th className="px-4 py-3 text-right">মোট টাকা</th>
                <th className="px-4 py-3 text-right">পরিশোধ</th>
                <th className="px-4 py-3 text-right">বাকি</th>
                <th className="px-4 py-3 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    কোনো লেনদেন রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono font-semibold text-slate-800">{tx.id}</div>
                      <div className="text-[11px] text-slate-400">{formatDate(tx.date)}</div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => onViewCustomer(tx.customerId)}
                        className="font-medium text-slate-800 hover:text-emerald-700 text-left hover:underline"
                      >
                        {tx.customerName}
                      </button>
                      <div className="text-[11px] text-slate-400 font-mono">{tx.customerMobile}</div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.type === 'due'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {tx.type === 'due' ? 'বাকি চালান' : 'টাকা জমা'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {tx.type === 'due' && tx.items && tx.items.length > 0 ? (
                        <div className="max-w-[220px] truncate text-slate-600">
                          {tx.items.map(i => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">
                          {tx.note || (tx.paymentMethod ? `${tx.paymentMethod} পেমেন্ট` : 'নগদ জমা')}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                      {formatCurrency(tx.subtotal, currency)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 whitespace-nowrap">
                      {formatCurrency(tx.paidAmount, currency)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                      {formatCurrency(tx.remainingDue, currency)}
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onViewInvoice(tx)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="ভাউচার ভিউ ও প্রিন্ট"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onViewCustomer(tx.customerId)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                          title="কাস্টমার লেজার"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
