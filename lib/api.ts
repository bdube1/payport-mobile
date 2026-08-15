import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { clearSession } from './auth';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.payport.africa';
export { BASE_URL };

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // was 30000 -- doubled for slower mobile networks
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from secure storage
api.interceptors.request.use(async (cfg) => {
  try {
    const token = await SecureStore.getItemAsync('pp_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return cfg;
});

let isRedirectingToLogin = false;

// Normalize gateway error responses, and route straight to login on 401 --
// previously an expired/invalidated session (e.g. logged in on another
// device) just showed as "failed to fetch beneficiaries" or "failed to
// fetch history", which reads as the app being broken. A logged-out user
// looking at the login screen is unambiguous and self-explanatory; a
// logged-out user staring at a generic fetch error is not.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const gwMsg =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message;
    if (gwMsg && err.response) {
      err.response.data = { ...err.response.data, message: gwMsg };
    }

    if (err.response?.status === 401 && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      try {
        await clearSession();
      } catch {}
      router.replace('/(auth)/login');
      // Reset the guard after navigation has had a chance to settle, so a
      // genuinely new login later isn't blocked by a stale flag.
      setTimeout(() => { isRedirectingToLogin = false; }, 1000);
    }

    return Promise.reject(err);
  }
);

// ── Utilities ─────────────────────────────────────────────────────────────

/** Normalize any Zimbabwe phone format to E.164 (+263XXXXXXXXX) */
export function normalizePhone(raw: string): string {
  if (!raw) return '';
  let p = raw.replace(/\s+/g, '').replace(/-/g, '');
  if (p.startsWith('+263')) return p;
  if (p.startsWith('263')) return '+' + p;
  if (p.startsWith('0')) return '+263' + p.slice(1);
  if (/^[7-9]\d{8}$/.test(p)) return '+263' + p;
  return p;
}

export function maskPhone(phone: string): string {
  if (!phone) return '';
  const p = normalizePhone(phone);
  return p.slice(0, 5) + '****' + p.slice(-3);
}

export function formatAmount(cents: number, currency = 'USD'): string {
  const amt = cents / 100;
  return `${currency} ${amt.toFixed(2)}`;
}

export function generateReference(channel = 'MOB'): string {
  const d = new Date();
  const date =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const seq = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `PP-${channel}-${date}-${seq}`;
}

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { fullName: string; phone: string; pin: string }) =>
    api.post('/api/v1/auth/register', data),
  login: (data: { phone: string; pin: string; deviceId?: string }) =>
    api.post('/api/v1/auth/login', data),
  changePin: (currentValue: string, newValue: string) =>
    api.post('/api/v1/account/change-pin', { currentValue, newValue }),
};

// ── Products ──────────────────────────────────────────────────────────────
export const productsApi = {
  getAll: () => api.get('/api/v1/products'),
  detectNetwork: (phone: string) =>
    api.get(`/api/v1/products/detect-network/${encodeURIComponent(phone)}`),
  getPaymentMethods: () => api.get('/api/v1/products/payment-methods'),
  getDataBundles: (provider: string, currency: string) =>
    api.get(`/api/v1/products/data-bundles?provider=${provider}&currency=${currency}`),
  // Unified bundle catalogue used by the Data screen (matches the web app's endpoint)
  getBundles: (provider: string, currency = 'USD') =>
    api.get(`/api/v1/bundles/${provider}?currency=${encodeURIComponent(currency)}`),
};

// ── Transactions ──────────────────────────────────────────────────────────
export const transactionsApi = {
  initiate: (payload: {
    reference: string;
    productTypeCode: string;
    recipientIdentifier: string;
    amountCents: number;
    currency: string;
    customerPhone: string;
    channel: string;
    productConfig?: string;
  }) => api.post('/api/v1/transactions/initiate', payload),

  pay: (payload: {
    reference: string;
    paymentMethodCode: string;
    customerPhone: string;
  }) => api.post('/api/v1/transactions/pay', payload),

  getStatus: (ref: string) => api.get(`/api/v1/transactions/${ref}`),
  getTimeline: (ref: string) => api.get(`/api/v1/transactions/${ref}/timeline`),
  getMyHistory: (page = 0, size = 15) =>
    api.get(`/api/v1/transactions/my-history?page=${page}&size=${size}`),
};

// ── Bills ─────────────────────────────────────────────────────────────────
export const billsApi = {
  getCustomerInfo: (billerCode: string, accountRef: string, currency: string) =>
    api.post('/api/v1/bills/customer-info', { billerCode, accountRef, currency }),
};

// ── Profile ───────────────────────────────────────────────────────────────
export const profileApi = {
  registerPushToken: (token: string) =>
    api.post('/api/v1/profile/push-token', { token }),
};

// ── Beneficiaries ─────────────────────────────────────────────────────────
// Centralised server-side now — previously mobile stored these only in
// local AsyncStorage, which is why they never showed up on the web app.
export const beneficiariesApi = {
  list: () => api.get('/api/v1/beneficiaries'),
  create: (payload: {
    type: 'PHONE' | 'BILLS';
    name: string;
    phone?: string;
    networkName?: string;
    networkColor?: string;
    billerCode?: string;
    billerName?: string;
    accountRef?: string;
  }) => api.post('/api/v1/beneficiaries', payload),
  update: (id: number, payload: Partial<{
    name: string; phone: string; networkName: string; networkColor: string;
    billerCode: string; billerName: string; accountRef: string;
  }>) => api.put(`/api/v1/beneficiaries/${id}`, payload),
  remove: (id: number) => api.delete(`/api/v1/beneficiaries/${id}`),
};

export default api;
