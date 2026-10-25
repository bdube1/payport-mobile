import { create } from 'zustand';
import { authApi, normalizePhone } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveSession, clearSession, getUser, getToken, getDeviceId, setBiometricEnabled, PPUser } from '../lib/auth';

import { setThemeMode } from '../constants/colors';

const INSTALL_KEY = 'pp_installed';
import { registerForPush, unregisterPush } from '../lib/push';

interface AuthState {
  user: PPUser | null;
  token: string | null;
  loading: boolean;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  login: (phone: string, pin: string) => Promise<{ success: boolean; message?: string }>;
  register: (fullName: string, phone: string, pin: string, idNumber?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  hydrated: false,

  hydrate: async () => {
    // A new install always starts as a guest: the keychain can keep an old session after the app is removed,
    // but app storage does not, so a missing install marker means a fresh install.
    try {
      if (!(await AsyncStorage.getItem(INSTALL_KEY))) {
        await clearSession().catch(() => {});
        await setBiometricEnabled(false).catch(() => {});
        // The keychain can also keep an old theme choice; a new install starts in light.
        await setThemeMode('light', true).catch(() => {});
        await AsyncStorage.setItem(INSTALL_KEY, String(Date.now()));
        set({ user: null, token: null, hydrated: true });
        return;
      }
    } catch { /* storage unavailable: keep the saved session */ }
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

  register: async (fullName, phone, pin, idNumber) => {
    set({ loading: true });
    try {
      const res = await authApi.register({ fullName, phone: normalizePhone(phone), pin, idNumber });
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
