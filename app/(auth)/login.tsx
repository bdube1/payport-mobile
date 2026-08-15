import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Image, ActivityIndicator, ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { normalizePhone } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { isBiometricAvailable, getBiometricType, authenticateWithBiometric } from '../../lib/biometric';
import {
  isBiometricEnabled, setBiometricEnabled,
  saveBiometricCredentials, getBiometricCredentials,
  saveLastPhone, getLastPhone,
} from '../../lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading } = useAuthStore();

  const [phone,   setPhone]   = useState('');
  const [pin,     setPin]     = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error,   setError]   = useState('');
  const [bioType, setBioType] = useState('Biometrics');

  // Three states: checking (deciding which screen to show), biometric (the
  // "welcome back" prompt), form (the normal phone+PIN entry).
  const [screen, setScreen] = useState<'checking' | 'biometric' | 'form'>('checking');
  const [bioBusy, setBioBusy] = useState(false);
  const autoFired = useRef(false);

  useEffect(() => {
    (async () => {
      const [lastPhone, bioEnabled, bioAvailable, creds, type] = await Promise.all([
        getLastPhone(),
        isBiometricEnabled(),
        isBiometricAvailable(),
        getBiometricCredentials(),
        getBiometricType(),
      ]);
      if (lastPhone) setPhone(lastPhone);
      setBioType(type);

      if (bioEnabled && bioAvailable && creds) {
        setScreen('biometric');
      } else {
        setScreen('form');
      }
    })();
  }, []);

  // Auto-fire the biometric prompt once, as soon as the "welcome back" screen appears —
  // still fully optional, "Use PIN instead" is always visible right below it.
  useEffect(() => {
    if (screen === 'biometric' && !autoFired.current) {
      autoFired.current = true;
      setTimeout(() => handleBiometricLogin(), 350);
    }
  }, [screen]);

  const handleBiometricLogin = async () => {
    setBioBusy(true);
    setError('');
    const creds = await getBiometricCredentials();
    if (!creds) { setScreen('form'); setBioBusy(false); return; }

    const result = await authenticateWithBiometric(`Log in to Payport`);
    if (!result.success) {
      setBioBusy(false);
      if (result.error !== 'Cancelled') setError('Biometric authentication failed. Try again or use your PIN.');
      return;
    }

    // A real login call — biometric only gates access to the stored PIN,
    // every sign-in still gets a genuinely fresh, valid session.
    const loginResult = await login(normalizePhone(creds.phone), creds.pin);
    setBioBusy(false);
    if (loginResult.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      setError('Your saved sign-in details no longer work. Please log in with your PIN.');
      setScreen('form');
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!phone.trim())        { setError('Please enter your mobile number'); return; }
    if (!/^\d{4}$/.test(pin)) { setError('Please enter your 4-digit PIN'); return; }

    const normalizedPhone = normalizePhone(phone);
    const result = await login(normalizedPhone, pin);
    if (result.success) {
      await saveLastPhone(phone);
      const available = await isBiometricAvailable();
      const enabled   = await isBiometricEnabled();
      if (available && !enabled) {
        const type = await getBiometricType();
        Alert.alert(`Enable ${type}?`, `Use ${type} to log in next time — no need to type your PIN.`, [
          { text: 'Not now', style: 'cancel', onPress: () => router.replace('/(tabs)') },
          { text: 'Enable', onPress: async () => {
            await setBiometricEnabled(true);
            await saveBiometricCredentials(normalizedPhone, pin);
            router.replace('/(tabs)');
          }},
        ]);
      } else {
        router.replace('/(tabs)');
      }
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.message || 'Incorrect number or PIN');
    }
  };

  if (screen === 'checking') {
    return (
      <ImageBackground source={require('../../assets/login-bg.png')} style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]} resizeMode="cover">
        <ActivityIndicator color={Colors.primary} size="large" />
      </ImageBackground>
    );
  }

  if (screen === 'biometric') {
    return (
      <ImageBackground source={require('../../assets/login-bg.png')} style={styles.root} resizeMode="cover">
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Image source={require('../../assets/logo-mark-transparent.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.title}>Welcome back</Text>
          {error !== '' && (
            <View style={[styles.errorBox, { alignSelf: 'stretch' }]}><Text style={styles.errorText}>{error}</Text></View>
          )}
          <TouchableOpacity onPress={handleBiometricLogin} disabled={bioBusy} style={styles.bioCircle} activeOpacity={0.8}>
            {bioBusy
              ? <ActivityIndicator color="#fff" size="large" />
              : <Ionicons name={bioType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'} size={40} color="#fff" />}
          </TouchableOpacity>
          <Text style={styles.bioHint}>Tap to sign in with {bioType}</Text>

          <TouchableOpacity onPress={() => setScreen('form')} style={{ marginTop: 28 }}>
            <Text style={styles.usePinText}>Use PIN instead</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/login-bg.png')} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Real company logo */}
            <Image
              source={require('../../assets/logo-mark-transparent.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />

            {/* Title */}
            <Text style={styles.title}>Welcome to Payport</Text>

            {/* Error banner */}
            {error !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Mobile number */}
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter mobile number"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="phone-pad"
              style={styles.input}
              returnKeyType="next"
            />

            {/* PIN */}
            <Text style={styles.label}>PIN</Text>
            <View style={styles.pinRow}>
              <TextInput
                value={pin}
                onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="4-digit PIN"
                placeholderTextColor={Colors.textSecondary}
                secureTextEntry={!showPin}
                keyboardType="numeric"
                maxLength={4}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeBtn}>
                <Ionicons name={showPin ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{ height: 24 }} />

            {/* LOGIN button — indigo, full width */}
            <TouchableOpacity
              style={[styles.btnLogin, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnLoginText}>
                {loading ? 'Signing in...' : 'Login'}
              </Text>
            </TouchableOpacity>

            {/* REGISTER button — pink accent, full width */}
            <TouchableOpacity
              style={styles.btnRegister}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnRegisterText}>Register</Text>
            </TouchableOpacity>

            {/* Continue as guest */}
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              style={styles.guestBtn}
            >
              <Text style={styles.guestText}>Continue as Guest</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.background },

  scroll: {
    flexGrow: 1,
    padding: 32,
    justifyContent: 'center',
  },

  logoImage: {
    width: 116,
    height: 170,
    alignSelf: 'center',
    marginBottom: 28,
  },

  title: {
    fontSize: 24, fontWeight: 'bold',
    color: Colors.primary, textAlign: 'center',
    marginBottom: 28, fontFamily: 'Rubik_700Bold',
  },

  errorBox:  { backgroundColor: '#FFEBEE', borderRadius: 4, padding: 12, marginBottom: 16 },
  errorText: { color: Colors.red, fontSize: 14, fontFamily: 'Nunito_400Regular' },

  label: {
    fontSize: 14, color: Colors.textPrimary,
    fontFamily: 'Nunito_400Regular', marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#DDDDDD',
    borderRadius: 24,                   // round edges
    paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 16, color: Colors.textPrimary,
    fontFamily: 'Nunito_400Regular',
    marginBottom: 16,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#DDDDDD',
    borderRadius: 24,                   // round edges
    marginBottom: 0,
    paddingRight: 4,
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },

  // Indigo LOGIN button — full width, clearly visible
  btnLogin: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnLoginText: {
    color: '#fff',
    fontSize: 16, fontWeight: 'bold',
    fontFamily: 'Rubik_700Bold',
    letterSpacing: 0.5,
  },

  // Pink REGISTER button — full width, clearly visible
  btnRegister: {
    backgroundColor: Colors.accent,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  btnRegisterText: {
    color: '#fff',
    fontSize: 16, fontWeight: 'bold',
    fontFamily: 'Rubik_700Bold',
    letterSpacing: 0.5,
  },

  guestBtn: { paddingVertical: 12, alignItems: 'center' },
  guestText: {
    fontSize: 14, fontWeight: 'bold',
    color: Colors.primary,
    fontFamily: 'Rubik_700Bold',
  },

  bioCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  bioHint: { fontSize: 13.5, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', marginTop: 16 },
  usePinText: { fontSize: 14, fontWeight: '700', color: Colors.primary, fontFamily: 'Rubik_700Bold' },
});
