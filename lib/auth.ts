import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY  = 'pp_token';
const USER_KEY   = 'pp_user';
const BIOMETRIC_KEY = 'pp_biometric_enabled';
const BIOMETRIC_CREDS_KEY = 'pp_biometric_creds';
const LAST_PHONE_KEY = 'pp_last_phone';

export interface PPUser {
  fullName: string;
  phone: string;
  role: string;
}

export async function saveSession(token: string, user: PPUser): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getUser(): Promise<PPUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? '1' : '0');
  if (!enabled) await SecureStore.deleteItemAsync(BIOMETRIC_CREDS_KEY);
}

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(BIOMETRIC_KEY);
  return val === '1';
}

// The PIN is stored behind the OS-level secure enclave (Keychain on iOS,
// Keystore-backed encrypted storage on Android) — biometric auth gates
// reading it, then it's used to do a real, fresh login (not a fake local
// unlock), so every biometric sign-in still gets a genuinely valid session.
export async function saveBiometricCredentials(phone: string, pin: string): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_CREDS_KEY, JSON.stringify({ phone, pin }));
}

export async function getBiometricCredentials(): Promise<{ phone: string; pin: string } | null> {
  const raw = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function clearBiometricCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_CREDS_KEY);
}

// Just the phone number, remembered independently of biometric — so even
// someone who never turns on biometric login doesn't have to retype it.
export async function saveLastPhone(phone: string): Promise<void> {
  await SecureStore.setItemAsync(LAST_PHONE_KEY, phone);
}

export async function getLastPhone(): Promise<string | null> {
  return SecureStore.getItemAsync(LAST_PHONE_KEY);
}

// A stable per-install identifier, generated once and reused for the life
// of the app install. Used server-side for single-device login — logging in
// on a new device replaces the old one as the account's active session.
// Not a hardware ID on purpose: no extra native permissions, no rebuild
// needed, and it naturally resets on reinstall which is the right behavior
// (a reinstalled app is effectively a "new device" as far as sessions go).
const DEVICE_ID_KEY = 'pp_device_id';

export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const fresh = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, fresh);
  return fresh;
}
