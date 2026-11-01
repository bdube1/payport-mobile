import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { profileApi } from './api';

/**
 * Push notifications for payment outcomes.
 *
 * After login: ask permission, get the Expo push token and register it with the backend
 * (POST /api/v1/profile/push-token). On logout: revoke it (DELETE) while the session is still
 * valid, so the next person on this phone never gets the previous user's notifications.
 *
 * The backend sends one push per final outcome (it de-duplicates per transaction and outcome);
 * the app also avoids re-registering the same token for the same user. SMS stays success-only.
 * Requires expo.extra.eas.projectId in app.json (set by `eas init`); without it registration is skipped.
 */

const REGISTERED_KEY = 'pp_push_registered'; // "<phone>|<token>"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  return (Constants.expoConfig?.extra as any)?.eas?.projectId || (Constants as any).easConfig?.projectId;
}

export type PushResult = { registered: boolean; reason?: string };

export async function registerForPush(phone: string): Promise<PushResult> {
  try {
    const id = projectId();
    if (!id) return { registered: false, reason: 'Push is not configured for this build (missing EAS projectId)' };

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payments',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return { registered: false, reason: 'Notifications are turned off for Payport' };

    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    const marker = `${phone}|${token}`;
    const previous = await SecureStore.getItemAsync(REGISTERED_KEY).catch(() => null);
    if (previous === marker) return { registered: true };

    await profileApi.registerPushToken(token, Platform.OS);
    await SecureStore.setItemAsync(REGISTERED_KEY, marker);
    return { registered: true };
  } catch (e: any) {
    return { registered: false, reason: e?.response?.data?.message || e?.message || 'Could not register for notifications' };
  }
}

/** Call BEFORE clearing the session: the backend needs the user's token to revoke it. */
export async function unregisterPush(): Promise<void> {
  try {
    const marker = await SecureStore.getItemAsync(REGISTERED_KEY);
    if (marker) {
      const token = marker.slice(marker.indexOf('|') + 1);
      await profileApi.unregisterPushToken(token);
    }
  } catch {
    // Offline or session already gone: the backend also drops tokens Expo reports as invalid.
  } finally {
    await SecureStore.deleteItemAsync(REGISTERED_KEY).catch(() => undefined);
  }
}

/** Opens what a notification is about when the customer taps it (payment, store order or chat). Returns the unsubscribe function. */
export function listenForNotificationTaps(): () => void {
  const open = (response: Notifications.NotificationResponse | null) => {
    const data = (response?.notification.request.content.data as any) || {};
    const ref = data.reference;
    // Store chats open Messages; store orders open the order; payments open their status.
    if (data.type === 'chat') { router.push('/store/messages' as any); return; }
    if (data.type === 'order' && typeof ref === 'string' && /^[A-Za-z0-9_-]{4,64}$/.test(ref)) { router.push(`/store/order/${ref}` as any); return; }
    if (typeof ref === 'string' && /^[A-Za-z0-9_-]{4,64}$/.test(ref)) router.push(`/status/${ref}`);
  };
  // Cold start from a tap: give the navigator a moment to mount first.
  Notifications.getLastNotificationResponseAsync().then(r => setTimeout(() => open(r), 300)).catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
