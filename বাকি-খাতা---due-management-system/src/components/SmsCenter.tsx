import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Settings, History, CheckCircle2, 
  AlertCircle, Clock, Phone, User, RefreshCw, Key, Globe, 
  ExternalLink, Sparkles, AlertTriangle, Calendar, Tag, FileText,
  RotateCcw, Check, Smartphone, Copy, Share2, HelpCircle
} from 'lucide-react';
import { api } from '../services/api.ts';
import { formatCurrency, formatDate, getWhatsAppLink, getNativeSmsLink, formatSmsTemplate } from '../utils/formatters.ts';
import type { Customer, SmsLog, ShopSettings, SmsConfig } from '../types.ts';

interface SmsCenterProps {
  customers: Customer[];
  shopSettings: ShopSettings | null;
  onRefreshSettings: () => void;
  targetCustomer?: Customer | null;
}

export const SmsCenter: React.FC<SmsCenterProps> = ({
  customers,
  shopSettings,
  onRefreshSettings,
  targetCustomer,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'compose' | 'gateway' | 'logs'>('queue');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Compose state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(targetCustomer?.id || '');
  const [customText, setCustomText] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto Due Date state for SMS
  const defaultDueDays = shopSettings?.defaultDueDays || 5;
  const getInitialDueDate = (days = defaultDueDays) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };
  const [reminderDueDate, setReminderDueDate] = useState<string>(getInitialDueDate(5));

  // Gateway Settings state
  const [gatewayConfig, setGatewayConfig] = useState<SmsConfig>({
    enabled: true,
    provider: 'generic',
    apiUrl: 'https://api.sms-gateway.com/api/v1/send',
    apiKey: '',
    senderId: 'VAI VAI STORE',
    httpMethod: 'POST',
    customHeaders: '{\n  "Content-Type": "application/json"\n}',
    bodyPayload: '{\n  "to": "{mobile}",\n  "message": "{message}",\n  "sender": "{senderId}"\n}',
    defaultTemplate: 'প্রিয় [Customer Name], আপনার [Shop Name]-এর কাছে [Due Amount] টাকা বাকি রয়েছে। নির্ধারিত তারিখ [Due Date]-এর মধ্যে পরিশোধ করার অনুরোধ করা হলো। প্রয়োজনে: [Contact Number]। ধন্যবাদ।',
  });
  const [savingGateway, setSavingGateway] = useState(false);
  const [gatewayNotice, setGatewayNotice] = useState<string | null>(null);

  // Test SMS state
  const [testPhone, setTestPhone] = useState('01700000000');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Logs state
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (shopSettings?.smsConfig) {
      setGatewayConfig(shopSettings.smsConfig);
    }
  }, [shopSettings]);

  useEffect(() => {
    if (targetCustomer) {
      setSelectedCustomerId(targetCustomer.id);
      setActiveSubTab('compose');
    }
  }, [targetCustomer]);

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.getSmsLogs();
      setLogs(res.logs);
    } catch (e) {
      console.error('Failed to load SMS logs', e);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'logs') {
      loadLogs();
    }
  }, [activeSubTab]);

  const currentSelectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers.find(c => c.currentDue > 0);

  // 5-day Due date queue calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const dueQueueCustomers = customers.filter(c => c.currentDue > 0);

  // Set quick date preset
  const handleSetQuickDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setReminderDueDate(d.toISOString().split('T')[0]);
  };

  // Insert tag into textarea
  const handleInsertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setCustomText((prev) => prev ? `${prev} ${tag}` : tag);
      return;
    }
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const updated = customText.substring(0, start) + tag + customText.substring(end);
    setCustomText(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Load auto formatted template with current values
  const handleLoadAutoTemplate = () => {
    if (!currentSelectedCustomer) return;
    const formatted = formatSmsTemplate(gatewayConfig.defaultTemplate || '', {
      customerName: currentSelectedCustomer.name,
      dueAmount: currentSelectedCustomer.currentDue,
      dueDate: reminderDueDate,
      shopName: shopSettings?.shopName || 'আমাদের দোকান',
      contactNumber: shopSettings?.mobile || '017XXXXXXXX',
    });
    setCustomText(formatted);
  };

  // Reset to default blank template
  const handleResetTemplate = () => {
    setCustomText('');
  };

  // Computed preview text with dynamic reminderDueDate
  const previewMessage = formatSmsTemplate(
    customText.trim() ? customText : (gatewayConfig.defaultTemplate || ''),
    {
      customerName: currentSelectedCustomer?.name || 'কাস্টমারের নাম',
      dueAmount: currentSelectedCustomer?.currentDue || 500,
      dueDate: reminderDueDate,
      shopName: shopSettings?.shopName || 'আমাদের দোকান',
      contactNumber: shopSettings?.mobile || '017XXXXXXXX',
    }
  );

  const [copiedText, setCopiedText] = useState(false);
  const handleCopyMessage = () => {
    if (!previewMessage) return;
    navigator.clipboard.writeText(previewMessage);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Handle Send Direct SMS
  const handleSendSms = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentSelectedCustomer) return;

    setSendLoading(true);
    setSendResult(null);

    try {
      const res = await api.sendSms(
        currentSelectedCustomer.id,
        customText.trim() || undefined,
        reminderDueDate
      );
      setSendResult({
        type: res.success ? 'success' : 'error',
        message: res.message || (res.success ? 'SMS সফলভাবে পাঠানো হয়েছে!' : 'SMS পাঠাতে ত্রুটি ঘটেছে।'),
      });
      loadLogs();
    } catch (err: any) {
      setSendResult({ type: 'error', message: err.message || 'SMS পাঠাতে ব্যর্থ হয়েছে' });
    } finally {
      setSendLoading(false);
    }
  };

  // Quick SMS to specific queue customer
  const handleQuickSend = async (c: Customer) => {
    setSendLoading(true);
    try {
      const res = await api.sendSms(c.id);
      alert(res.message);
      loadLogs();
    } catch (err: any) {
      alert(err.message || 'SMS পাঠাতে ব্যর্থ');
    } finally {
      setSendLoading(false);
    }
  };

  // Save SMS Gateway API Settings
  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGateway(true);
    setGatewayNotice(null);

    try {
      await api.updateSettings({ smsConfig: gatewayConfig });
      setGatewayNotice('SMS গেটওয়ে সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
      onRefreshSettings();
      setTimeout(() => setGatewayNotice(null), 3000);
    } catch (err: any) {
      setGatewayNotice(`ত্রুটি: ${err.message}`);
    } finally {
      setSavingGateway(false);
    }
  };

  // Send Test SMS
  const handleSendTest = async () => {
    if (!testPhone) return;
    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await api.testSms(testPhone);
      setTestResult({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      loadLogs();
    } catch (err: any) {
      setTestResult({ type: 'error', message: err.message || 'টেস্ট SMS ব্যর্থ' });
    } finally {
      setTestLoading(false);
    }
  };

  // Provider presets helper
  const handleApplyPreset = (preset: string) => {
    if (preset === 'greenweb') {
      setGatewayConfig(prev => ({
        ...prev,
        provider: 'greenweb',
        apiUrl: 'http://api.greenweb.com.bd/api.php',
        httpMethod: 'GET',
        senderId: '',
        bodyPayload: '',
      }));
    } else if (preset === 'bulksmsbd') {
      setGatewayConfig(prev => ({
        ...prev,
        provider: 'bulksmsbd',
        apiUrl: 'http://bulksmsbd.net/api/smsapi',
        httpMethod: 'POST',
        senderId: '8809612...',
        bodyPayload: '{\n  "api_key": "{apiKey}",\n  "senderid": "{senderId}",\n  "number": "{mobile}",\n  "message": "{message}"\n}',
      }));
    } else if (preset === 'reve') {
      setGatewayConfig(prev => ({
        ...prev,
        provider: 'reve',
        apiUrl: 'https://smpp.revesms.com:7790/sendtext',
        httpMethod: 'POST',
        senderId: '',
        bodyPayload: '{\n  "apikey": "{apiKey}",\n  "sender": "{senderId}",\n  "receiver": "{mobile}",\n  "msg": "{message}"\n}',
      }));
    } else {
      setGatewayConfig(prev => ({
        ...prev,
        provider: 'generic',
        apiUrl: 'https://api.sms-gateway.com/api/v1/send',
        httpMethod: 'POST',
        bodyPayload: '{\n  "to": "{mobile}",\n  "message": "{message}",\n  "sender": "{senderId}"\n}',
      }));
    }
  };

  return (
    <div id="sms-center-view" className="space-y-5 pb-16 md:pb-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">SMS ও রিমাইন্ডার সেন্টার</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ৫ দিন পর স্বয়ংক্রিয় SMS রিমাইন্ডার, রিয়েল গেটওয়ে ইন্টিগ্রেশন ও সরাসরি বার্তা প্রেরণ
          </p>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('queue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'queue' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ৫ দিনের রিমাইন্ডার ({dueQueueCustomers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('compose')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'compose' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            সরাসরি SMS
          </button>
          <button
            onClick={() => setActiveSubTab('gateway')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'gateway' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            গেটওয়ে কনফিগ
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'logs' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SMS হিস্ট্রি
          </button>
        </div>
      </div>

      {/* Free SMS & Reminder Guidance Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-800 text-sm sm:text-base">ফ্রি SMS ও রিমাইন্ডার পাঠানোর বিকল্প</h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                  ১০০% ফ্রি অপশনসমূহ
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                টাকা বা গেটওয়ে রিচার্জ ছাড়াই সরাসরি আপনার মোবাইল বা হোয়াটসঅ্যাপ দিয়ে মেসেজ পাঠান
              </p>
            </div>
          </div>

          {!gatewayConfig.apiKey && (
            <button
              onClick={() => setActiveSubTab('gateway')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shrink-0 shadow-xs transition"
            >
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span>অনলাইন গেটওয়ে সেটআপ</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
          <div className="bg-white/95 border border-sky-200/80 p-3 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-sky-900 block font-bold">১. মোবাইলের SIM দিয়ে SMS (ফ্রি)</strong>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                বাটনে চাপলে ফোনের মেসেজ অ্যাপে স্বয়ংক্রিয়ভাবে মেসেজ চলে আসবে। আপনার সিমের ফ্রি SMS প্যাক দিয়ে ০ খরচে পাঠাতে পারবেন।
              </p>
            </div>
          </div>

          <div className="bg-white/95 border border-emerald-200/80 p-3 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-emerald-900 block font-bold">২. WhatsApp রিমাইন্ডার (১০০% ফ্রি)</strong>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                সম্পূর্ণ বিনামূল্যে আনলিমিটেড রিমাইন্ডার পাঠান। কাস্টমারের নম্বরে সরাসরি সম্পূর্ণ হিসাবের মেসেজ চলে যাবে।
              </p>
            </div>
          </div>

          <div className="bg-white/95 border border-amber-200/80 p-3 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-amber-900 block font-bold">৩. কপি করে ইমো / মেসেঞ্জারে</strong>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                এক ক্লিকে মেসেজ ও মোবাইল নম্বর কপি করে IMO, Messenger বা যে কোনো অ্যাপে পেস্ট করে ফ্রিতে পাঠিয়ে দিন।
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: 5-Day Due Queue (Section 8) */}
      {activeSubTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                বাকি পরিশোধযোগ্য ও রিমাইন্ডার গ্রাহক তালিকা
              </h3>
              <p className="text-xs text-slate-500">
                যাদের বাকি নেওয়ার পর ৫ দিন অতিবাহিত হয়েছে বা হওয়ার পথে তাদের SMS পাঠান
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">গ্রাহক</th>
                  <th className="px-4 py-3">মোবাইল নম্বর</th>
                  <th className="px-4 py-3 text-right">বাকি পরিমাণ</th>
                  <th className="px-4 py-3 text-center">৫-দিনের নোটিশ</th>
                  <th className="px-4 py-3 text-center">SMS / WhatsApp বাটন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dueQueueCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      কোনো বকেয়া কাস্টমার নেই!
                    </td>
                  </tr>
                ) : (
                  dueQueueCustomers.map((customer) => {
                    const waText = formatSmsTemplate(gatewayConfig.defaultTemplate, {
                      customerName: customer.name,
                      dueAmount: customer.currentDue,
                      dueDate: formatDate(new Date(Date.now() + 5 * 86400000).toISOString()),
                      shopName: shopSettings?.shopName || 'আমাদের দোকান',
                      contactNumber: shopSettings?.mobile || '017XXXXXXXX',
                    });

                    return (
                      <tr key={customer.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{customer.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{customer.id}</div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-mono font-medium text-slate-700">
                          {customer.mobile}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold text-rose-600 text-sm">
                          {formatCurrency(customer.currentDue, shopSettings?.currency)}
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>৫ দিন পূর্ণ রিমাইন্ডার</span>
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 1. Free Device SIM SMS */}
                            <a
                              href={getNativeSmsLink(customer.mobile, waText)}
                              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow-2xs"
                              title="মোবাইলের নিজস্ব সিম দিয়ে ফ্রি SMS পাঠান"
                            >
                              <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                              <span>SIM SMS (ফ্রি)</span>
                            </a>

                            {/* 2. Free WhatsApp */}
                            <a
                              href={getWhatsAppLink(customer.mobile, waText)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow-2xs"
                              title="WhatsApp-এ সম্পূর্ণ ফ্রিতে মেসেজ পাঠান"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>

                            {/* 3. Server Gateway SMS */}
                            <button
                              onClick={() => handleQuickSend(customer)}
                              disabled={sendLoading}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition inline-flex items-center gap-1 shadow-2xs"
                              title="অনলাইন গেটওয়ে দিয়ে SMS পাঠান"
                            >
                              <Globe className="w-3.5 h-3.5 text-slate-500" />
                              <span>গেটওয়ে</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Compose & Send Custom SMS */}
      {activeSubTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Composer Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-base">কাস্টমারকে সরাসরি SMS পাঠান</h3>

            {sendResult && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                sendResult.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {sendResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{sendResult.message}</span>
              </div>
            )}

            <form onSubmit={handleSendSms} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  কাস্টমার নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobile}) - বাকি: {formatCurrency(c.currentDue, shopSettings?.currency)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto Due Date Selector for SMS Reminder */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <label className="text-xs font-bold text-slate-800">
                      পরিশোধের তারিখ (SMS-এ অটো তারিখ বসবে)
                    </label>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>অটো তারিখ: {formatDate(reminderDueDate) || reminderDueDate}</span>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="date"
                    value={reminderDueDate}
                    onChange={(e) => setReminderDueDate(e.target.value)}
                    className="w-full sm:w-auto text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />

                  {/* Quick Preset Date Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(0)}
                      className="text-[11px] px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium transition"
                    >
                      আজকের তারিখ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(3)}
                      className="text-[11px] px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium transition"
                    >
                      +৩ দিন
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(5)}
                      className="text-[11px] px-2 py-1 bg-emerald-100/70 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded-md font-bold transition"
                    >
                      +৫ দিন (ডিফল্ট)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(7)}
                      className="text-[11px] px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium transition"
                    >
                      +৭ দিন
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(10)}
                      className="text-[11px] px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium transition"
                    >
                      +১০ দিন
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(15)}
                      className="text-[11px] px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium transition"
                    >
                      +১৫ দিন
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal">
                  💡 SMS মেসেজে <code className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-mono">[Due Date]</code> বা <code className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-mono">[তারিখ]</code> ট্যাগের স্থানে এই তারিখটি স্বয়ংক্রিয়ভাবে বসে যাবে।
                </p>
              </div>

              {/* SMS Message / Reminder Text Composer */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      SMS বার্তা / রিমাইন্ডার টেক্সট
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadAutoTemplate}
                      title="কাস্টমার ও বর্তমান অটো তারিখ সহ সম্পূর্ণ মেসেজ বসান"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>অটো বার্তা লোড করুন (তারিখ সহ)</span>
                    </button>
                    {customText && (
                      <button
                        type="button"
                        onClick={handleResetTemplate}
                        title="টেক্সট মুছে ডিফল্ট ফরম্যাটে ফেরত যান"
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>রিসেট</span>
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono">
                      {previewMessage.length} অক্ষর
                    </span>
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  rows={4}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder={gatewayConfig.defaultTemplate}
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                ></textarea>

                {/* Quick Insert Tag Chips */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>ক্লিক করে সরাসরি ট্যাগ ও তারিখ যুক্ত করুন:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleInsertTag('[Due Date]')}
                      className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-md font-semibold transition"
                      title="অটো নির্ধারিত তারিখ বসবে"
                    >
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      <span>[Due Date] (অটো তারিখ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag(formatDate(reminderDueDate) || reminderDueDate)}
                      className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-1 rounded-md font-semibold transition"
                      title="বর্তমান নির্বাচিত বাংলা তারিখটি সরাসরি পেস্ট হবে"
                    >
                      <Tag className="w-3 h-3 text-indigo-600" />
                      <span>{formatDate(reminderDueDate) || reminderDueDate} (তারিখ বসান)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('[Customer Name]')}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition"
                    >
                      [Customer Name]
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('[Due Amount]')}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition"
                    >
                      [Due Amount]
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('[Shop Name]')}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition"
                    >
                      [Shop Name]
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('[Contact Number]')}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition"
                    >
                      [Contact Number]
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">পাঠানোর মাধ্যম:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* 1. Mobile SIM SMS (100% Free) */}
                  <a
                    href={currentSelectedCustomer ? getNativeSmsLink(currentSelectedCustomer.mobile, previewMessage) : '#'}
                    onClick={(e) => {
                      if (!currentSelectedCustomer) {
                        e.preventDefault();
                        alert('অনুগ্রহ করে আগে একজন কাস্টমার নির্বাচন করুন');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                    title="মোবাইলের নিজস্ব সিম ও মেসেজ অ্যাপ দিয়ে ফ্রি SMS পাঠান"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>📱 সিম দিয়ে SMS (ফ্রি)</span>
                  </a>

                  {/* 2. WhatsApp (100% Free) */}
                  <a
                    href={currentSelectedCustomer ? getWhatsAppLink(currentSelectedCustomer.mobile, previewMessage) : '#'}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      if (!currentSelectedCustomer) {
                        e.preventDefault();
                        alert('অনুগ্রহ করে আগে একজন কাস্টমার নির্বাচন করুন');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                    title="হোয়াটসঅ্যাপে সম্পূর্ণ বিনামূল্যে মেসেজ পাঠান"
                  >
                    <Send className="w-4 h-4" />
                    <span>💬 WhatsApp (ফ্রি)</span>
                  </a>

                  {/* 3. Copy message */}
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                    title="ইমো, মেসেঞ্জারে পাঠাতে মেসেজ কপি করুন"
                  >
                    {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    <span>{copiedText ? 'কপি হয়েছে!' : '📋 কপি করুন'}</span>
                  </button>

                  {/* 4. Gateway SMS (Server/Paid) */}
                  <button
                    type="submit"
                    disabled={sendLoading || !currentSelectedCustomer}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
                    title="অনলাইন SMS Gateway দিয়ে পাঠান"
                  >
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>{sendLoading ? 'পাঠানো হচ্ছে...' : '🌐 গেটওয়ে SMS'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Live Mobile Screen Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col items-center">
            <span className="text-xs font-semibold text-slate-500 mb-3">কাস্টমারের ফোনে প্রিভিউ</span>
            <div className="w-full max-w-[280px] bg-slate-900 rounded-3xl p-3 shadow-xl border-4 border-slate-800 text-slate-900">
              <div className="w-16 h-3 bg-slate-800 rounded-full mx-auto mb-4"></div>
              <div className="bg-slate-100 rounded-2xl p-3.5 min-h-[220px] flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-center text-slate-400 mb-2">
                    {gatewayConfig.senderId || 'SHOP SMS'}
                  </div>
                  <div className="bg-emerald-600 text-white p-2.5 rounded-xl rounded-tl-xs text-[11px] leading-relaxed shadow-xs">
                    {previewMessage}
                  </div>
                </div>
                <div className="text-[9px] text-slate-400 text-center mt-2">
                  এখনই পাঠানো হবে
                </div>
              </div>
            </div>

            {/* Quick action buttons under mobile preview */}
            <div className="w-full max-w-[280px] mt-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 text-center">
                দ্রুত পাঠানোর বাটনসমূহ:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={currentSelectedCustomer ? getNativeSmsLink(currentSelectedCustomer.mobile, previewMessage) : '#'}
                  onClick={(e) => {
                    if (!currentSelectedCustomer) {
                      e.preventDefault();
                      alert('অনুগ্রহ করে আগে একজন কাস্টমার নির্বাচন করুন');
                    }
                  }}
                  className="flex items-center justify-center gap-1 py-2 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold text-center transition cursor-pointer"
                  title="মোবাইলের মেসেজ অ্যাপ দিয়ে সিমের মাধ্যমে পাঠান"
                >
                  <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                  <span>SIM SMS (ফ্রি)</span>
                </a>
                <a
                  href={currentSelectedCustomer ? getWhatsAppLink(currentSelectedCustomer.mobile, previewMessage) : '#'}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    if (!currentSelectedCustomer) {
                      e.preventDefault();
                      alert('অনুগ্রহ করে আগে একজন কাস্টমার নির্বাচন করুন');
                    }
                  }}
                  className="flex items-center justify-center gap-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold text-center transition cursor-pointer"
                  title="হোয়াটসঅ্যাপে সম্পূর্ণ বিনামূল্যে পাঠান"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>
              </div>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedText ? 'মেসেজ কপি সম্পন্ন হয়েছে' : 'বার্তা কপি করে ইমো/মেসেঞ্জারে পাঠান'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Real Gateway API Configuration (Section 9) */}
      {activeSubTab === 'gateway' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <h3 className="font-bold text-slate-800 text-base">রিয়েল SMS Gateway API কনফিগারেশন</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                কাস্টমারের মোবাইলে স্বয়ংক্রিয়ভাবে অনলাইন SMS পাঠাতে যেকোনো দেশীয় SMS Gateway ব্যবহার করতে পারেন।
              </p>
            </div>

            {/* Help Guide Accordion / Box */}
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs">💡</span>
                <span>API Key / Secret Token কোথায় পাবেন এবং এটি কি কাজে লাগে?</span>
              </div>

              <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                <p>
                  <strong>১. API Key কি?</strong> এটি বাল্ক SMS প্রদানকারী কোম্পানি (যেমন Greenweb, BulkSMSBD) থেকে দেওয়া একটি গোপন পাসওয়ার্ড বা টোকেন। এর মাধ্যমে ওয়েবসাইট থেকে গ্রাহকের মোবাইলে সরাসরি মেসেজ পৌঁছায়।
                </p>
                <p>
                  <strong>২. এটি কি বাধ্যতামূলক?</strong> <span className="text-emerald-700 font-bold">না, এটি বাধ্যতামূলক নয়!</span> আপনার যদি কোনো SMS গেটওয়ে না থাকে তবে এটি খালি রেখেও বাকি খাতা, কাস্টমার লেজার, প্রিন্ট মেমো সম্পূর্ণ ফ্রিতে ব্যবহার করতে পারবেন।
                </p>
                <p>
                  <strong>৩. ফ্রি SMS কিভাবে পাঠাবেন?</strong> ইন্টারনেট বাল্ক SMS গেটওয়েগুলো মোবাইল অপারেটরদের সরকারি ফির কারণে পেইড হয়। কিন্তু আপনি <span className="text-sky-700 font-bold">১০০% ফ্রিতে</span> গ্রাহককে মেসেজ পাঠাতে পারবেন দুটি সহজ উপায়ে:
                  <br />
                  • <strong>📱 মোবাইলের SIM SMS (ফ্রি):</strong> "সরাসরি SMS" ট্যাবে গিয়ে <em>"সিম দিয়ে SMS"</em> বাটনে চাপলে ফোনের মেসেজ অ্যাপে স্বয়ংক্রিয়ভাবে মেসেজ চলে আসবে। আপনার সিমের ফ্রি SMS প্যাক বা স্বাভাবিক ব্যালেন্স দিয়ে ০ গেটওয়ে খরচে যাবে।
                  <br />
                  • <strong>💬 WhatsApp (সম্পূর্ণ ফ্রি):</strong> কোনো খরচ বা রিচার্জ ছাড়াই গ্রাহককে সম্পূর্ণ হিসাবের রিমাইন্ডার পৌঁছে যাবে।
                </p>
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60 space-y-1.5 text-[11px]">
                  <strong className="text-slate-800 block text-xs">যদি স্বয়ংক্রিয় সার্ভার গেটওয়ে কিনতে চান তবে কিভাবে API Key পাবেন:</strong>
                  <ul className="list-decimal list-inside space-y-1 text-slate-600">
                    <li>বাংলাদেশি কোনো এসএমএস প্রোভাইডারে ফ্রি অ্যাকাউন্ট খুলুন (যেমন: <a href="https://greenweb.com.bd" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">greenweb.com.bd</a> অথবা <a href="http://bulksmsbd.net" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">bulksmsbd.net</a>)।</li>
                    <li>সেখানে ১০০-২০০ টাকার মতো ছোট একটি SMS প্যাকেজ রিচার্জ করুন (প্রতি SMS প্রায় ২৫-৩০ পয়সা)।</li>
                    <li>আপনার ইউজার একাউন্টের <strong>API Settings / Developer Token</strong> মেনু থেকে <strong>API Key</strong> কপি করে নিচের ঘরে পেস্ট করে সেভ করুন।</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Presets */}
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-1.5">দ্রুত প্রি-সেট নির্বাচন:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'generic', label: 'Generic REST API (POST)' },
                  { id: 'greenweb', label: 'Greenweb SMS (BD)' },
                  { id: 'bulksmsbd', label: 'BulkSMSBD (BD)' },
                  { id: 'reve', label: 'Reve SMS' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-medium transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {gatewayNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                {gatewayNotice}
              </div>
            )}

            <form onSubmit={handleSaveGateway} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    API Endpoint URL
                  </label>
                  <input
                    type="url"
                    required
                    value={gatewayConfig.apiUrl}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, apiUrl: e.target.value })}
                    placeholder="https://api.sms-gateway.com/send"
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HTTP Method</label>
                  <select
                    value={gatewayConfig.httpMethod}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, httpMethod: e.target.value as any })}
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="POST">POST (Standard)</option>
                    <option value="GET">GET (Query String)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      API Key / Secret Token
                    </label>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                      ঐচ্ছিক (শুধু SMS এর জন্য)
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={gatewayConfig.apiKey}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, apiKey: e.target.value })}
                      placeholder="যেমন: gw_token_xxxx বা bulksms_key"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sender ID (প্রেরকের নাম / মাস্কিং নাম)
                  </label>
                  <input
                    type="text"
                    value={gatewayConfig.senderId}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, senderId: e.target.value })}
                    placeholder="ONLINE SEBA বা আপনার নম্বর"
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                  />
                </div>
              </div>

              {gatewayConfig.httpMethod === 'POST' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    POST Body Payload Template (JSON)
                  </label>
                  <textarea
                    rows={3}
                    value={gatewayConfig.bodyPayload || ''}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, bodyPayload: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  ></textarea>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ডিফল্ট SMS Template (রিমাইন্ডার মেসেজ)
                </label>
                <textarea
                  rows={3}
                  value={gatewayConfig.defaultTemplate}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, defaultTemplate: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingGateway}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-60"
                >
                  {savingGateway ? 'সংরক্ষণ হচ্ছে...' : 'গেটওয়ে কনফিগারেশন সেভ করুন'}
                </button>
              </div>
            </form>
          </div>

          {/* Test SMS Tool */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">পরীক্ষামূলক টেস্ট SMS</h4>
            <p className="text-xs text-slate-500">
              API সংযোগ সঠিকভাবে কাজ করছে কিনা দেখতে নিজের মোবাইলে একটি টেস্ট SMS পাঠিয়ে পরীক্ষা করুন।
            </p>

            {testResult && (
              <div className={`p-2.5 rounded-xl text-xs ${
                testResult.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {testResult.message}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">টেস্ট মোবাইল নম্বর</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={testLoading || !testPhone}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50"
            >
              {testLoading ? 'পাঠানো হচ্ছে...' : 'টেস্ট SMS পাঠান'}
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SMS Logs & History (Section 9) */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">SMS পাঠানোর সম্পূর্ণ ইতিহাস (Logs)</h3>
              <p className="text-xs text-slate-500">প্রতিটি পাঠানো বার্তার স্ট্যাটাস, প্রেরিত তারিখ ও গেটওয়ে রেসপন্স</p>
            </div>
            <button
              onClick={loadLogs}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="রিফ্রেশ"
            >
              <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">তারিখ ও সময়</th>
                  <th className="px-4 py-3">গ্রাহক</th>
                  <th className="px-4 py-3">মোবাইল</th>
                  <th className="px-4 py-3">বার্তা</th>
                  <th className="px-4 py-3 text-right">বাকি টাকা</th>
                  <th className="px-4 py-3 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      এখনো কোনো SMS লগ নেই
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {new Date(log.sentAt).toLocaleString('bn-BD')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                        {log.customerName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-700">
                        {log.mobile}
                      </td>
                      <td className="px-4 py-3 max-w-[280px] truncate text-slate-600" title={log.message}>
                        {log.message}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                        {formatCurrency(log.amount, shopSettings?.currency)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {log.status === 'sent' ? 'সফল (Sent)' : 'ব্যর্থ (Failed)'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
