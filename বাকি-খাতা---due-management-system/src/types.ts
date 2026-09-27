export interface ProductItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Customer {
  id: string; // e.g. CUST-1001
  name: string;
  mobile: string;
  altMobile?: string;
  address: string;
  photo?: string;
  openingDue: number;
  currentDue: number;
  totalPurchases: number;
  totalPaid: number;
  passcode: string; // PIN for customer portal (default: last 4 digits of phone)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'due' | 'payment';

export interface Transaction {
  id: string; // e.g. INV-1001 or PAY-1001
  customerId: string;
  customerName: string;
  customerMobile: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD (Created Date + 5 days)
  items?: ProductItem[];
  subtotal: number;
  paidAmount: number;
  remainingDue: number;
  paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Other';
  note?: string;
  createdAt: string;
}

export interface SmsLog {
  id: string;
  customerId: string;
  customerName: string;
  mobile: string;
  amount: number;
  dueDate: string;
  message: string;
  status: 'sent' | 'failed';
  error?: string | null;
  response?: string | null;
  sentAt: string;
  gatewayUsed: string;
}

export interface SmsConfig {
  enabled: boolean;
  provider: 'generic' | 'greenweb' | 'bulksmsbd' | 'reve' | 'twilio' | 'custom';
  apiUrl: string;
  apiKey: string;
  senderId: string;
  httpMethod: 'POST' | 'GET';
  customHeaders?: string;
  bodyPayload?: string;
  defaultTemplate: string;
}

export interface ShopSettings {
  shopName: string;
  ownerName: string;
  mobile: string;
  address: string;
  currency: string;
  defaultDueDays: number;
  smsConfig: SmsConfig;
}

export interface DashboardStats {
  totalCustomers: number;
  totalDue: number;
  todayDue: number;
  todayPaid: number;
  dueNext5Days: number;
  overdueAmount: number;
  totalSales: number;
  totalCollection: number;
  dueSoonCount: number;
  overdueCount: number;
}

export interface AuthUser {
  role: 'admin' | 'customer';
  id: string;
  name: string;
  username?: string;
  email?: string;
  mobile?: string;
  customerId?: string;
  token?: string;
}
