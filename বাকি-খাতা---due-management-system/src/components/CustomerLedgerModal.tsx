import React, { useState, useEffect } from 'react';
import { 
  X, User, Phone, MapPin, Calendar, PlusCircle, ArrowDownCircle, 
  MessageSquare, Printer, Trash2, Receipt, ShoppingBag, CreditCard,
  Send, AlertCircle, Smartphone
} from 'lucide-react';
import { api } from '../services/api.ts';
import { formatCurrency, formatDate, getWhatsAppLink, getNativeSmsLink } from '../utils/formatters.ts';
import type { Customer, Transaction, SmsLog, ShopSettings } from '../types.ts';

interface CustomerLedgerModalProps {
  customerId: string | null;
  onClose: () => void;
  shopSettings: ShopSettings | null;
  onAddDue: (customer: Customer) => void;
  onAddPayment: (customer: Customer) => void;
  onSendSms: (customer: Customer) => void;
  onViewInvoice: (tx: Transaction) => void;
  onRefreshData: () => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  customerId,
  onClose,
  shopSettings,
  onAddDue,
  onAddPayment,
  onSendSms,
  onViewInvoice,
  onRefreshData,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'sms'>('transactions');

  const currency = shopSettings?.currency || '৳';

  const loadLedger = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await api.getCustomerLedger(customerId);
      setCustomer(data.customer);
      setTransactions(data.transactions);
      setSmsLogs(data.smsLogs);
    } catch (err) {
      console.error('Failed to load ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      loadLedger();
    }
  }, [customerId]);

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('আপনি কি এই লেনদেনটি বাতিল করতে চান? এর ফলে বাকি ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় হবে।')) return;
    try {
      await api.deleteTransaction(txId);
      loadLedger();
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'বাতিল করতে ব্যর্থ হয়েছে');
    }
  };

  if (!customerId || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            {customer.photo ? (
              <img
                src={customer.photo}
                alt={customer.name}
                className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-lg">
                {customer.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-lg">{customer.name}</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                  {customer.id}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.mobile}
                </span>
                {customer.altMobile && (
                  <span className="font-mono text-slate-400">বিকল্প: {customer.altMobile}</span>
                )}
                {customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {customer.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Balance Highlights & Actions Bar */}
        <div className="py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          {/* Balances */}
          <div className="flex items-center gap-4">
            <div className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl">
              <span className="text-[11px] font-semibold text-rose-700 block">বর্তমান মোট বাকি</span>
              <span className="font-mono font-extrabold text-xl text-rose-600">
                {formatCurrency(customer.currentDue, currency)}
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
              <span className="text-[11px] font-semibold text-emerald-700 block">মোট পরিশোধ</span>
              <span className="font-mono font-bold text-xl text-emerald-700">
                {formatCurrency(customer.totalPaid, currency)}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl hidden sm:block">
              <span className="text-[11px] font-semibold text-slate-600 block">সর্বমোট বিক্রি</span>
              <span className="font-mono font-bold text-xl text-slate-800">
                {formatCurrency(customer.totalPurchases, currency)}
              </span>
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onAddDue(customer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ বাকি দিন</span>
            </button>

            <button
              onClick={() => onAddPayment(customer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>+ টাকা জমা</span>
            </button>

            <button
              onClick={() => onSendSms(customer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS সেন্টার</span>
            </button>

            <a
              href={getNativeSmsLink(
                customer.mobile,
                `প্রিয় ${customer.name}, আপনার ${shopSettings?.shopName || 'দোকানে'} ${customer.currentDue} টাকা বাকি রয়েছে। অনুগ্রহ করে নির্ধারিত সময়ে পরিশোধ করুন। ধন্যবাদ।`
              )}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold transition"
              title="মোবাইলের নিজস্ব সিম দিয়ে ফ্রি SMS পাঠান"
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-600" />
              <span>SIM SMS (ফ্রি)</span>
            </a>

            <a
              href={getWhatsAppLink(
                customer.mobile,
                `প্রিয় ${customer.name}, আপনার ${shopSettings?.shopName || 'দোকানে'} ${customer.currentDue} টাকা বাকি রয়েছে। অনুগ্রহ করে নির্ধারিত সময়ে পরিশোধ করুন। ধন্যবাদ।`
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition"
              title="WhatsApp-এ সম্পূর্ণ ফ্রি মেসেজ পাঠান"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Tabs: Transactions History vs SMS History */}
        <div className="flex items-center gap-3 pt-3 border-b border-slate-200 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-2.5 px-1 border-b-2 transition ${
              activeTab === 'transactions'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            সম্পূর্ণ লেনদেনের খতিয়ান ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`pb-2.5 px-1 border-b-2 transition ${
              activeTab === 'sms'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            SMS রিমাইন্ডার হিস্ট্রি ({smsLogs.length})
          </button>
        </div>

        {/* Tab Content: Transactions */}
        {activeTab === 'transactions' ? (
          <div className="overflow-y-auto flex-1 py-3 space-y-3">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                কোনো লেনদেনের রেকর্ড নেই
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        tx.type === 'due'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {tx.type === 'due' ? 'বাকি চালান' : 'টাকা জমা'}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700">{tx.id}</span>
                      <span className="text-xs text-slate-400">• {formatDate(tx.date)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {tx.type === 'due' ? (
                          <div className="text-xs">
                            <span className="text-slate-400">বাকি: </span>
                            <strong className="font-mono text-rose-600 font-bold text-sm">
                              {formatCurrency(tx.remainingDue, currency)}
                            </strong>
                          </div>
                        ) : (
                          <div className="text-xs">
                            <span className="text-slate-400">জমা: </span>
                            <strong className="font-mono text-emerald-600 font-bold text-sm">
                              {formatCurrency(tx.paidAmount, currency)}
                            </strong>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                        <button
                          onClick={() => onViewInvoice(tx)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="ভাউচার প্রিন্ট করুন"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="লেনদেন মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Multi-item Product Breakdown */}
                  {tx.type === 'due' && tx.items && tx.items.length > 0 && (
                    <div className="mt-3 bg-slate-50/80 rounded-xl p-3 border border-slate-200/80">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-200/60 pb-1">
                              <th className="pb-1 font-medium">পণ্যের নাম</th>
                              <th className="pb-1 font-medium text-center">পরিমাণ</th>
                              <th className="pb-1 font-medium text-right">একক দর</th>
                              <th className="pb-1 font-medium text-right">মোট টাকা</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tx.items.map((item, idx) => (
                              <tr key={idx} className="py-1">
                                <td className="py-1 font-medium text-slate-800">{item.productName}</td>
                                <td className="py-1 text-center font-mono text-slate-600">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="py-1 text-right font-mono text-slate-600">
                                  {formatCurrency(item.unitPrice, currency)}
                                </td>
                                <td className="py-1 text-right font-mono font-bold text-slate-800">
                                  {formatCurrency(item.total, currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-600">
                        <span>মোট মূল্য: <strong className="font-mono text-slate-800">{formatCurrency(tx.subtotal, currency)}</strong></span>
                        {tx.paidAmount > 0 && (
                          <span>নগদ পরিশোধ: <strong className="font-mono text-emerald-700">{formatCurrency(tx.paidAmount, currency)}</strong></span>
                        )}
                        <span>বাকি রসিদ: <strong className="font-mono text-rose-600">{formatCurrency(tx.remainingDue, currency)}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Payment details */}
                  {tx.type === 'payment' && (
                    <div className="mt-2 text-xs text-slate-600 flex items-center justify-between bg-emerald-50/30 px-3 py-1.5 rounded-lg border border-emerald-100">
                      <span>পরিশোধের মাধ্যম: <strong>{tx.paymentMethod || 'ক্যাশ'}</strong></span>
                      {tx.note && <span className="text-slate-500 italic">{tx.note}</span>}
                    </div>
                  )}

                  {/* 5-day due date indication */}
                  {tx.dueDate && tx.remainingDue > 0 && (
                    <div className="mt-2 text-[11px] text-amber-700 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>নির্ধারিত পরিশোধের তারিখ: <strong>{formatDate(tx.dueDate)}</strong></span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Tab Content: SMS Logs */
          <div className="overflow-y-auto flex-1 py-3 space-y-3">
            {smsLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                এই কাস্টমারকে এখনো কোনো SMS পাঠানো হয়নি
              </div>
            ) : (
              smsLogs.map((log) => (
                <div key={log.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 font-mono">{log.mobile}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {log.status === 'sent' ? 'সফল (Sent)' : 'ব্যর্থ (Failed)'}
                    </span>
                  </div>
                  <p className="text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                    "{log.message}"
                  </p>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>পাঠানোর সময়: {new Date(log.sentAt).toLocaleString('bn-BD')}</span>
                    <span>গেটওয়ে: {log.gatewayUsed}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
