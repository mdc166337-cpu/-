import type { Customer, Transaction, SmsLog, ShopSettings, DashboardStats } from '../types.ts';

const TOKEN_KEY = 'bakikhata_token';
const USER_KEY = 'bakikhata_user';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user: any) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      // Clear expired / invalid token
      authStorage.clearToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: data.error }));
      }
    }
    throw new Error(data.error || 'একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
  }
  return data;
}

export const api = {
  // Auth
  adminLogin: async (username: string, password: string) => {
    const res = await request<{ success: boolean; token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.token) {
      authStorage.setToken(res.token);
      authStorage.setUser(res.user);
    }
    return res;
  },

  customerLogin: async (identifier: string, passcode?: string) => {
    const res = await request<{ success: boolean; token: string; user: any; customer: Customer }>('/api/auth/customer-login', {
      method: 'POST',
      body: JSON.stringify({ identifier, passcode }),
    });
    if (res.token) {
      authStorage.setToken(res.token);
      authStorage.setUser(res.user);
    }
    return res;
  },

  forgotPassword: (usernameOrEmail: string, securityPin: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, securityPin, newPassword }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getMe: () => request<any>('/api/auth/me'),

  getCurrentUser: (): any => authStorage.getUser(),

  logout: () => {
    authStorage.clearToken();
  },

  // Customer self-service
  getMyDue: (customerId?: string) =>
    request<{ customer: Customer; transactions: Transaction[]; shop: any }>(
      `/api/customer/my-due${customerId ? `?customerId=${customerId}` : ''}`
    ),

  // Dashboard
  getDashboardStats: () =>
    request<{ stats: DashboardStats; recentTransactions: Transaction[] }>('/api/dashboard/stats'),

  // Customers
  getCustomers: (query = '') =>
    request<{ customers: Customer[] }>(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      .then(res => res.customers),

  createCustomer: (customerData: Partial<Customer>) =>
    request<{ success: boolean; customer: Customer }>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    }),

  updateCustomer: (id: string, updates: Partial<Customer>) =>
    request<{ success: boolean; customer: Customer }>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteCustomer: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/customers/${id}`, {
      method: 'DELETE',
    }),

  getCustomerLedger: (id: string) =>
    request<{ customer: Customer; transactions: Transaction[]; smsLogs: SmsLog[] }>(`/api/customers/${id}/ledger`),

  // Transactions
  getTransactions: (customerId?: string) =>
    request<{ transactions: Transaction[] }>(`/api/transactions${customerId ? `?customerId=${customerId}` : ''}`)
      .then(res => res.transactions),

  addDueTransaction: (data: {
    customerId: string;
    items: Array<{ productName: string; quantity: number; unit: string; unitPrice: number }>;
    paidAmount?: number;
    paymentMethod?: string;
    date?: string;
    dueDate?: string;
    note?: string;
    sendSmsImmediately?: boolean;
  }) =>
    request<{ success: boolean; transaction: Transaction; customer: Customer; message: string }>('/api/transactions/due', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addPaymentTransaction: (data: {
    customerId: string;
    amount: number;
    paymentMethod?: string;
    date?: string;
    note?: string;
    sendSmsConfirmation?: boolean;
  }) =>
    request<{ success: boolean; transaction: Transaction; customer: Customer; message: string }>('/api/transactions/payment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    }),

  // SMS
  sendSms: (customerId: string, customMessage?: string, dueDate?: string) =>
    request<{ success: boolean; log: SmsLog; message: string; gatewayResponse?: any }>('/api/sms/send', {
      method: 'POST',
      body: JSON.stringify({ customerId, customMessage, dueDate }),
    }),

  testSms: (testMobile: string, customMessage?: string) =>
    request<{ success: boolean; log: SmsLog; message: string; gatewayResponse?: any }>('/api/sms/test', {
      method: 'POST',
      body: JSON.stringify({ testMobile, customMessage }),
    }),

  getSmsLogs: () => request<{ logs: SmsLog[] }>('/api/sms/logs'),

  // Settings
  getSettings: () => request<{ settings: ShopSettings }>('/api/settings').then(res => res.settings),

  updateSettings: (settings: Partial<ShopSettings>) =>
    request<{ success: boolean; settings: ShopSettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Data Backup & Safety
  exportBackup: () => request<any>('/api/backup/export'),

  restoreBackup: (backupData: any) =>
    request<{ success: boolean; message: string; result: any }>('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify(backupData),
    }),
};
