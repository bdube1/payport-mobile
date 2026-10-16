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

// ── Per-transaction access tokens ──────────────────────────────────────────
// /initiate returns a one-time accessToken for the reference; it is sent back as
// X-Transaction-Token on /pay and when reading that transaction. Kept in memory and
// in secure storage (so a restarted app can still show the outcome).
const txTokens = new Map<string, string>();
const txKey = (ref: string) => 'pp_tx_' + ref.replace(/[^A-Za-z0-9._-]/g, '_');

export async function rememberTransactionToken(ref: string, token?: string | null) {
  if (!ref || !token) return;
  txTokens.set(ref, token);
  try { await SecureStore.setItemAsync(txKey(ref), token); } catch {}
}

async function transactionToken(ref: string | null): Promise<string | null> {
  if (!ref) return null;
  const t = txTokens.get(ref);
  if (t) return t;
  try { return await SecureStore.getItemAsync(txKey(ref)); } catch { return null; }
}

function referenceOf(cfg: any): string | null {
  const url: string = cfg.url || '';
  const m = /\/api\/v1\/transactions\/([^/?]+)/.exec(url);
  if (m && !['initiate', 'pay', 'my-history'].includes(m[1])) return decodeURIComponent(m[1]);
  if (url.startsWith('/api/v1/transactions/pay')) {
    try { return (typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data)?.reference || null; } catch { return null; }
  }
  return null;
}

/** A fresh key per payment attempt (reuse it only when retrying the same attempt). */
export function newIdempotencyKey(): string {
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${hex(4)}-${hex(12)}`;
}

// Attach JWT from secure storage, and the transaction's access token when there is one
api.interceptors.request.use(async (cfg) => {
  try {
    const token = await SecureStore.getItemAsync('pp_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  } catch {}
  const txToken = await transactionToken(referenceOf(cfg));
  if (txToken) cfg.headers['X-Transaction-Token'] = txToken;
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
    const data = err.response?.data;
    const code = data?.error?.code || data?.code || null;
    const gwMsg =
      data?.error?.message ||
      data?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      err.message;
    if (err.response) {
      err.response.data = { ...(data || {}), message: gwMsg, code };
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

/**
 * What to tell the customer when a payment cannot be started. Server wording is shown as sent:
 * 503 PROVIDER_UNAVAILABLE ("...No money was taken...") -> suggest another method;
 * 403 PAYMENT_NOT_ALLOWED -> the neutral message, which quotes the reference.
 */
export function paymentError(err: any, fallback = 'Payment failed. Please try again.') {
  const status = err?.response?.status;
  const code = err?.response?.data?.code;
  const providerUnavailable = status === 503 || code === 'PROVIDER_UNAVAILABLE';
  let message: string = err?.response?.data?.message || (err?.response ? fallback : 'No connection. Check your internet and try again.');
  if (providerUnavailable) message = `${message} You can choose another payment method.`;
  return { message, code, providerUnavailable, notAllowed: status === 403 || code === 'PAYMENT_NOT_ALLOWED' };
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
  }, idempotencyKey?: string) => api.post('/api/v1/transactions/initiate', payload,
    { headers: { 'Idempotency-Key': idempotencyKey || newIdempotencyKey() } }),

  pay: (payload: {
    reference: string;
    paymentMethodCode: string;
    customerPhone: string;
  }, idempotencyKey?: string) => api.post('/api/v1/transactions/pay', payload,
    { headers: { 'Idempotency-Key': idempotencyKey || newIdempotencyKey() } }),

  getStatus: (ref: string) => api.get(`/api/v1/transactions/${ref}`),
  getOutcome: (ref: string, waitSeconds = 0) => api.get(`/api/v1/transactions/${ref}/outcome?waitSeconds=${waitSeconds}`),
  getTimeline: (ref: string) => api.get(`/api/v1/transactions/${ref}/timeline`),
  getMyHistory: (page = 0, size = 15) =>
    api.get(`/api/v1/transactions/my-history?page=${page}&size=${size}`),
};

/** Initiate + pay as one attempt, with idempotency keys and the access token kept for the reference. */
export async function startPayment(
  initiatePayload: Parameters<typeof transactionsApi.initiate>[0],
  payPayload: { paymentMethodCode: string; customerPhone: string },
) {
  const attempt = newIdempotencyKey();
  const init = await transactionsApi.initiate(initiatePayload, attempt + ':initiate');
  const tx = init.data?.data || init.data;
  await rememberTransactionToken(initiatePayload.reference, tx?.accessToken);
  const paid = await transactionsApi.pay({ ...payPayload, reference: initiatePayload.reference }, attempt + ':pay');
  return paid.data?.data || paid.data;
}

// ── Bills ─────────────────────────────────────────────────────────────────
// Biller catalogue (label, accountPattern, hint, currencies, limits) and account lookup
// (holderName, acceptedCurrencies, payable / notPayableReason, details).
export const billersApi = {
  catalogue: () => api.get('/api/v1/billers'),
  lookup: (code: string, accountNumber: string, currency?: string, sourcePhone?: string) =>
    api.post(`/api/v1/billers/${encodeURIComponent(code)}/lookup`, { accountNumber, currency, sourcePhone }),
};

// ── Profile ───────────────────────────────────────────────────────────────
export const profileApi = {
  registerPushToken: (token: string, platform: string) =>
    api.post('/api/v1/profile/push-token', { token, platform }),
  unregisterPushToken: (token: string) =>
    api.delete('/api/v1/profile/push-token', { data: { token } }),
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
