import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, hashPassword, verifyPassword } from './server/db.ts';
import { sendSmsGateway, formatSmsTemplate } from './server/sms.ts';

dotenv.config();

const app = express();
const PORT = 3000;
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'baki_khata_secure_signing_key_2026';

app.use(express.json({ limit: '10mb' }));

// Token generation and verification helper
function createToken(payload: { role: 'admin' | 'customer'; id: string; name: string }): string {
  const data = JSON.stringify({ ...payload, ts: Date.now() });
  const base64 = Buffer.from(data).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(base64).digest('hex');
  return `${base64}.${signature}`;
}

function verifyToken(token?: string): { role: 'admin' | 'customer'; id: string; name: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [base64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(base64).digest('hex');
  if (sig !== expectedSig) return null;
  try {
    const raw = Buffer.from(base64, 'base64url').toString('utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Middlewares
function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const verified = verifyToken(token);
  if (!verified || verified.role !== 'admin') {
    return res.status(401).json({ error: 'অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে এডমিন হিসেবে লগইন করুন।' });
  }
  (req as any).user = verified;
  next();
}

function customerOrAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ error: 'অনুগ্রহ করে লগইন করুন।' });
  }
  (req as any).user = verified;
  next();
}

// --- API ROUTES ---

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Admin Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'ইউজারনেম এবং পাসওয়ার্ড দিন' });
  }

  const admin = db.getAdmin();
  const isUserMatch = admin.username.toLowerCase() === username.trim().toLowerCase() ||
                      admin.email.toLowerCase() === username.trim().toLowerCase();

  if (!isUserMatch || !verifyPassword(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'ভুল ইউজারনেম অথবা পাসওয়ার্ড!' });
  }

  const token = createToken({ role: 'admin', id: admin.id, name: admin.username });
  return res.json({
    success: true,
    token,
    user: {
      role: 'admin',
      id: admin.id,
      username: admin.username,
      email: admin.email,
    },
  });
});

// Admin Forgot Password / Security PIN Reset
app.post('/api/auth/forgot-password', (req, res) => {
  const { usernameOrEmail, securityPin, newPassword } = req.body;
  if (!usernameOrEmail || !securityPin || !newPassword) {
    return res.status(400).json({ error: 'সবগুলো তথ্য পূরণ করুন' });
  }

  const admin = db.getAdmin();
  const isMatch = admin.username.toLowerCase() === usernameOrEmail.trim().toLowerCase() ||
                  admin.email.toLowerCase() === usernameOrEmail.trim().toLowerCase();

  if (!isMatch) {
    return res.status(404).json({ error: 'এই একাউন্টটি পাওয়া যায়নি' });
  }

  if (admin.securityPin !== securityPin.trim()) {
    return res.status(400).json({ error: 'সিকিউরিটি পিন সঠিক নয়! (ডিফল্ট পিন: 240240)' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে' });
  }

  const newHash = hashPassword(newPassword);
  db.updateAdmin({ passwordHash: newHash });

  return res.json({ success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।' });
});

// Admin Change Password
app.post('/api/auth/change-password', adminAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'বর্তমান ও নতুন পাসওয়ার্ড দিন' });
  }

  const admin = db.getAdmin();
  if (!verifyPassword(currentPassword, admin.passwordHash)) {
    return res.status(400).json({ error: 'বর্তমান পাসওয়ার্ড সঠিক নয়' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে' });
  }

  const newHash = hashPassword(newPassword);
  db.updateAdmin({ passwordHash: newHash });
  return res.json({ success: true, message: 'পাসওয়ার্ড সফলভাবে আপডেট হয়েছে' });
});

// Customer Login (Self-Service)
app.post('/api/auth/customer-login', (req, res) => {
  const { identifier, passcode } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'মোবাইল নম্বর অথবা কাস্টমার আইডি লিখুন' });
  }

  const clean = identifier.trim();
  const customer = db.getCustomerById(clean) || db.getCustomerByMobile(clean);

  if (!customer) {
    return res.status(404).json({ error: 'কাস্টমার খুঁজে পাওয়া যায়নি। দোকানের সাথে যোগাযোগ করুন।' });
  }

  // If customer has a passcode set, verify it
  if (customer.passcode && passcode) {
    if (customer.passcode.trim() !== passcode.trim()) {
      return res.status(401).json({ error: 'ভুল পিন কোড! (ডিফল্ট: আপনার মোবাইল নম্বরের শেষ ৪ ডিজিট)' });
    }
  }

  const token = createToken({ role: 'customer', id: customer.id, name: customer.name });
  return res.json({
    success: true,
    token,
    user: {
      role: 'customer',
      id: customer.id,
      name: customer.name,
      mobile: customer.mobile,
    },
    customer,
  });
});

