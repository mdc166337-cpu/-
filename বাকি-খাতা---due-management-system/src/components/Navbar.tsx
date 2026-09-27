import React from 'react';
import { 
  Store, LayoutDashboard, Users, MessageSquare, 
  BarChart3, Settings, LogOut, PlusCircle, ArrowDownCircle, Laptop
} from 'lucide-react';
import type { ShopSettings, AuthUser } from '../types.ts';

interface NavbarProps {
  activeTab: 'dashboard' | 'customers' | 'sms' | 'reports' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'customers' | 'sms' | 'reports' | 'settings') => void;
  shopSettings: ShopSettings | null;
  currentUser: AuthUser | null;
  dueSoonCount: number;
  onOpenAddDue: () => void;
  onOpenAddPayment: () => void;
  onOpenSettings: () => void;
  onOpenInstallGuide: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  shopSettings,
  currentUser,
  dueSoonCount,
  onOpenAddDue,
  onOpenAddPayment,
  onOpenSettings,
  onOpenInstallGuide,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Shop Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base sm:text-lg leading-tight tracking-tight">
                  {shopSettings?.shopName || 'বাকি খাতা'}
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {shopSettings?.ownerName ? `${shopSettings.ownerName} • ফটোকপি ও অনলাইন সেবা` : 'ফটোকপি ও অনলাইন সেবা কেন্দ্র'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>ড্যাশবোর্ড</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'customers'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>কাস্টমার খাতা</span>
            </button>

            <button
              onClick={() => setActiveTab('sms')}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'sms'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>SMS রিমাইন্ডার</span>
              {dueSoonCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {dueSoonCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'reports'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>রিপোর্ট</span>
            </button>
          </nav>

          {/* Quick Action Buttons & User Controls */}
          <div className="flex items-center gap-2">
            <button
              id="nav-btn-add-due"
              onClick={onOpenAddDue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium shadow-sm transition"
              title="নতুন বাকি চালান তৈরি করুন"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ বাকি দিন</span>
              <span className="sm:hidden">+ বাকি</span>
            </button>

            <button
              id="nav-btn-add-payment"
              onClick={onOpenAddPayment}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium shadow-sm transition"
              title="টাকা জমা নিন"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ জমা নিন</span>
              <span className="sm:hidden">+ জমা</span>
            </button>

            <button
              onClick={onOpenInstallGuide}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold border border-slate-200 hover:border-emerald-300 transition cursor-pointer"
              title="কম্পিউটার বা ল্যাপটপে অ্যাপ হিসেবে ইন্সটল করুন"
            >
              <Laptop className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline">PC অ্যাপ ইন্সটল</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              title="সেটিংস ও SMS গেটওয়ে"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="লগআউট"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar for quick thumb navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold py-1 px-3 rounded-lg ${
            activeTab === 'dashboard' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>ড্যাশবোর্ড</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold py-1 px-3 rounded-lg ${
            activeTab === 'customers' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>কাস্টমার</span>
        </button>

        <button
          onClick={() => setActiveTab('sms')}
          className={`relative flex flex-col items-center gap-1 text-[11px] font-semibold py-1 px-3 rounded-lg ${
            activeTab === 'sms' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>SMS</span>
          {dueSoonCount > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-rose-500"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold py-1 px-3 rounded-lg ${
            activeTab === 'reports' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>রিপোর্ট</span>
        </button>
      </div>
    </header>
  );
};
