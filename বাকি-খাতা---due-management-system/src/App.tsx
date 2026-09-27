import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Store, Laptop } from 'lucide-react';
import { api } from './services/api.ts';
import type { Customer, Transaction, ShopSettings, AuthUser, DashboardStats } from './types.ts';

// Core Components
import { Navbar } from './components/Navbar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { CustomerManagement } from './components/CustomerManagement.tsx';
import { SmsCenter } from './components/SmsCenter.tsx';
import { Reports } from './components/Reports.tsx';
import { SettingsPage } from './components/SettingsPage.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';
import { CustomerPortal } from './components/CustomerPortal.tsx';

// Modals
import { AddDueModal } from './components/AddDueModal.tsx';
import { AddPaymentModal } from './components/AddPaymentModal.tsx';
import { CustomerLedgerModal } from './components/CustomerLedgerModal.tsx';
import { InvoicePrintModal } from './components/InvoicePrintModal.tsx';
import { InstallGuideModal } from './components/InstallGuideModal.tsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authView, setAuthView] = useState<'admin' | 'customer'>('admin');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'sms' | 'reports' | 'settings'>('dashboard');

  // App Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Modals state
  const [isAddDueOpen, setIsAddDueOpen] = useState(false);
  const [dueModalCustomer, setDueModalCustomer] = useState<Customer | null>(null);

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);

  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);

  const [printingTransaction, setPrintingTransaction] = useState<Transaction | null>(null);
  const [printingCustomer, setPrintingCustomer] = useState<Customer | null>(null);

  const [smsTargetCustomer, setSmsTargetCustomer] = useState<Customer | null>(null);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);

  // Initialize Auth & Settings
  useEffect(() => {
    const user = api.getCurrentUser();
    if (user) {
      // Validate session with backend
      api.getMe()
        .then((validatedUser) => {
          setCurrentUser(validatedUser);
        })
        .catch(() => {
          api.logout();
          setCurrentUser(null);
        });
    }

    // Always fetch public shop settings (safe and non-blocking)
    api.getSettings().then(setShopSettings).catch(() => {});

    const handleUnauthorized = () => {
      setCurrentUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Fetch Admin Data
  const fetchAllData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setDataLoading(true);
    try {
      const [custRes, txRes, setRes, dashRes] = await Promise.all([
        api.getCustomers(),
        api.getTransactions(),
        api.getSettings(),
        api.getDashboardStats().catch(() => null),
      ]);
      setCustomers(custRes);
      setTransactions(txRes);
      setShopSettings(setRes);
      if (dashRes?.stats) {
        setDashboardStats(dashRes.stats);
      }
    } catch (err: any) {
      console.warn('Failed to load admin application data', err?.message);
    } finally {
      setDataLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchAllData();
    }
  }, [currentUser, fetchAllData]);

  // Handlers for Opening Modals
  const handleOpenAddDue = (customer?: Customer) => {
    setDueModalCustomer(customer || null);
    setIsAddDueOpen(true);
  };

  const handleOpenAddPayment = (customer?: Customer) => {
    setPaymentModalCustomer(customer || null);
    setIsAddPaymentOpen(true);
  };

  const handleOpenLedger = (customerId: string) => {
    setViewingCustomerId(customerId);
  };

  const handleOpenSendSms = (customer: Customer) => {
    setSmsTargetCustomer(customer);
    setActiveTab('sms');
  };

  const handleOpenInvoicePrint = (tx: Transaction) => {
    setPrintingTransaction(tx);
    const cust = customers.find(c => c.id === tx.customerId) || null;
    setPrintingCustomer(cust);
  };

  const handleDueSuccess = (tx: Transaction, cust: Customer) => {
    fetchAllData();
    setPrintingTransaction(tx);
    setPrintingCustomer(cust);
  };

  const handlePaymentSuccess = (tx: Transaction, cust: Customer) => {
    fetchAllData();
    setPrintingTransaction(tx);
    setPrintingCustomer(cust);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setAuthView('admin');
  };

  // Fallback calculated stats if dashboard API call isn't available
  const computedStats: DashboardStats = useMemo(() => {
    if (dashboardStats) return dashboardStats;
    const totalDue = customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);
    const totalSales = customers.reduce((s, c) => s + (c.totalPurchases || 0), 0);
    const totalCollection = customers.reduce((s, c) => s + (c.totalPaid || 0), 0);
    const dueCount = customers.filter(c => c.currentDue > 0).length;

    return {
      totalCustomers: customers.length,
      totalDue,
      todayDue: 0,
      todayPaid: 0,
      dueNext5Days: totalDue,
      overdueAmount: 0,
      totalSales,
      totalCollection,
      dueSoonCount: dueCount,
      overdueCount: 0,
    };
  }, [dashboardStats, customers]);

  // If user is logged in as Customer
  if (currentUser?.role === 'customer') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        <CustomerPortal
          onBackToAdmin={handleLogout}
        />
      </div>
    );
  }

  // If user is NOT logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-slate-100 font-sans flex flex-col justify-between">
        {/* Header Switcher */}
        <header className="p-4 sm:p-6 flex items-center justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                {shopSettings?.shopName || 'বাকি খাতা (Due Management)'}
              </h1>
              <p className="text-xs text-slate-400">ডিজিটাল ও নিরাপদ বাকি হিসাব ও SMS রিমাইন্ডার</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsInstallGuideOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition cursor-pointer"
              title="কম্পিউটার বা ল্যাপটপে অ্যাপ হিসেবে ইন্সটল করুন"
            >
              <Laptop className="w-3.5 h-3.5 text-emerald-400" />
              <span>PC অ্যাপ ইন্সটল</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-inner">
              <button
                onClick={() => setAuthView('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  authView === 'admin'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                দোকানদার লগইন
              </button>
              <button
                onClick={() => setAuthView('customer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  authView === 'customer'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                কাস্টমার খতিয়ান
              </button>
            </div>
          </div>
        </header>

        {/* Main Authentication Panels */}
        <main className="flex-1 flex items-center justify-center p-4">
          {authView === 'admin' ? (
            <AdminLogin
              onLoginSuccess={(user: AuthUser) => setCurrentUser(user)}
              onSwitchToCustomer={() => setAuthView('customer')}
            />
          ) : (
            <CustomerPortal
              onBackToAdmin={() => setAuthView('admin')}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="p-4 text-center text-xs text-slate-400 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto w-full gap-2">
          <span>বাকি খাতা © {new Date().getFullYear()} • আধুনিক ডিজিটাল হিসাব ও ভাউচার রসিদ প্রিন্টিং</span>
          <button
            onClick={() => setIsInstallGuideOpen(true)}
            className="text-emerald-400 hover:text-emerald-300 font-medium underline flex items-center gap-1 cursor-pointer"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>কম্পিউটারে অ্যাপ ইন্সটল পদ্ধতি</span>
          </button>
        </footer>

        {isInstallGuideOpen && (
          <InstallGuideModal onClose={() => setIsInstallGuideOpen(false)} />
        )}
      </div>
    );
  }

  // If user is logged in as ADMIN
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shopSettings={shopSettings}
        currentUser={currentUser}
        dueSoonCount={computedStats.dueSoonCount}
        onOpenAddDue={() => handleOpenAddDue()}
        onOpenAddPayment={() => handleOpenAddPayment()}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main App Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            stats={computedStats}
            recentTransactions={transactions.slice(0, 10)}
            shopSettings={shopSettings}
            onOpenAddDue={() => handleOpenAddDue()}
            onOpenAddPayment={() => handleOpenAddPayment()}
            onOpenAddCustomer={() => setActiveTab('customers')}
            onNavigateToSms={() => setActiveTab('sms')}
            onNavigateToCustomers={() => setActiveTab('customers')}
            onViewInvoice={handleOpenInvoicePrint}
            onViewCustomer={handleOpenLedger}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManagement
            customers={customers}
            shopSettings={shopSettings}
            onRefresh={fetchAllData}
            onViewCustomer={handleOpenLedger}
            onAddDue={handleOpenAddDue}
            onAddPayment={handleOpenAddPayment}
            onSendSms={handleOpenSendSms}
          />
        )}

        {activeTab === 'sms' && (
          <SmsCenter
            customers={customers}
            shopSettings={shopSettings}
            onRefreshSettings={fetchAllData}
            targetCustomer={smsTargetCustomer}
          />
        )}

        {activeTab === 'reports' && (
          <Reports
            customers={customers}
            transactions={transactions}
            shopSettings={shopSettings}
            onViewCustomer={handleOpenLedger}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            settings={shopSettings}
            onRefresh={fetchAllData}
          />
        )}
      </main>

      {/* Add Due Modal */}
      <AddDueModal
        isOpen={isAddDueOpen}
        onClose={() => setIsAddDueOpen(false)}
        customers={customers}
        selectedCustomer={dueModalCustomer}
        shopSettings={shopSettings}
        onSuccess={handleDueSuccess}
      />

      {/* Add Payment Modal */}
      <AddPaymentModal
        isOpen={isAddPaymentOpen}
        onClose={() => setIsAddPaymentOpen(false)}
        customers={customers}
        selectedCustomer={paymentModalCustomer}
        shopSettings={shopSettings}
        onSuccess={handlePaymentSuccess}
      />

      {/* Customer Ledger Statement Modal */}
      <CustomerLedgerModal
        customerId={viewingCustomerId}
        onClose={() => setViewingCustomerId(null)}
        shopSettings={shopSettings}
        onAddDue={handleOpenAddDue}
        onAddPayment={handleOpenAddPayment}
        onSendSms={handleOpenSendSms}
        onViewInvoice={handleOpenInvoicePrint}
        onRefreshData={fetchAllData}
      />

      {/* Printable Invoice / Voucher Modal */}
      <InvoicePrintModal
        transaction={printingTransaction}
        customer={printingCustomer}
        shopSettings={shopSettings}
        onClose={() => setPrintingTransaction(null)}
      />

      {/* PC Install Guide Modal */}
      {isInstallGuideOpen && (
        <InstallGuideModal onClose={() => setIsInstallGuideOpen(false)} />
      )}
    </div>
  );
}
