import React, { useState } from 'react';
import { 
  BarChart3, TrendingUp, Download, Printer, Users, 
  Calendar, FileSpreadsheet, ArrowUpRight, ArrowDownRight, 
  Percent, Award, ShieldAlert
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import type { Customer, Transaction, ShopSettings } from '../types.ts';

interface ReportsProps {
  customers: Customer[];
  transactions: Transaction[];
  shopSettings: ShopSettings | null;
  onViewCustomer: (id: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({
  customers,
  transactions,
  shopSettings,
  onViewCustomer,
}) => {
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'this_month' | 'last_30_days'>('all');
  const currency = shopSettings?.currency || '৳';

  // Total summary calculations
  const totalDue = customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);
  const totalSales = customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);
  const totalPaid = customers.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
  const recoveryRate = totalSales > 0 ? Math.round((totalPaid / totalSales) * 100) : 0;

  // Filter transactions by selected time window
  const now = new Date();
  const filteredTransactions = transactions.filter(tx => {
    if (timeFilter === 'all') return true;
    const txDate = new Date(tx.date);
    if (timeFilter === 'today') {
      const today = new Date();
      return txDate.toDateString() === today.toDateString();
    }
    if (timeFilter === 'this_month') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'last_30_days') {
      const diff = now.getTime() - txDate.getTime();
      return diff <= 30 * 24 * 60 * 60 * 1000;
    }
    return true;
  });

  // Top due customers (Ranking)
  const topDueCustomers = [...customers]
    .filter(c => c.currentDue > 0)
    .sort((a, b) => b.currentDue - a.currentDue)
    .slice(0, 8);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Customer ID', 'Name', 'Mobile', 'Address', 'Current Due (BDT)', 'Total Purchases', 'Total Paid'];
    const rows = customers.map(c => [
      c.id,
      `"${c.name}"`,
      `"${c.mobile}"`,
      `"${c.address || ''}"`,
      c.currentDue,
      c.totalPurchases,
      c.totalPaid,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bakikhata_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="reports-view" className="space-y-6 pb-16 md:pb-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">ব্যবসায়িক রিপোর্ট ও বিশ্লেষণ</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            দৈনিক ও মাসিক বাকি বিক্রির হিসাব, সর্বোচ্চ বকেয়া ও আদায় হার
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel / CSV ডাউনলোড</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট রিপোর্ট</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Due */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>বর্তমানে মোট বাকি</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-rose-600">
            {formatCurrency(totalDue, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            মোট {customers.filter(c => c.currentDue > 0).length} জন কাস্টমারের কাছে
          </p>
        </div>

        {/* Total Collected */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>সর্বমোট আদায় (Paid)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-emerald-700">
            {formatCurrency(totalPaid, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            নগদ ও ডিজিটাল মাধ্যমে পরিশোধিত
          </p>
        </div>

        {/* Recovery Rate */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>পরিশোধের হার (Recovery Rate)</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-sky-700">
            {recoveryRate}%
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-sky-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, recoveryRate)}%` }}
            ></div>
          </div>
        </div>

        {/* Total Volume */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>মোট বিক্রি ভলিউম</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-slate-800">
            {formatCurrency(totalSales, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            মোট লেনদেন: {transactions.length} টি
          </p>
        </div>
      </div>

      {/* Top Due Ranking List (Section 10) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                সর্বোচ্চ বাকি থাকা কাস্টমারদের তালিকা (Top Defaulters)
              </h3>
              <p className="text-xs text-slate-500">বাকি পরিমাণের ভিত্তিতে শীর্ষ গ্রাহকদের র‍্যাঙ্কিং</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-12 text-center">র‍্যাংক</th>
                <th className="px-4 py-3">কাস্টমারের নাম</th>
                <th className="px-4 py-3">মোবাইল</th>
                <th className="px-4 py-3 text-right">বাকি পরিমাণ</th>
                <th className="px-4 py-3 text-right">দোকানের মোট বাকির অংশ</th>
                <th className="px-4 py-3 text-center">খতিয়ান</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topDueCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    কোনো বকেয়া কাস্টমার পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                topDueCustomers.map((customer, index) => {
                  const shareOfTotal = totalDue > 0 ? Math.round((customer.currentDue / totalDue) * 100) : 0;
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold font-mono text-xs ${
                          index === 0
                            ? 'bg-rose-600 text-white'
                            : index === 1
                            ? 'bg-rose-500 text-white'
                            : index === 2
                            ? 'bg-rose-400 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => onViewCustomer(customer.id)}
                          className="font-bold text-slate-800 hover:text-emerald-700 text-left hover:underline"
                        >
                          {customer.name}
                        </button>
                        <div className="text-[11px] text-slate-400 font-mono">{customer.id}</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-700">
                        {customer.mobile}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-extrabold text-rose-600 text-sm">
                        {formatCurrency(customer.currentDue, currency)}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${shareOfTotal}%` }}></div>
                          </div>
                          <span className="font-mono text-slate-600">{shareOfTotal}%</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => onViewCustomer(customer.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                        >
                          খতিয়ান দেখুন
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction History Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">লেনদেনের বিস্তারিত হিস্ট্রি ও অডিট</h3>
            <p className="text-xs text-slate-500">বাকি ও পরিশোধের সব ইনভয়েস লগ</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                timeFilter === 'all' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              সব সময়
            </button>
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                timeFilter === 'today' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              আজকে
            </button>
            <button
              onClick={() => setTimeFilter('this_month')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                timeFilter === 'this_month' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              এই মাস
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">তারিখ</th>
                <th className="px-4 py-3">ভাউচার নং</th>
                <th className="px-4 py-3">কাস্টমার</th>
                <th className="px-4 py-3">ধরন</th>
                <th className="px-4 py-3 text-right">মোট মূল্য</th>
                <th className="px-4 py-3 text-right">নগদ জমা</th>
                <th className="px-4 py-3 text-right">বাকি অবশিষ্ট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    কোনো লেনদেন রেকর্ড নেই
                  </td>
                </tr>
              ) : (
                filteredTransactions.slice(0, 15).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-700">{tx.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">{tx.customerName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.type === 'due'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {tx.type === 'due' ? 'বাকি বিক্রি' : 'টাকা জমা'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-slate-800">
                      {formatCurrency(tx.subtotal, currency)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold text-emerald-700">
                      {formatCurrency(tx.paidAmount, currency)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold text-rose-600">
                      {formatCurrency(tx.remainingDue, currency)}
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