// Get Current Auth User
app.get('/api/auth/me', customerOrAdminAuth, (req, res) => {
  const user = (req as any).user;
  if (user.role === 'admin') {
    const admin = db.getAdmin();
    return res.json({
      role: 'admin',
      id: admin.id,
      name: admin.username,
      email: admin.email,
    });
  } else {
    const customer = db.getCustomerById(user.id);
    if (!customer) return res.status(404).json({ error: 'কাস্টমার পাওয়া যায়নি' });
    return res.json({
      role: 'customer',
      id: customer.id,
      name: customer.name,
      mobile: customer.mobile,
      currentDue: customer.currentDue,
    });
  }
});

// Customer View Own Due
app.get('/api/customer/my-due', customerOrAdminAuth, (req, res) => {
  const user = (req as any).user;
  const customerId = user.role === 'customer' ? user.id : (req.query.customerId as string);
  if (!customerId) return res.status(400).json({ error: 'Customer ID required' });

  const customer = db.getCustomerById(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const transactions = db.getTransactions(customerId);
  const settings = db.getSettings();

  return res.json({
    customer,
    transactions,
    shop: {
      shopName: settings.shopName,
      ownerName: settings.ownerName,
      mobile: settings.mobile,
      address: settings.address,
      currency: settings.currency,
    }
  });
});

// Dashboard Stats
app.get('/api/dashboard/stats', adminAuth, (req, res) => {
  const stats = db.getDashboardStats();
  const recentTransactions = db.getTransactions().slice(0, 10);
  res.json({ stats, recentTransactions });
});

// Customers CRUD
app.get('/api/customers', adminAuth, (req, res) => {
  const q = ((req.query.q as string) || '').toLowerCase().trim();
  let customers = db.getCustomers();

  if (q) {
    customers = customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      (c.altMobile && c.altMobile.includes(q)) ||
      c.id.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  }

  res.json({ customers });
});

app.post('/api/customers', adminAuth, (req, res) => {
  try {
    const { name, mobile, altMobile, address, photo, openingDue, notes, passcode } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ error: 'নাম এবং মোবাইল নম্বর আবশ্যক' });
    }

    const created = db.addCustomer({
      name: name.trim(),
      mobile: mobile.trim(),
      altMobile: altMobile ? altMobile.trim() : '',
      address: address ? address.trim() : '',
      photo: photo || '',
      openingDue: Number(openingDue) || 0,
      notes: notes || '',
      passcode: passcode || mobile.slice(-4) || '1234',
    });

    res.status(201).json({ success: true, customer: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const updated = db.updateCustomer(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'কাস্টমার খুঁজে পাওয়া যায়নি' });
  }
  res.json({ success: true, customer: updated });
});

app.delete('/api/customers/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteCustomer(id);
  if (!deleted) {
    return res.status(404).json({ error: 'কাস্টমার মুছে ফেলা সম্ভব হয়নি' });
  }
  res.json({ success: true, message: 'কাস্টমার সফলভাবে মুছে ফেলা হয়েছে' });
});

// Customer Ledger (Full Transaction History)
app.get('/api/customers/:id/ledger', adminAuth, (req, res) => {
  const { id } = req.params;
  const customer = db.getCustomerById(id);
  if (!customer) {
    return res.status(404).json({ error: 'কাস্টমার খুঁজে পাওয়া যায়নি' });
  }
  const transactions = db.getTransactions(id);
  const smsLogs = db.getSmsLogs(id);
  res.json({ customer, transactions, smsLogs });
});

