import React, { useState } from 'react';
import { Lock, Mail, User, ShieldCheck, Eye, EyeOff, Store, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { api, authStorage } from '../services/api.ts';
import type { AuthUser } from '../types.ts';

interface AdminLoginProps {
  onLoginSuccess: (user: AuthUser) => void;
  onSwitchToCustomer: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onSwitchToCustomer }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUser, setForgotUser] = useState('admin');
  const [securityPin, setSecurityPin] = useState('240240');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.adminLogin(username, password);
      authStorage.setToken(res.token);
      authStorage.setUser(res.user);
      onLoginSuccess({
        role: 'admin',
        id: res.user.id,
        name: res.user.username,
        email: res.user.email,
        token: res.token,
      });
    } catch (err: any) {
      setError(err.message || 'লগইন ব্যর্থ হয়েছে। ইউজারনেম ও পাসওয়ার্ড চেক করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    setForgotLoading(true);

    try {
      const res = await api.forgotPassword(forgotUser, securityPin, newPassword);
      setForgotMsg({ type: 'success', text: res.message });
      setPassword(newPassword);
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotMsg(null);
      }, 1500);
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: err.message });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div id="admin-login-screen" className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="w-full text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 mb-2">
          <Store className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">বাকি খাতা (Due Management)</h1>
        <p className="text-xs text-slate-400 mt-0.5">দোকানের নিরাপদ বাকি হিসাব ও অটো SMS রিমাইন্ডার</p>
      </div>

      {/* Main Login Card */}
      <div className="w-full bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">এডমিন লগইন</h2>
            <p className="text-xs text-slate-500">শুধুমাত্র দোকানের মালিকের জন্য</p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> সুরক্ষিত
          </span>
        </div>

        {error && (
          <div id="login-error-alert" className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ইউজারনেম অথবা ইমেইল
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-username-input"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin অথবা onlainshop240@gmail.com"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">পাসওয়ার্ড</label>
              <button
                type="button"
                id="btn-forgot-password"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="btn-admin-submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm shadow-md shadow-emerald-600/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>লগইন করুন</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credential Helper */}
        <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">ডিফল্ট এডমিন তথ্য:</span>
            <button
              type="button"
              onClick={() => {
                setUsername('admin');
                setPassword('admin123');
              }}
              className="text-emerald-700 hover:text-emerald-800 font-medium underline"
            >
              স্বয়ংক্রিয় পূরণ
            </button>
          </div>
          <div className="mt-1 flex items-center justify-between text-slate-500 font-mono text-[11px]">
            <span>User: admin</span>
            <span>Pass: admin123</span>
          </div>
        </div>

        {/* Switch to Customer Portal */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 mb-2">আপনি কি কাস্টমার হিসেবে নিজের বাকি দেখতে চান?</p>
          <button
            type="button"
            id="btn-switch-to-customer"
            onClick={onSwitchToCustomer}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl transition"
          >
            <span>কাস্টমার পোর্টাল দেখুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 mb-4 text-emerald-700">
              <KeyRound className="w-5 h-5" />
              <h3 className="font-bold text-slate-800 text-base">পাসওয়ার্ড রিসেট</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              দোকানের সিকিউরিটি পিন (ডিফল্ট: <span className="font-mono font-semibold">240240</span>) দিয়ে তাৎক্ষণিক নতুন পাসওয়ার্ড সেট করুন।
            </p>

            {forgotMsg && (
              <div className={`p-2.5 rounded-lg text-xs mb-3 ${forgotMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                {forgotMsg.text}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ইউজারনেম / ইমেইল</label>
                <input
                  type="text"
                  required
                  value={forgotUser}
                  onChange={(e) => setForgotUser(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">৬-ডিজিট সিকিউরিটি পিন</label>
                <input
                  type="text"
                  required
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value)}
                  placeholder="240240"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নতুন পাসওয়ার্ড</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৪ অক্ষর"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-60"
                >
                  {forgotLoading ? 'সেভ হচ্ছে...' : 'রিসেট করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
