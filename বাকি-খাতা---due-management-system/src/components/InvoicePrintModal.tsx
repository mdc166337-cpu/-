import React, { useState } from 'react';
import { X, Printer, Store, CheckCircle, Copy, Check, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate, numberToBengaliWords, toBengaliNumber } from '../utils/formatters.ts';
import type { Transaction, ShopSettings, Customer } from '../types.ts';

interface InvoicePrintModalProps {
  transaction: Transaction | null;
  customer?: Customer | null;
  shopSettings: ShopSettings | null;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  transaction,
  customer,
  shopSettings,
  onClose,
}) => {
  const [printLayout, setPrintLayout] = useState<'standard' | 'thermal'>('standard');
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!transaction) return null;

  const currency = shopSettings?.currency || '৳';
  const isDue = transaction.type === 'due';
  const isPayment = transaction.type === 'payment';

  // Calculate prior balance if available
  const currentTotalDue = customer ? customer.currentDue : transaction.remainingDue;
  const previousDueBeforeThis = isPayment
    ? transaction.remainingDue + transaction.paidAmount
    : Math.max(0, currentTotalDue - transaction.remainingDue);

  const handlePrint = () => {
    setIsPrinting(true);
    const content = document.getElementById('printable-voucher-content');
    if (!content) {
      window.print();
      setIsPrinting(false);
      return;
    }

    try {
      let printFrame = document.getElementById('voucher-print-iframe') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'voucher-print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.style.visibility = 'hidden';
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html lang="bn">
          <head>
            <meta charset="utf-8">
            <title>${transaction.type === 'due' ? 'বাকি মেমো' : 'টাকা জমার রসিদ'} - ${transaction.id}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body {
                font-family: 'Hind Siliguri', system-ui, -apple-system, sans-serif;
                background: #ffffff;
                color: #0f172a;
                margin: 0;
                padding: 12px;
              }
              @page {
                margin: 8mm;
                size: auto;
              }
            </style>
          </head>
          <body>
            ${content.innerHTML}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 300);
              };
            </script>
          </body>
          </html>
        `);
        frameDoc.close();
        setTimeout(() => setIsPrinting(false), 1500);
        return;
      }
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print', e);
    }

    window.print();
    setTimeout(() => setIsPrinting(false), 1000);
  };

  const handleOpenInNewTab = () => {
    window.open(`/print/${transaction.id}`, '_blank');
  };

  const handleCopySummary = () => {
    const text = isPayment
      ? `*টাকা জমার রসিদ*\nদোকান: ${shopSettings?.shopName || 'অনলাইন সেবা কেন্দ্র'}\nভাউচার: ${transaction.id}\nতারিখ: ${formatDate(transaction.date)}\nকাস্টমার: ${transaction.customerName}\nমোবাইল: ${transaction.customerMobile}\nজমার পরিমাণ: ${formatCurrency(transaction.paidAmount, currency)}\nবর্তমান বাকি: ${formatCurrency(transaction.remainingDue, currency)}\nযোগাযোগ: ${shopSettings?.mobile || '01860448008'}`
      : `*বাকি মেমো / চালান*\nদোকান: ${shopSettings?.shopName || 'অনলাইন সেবা কেন্দ্র'}\nচালান: ${transaction.id}\nতারিখ: ${formatDate(transaction.date)}\nকাস্টমার: ${transaction.customerName}\nমোট মূল্য: ${formatCurrency(transaction.subtotal, currency)}\nনগদ পরিশোধ: ${formatCurrency(transaction.paidAmount, currency)}\nচালানের বাকি: ${formatCurrency(transaction.remainingDue, currency)}\nসর্বমোট বাকি: ${formatCurrency(currentTotalDue, currency)}\nযোগাযোগ: ${shopSettings?.mobile || '01860448008'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Multiple phone numbers display
  const shopPhone1 = shopSettings?.mobile || '01860448008';
  const shopPhone2 = '01712447027';
  const phoneDisplay = shopPhone1.includes(shopPhone2) ? shopPhone1 : `${shopPhone1}, ${shopPhone2}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[95vh]">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">স্মার্ট ভাউচার প্রিন্ট ও প্রিভিউ</span>
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setPrintLayout('standard')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  printLayout === 'standard' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                }`}
              >
                A4 / স্ট্যান্ডার্ড
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('thermal')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  printLayout === 'thermal' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                }`}
              >
                POS থার্মাল (80mm)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleCopySummary}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              title="WhatsApp বা SMS-এর জন্য কপি করুন"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
            </button>

            <button
              onClick={handleOpenInNewTab}
              type="button"
              id="btn-open-tab-voucher"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer"
              title="আইফ্রেম বা প্রিভিউতে সমস্যা হলে নতুন ট্যাবে খুলে সরাসরি প্রিন্ট নিন"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>নতুন ট্যাবে প্রিন্ট</span>
            </button>

            <button
              onClick={handlePrint}
              id="btn-print-voucher"
              type="button"
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isPrinting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>{isPrinting ? 'প্রিন্ট হচ্ছে...' : 'প্রিন্ট করুন'}</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Info Banner */}
        <div className="no-print bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-1.5 mt-2 text-[11px] text-amber-900 flex items-center justify-between">
          <span>💡 <strong>টিপস:</strong> সরাসরি ডায়লগ না আসলে পাশের <strong>"নতুন ট্যাবে প্রিন্ট"</strong> বাটনে ক্লিক করুন।</span>
          <button onClick={handleOpenInNewTab} className="underline font-bold text-amber-950 ml-2 hover:text-black cursor-pointer">
            নতুন উইন্ডো খুলুন
          </button>
        </div>

        {/* Printable Voucher Paper */}
        <div id="printable-voucher-content" className="overflow-y-auto flex-1 py-3 print-card text-slate-800">
          <div className={`mx-auto bg-white border border-slate-300 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs ${
            printLayout === 'thermal' ? 'max-w-[340px] text-[11px]' : 'w-full'
          }`}>
            
            {/* Header: Shop Information */}
            <div className="text-center pb-3 border-b-2 border-slate-800 space-y-1">
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold mb-1">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span>কম্পিউটারাইজড রসিদ</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {shopSettings?.shopName || 'অনলাইন সেবা কেন্দ্র'}
              </h1>
              
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                {shopSettings?.address || 'সড়াবাড়ীয়া বাজার'}
              </p>

              <div className="text-xs font-semibold text-slate-600 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
                <span>মোবাইল: <strong className="font-mono text-slate-900">{phoneDisplay}</strong></span>
                {shopSettings?.ownerName && (
                  <span>স্বত্বাধিকারী: <strong className="text-slate-900">{shopSettings.ownerName}</strong></span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                ফটোকপি, কম্পিউটার প্রিন্ট ও সকল প্রকার অনলাইন কাজের বিশ্বস্ত সেবা
              </p>

              {/* Voucher Category Badge */}
              <div className="pt-2">
                <span className={`inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                  isDue 
                    ? 'bg-rose-50 text-rose-800 border-rose-300' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}>
                  {isDue ? 'বাকি মেমো / চালান (DUE MEMO)' : 'টাকা জমার রসিদ (MONEY RECEIPT)'}
                </span>
              </div>
            </div>

            {/* Voucher Metadata Bar */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">ভাউচার নম্বর:</span>
                <span className="font-mono font-black text-slate-900 text-sm">{transaction.id}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">তারিখ ও সময়:</span>
                <span className="font-semibold text-slate-900">{formatDate(transaction.date)}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">কাস্টমারের নাম:</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm">{transaction.customerName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">মোবাইল নম্বর:</span>
                <span className="font-mono font-bold text-slate-900">{transaction.customerMobile}</span>
              </div>

              {customer?.address && (
                <div className="col-span-2 text-[11px] text-slate-600">
                  <span className="text-slate-500 font-medium">ঠিকানা:</span> {customer.address}
                </div>
              )}

              {isDue && transaction.dueDate && transaction.remainingDue > 0 && (
                <div className="col-span-2 mt-1 py-1 px-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-semibold flex items-center justify-between">
                  <span>পরিশোধের নির্ধারিত শেষ তারিখ:</span>
                  <strong className="font-mono">{formatDate(transaction.dueDate)}</strong>
                </div>
              )}
            </div>

            {/* 1. Items Table for Due Transactions (বাকি চালান) */}
            {isDue && (
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                    <tr>
                      <th className="p-2 w-10 text-center border-r border-slate-300">ক্র.নং</th>
                      <th className="p-2 border-r border-slate-300">পণ্যের নাম / সেবার বিবরণ</th>
                      <th className="p-2 text-center w-20 border-r border-slate-300">পরিমাণ</th>
                      <th className="p-2 text-right w-20 border-r border-slate-300">একক দর</th>
                      <th className="p-2 text-right w-24">মোট টাকা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {transaction.items && transaction.items.length > 0 ? (
                      transaction.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 text-center font-mono border-r border-slate-200 text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">
                            {item.productName}
                          </td>
                          <td className="p-2 text-center font-medium text-slate-700 border-r border-slate-200">
                            {item.quantity} {item.unit || 'পিস'}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-200">
                            {formatCurrency(item.unitPrice, currency)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(item.total, currency)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2 text-center font-mono border-r border-slate-200 text-slate-500">১</td>
                        <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">
                          ফটোকপি ও অনলাইন সেবা বিল
                        </td>
                        <td className="p-2 text-center font-medium text-slate-700 border-r border-slate-200">১ টি</td>
                        <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-200">
                          {formatCurrency(transaction.subtotal, currency)}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(transaction.subtotal, currency)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. Items Table for Money Receipts (টাকা জমার রসিদ) */}
            {isPayment && (
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                    <tr>
                      <th className="p-2 w-10 text-center border-r border-slate-300">ক্র.নং</th>
                      <th className="p-2 border-r border-slate-300">জমার বিবরণ / খাত</th>
                      <th className="p-2 text-center w-28 border-r border-slate-300">পরিশোধের মাধ্যম</th>
                      <th className="p-2 text-right w-28">জমার পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 text-center font-mono border-r border-slate-200 text-slate-500">১</td>
                      <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                        বকেয়া বাকি পরিশোধ
                        {transaction.note && (
                          <span className="block text-[11px] font-normal text-slate-600 mt-0.5">
                            নোট: {transaction.note}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center font-semibold text-slate-700 border-r border-slate-200">
                        {transaction.paymentMethod === 'bKash' ? 'বিকাশ (bKash)' :
                         transaction.paymentMethod === 'Nagad' ? 'নগদ (Nagad)' :
                         transaction.paymentMethod === 'Rocket' ? 'রকেট (Rocket)' :
                         transaction.paymentMethod === 'Bank' ? 'ব্যাংক ট্রান্সফার' : 'নগদ ক্যাশ (Cash)'}
                      </td>
                      <td className="p-2 text-right font-mono font-extrabold text-emerald-700 text-sm">
                        {formatCurrency(transaction.paidAmount, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial Summary Calculation (হিসাব বিবরণী) */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2 text-xs">
              {isDue && (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>মোট পণ্যের মূল্য (Subtotal):</span>
                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      {formatCurrency(transaction.subtotal, currency)}
                    </span>
                  </div>

                  {transaction.paidAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>পরিশোধ করেছেন (Paid):</span>
                      <span className="font-mono font-bold">
                        (-) {formatCurrency(transaction.paidAmount, currency)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-rose-700 font-bold pt-1 border-t border-slate-200">
                    <span>বর্তমান ভাউচারের বাকি:</span>
                    <span className="font-mono text-xs sm:text-sm">
                      {formatCurrency(transaction.remainingDue, currency)}
                    </span>
                  </div>

                  {customer && (
                    <div className="flex justify-between text-slate-900 font-black pt-1.5 border-t border-dashed border-slate-300 text-sm">
                      <span>কাস্টমারের সর্বমোট বাকি:</span>
                      <span className="font-mono text-rose-600 text-base">
                        {formatCurrency(customer.currentDue, currency)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {isPayment && (
                <>
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>জমা গ্রহণ করা হয়েছে (Paid Amount):</span>
                    <span className="font-mono text-sm sm:text-base font-black">
                      {formatCurrency(transaction.paidAmount, currency)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                    <span>পূর্বের বকেয়া বাকি ছিল:</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(previousDueBeforeThis, currency)}
                    </span>
                  </div>

                  <div className="flex justify-between text-rose-700 font-bold pt-1 border-t border-slate-200">
                    <span>বর্তমান ভাউচারের বাকি:</span>
                    <span className="font-mono text-xs sm:text-sm">
                      {formatCurrency(transaction.remainingDue, currency)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-900 font-black pt-1.5 border-t border-dashed border-slate-300 text-sm">
                    <span>কাস্টমারের সর্বমোট বাকি:</span>
                    <span className="font-mono text-rose-600 text-base">
                      {formatCurrency(customer ? customer.currentDue : transaction.remainingDue, currency)}
                    </span>
                  </div>
                </>
              )}

              {/* Amount in Words (কথায়) */}
              <div className="pt-2 text-[11px] text-slate-600 border-t border-slate-200">
                <span className="font-bold text-slate-700">কথায়: </span>
                <span className="italic font-medium">
                  {numberToBengaliWords(isPayment ? transaction.paidAmount : transaction.remainingDue || transaction.subtotal)}
                </span>
              </div>
            </div>

            {/* Footer Notice & Signatures */}
            <div className="pt-6 space-y-5">
              <div className="flex justify-between items-end px-3 text-slate-700 text-xs">
                <div className="flex flex-col items-center">
                  <div className="border-t-2 border-slate-400 w-32 sm:w-36 text-center pt-1.5 font-bold text-slate-800">
                    কাস্টমার স্বাক্ষর
                  </div>
                  <span className="text-[10px] text-slate-400">Customer Signature</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="border-t-2 border-slate-900 w-36 sm:w-44 text-center pt-1.5 font-extrabold text-slate-900">
                    দোকানদার স্বাক্ষর
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">অনলাইন সেবা কেন্দ্র (সড়াবাড়ীয়া)</span>
                </div>
              </div>

              {/* Thank you note */}
              <div className="text-center text-[10px] text-slate-500 border-t border-dashed border-slate-300 pt-2.5 space-y-0.5">
                <p className="font-semibold text-slate-700">
                  "ধন্যবাদ, আপনার সহযোগিতার জন্য। নিয়মিত বাকি পরিশোধ করে সঠিক হিসাব বজায় রাখুন।"
                </p>
                <p className="text-slate-400">
                  সফটওয়্যার প্রস্তুতকারক: অনলাইন সেবা কেন্দ্র বাকি খাতা সিস্টেম
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
