import React, { useState } from 'react';
import { 
  Users, Search, UserPlus, Phone, MapPin, Eye, 
  Trash2, Edit2, PlusCircle, ArrowDownCircle, MessageSquare, 
  FileText, CheckCircle2, AlertCircle, Calendar, Camera, X
} from 'lucide-react';
import { api } from '../services/api.ts';
import { formatCurrency, formatDate, getWhatsAppLink } from '../utils/formatters.ts';
import type { Customer, ShopSettings } from '../types.ts';

interface CustomerManagementProps {
  customers: Customer[];
  shopSettings: ShopSettings | null;
  onRefresh: () => void;
  onViewCustomer: (id: string) => void;
  onAddDue: (customer: Customer) => void;
  onAddPayment: (customer: Customer) => void;
  onSendSms: (customer: Customer) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  shopSettings,
  onRefresh,
  onViewCustomer,
  onAddDue,
  onAddPayment,
  onSendSms,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDueOnly, setFilterDueOnly] = useState<'all' | 'due' | 'zero'>('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [address, setAddress] = useState('');
  const [openingDue, setOpeningDue] = useState('0');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState('');
  const [passcode, setPasscode] = useState('');

  const currency = shopSettings?.currency || '৳';

  // Filter customers by search (name, mobile, altMobile, ID)
  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      (c.altMobile && c.altMobile.includes(q)) ||
      c.id.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterDueOnly === 'due') return c.currentDue > 0;
    if (filterDueOnly === 'zero') return c.currentDue <= 0;
    return true;
  });

  const resetForm = () => {
    setName('');
    setMobile('');
    setAltMobile('');
    setAddress('');
    setOpeningDue('0');
    setNotes('');
    setPhoto('');
    setPasscode('');
    setFormError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setMobile(customer.mobile);
    setAltMobile(customer.altMobile || '');
    setAddress(customer.address || '');
    setOpeningDue(String(customer.openingDue || 0));
    setNotes(customer.notes || '');
    setPhoto(customer.photo || '');
    setPasscode(customer.passcode || '');
    setFormError(null);
  };

  // Photo file upload to base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFormError('ছবি সর্বোচ্চ ২ মেগাবাইট হতে হবে');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, {
          name,
          mobile,
          altMobile,
          address,
          notes,
          photo,
          passcode: passcode || mobile.slice(-4),
        });
        setEditingCustomer(null);
      } else {
        await api.createCustomer({
          name,
          mobile,
          altMobile,
          address,
          openingDue: Number(openingDue) || 0,
          notes,
          photo,
          passcode: passcode || mobile.slice(-4) || '1234',
        });
        setShowAddModal(false);
      }
      resetForm();
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'কাস্টমার সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await api.deleteCustomer(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'মুছে ফেলতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="customer-management-view" className="space-y-5 pb-16 md:pb-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">কাস্টমার খাতা ও ব্যবস্থাপনা</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            মোট কাস্টমার: <strong className="text-slate-800 font-mono">{customers.length}</strong> জন | 
            বাকি আছে: <strong className="text-rose-600 font-mono">{customers.filter(c => c.currentDue > 0).length}</strong> জন
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          id="btn-add-customer-main"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ নতুন কাস্টমার যোগ করুন</span>
        </button>
      </div>

      {/* Search Bar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="customer-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম, মোবাইল নম্বর বা কাস্টমার আইডি দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/90 shadow-xs">
          <button
            onClick={() => setFilterDueOnly('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterDueOnly === 'all'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            সবাই ({customers.length})
          </button>
          <button
            onClick={() => setFilterDueOnly('due')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterDueOnly === 'due'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            বাকি আছে ({customers.filter(c => c.currentDue > 0).length})
          </button>
          <button
            onClick={() => setFilterDueOnly('zero')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterDueOnly === 'zero'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            বাকি নেই ({customers.filter(c => c.currentDue <= 0).length})
          </button>
        </div>
      </div>

      {/* Customers List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-3">কাস্টমার বিবরণ</th>
                <th className="px-4 py-3">যোগাযোগ</th>
                <th className="px-4 py-3 text-right">বর্তমান বাকি</th>
                <th className="px-4 py-3 text-right">মোট বিক্রি</th>
                <th className="px-4 py-3 text-right">মোট পরিশোধ</th>
                <th className="px-4 py-3 text-center">নির্ধারিত অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    কোনো কাস্টমার তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/70 transition">
                    {/* Customer Info */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {customer.photo ? (
                          <img
                            src={customer.photo}
                            alt={customer.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                            {customer.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <button
                            onClick={() => onViewCustomer(customer.id)}
                            className="font-bold text-slate-800 hover:text-emerald-700 text-left text-sm hover:underline"
                          >
                            {customer.name}
                          </button>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                              {customer.id}
                            </span>
                            {customer.address && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" /> {customer.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono text-slate-800 font-semibold">{customer.mobile}</div>
                      {customer.altMobile && (
                        <div className="text-[11px] text-slate-400 font-mono">বিকল্প: {customer.altMobile}</div>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        পিন: <span className="font-mono">{customer.passcode}</span>
                      </div>
                    </td>

                    {/* Current Due */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <span className={`inline-block font-mono text-sm font-extrabold px-2.5 py-1 rounded-lg ${
                        customer.currentDue > 0
                          ? 'text-rose-700 bg-rose-50 border border-rose-200'
                          : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      }`}>
                        {formatCurrency(customer.currentDue, currency)}
                      </span>
                    </td>

                    {/* Total Purchases */}
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatCurrency(customer.totalPurchases, currency)}
                    </td>

                    {/* Total Paid */}
                    <td className="px-4 py-3.5 text-right font-mono text-emerald-600 font-medium whitespace-nowrap">
                      {formatCurrency(customer.totalPaid, currency)}
                    </td>

                    {/* Action Buttons as specified in Section 5 */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1. View */}
                        <button
                          onClick={() => onViewCustomer(customer.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition inline-flex items-center gap-1"
                          title="সম্পূর্ণ খতিয়ান ও লেনদেন ইতিহাস"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>View</span>
                        </button>

                        {/* 2. Add Due */}
                        <button
                          onClick={() => onAddDue(customer)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                          title="নতুন বাকি যোগ করুন"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>+ বাকি</span>
                        </button>

                        {/* 3. Add Payment */}
                        <button
                          onClick={() => onAddPayment(customer)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                          title="টাকা জমা নিন"
                        >
                          <ArrowDownCircle className="w-3 h-3" />
                          <span>+ জমা</span>
                        </button>

                        {/* 4. Send SMS */}
                        <button
                          onClick={() => onSendSms(customer)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium transition inline-flex items-center gap-1"
                          title="SMS রিমাইন্ডার পাঠান"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>SMS</span>
                        </button>

                        {/* 5. Edit */}
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* 6. Delete */}
                        <button
                          onClick={() => setDeleteTarget(customer)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Customer Modal */}
      {(showAddModal || editingCustomer) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-800 text-base">
                {editingCustomer ? 'কাস্টমার তথ্য পরিবর্তন করুন' : 'নতুন কাস্টমার নিবন্ধন'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCustomer(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              {/* Photo Preview & Upload */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {photo ? (
                    <img
                      src={photo}
                      alt="Customer"
                      className="w-16 h-16 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                  {photo && (
                    <button
                      type="button"
                      onClick={() => setPhoto('')}
                      className="absolute -top-1 -right-1 bg-rose-600 text-white p-0.5 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ছবি (ঐচ্ছিক)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কাস্টমারের নাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: রহিম উদ্দিন"
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    মোবাইল নম্বর <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    বিকল্প মোবাইল (Alternative Mobile)
                  </label>
                  <input
                    type="text"
                    value={altMobile}
                    onChange={(e) => setAltMobile(e.target.value)}
                    placeholder="018XXXXXXXX"
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কাস্টমার পোর্টাল পিন (Passcode)
                  </label>
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="ডিফল্ট: মোবাইলের শেষ ৪ ডিজিট"
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা (Address)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="গ্রাম / এলাকা / রোড নং"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {!editingCustomer && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    পূর্বের বাকি থাকলে (Opening Due)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-xs">{currency}</span>
                    <input
                      type="number"
                      min="0"
                      value={openingDue}
                      onChange={(e) => setOpeningDue(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নোট / মন্তব্য (Notes)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="কাস্টমার সম্পর্কে যেকোনো বিশেষ নোট"
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCustomer(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition disabled:opacity-60"
                >
                  {loading ? 'সংরক্ষণ হচ্ছে...' : editingCustomer ? 'পরিবর্তন সেভ করুন' : 'কাস্টমার যোগ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">কাস্টমার মুছে ফেলতে চান?</h3>
            <p className="text-xs text-slate-500 mb-4">
              <strong>{deleteTarget.name}</strong> ({deleteTarget.id})-এর সকল লেনদেনের তথ্য মুছে যাবে। এই কাজটি আর ফিরিয়ে আনা সম্ভব নয়।
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition disabled:opacity-60"
              >
                {loading ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
