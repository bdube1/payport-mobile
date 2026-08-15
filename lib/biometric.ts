import * as LocalAuthentication from 'expo-local-authentication';
import { isBiometricEnabled } from './auth';

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export async function authenticateWithBiometric(
  reason = 'Confirm your Payport payment'
): Promise<BiometricResult> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      return { success: false, error: 'Biometrics not available on this device' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Use PIN instead',
      fallbackLabel: 'Enter PIN',
      disableDeviceFallback: false,
    });

    if (result.success) return { success: true };
    const errorCode = 'error' in result ? result.error : 'unknown_error';
    if (errorCode === 'user_cancel') return { success: false, error: 'Cancelled' };
    return { success: false, error: errorCode };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getBiometricType(): Promise<string> {
  // Always generic — Android devices frequently report facial-recognition
  // hardware as "supported" even when the user only has fingerprint
  // enrolled, which was causing us to wrongly label the prompt "Face ID"
  // for fingerprint users. "Biometrics" is accurate either way.
  return 'Biometrics';
}
