import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Customer, Transaction, SmsLog, ShopSettings, DashboardStats } from '../src/types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bakikhata.json');

// Password hashing helpers using native crypto scrypt
export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): string {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export interface AdminAccount {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  securityPin: string; // 6-digit recovery PIN for Forgot Password
  createdAt: string;
}

export interface DatabaseSchema {
  admin: AdminAccount;
  settings: ShopSettings;
  customers: Customer[];
  transactions: Transaction[];
  smsLogs: SmsLog[];
}

function getInitialData(): DatabaseSchema {
  const adminPasswordHash = hashPassword('admin123');

  const today = new Date().toISOString().split('T')[0];
  const datePlus5 = (baseDateStr: string, days = 5): string => {
    const d = new Date(baseDateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const initialCustomers: Customer[] = [
    {
      id: 'CUST-1001',
      name: 'মোঃ রহিম উদ্দিন',
      mobile: '01711223344',
      altMobile: '01811223344',
      address: 'ধানমন্ডি, ঢাকা',
      openingDue: 0,
      currentDue: 750,
      totalPurchases: 1800,
      totalPaid: 1050,
      passcode: '3344',
      notes: 'নিয়মিত ভালো কাস্টমার',
      createdAt: '2026-09-15',
      updatedAt: '2026-09-22',
    },
    {
      id: 'CUST-1002',
      name: 'করিম সাহেব',
      mobile: '01899887766',
      altMobile: '',
      address: 'মিরপুর-১০, ঢাকা',
      openingDue: 500,
      currentDue: 1260,
      totalPurchases: 2500,
      totalPaid: 1240,
      passcode: '7766',
      notes: 'মাসের ১ তারিখে পরিশোধ করে',
      createdAt: '2026-09-10',
      updatedAt: '2026-09-20',
    },
    {
      id: 'CUST-1003',
      name: 'আব্দুল কাদের',
      mobile: '01912345678',
      altMobile: '01612345678',
      address: 'চকবাজার, ঢাকা',
      openingDue: 0,
      currentDue: 660,
      totalPurchases: 1520,
      totalPaid: 860,
      passcode: '5678',
      notes: 'দোকানের কাছের কাস্টমার',
      createdAt: '2026-09-18',
      updatedAt: '2026-09-22',
    },
    {
      id: 'CUST-1004',
      name: 'সালমা বেগম',
      mobile: '01755443322',
      altMobile: '',
      address: 'উত্তরা সেক্টর ৭, ঢাকা',
      openingDue: 0,
      currentDue: 0,
      totalPurchases: 3200,
      totalPaid: 3200,
      passcode: '3322',
      notes: 'বাকি সব পরিশোধিত',
      createdAt: '2026-09-01',
      updatedAt: '2026-09-21',
    }
  ];

  const initialTransactions: Transaction[] = [
    {
      id: 'INV-1001',
      customerId: 'CUST-1001',
      customerName: 'মোঃ রহিম উদ্দিন',
      customerMobile: '01711223344',
      type: 'due',
      date: '2026-09-22',
      dueDate: datePlus5('2026-09-22', 5), // 2026-09-27
      items: [
        { id: '1', productName: 'চাল (মিনিকেট)', quantity: 5, unit: 'কেজি', unitPrice: 70, total: 350 },
        { id: '2', productName: 'মসুর ডাল', quantity: 2, unit: 'কেজি', unitPrice: 120, total: 240 },
        { id: '3', productName: 'সয়াবিন তেল', quantity: 2, unit: 'লিটার', unitPrice: 180, total: 360 }
      ],
      subtotal: 950,
      paidAmount: 200,
      remainingDue: 750,
      paymentMethod: 'Cash',
      note: 'রাহিম ভাইয়ের বিকালের সদাই',
      createdAt: '2026-09-22T10:30:00.000Z'
    },
    {
      id: 'INV-1002',
      customerId: 'CUST-1003',
      customerName: 'আব্দুল কাদের',
      customerMobile: '01912345678',
      type: 'due',
      date: '2026-09-22',
      dueDate: datePlus5('2026-09-22', 5),
      items: [
        { id: '1', productName: 'চিনি', quantity: 3, unit: 'কেজি', unitPrice: 140, total: 420 },
        { id: '2', productName: 'লাক্স সাবান', quantity: 3, unit: 'পিস', unitPrice: 50, total: 150 },
        { id: '3', productName: 'আটা', quantity: 5, unit: 'কেজি', unitPrice: 58, total: 290 }
      ],
      subtotal: 860,
      paidAmount: 200,
      remainingDue: 660,
      paymentMethod: 'Cash',
      note: 'কাদের ভাইয়ের মুদি সদাই',
      createdAt: '2026-09-22T11:15:00.000Z'
    },
    {
      id: 'PAY-1001',
      customerId: 'CUST-1002',
      customerName: 'করিম সাহেব',
      customerMobile: '01899887766',
      type: 'payment',
      date: '2026-09-21',
      subtotal: 500,
      paidAmount: 500,
      remainingDue: 1260,
      paymentMethod: 'bKash',
      note: 'বিকাশে ৫০০ টাকা জমা',
      createdAt: '2026-09-21T16:00:00.000Z'
    }
  ];

  return {
    admin: {
      id: 'admin_1',
      username: 'admin',
      email: 'onlainshop240@gmail.com',
      passwordHash: adminPasswordHash,
      securityPin: '240240',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    settings: {
      shopName: 'অনলাইন সেবা কেন্দ্র',
      ownerName: 'মোঃ নুর আলম',
      mobile: '01712447027',
      address: 'সড়াবাড়ীয়া বাজার',
      currency: '৳',
      defaultDueDays: 5,
      smsConfig: {
        enabled: false,
        provider: 'generic',
        apiUrl: 'https://api.sms-gateway.com/api/v1/send',
        apiKey: '',
        senderId: 'ONLINE SEBA',
        httpMethod: 'POST',
        customHeaders: '{\n  "Content-Type": "application/json"\n}',
        bodyPayload: '{\n  "to": "{mobile}",\n  "message": "{message}",\n  "sender": "{senderId}"\n}',
        defaultTemplate: 'প্রিয় [Customer Name], আপনার [Shop Name]-এর কাছে [Due Amount] টাকা বাকি রয়েছে। নির্ধারিত তারিখ [Due Date]-এর মধ্যে পরিশোধ করার অনুরোধ করা হলো। প্রয়োজনে: [Contact Number]। ধন্যবাদ।',
      },
    },
    customers: initialCustomers,
    transactions: initialTransactions,
    smsLogs: [
      {
        id: 'SMS-1',
        customerId: 'CUST-1001',
        customerName: 'মোঃ রহিম উদ্দিন',
        mobile: '01711223344',
        amount: 750,
        dueDate: '2026-09-27',
        message: 'প্রিয় মোঃ রহিম উদ্দিন, আপনার মেসার্স ভাই ভাই জেনারেল স্টোর-এর কাছে 750 টাকা বাকি রয়েছে। অনুগ্রহ করে নির্ধারিত সময়ে বাকি পরিশোধ করুন। ধন্যবাদ।',
        status: 'sent',
        response: 'OK: Message Queued',
        sentAt: '2026-09-22T10:35:00.000Z',
        gatewayUsed: 'System SMS Gateway'
      }
    ]
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDir();
    this.data = this.read();
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private read(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading db.json, initializing fresh data', e);
    }
    const fresh = getInitialData();
    this.saveDirect(fresh);
    return fresh;
  }

  private saveDirect(dataToSave: DatabaseSchema) {
    try {
      this.ensureDir();
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (e) {
      console.error('Failed to write db.json', e);
    }
  }

  public save() {
    this.saveDirect(this.data);
  }

  // Admin and Auth
  public getAdmin(): AdminAccount {
    return this.data.admin;
  }

  public updateAdmin(updates: Partial<AdminAccount>) {
    this.data.admin = { ...this.data.admin, ...updates };
    this.save();
    return this.data.admin;
  }

  // Settings
  public getSettings(): ShopSettings {
    return this.data.settings;
  }

  public updateSettings(settings: Partial<ShopSettings>) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.data.settings;
  }

  // Customers
  public getCustomers(): Customer[] {
    return this.data.customers;
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find(c => c.id === id);
  }

  public getCustomerByMobile(mobile: string): Customer | undefined {
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    return this.data.customers.find(c => {
      const cMobile = c.mobile.replace(/[^0-9]/g, '');
      return cMobile.endsWith(cleanMobile) || cleanMobile.endsWith(cMobile);
    });
  }

  public addCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'currentDue' | 'totalPurchases' | 'totalPaid'> & { currentDue?: number }): Customer {
    const nextNum = 1000 + this.data.customers.length + 1;
    const id = `CUST-${nextNum}`;
    const now = new Date().toISOString();
    const openingDue = Number(customerData.openingDue) || 0;

    const newCustomer: Customer = {
      ...customerData,
      id,
      openingDue,
      currentDue: customerData.currentDue !== undefined ? customerData.currentDue : openingDue,
      totalPurchases: openingDue,
      totalPaid: 0,
      passcode: customerData.passcode || customerData.mobile.slice(-4) || '1234',
      createdAt: now.split('T')[0],
      updatedAt: now,
    };

    this.data.customers.unshift(newCustomer);
    this.save();
    return newCustomer;
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const index = this.data.customers.findIndex(c => c.id === id);
    if (index === -1) return null;

    const updated = {
      ...this.data.customers[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.customers[index] = updated;
    this.save();
    return updated;
  }

  public deleteCustomer(id: string): boolean {
    const initialLen = this.data.customers.length;
    this.data.customers = this.data.customers.filter(c => c.id !== id);
    // Also remove associated transactions and sms logs
    this.data.transactions = this.data.transactions.filter(t => t.customerId !== id);
    this.data.smsLogs = this.data.smsLogs.filter(s => s.customerId !== id);
    this.save();
    return this.data.customers.length < initialLen;
  }

  // Transactions
  public getTransactions(customerId?: string): Transaction[] {
    if (customerId) {
      return this.data.transactions
        .filter(t => t.customerId === customerId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [...this.data.transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getTransactionById(id: string): Transaction | undefined {
    return this.data.transactions.find(t => t.id === id);
  }

  public addDueTransaction(data: {
    customerId: string;
    items: Array<{ productName: string; quantity: number; unit: string; unitPrice: number }>;
    paidAmount?: number;
    paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Other';
    date?: string;
    dueDate?: string;
    note?: string;
  }): { transaction: Transaction; customer: Customer } {
    const customer = this.getCustomerById(data.customerId);
    if (!customer) throw new Error('Customer not found');

    const calculatedItems = data.items.map((item, idx) => ({
      id: `${Date.now()}_${idx}`,
      productName: item.productName,
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'পিস',
      unitPrice: Number(item.unitPrice) || 0,
      total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
    }));

    const subtotal = calculatedItems.reduce((acc, curr) => acc + curr.total, 0);
    const paidAmount = Number(data.paidAmount) || 0;
    const remainingDue = Math.max(0, subtotal - paidAmount);

    const txDate = data.date || new Date().toISOString().split('T')[0];
    
    // 5-day default rule: Due Date = Created Date + 5 days
    let dueDate = data.dueDate;
    if (!dueDate) {
      const d = new Date(txDate);
      const defaultDays = this.data.settings.defaultDueDays || 5;
      d.setDate(d.getDate() + defaultDays);
      dueDate = d.toISOString().split('T')[0];
    }

    const txId = `INV-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const newTx: Transaction = {
      id: txId,
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      type: 'due',
      date: txDate,
      dueDate,
      items: calculatedItems,
      subtotal,
      paidAmount,
      remainingDue,
      paymentMethod: data.paymentMethod || 'Cash',
      note: data.note || '',
      createdAt: now,
    };

    this.data.transactions.unshift(newTx);

    // Update Customer balances
    customer.currentDue = Math.max(0, (customer.currentDue || 0) + remainingDue);
    customer.totalPurchases = (customer.totalPurchases || 0) + subtotal;
    customer.totalPaid = (customer.totalPaid || 0) + paidAmount;
    customer.updatedAt = now;

    this.save();
    return { transaction: newTx, customer };
  }

  public addPaymentTransaction(data: {
    customerId: string;
    amount: number;
    paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Other';
    date?: string;
    note?: string;
  }): { transaction: Transaction; customer: Customer } {
    const customer = this.getCustomerById(data.customerId);
    if (!customer) throw new Error('Customer not found');

    const amount = Number(data.amount) || 0;
    if (amount <= 0) throw new Error('Payment amount must be greater than 0');

    const txDate = data.date || new Date().toISOString().split('T')[0];
    const txId = `PAY-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const previousDue = customer.currentDue || 0;
    const newRemainingDue = Math.max(0, previousDue - amount);

    const newTx: Transaction = {
      id: txId,
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      type: 'payment',
      date: txDate,
      subtotal: amount,
      paidAmount: amount,
      remainingDue: newRemainingDue,
      paymentMethod: data.paymentMethod || 'Cash',
      note: data.note || '',
      createdAt: now,
    };

    this.data.transactions.unshift(newTx);

    customer.currentDue = newRemainingDue;
    customer.totalPaid = (customer.totalPaid || 0) + amount;
    customer.updatedAt = now;

    this.save();
    return { transaction: newTx, customer };
  }

  public deleteTransaction(id: string): boolean {
    const index = this.data.transactions.findIndex(t => t.id === id);
    if (index === -1) return false;

    const tx = this.data.transactions[index];
    const customer = this.getCustomerById(tx.customerId);

    if (customer) {
      if (tx.type === 'due') {
        customer.currentDue = Math.max(0, customer.currentDue - tx.remainingDue);
        customer.totalPurchases = Math.max(0, customer.totalPurchases - tx.subtotal);
        customer.totalPaid = Math.max(0, customer.totalPaid - tx.paidAmount);
      } else if (tx.type === 'payment') {
        customer.currentDue = customer.currentDue + tx.paidAmount;
        customer.totalPaid = Math.max(0, customer.totalPaid - tx.paidAmount);
      }
      customer.updatedAt = new Date().toISOString();
    }

    this.data.transactions.splice(index, 1);
    this.save();
    return true;
  }

  // SMS Logs
  public getSmsLogs(customerId?: string): SmsLog[] {
    if (customerId) {
      return this.data.smsLogs.filter(s => s.customerId === customerId);
    }
    return [...this.data.smsLogs].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  public addSmsLog(log: Omit<SmsLog, 'id' | 'sentAt'>): SmsLog {
    const newLog: SmsLog = {
      ...log,
      id: `SMS-${Date.now().toString().slice(-6)}`,
      sentAt: new Date().toISOString()
    };
    this.data.smsLogs.unshift(newLog);
    this.save();
    return newLog;
  }

  // Dashboard Stats
  public getDashboardStats(): DashboardStats {
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today);

    const fiveDaysLater = new Date(todayDate);
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
    const fiveDaysLaterStr = fiveDaysLater.toISOString().split('T')[0];

    const totalCustomers = this.data.customers.length;
    const totalDue = this.data.customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

    let todayDue = 0;
    let todayPaid = 0;
    let totalSales = 0;
    let totalCollection = 0;

    for (const t of this.data.transactions) {
      if (t.type === 'due') {
        totalSales += t.subtotal;
        totalCollection += t.paidAmount;
        if (t.date === today) {
          todayDue += t.remainingDue;
          todayPaid += t.paidAmount;
        }
      } else if (t.type === 'payment') {
        totalCollection += t.paidAmount;
        if (t.date === today) {
          todayPaid += t.paidAmount;
        }
      }
    }

    // Identify dues in next 5 days and overdue dues
    let dueNext5Days = 0;
    let dueSoonCount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;

    // Check recent active due transactions
    const customerDueMap = new Map<string, { latestDueDate: string; due: number }>();
    for (const t of this.data.transactions) {
      if (t.type === 'due' && t.dueDate && t.remainingDue > 0) {
        if (!customerDueMap.has(t.customerId)) {
          customerDueMap.set(t.customerId, { latestDueDate: t.dueDate, due: t.remainingDue });
        }
      }
    }

    for (const customer of this.data.customers) {
      if (customer.currentDue > 0) {
        const activeDueInfo = customerDueMap.get(customer.id);
        const dueDateStr = activeDueInfo ? activeDueInfo.latestDueDate : today;

        if (dueDateStr < today) {
          overdueAmount += customer.currentDue;
          overdueCount++;
        } else if (dueDateStr >= today && dueDateStr <= fiveDaysLaterStr) {
          dueNext5Days += customer.currentDue;
          dueSoonCount++;
        }
      }
    }

    return {
      totalCustomers,
      totalDue,
      todayDue,
      todayPaid,
      dueNext5Days,
      overdueAmount,
      totalSales,
      totalCollection,
      dueSoonCount,
      overdueCount
    };
  }

  // Backup & Export Data
  public getFullBackupData() {
    const totalDue = this.data.customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);
    const totalPurchases = this.data.customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);
    const totalPaid = this.data.customers.reduce((sum, c) => sum + (c.totalPaid || 0), 0);

    return {
      version: '1.0',
      system: 'Baki Khata - Online Seba Kendro',
      exportedAt: new Date().toISOString(),
      shop: {
        shopName: this.data.settings.shopName,
        ownerName: this.data.settings.ownerName,
        mobile: this.data.settings.mobile,
        address: this.data.settings.address,
        currency: this.data.settings.currency || '৳',
      },
      summary: {
        totalCustomers: this.data.customers.length,
        totalTransactions: this.data.transactions.length,
        totalDue,
        totalPurchases,
        totalPaid,
      },
      customers: this.data.customers,
      transactions: this.data.transactions,
      settings: this.data.settings,
    };
  }

  // Restore Data from Backup
  public restoreBackupData(backup: any) {
    if (!backup || typeof backup !== 'object') {
      throw new Error('অবৈধ ব্যাকআপ ফাইল।');
    }
    if (!Array.isArray(backup.customers)) {
      throw new Error('কাস্টমারদের তালিকা (customers) পাওয়া যায়নি।');
    }
    if (!Array.isArray(backup.transactions)) {
      throw new Error('লেনদেনের তালিকা (transactions) পাওয়া যায়নি।');
    }

    this.data.customers = backup.customers;
    this.data.transactions = backup.transactions;
    if (backup.settings && typeof backup.settings === 'object') {
      this.data.settings = { ...this.data.settings, ...backup.settings };
    }
    this.save();

    return {
      success: true,
      totalCustomers: this.data.customers.length,
      totalTransactions: this.data.transactions.length,
      restoredAt: new Date().toISOString(),
    };
  }
}

export const db = new Database();
