import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Store, Lock, Key, ShieldCheck, Download, 
  RefreshCw, CheckCircle2, AlertCircle, Save, Database, Laptop,
  Upload, FileJson, HardDrive, X
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { ShopSettings } from '../types.ts';
import { InstallGuideModal } from './InstallGuideModal.tsx';

interface SettingsPageProps {
  settings: ShopSettings | null;
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onRefresh,
}) => {
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  // Shop Details State
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('৳');
  const [defaultDueDays, setDefaultDueDays] = useState(5);

  const [savingShop, setSavingShop] = useState(false);
  const [shopSuccess, setShopSuccess] = useState<string | null>(null);

  // Password Change State (Section 3: Admin password must not be hardcoded, secure hashing)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setShopName(settings.shopName || '');
      setOwnerName(settings.ownerName || '');
      setMobile(settings.mobile || '');
      setAddress(settings.address || '');
      setCurrency(settings.currency || '৳');
      setDefaultDueDays(settings.defaultDueDays || 5);
    }
  }, [settings]);

  const handleSaveShopDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShop(true);
    setShopSuccess(null);

    try {
      await api.updateSettings({
        shopName,
        ownerName,
        mobile,
        address,
        currency,
        defaultDueDays: Number(defaultDueDays) || 5,
      });
      setShopSuccess('দোকানের তথ্য সফলভাবে সংরক্ষিত হয়েছে!');
      onRefresh();
      setTimeout(() => setShopSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setSavingShop(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPassword.length < 4) {
      setPassError('নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('নতুন পাসওয়ার্ড দুটি হুবহু মিলছে না');
      return;
    }

    setChangingPass(true);

    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setPassSuccess(res.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(null), 3500);
    } catch (err: any) {
      setPassError(err.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে');
    } finally {
      setChangingPass(false);
    }
  };

  // Backup Data State
  const [exportingBackup, setExportingBackup] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupStats, setBackupStats] = useState<{
    totalCustomers: number;
    totalTransactions: number;
    totalDue: number;
  } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<any | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load summary stats for backup info
  useEffect(() => {
    api.getDashboardStats()
      .then((data) => {
        setBackupStats({
          totalCustomers: data.stats.totalCustomers,
          totalTransactions: data.recentTransactions?.length || 0,
          totalDue: data.stats.totalDue,
        });
      })
      .catch(() => {});
  }, [settings]);

  // Export full JSON database backup
  const handleExportBackup = async () => {
    setExportingBackup(true);
    setBackupSuccess(null);
    setBackupError(null);

    try {
      const backupData = await api.exportBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      const safeName = (settings?.shopName || 'bakikhata')
        .replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '_')
        .substring(0, 20);
      a.download = `bakikhata_backup_${safeName}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const custCount = backupData.customers?.length || backupData.summary?.totalCustomers || 0;
      const txCount = backupData.transactions?.length || backupData.summary?.totalTransactions || 0;
      setBackupSuccess(`সফলভাবে ${custCount} জন কাস্টমার এবং ${txCount} টি লেনদেনের সম্পূর্ণ ডাটা ব্যাকআপ (.json) ডাউনলোড হয়েছে!`);
      setTimeout(() => setBackupSuccess(null), 6000);
    } catch (err: any) {
      setBackupError(err.message || 'ব্যাকআপ ফাইল প্রস্তুত করতে সমস্যা হয়েছে।');
    } finally {
      setExportingBackup(false);
    }
  };

  // Handle JSON File selection for restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupError(null);
    setBackupSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.customers) || !Array.isArray(parsed.transactions)) {
          throw new Error('অবৈধ ব্যাকআপ ফাইল। ফাইলে কাস্টমার বা লেনদেনের সঠিক তালিকা পাওয়া যায়নি।');
        }
        setPendingRestore(parsed);
      } catch (err: any) {
        setBackupError(err.message || 'ফাইলটি পড়তে সমস্যা হয়েছে। দয়া করে সঠিক .json ফাইল নির্বাচন করুন।');
      }
    };
    reader.onerror = () => {
      setBackupError('ফাইল লোড করতে ব্যর্থ হয়েছে।');
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input so same file can be re-selected if needed
  };

  // Confirm and apply restore
  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setRestoring(true);
    setBackupSuccess(null);
    setBackupError(null);

    try {
      const res = await api.restoreBackup(pendingRestore);
      setBackupSuccess(res.message);
      setPendingRestore(null);
      onRefresh();
      // refresh stats
      const data = await api.getDashboardStats();
      setBackupStats({
        totalCustomers: data.stats.totalCustomers,
        totalTransactions: data.recentTransactions?.length || 0,
        totalDue: data.stats.totalDue,
      });
      setTimeout(() => setBackupSuccess(null), 6000);
    } catch (err: any) {
      setBackupError(err.message || 'ডাটা রিস্টোর করতে সমস্যা হয়েছে।');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div id="settings-view" className="space-y-6 pb-16 md:pb-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">সিস্টেম ও দোকান সেটিংস</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          দোকানের নাম, মেমো হেডার, অ্যাডমিন পাসওয়ার্ড ও ডেটাবেজ ব্যাকআপ ব্যবস্থাপনা
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Shop Profile Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Store className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-base">দোকান ও মেমো সেটিংস</h3>
          </div>

          {shopSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{shopSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveShopDetails} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                দোকানের নাম (Shop Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="যেমন: মেসার্স ভাই ভাই জেনারেল স্টোর"
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">প্রোপ্রাইটর / মালিকের নাম</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="যেমন: মোঃ কামরুল ইসলাম"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  দোকানের মোবাইল নম্বর <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="01711000000"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">দোকানের ঠিকানা</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="বাজার রোড, সদর, ঢাকা"
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মুদ্রার প্রতীক (Currency)</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="৳"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ডিফল্ট SMS রিমাইন্ডার দিন</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={defaultDueDays}
                  onChange={(e) => setDefaultDueDays(Number(e.target.value))}
                  placeholder="5"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingShop}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{savingShop ? 'সংরক্ষণ হচ্ছে...' : 'দোকানের তথ্য সেভ করুন'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* 2. Security & Admin Password Change (Section 3) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-base">অ্যাডমিন পাসওয়ার্ড পরিবর্তন</h3>
            </div>

            {passError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বর্তমান পাসওয়ার্ড</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="বর্তমান গোপন পাসওয়ার্ড লিখুন"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নতুন পাসওয়ার্ড</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৪ সংখ্যার নতুন পাসওয়ার্ড"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={changingPass}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-60"
                >
                  <Key className="w-4 h-4" />
                  <span>{changingPass ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* 3. Database Backup & Safe Persistence */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-800 text-sm sm:text-base">কাস্টমার ও লেনদেনের সম্পূর্ণ ডাটা ব্যাকআপ</h4>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                JSON Export
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              আপনার দোকানের সমস্ত কাস্টমার তালিকা, চালান, বাকি ও পরিশোধের লেনদেন একটি একক <strong>JSON</strong> ফাইল হিসেবে আপনার কম্পিউটারে নিরাপদে ডাউনলোড করে রাখুন।
            </p>

            {/* Quick Stats Pill */}
            {backupStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                <div className="p-1.5 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <span className="block text-[10px] text-slate-500 font-medium">মোট কাস্টমার</span>
                  <strong className="text-xs sm:text-sm font-bold text-slate-800">{backupStats.totalCustomers} জন</strong>
                </div>
                <div className="p-1.5 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <span className="block text-[10px] text-slate-500 font-medium">মোট বকেয়া</span>
                  <strong className="text-xs sm:text-sm font-bold text-rose-600">
                    {currency} {backupStats.totalDue.toLocaleString('bn-BD')}
                  </strong>
                </div>
                <div className="col-span-2 sm:col-span-1 p-1.5 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <span className="block text-[10px] text-slate-500 font-medium">ফাইল ফরম্যাট</span>
                  <strong className="text-xs sm:text-sm font-bold text-emerald-700 font-mono">.JSON</strong>
                </div>
              </div>
            )}

            {/* Success & Error Banners */}
            {backupSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{backupSuccess}</span>
              </div>
            )}

            {backupError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{backupError}</span>
              </div>
            )}

            {/* Export and Restore Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={exportingBackup}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {exportingBackup ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>ব্যাকআপ ফাইল তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>সম্পূর্ণ JSON ডেটা ব্যাকআপ ডাউনলোড করুন</span>
                  </>
                )}
              </button>

              {/* Hidden file input for restore */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>পূর্বের ব্যাকআপ ফাইল থেকে রিস্টোর (Restore) করুন</span>
              </button>
            </div>

            {/* Safety Guidance */}
            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>নিরাপত্তা পরামর্শ:</strong> প্রতি সপ্তাহে এই ব্যাকআপ ফাইলটি আপনার কম্পিউটার, পেনড্রাইভ বা গুগল ড্রাইভে সেভ করে রাখুন। কম্পিউটার নষ্ট বা পরিবর্তন করলেও এই ফাইল থেকে মুহূর্তেই সব বাকি ও হিসাব ফিরে পাবেন।
              </span>
            </div>
          </div>

          {/* 4. Desktop / PC App Installation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <Laptop className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-slate-800 text-sm">কম্পিউটার বা ল্যাপটপে অ্যাপ ইন্সটল</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              সফটওয়্যারটি গুগল ক্রোম বা মাইক্রোসফট এজের মাধ্যমে ডেস্কটপে স্বতন্ত্র অ্যাপ হিসেবে ইন্সটল করে ব্রাউজার বার ছাড়া সরাসরি চালাতে পারেন।
            </p>
            <button
              type="button"
              onClick={() => setShowInstallGuide(true)}
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Laptop className="w-4 h-4 text-emerald-600" />
              <span>ইন্সটল করার নিয়ম ও বাটন দেখুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">ব্যাকআপ ডাটা রিস্টোর নিশ্চিতকরণ</h3>
              </div>
              <button
                onClick={() => setPendingRestore(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <p>
                আপনি একটি ব্যাকআপ ফাইল নির্বাচন করেছেন। এটি রিস্টোর করলে সফটওয়্যারের বর্তমান ডাটাবেজ ব্যাকআপের তথ্য দিয়ে আপডেট হবে।
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">দোকানের নাম:</span>
                  <strong className="text-slate-800">{pendingRestore.shop?.shopName || pendingRestore.settings?.shopName || 'বাকি খাতা'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">কাস্টমার সংখ্যা:</span>
                  <strong className="text-slate-800">{pendingRestore.customers?.length || 0} জন</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">লেনদেন সংখ্যা:</span>
                  <strong className="text-slate-800">{pendingRestore.transactions?.length || 0} টি</strong>
                </div>
                {pendingRestore.exportedAt && (
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                    <span>এক্সপোর্ট তারিখ:</span>
                    <span>{new Date(pendingRestore.exportedAt).toLocaleDateString('bn-BD')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                disabled={restoring}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                {restoring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>রিস্টোর হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>হ্যাঁ, রিস্টোর সম্পন্ন করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInstallGuide && (
        <InstallGuideModal onClose={() => setShowInstallGuide(false)} />
      )}
    </div>
  );
};