// Add Due Transaction (with Multi-Product Line Items & Auto 5-day due date)
app.post('/api/transactions/due', adminAuth, (req, res) => {
  try {
    const { customerId, items, paidAmount, paymentMethod, date, dueDate, note, sendSmsImmediately } = req.body;
    if (!customerId) return res.status(400).json({ error: 'কাস্টমার নির্বাচন করুন' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'কমপক্ষে একটি পণ্য যোগ করুন' });
    }

    const result = db.addDueTransaction({
      customerId,
      items,
      paidAmount: Number(paidAmount) || 0,
      paymentMethod,
      date,
      dueDate,
      note,
    });

    // Option to send SMS reminder right away
    if (sendSmsImmediately && result.customer.mobile) {
      sendSmsGateway({
        customerId: result.customer.id,
        customerName: result.customer.name,
        mobile: result.customer.mobile,
        amount: result.customer.currentDue,
        dueDate: result.transaction.dueDate || '',
      }).catch(err => console.error('Background SMS error:', err));
    }

    res.status(201).json({
      success: true,
      transaction: result.transaction,
      customer: result.customer,
      message: 'বাকি ভাউচার সফলভাবে সংরক্ষণ হয়েছে',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Payment (Reduce Due)
app.post('/api/transactions/payment', adminAuth, (req, res) => {
  try {
    const { customerId, amount, paymentMethod, date, note, sendSmsConfirmation } = req.body;
    if (!customerId) return res.status(400).json({ error: 'কাস্টমার নির্বাচন করুন' });
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'সঠিক জমার পরিমাণ লিখুন' });
    }

    const result = db.addPaymentTransaction({
      customerId,
      amount: Number(amount),
      paymentMethod,
      date,
      note,
    });

    if (sendSmsConfirmation && result.customer.mobile) {
      const settings = db.getSettings();
      const customMsg = `প্রিয় ${result.customer.name}, আপনার ${amount} টাকা জমা হয়েছে। বর্তমান বাকি রয়েছে ${result.customer.currentDue} টাকা। ধন্যবাদ, ${settings.shopName}।`;
      sendSmsGateway({
        customerId: result.customer.id,
        customerName: result.customer.name,
        mobile: result.customer.mobile,
        amount: result.customer.currentDue,
        dueDate: new Date().toISOString().split('T')[0],
        customMessage: customMsg,
      }).catch(err => console.error('Payment SMS error:', err));
    }

    res.status(201).json({
      success: true,
      transaction: result.transaction,
      customer: result.customer,
      message: 'টাকা জমা সফলভাবে রেকর্ড হয়েছে',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Transactions
app.get('/api/transactions', adminAuth, (req, res) => {
  const customerId = req.query.customerId as string;
  const transactions = db.getTransactions(customerId);
  res.json({ transactions });
});

// Delete Transaction
app.delete('/api/transactions/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteTransaction(id);
  if (!deleted) {
    return res.status(404).json({ error: 'লেনদেন খুঁজে পাওয়া যায়নি' });
  }
  res.json({ success: true, message: 'লেনদেন সফলভাবে বাতিল করা হয়েছে' });
});

// SMS Dispatch
app.post('/api/sms/send', adminAuth, async (req, res) => {
  try {
    const { customerId, customMessage, dueDate: reqDueDate } = req.body;
    if (!customerId) return res.status(400).json({ error: 'Customer ID is required' });

    const customer = db.getCustomerById(customerId);
    if (!customer) return res.status(404).json({ error: 'কাস্টমার পাওয়া যায়নি' });

    if (!customer.mobile) {
      return res.status(400).json({ error: 'কাস্টমারের মোবাইল নম্বর নেই' });
    }

    const settings = db.getSettings();
    const defaultDays = settings.defaultDueDays || 5;

    // Use explicitly requested dueDate, or latest due date from transactions, or default to today + defaultDays
    const recentDueTx = db.getTransactions(customer.id).find(t => t.type === 'due' && t.dueDate);
    const dueDate = reqDueDate || recentDueTx?.dueDate || new Date(Date.now() + defaultDays * 86400000).toISOString().split('T')[0];

    const result = await sendSmsGateway({
      customerId: customer.id,
      customerName: customer.name,
      mobile: customer.mobile,
      amount: customer.currentDue,
      dueDate,
      customMessage,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SMS Test Dispatch
app.post('/api/sms/test', adminAuth, async (req, res) => {
  try {
    const { testMobile, customMessage } = req.body;
    if (!testMobile) return res.status(400).json({ error: 'টেস্ট মোবাইল নম্বর লিখুন' });

    const settings = db.getSettings();
    const result = await sendSmsGateway({
      customerId: 'TEST',
      customerName: 'সম্মানিত গ্রাহক (টেস্ট)',
      mobile: testMobile,
      amount: 500,
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      customMessage: customMessage || `[টেস্ট SMS] এটি ${settings.shopName} বাকি খাতা অ্যাপের পরীক্ষামূলক বার্তা। গেটওয়ে সফলভাবে কাজ করছে।`,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SMS Logs
app.get('/api/sms/logs', adminAuth, (req, res) => {
  const logs = db.getSmsLogs();
  res.json({ logs });
});

// Settings Get & Update
app.get('/api/settings', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const verified = verifyToken(token);
  const settings = db.getSettings();

  if (verified && verified.role === 'admin') {
    return res.json({ settings });
  }

  // Safe public shop settings for customer portal & login screens (mask sensitive api key)
  const publicSettings = {
    ...settings,
    smsConfig: {
      ...settings.smsConfig,
      apiKey: settings.smsConfig?.apiKey ? '********' : '',
    },
  };
  return res.json({ settings: publicSettings });
});

app.put('/api/settings', adminAuth, (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

// Full Data Backup & Export API
app.get('/api/backup/export', adminAuth, (req, res) => {
  try {
    const backupData = db.getFullBackupData();
    const dateStr = new Date().toISOString().split('T')[0];
    const asciiFilename = `bakikhata_backup_${dateStr}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"`);
    res.json(backupData);
  } catch (err: any) {
    res.status(500).json({ error: 'ব্যাকআপ প্রস্তুত করতে সমস্যা হয়েছে: ' + err.message });
  }
});

// Restore Backup Data API
app.post('/api/backup/restore', adminAuth, (req, res) => {
  try {
    const result = db.restoreBackupData(req.body);
    res.json({
      success: true,
      message: `ব্যাকআপ সফলভাবে রিস্টোর হয়েছে! মোট ${result.totalCustomers} জন কাস্টমার এবং ${result.totalTransactions} টি লেনদেন লোড হয়েছে।`,
      result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'ব্যাকআপ রিস্টোর ব্যর্থ হয়েছে।' });
  }
});

// Standalone Print Route for Direct Tab / Full-page Printing
app.get('/print/:id', (req, res) => {
  const { id } = req.params;
  const transaction = db.getTransactions().find(t => t.id === id);
  if (!transaction) {
    return res.status(404).send('<div style="font-family: sans-serif; padding: 40px; text-align: center;"><h2>ভাউচার পাওয়া যায়নি (Voucher Not Found)</h2><a href="/" style="color: blue;">অ্যাপে ফিরে যান</a></div>');
  }

  const customer = db.getCustomerById(transaction.customerId);
  const settings = db.getSettings();
  const isDue = transaction.type === 'due';
  const isPayment = transaction.type === 'payment';
  const currency = settings.currency || '৳';
  const currentTotalDue = customer ? customer.currentDue : transaction.remainingDue;
  const previousDueBeforeThis = isPayment
    ? transaction.remainingDue + transaction.paidAmount
    : Math.max(0, currentTotalDue - transaction.remainingDue);

  const phoneDisplay = settings.mobile || '01860448008, 01712447027';

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isDue ? 'বাকি মেমো' : 'টাকা জমার রসিদ'} - ${transaction.id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      font-family: 'Hind Siliguri', system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 0;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .print-box {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      @page {
        margin: 8mm;
        size: auto;
      }
    }
  </style>
</head>
<body class="min-h-screen flex flex-col items-center py-6 px-3">
  <!-- Top Floating Controls for User -->
  <div class="no-print w-full max-w-xl mb-4 flex items-center justify-between bg-white p-3 rounded-xl shadow-md border border-slate-200">
    <div class="flex items-center gap-2">
      <span class="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
      <span class="text-xs font-bold text-slate-700">প্রিন্ট প্রিভিউ প্রস্তুত</span>
    </div>
    <div class="flex items-center gap-2">
      <button onclick="window.print()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        প্রিন্ট করুন (Print)
      </button>
      <button onclick="window.close()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer">
        বন্ধ করুন
      </button>
    </div>
  </div>

  <!-- Printable Voucher Paper -->
  <div class="print-box bg-white border border-slate-300 rounded-2xl p-6 max-w-xl w-full shadow-lg space-y-4">
    <!-- Header -->
    <div class="text-center pb-3 border-b-2 border-slate-800 space-y-1">
      <div class="inline-block px-3 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold mb-1">
        কম্পিউটারাইজড রসিদ
      </div>
      <h1 class="text-2xl font-black text-slate-900 tracking-tight leading-tight">
        ${settings.shopName || 'অনলাইন সেবা কেন্দ্র'}
      </h1>
      <p class="text-sm font-bold text-slate-700">
        ${settings.address || 'সড়াবাড়ীয়া বাজার'}
      </p>
      <div class="text-xs font-semibold text-slate-600">
        <span>মোবাইল: <strong class="font-mono text-slate-900">${phoneDisplay}</strong></span>
        ${settings.ownerName ? ` | <span>স্বত্বাধিকারী: <strong class="text-slate-900">${settings.ownerName}</strong></span>` : ''}
      </div>
      <p class="text-[11px] text-slate-500 font-medium">
        ফটোকপি, কম্পিউটার প্রিন্ট ও সকল প্রকার অনলাইন কাজের বিশ্বস্ত সেবা
      </p>

      <div class="pt-2">
        <span class="inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
          isDue ? 'bg-rose-50 text-rose-800 border-rose-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
        }">
          ${isDue ? 'বাকি মেমো / চালান (DUE MEMO)' : 'টাকা জমার রসিদ (MONEY RECEIPT)'}
        </span>
      </div>
    </div>

    <!-- Metadata Info -->
    <div class="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
      <div>
        <span class="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">ভাউচার নম্বর:</span>
        <span class="font-mono font-black text-slate-900 text-sm">${transaction.id}</span>
      </div>
      <div class="text-right">
        <span class="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">তারিখ:</span>
        <span class="font-semibold text-slate-900">${transaction.date}</span>
      </div>
      <div>
        <span class="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">কাস্টমারের নাম:</span>
        <span class="font-bold text-slate-900 text-sm">${transaction.customerName}</span>
      </div>
      <div class="text-right">
        <span class="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">মোবাইল নম্বর:</span>
        <span class="font-mono font-bold text-slate-900">${transaction.customerMobile || '-'}</span>
      </div>
      ${customer?.address ? `<div class="col-span-2 text-[11px] text-slate-600"><span class="text-slate-500 font-medium">ঠিকানা:</span> ${customer.address}</div>` : ''}
      ${isDue && transaction.dueDate && transaction.remainingDue > 0 ? `
        <div class="col-span-2 py-1 px-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-semibold flex justify-between">
          <span>পরিশোধের নির্ধারিত শেষ তারিখ:</span>
          <strong class="font-mono">${transaction.dueDate}</strong>
        </div>
      ` : ''}
    </div>

    <!-- Table Details -->
    ${isDue ? `
      <div class="border border-slate-300 rounded-xl overflow-hidden">
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
            <tr>
              <th class="p-2 w-10 text-center border-r border-slate-300">ক্র.নং</th>
              <th class="p-2 border-r border-slate-300">পণ্যের নাম / সেবার বিবরণ</th>
              <th class="p-2 text-center w-20 border-r border-slate-300">পরিমাণ</th>
              <th class="p-2 text-right w-20 border-r border-slate-300">একক দর</th>
              <th class="p-2 text-right w-24">মোট টাকা</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${transaction.items && transaction.items.length > 0 ? transaction.items.map((it, idx) => `
              <tr>
                <td class="p-2 text-center font-mono border-r border-slate-200 text-slate-500">${idx + 1}</td>
                <td class="p-2 font-semibold text-slate-900 border-r border-slate-200">${it.productName}</td>
                <td class="p-2 text-center font-medium text-slate-700 border-r border-slate-200">${it.quantity} ${it.unit || 'পিস'}</td>
                <td class="p-2 text-right font-mono text-slate-700 border-r border-slate-200">${currency} ${Number(it.unitPrice).toLocaleString()}</td>
                <td class="p-2 text-right font-mono font-bold text-slate-900">${currency} ${Number(it.total).toLocaleString()}</td>
              </tr>
            `).join('') : `
              <tr>
                <td class="p-2 text-center font-mono border-r border-slate-200 text-slate-500">১</td>
                <td class="p-2 font-semibold text-slate-900 border-r border-slate-200">ফটোকপি ও অনলাইন সেবা বিল</td>
                <td class="p-2 text-center font-medium text-slate-700 border-r border-slate-200">১ টি</td>
                <td class="p-2 text-right font-mono text-slate-700 border-r border-slate-200">${currency} ${Number(transaction.subtotal).toLocaleString()}</td>
                <td class="p-2 text-right font-mono font-bold text-slate-900">${currency} ${Number(transaction.subtotal).toLocaleString()}</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    ` : `
      <div class="border border-slate-300 rounded-xl overflow-hidden">
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
            <tr>
              <th class="p-2 w-10 text-center border-r border-slate-300">ক্র.নং</th>
              <th class="p-2 border-r border-slate-300">জমার বিবরণ / খাত</th>
              <th class="p-2 text-center w-28 border-r border-slate-300">পরিশোধের মাধ্যম</th>
              <th class="p-2 text-right w-28">জমার পরিমাণ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr>
              <td class="p-2 text-center font-mono border-r border-slate-200 text-slate-500">১</td>
              <td class="p-2 font-bold text-slate-900 border-r border-slate-200">
                বকেয়া বাকি পরিশোধ
                ${transaction.note ? `<span class="block text-[11px] font-normal text-slate-600">নোট: ${transaction.note}</span>` : ''}
              </td>
              <td class="p-2 text-center font-semibold text-slate-700 border-r border-slate-200">${transaction.paymentMethod || 'নগদ ক্যাশ'}</td>
              <td class="p-2 text-right font-mono font-black text-emerald-700 text-sm">${currency} ${Number(transaction.paidAmount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `}

    <!-- Calculation Section -->
    <div class="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2 text-xs">
      ${isDue ? `
        <div class="flex justify-between text-slate-700">
          <span>মোট পণ্যের মূল্য (Subtotal):</span>
          <span class="font-mono font-bold text-slate-900">${currency} ${Number(transaction.subtotal).toLocaleString()}</span>
        </div>
        ${transaction.paidAmount > 0 ? `
          <div class="flex justify-between text-emerald-700 font-semibold">
            <span>পরিশোধ করেছেন (Paid):</span>
            <span class="font-mono font-bold">(-) ${currency} ${Number(transaction.paidAmount).toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="flex justify-between text-rose-700 font-bold pt-1 border-t border-slate-200">
          <span>বর্তমান ভাউচারের বাকি:</span>
          <span class="font-mono">${currency} ${Number(transaction.remainingDue).toLocaleString()}</span>
        </div>
        <div class="flex justify-between text-slate-900 font-black pt-1.5 border-t border-dashed border-slate-300 text-sm">
          <span>কাস্টমারের সর্বমোট বাকি:</span>
          <span class="font-mono text-rose-600 text-base">${currency} ${Number(currentTotalDue).toLocaleString()}</span>
        </div>
      ` : `
        <div class="flex justify-between text-emerald-800 font-bold">
          <span>জমা গ্রহণ করা হয়েছে (Paid Amount):</span>
          <span class="font-mono text-base font-black">${currency} ${Number(transaction.paidAmount).toLocaleString()}</span>
        </div>
        <div class="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
          <span>পূর্বের বকেয়া বাকি ছিল:</span>
          <span class="font-mono font-semibold">${currency} ${Number(previousDueBeforeThis).toLocaleString()}</span>
        </div>
        <div class="flex justify-between text-rose-700 font-bold pt-1 border-t border-slate-200">
          <span>বর্তমান ভাউচারের বাকি:</span>
          <span class="font-mono">${currency} ${Number(transaction.remainingDue).toLocaleString()}</span>
        </div>
        <div class="flex justify-between text-slate-900 font-black pt-1.5 border-t border-dashed border-slate-300 text-sm">
          <span>কাস্টমারের সর্বমোট বাকি:</span>
          <span class="font-mono text-rose-600 text-base">${currency} ${Number(customer ? customer.currentDue : transaction.remainingDue).toLocaleString()}</span>
        </div>
      `}
    </div>

    <!-- Signatures -->
    <div class="pt-6 space-y-4">
      <div class="flex justify-between items-end px-3 text-slate-700 text-xs">
        <div class="flex flex-col items-center">
          <div class="border-t-2 border-slate-400 w-32 text-center pt-1.5 font-bold text-slate-800">
            কাস্টমার স্বাক্ষর
          </div>
          <span class="text-[10px] text-slate-400">Customer Signature</span>
        </div>
        <div class="flex flex-col items-center">
          <div class="border-t-2 border-slate-900 w-36 text-center pt-1.5 font-extrabold text-slate-900">
            দোকানদার স্বাক্ষর
          </div>
          <span class="text-[10px] text-slate-500 font-medium">অনলাইন সেবা কেন্দ্র</span>
        </div>
      </div>

      <div class="text-center text-[10px] text-slate-500 border-t border-dashed border-slate-300 pt-2">
        <p class="font-semibold text-slate-700">"ধন্যবাদ, আপনার সহযোগিতার জন্য। নিয়মিত বাকি পরিশোধ করে সঠিক হিসাব বজায় রাখুন।"</p>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      // Small timeout for fonts and CSS to fully render
      setTimeout(function() {
        window.focus();
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// --- SERVER SETUP & VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
