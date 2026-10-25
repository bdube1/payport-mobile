import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
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
import { Colors, isDark, onThemeChange, themeVersion } from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TermsGate from '../components/TermsGate';

const TERMS_KEY = 'pp_terms_accepted';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const router = useRouter();
  // A theme switch redraws every screen with the new palette; the session is kept and Profile is shown again.
  const [theme, setTheme] = useState(themeVersion());
  const switched = useRef(false);
  useEffect(() => onThemeChange((v, quiet) => { switched.current = !quiet; setTheme(v); }), []);
  // Terms of Service and Privacy Policy must be accepted once after installing, before anything else.
  const [termsOk, setTermsOk] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(TERMS_KEY).then((v) => setTermsOk(!!v)).catch(() => setTermsOk(false));
  }, []);
  const acceptTerms = () => {
    AsyncStorage.setItem(TERMS_KEY, new Date().toISOString()).catch(() => {});
    setTermsOk(true);
  };
  useEffect(() => {
    if (!switched.current) return;
    switched.current = false;
    const t = setTimeout(() => router.replace('/(tabs)/profile'), 0);
    return () => clearTimeout(t);
  }, [theme]);

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

  if (!fontsLoaded || termsOk === null) return null;

  if (!termsOk) {
    return (
      <GestureHandlerRootView key={`theme-${theme}`} style={{ flex: 1, backgroundColor: Colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <TermsGate onAccept={acceptTerms} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView key={`theme-${theme}`} style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="airtime/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="data/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="bills/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="wallet/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="cards/index" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="cards/[ref]" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="processing/[ref]" options={{ headerShown: false, presentation: 'card', gestureEnabled: false }} />
        <Stack.Screen name="status/[ref]" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
