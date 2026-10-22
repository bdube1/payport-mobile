import { create } from 'zustand';
import { authApi, normalizePhone } from '../lib/api';
import { saveSession, clearSession, getUser, getToken, getDeviceId, PPUser } from '../lib/auth';
import { registerForPush, unregisterPush } from '../lib/push';

interface AuthState {
  user: PPUser | null;
  token: string | null;
  loading: boolean;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  login: (phone: string, pin: string) => Promise<{ success: boolean; message?: string }>;
  register: (fullName: string, phone: string, pin: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  hydrated: false,

  hydrate: async () => {
    const [user, token] = await Promise.all([getUser(), getToken()]);
    set({ user, token, hydrated: true });
    // Tokens can rotate; registering again is a no-op when nothing changed.
    if (user && token) registerForPush(user.phone);
  },

  login: async (phone, pin) => {
    set({ loading: true });
    try {
      const deviceId = await getDeviceId();
      const res = await authApi.login({ phone: normalizePhone(phone), pin, deviceId });
      const outer = res.data?.data || res.data || {};
      const token = outer.token || outer.accessToken || '';
      const u = outer.user || outer;
      const user: PPUser = {
        fullName: u.fullName || '',
        phone: u.phone || phone,
        role: u.role || 'CUSTOMER',
      };
      await saveSession(token, user);
      set({ user, token, loading: false });
      registerForPush(user.phone);
      return { success: true };
    } catch (e: any) {
      const msg =
        e.response?.data?.error?.message ||
        e.response?.data?.message ||
        'Login failed. Check your number and PIN.';
      set({ loading: false });
      return { success: false, message: msg };
    }
  },

  register: async (fullName, phone, pin) => {
    set({ loading: true });
    try {
      const res = await authApi.register({ fullName, phone: normalizePhone(phone), pin });
      const outer = res.data?.data || res.data || {};
      const token = outer.token || outer.accessToken || '';
      const u = outer.user || outer;
      const user: PPUser = {
        fullName: u.fullName || fullName,
        phone: u.phone || phone,
        role: u.role || 'CUSTOMER',
      };
      await saveSession(token, user);
      set({ user, token, loading: false });
      registerForPush(user.phone);
      return { success: true };
    } catch (e: any) {
      const msg =
        e.response?.data?.error?.message ||
        e.response?.data?.message ||
        'Registration failed. Please try again.';
      set({ loading: false });
      return { success: false, message: msg };
    }
  },

  logout: async () => {
    await unregisterPush();
    await clearSession();
    set({ user: null, token: null });
  },
}));
