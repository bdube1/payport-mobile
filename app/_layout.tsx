import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts as useRubikFonts,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_800ExtraBold,
} from '@expo-google-fonts/rubik';
import {
  useFonts as useNunitoFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { useAuthStore } from '../store/authStore';
import { listenForNotificationTaps } from '../lib/push';
import { Colors, isDark } from '../constants/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  const [rubikLoaded] = useRubikFonts({
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
    Rubik_800ExtraBold,
  });
  const [nunitoLoaded] = useNunitoFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const fontsLoaded = rubikLoaded && nunitoLoaded;

  useEffect(() => listenForNotificationTaps(), []);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      // Fonts can finish loading almost instantly on a fast device, which would
      // make the splash barely flash by. Keep it visible for a beat so people
      // actually register the logo and name, matching what was asked for.
      const timer = setTimeout(() => SplashScreen.hideAsync(), 1500);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="airtime/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="data/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="bills/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="processing/[ref]" options={{ headerShown: false, presentation: 'card', gestureEnabled: false }} />
        <Stack.Screen name="status/[ref]" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
