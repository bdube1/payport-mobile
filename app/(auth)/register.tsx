import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Image, ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, themed } from '../../constants/colors';
import { normalizePhone } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, loading } = useAuthStore();

  const [fullName,   setFullName]   = useState('');
  const [phone,      setPhone]      = useState('');
  const [idNumber,   setIdNumber]   = useState('');
  const [pin,        setPin]        = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin,    setShowPin]    = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!fullName.trim() || fullName.trim().length < 2) { setError('Enter your full name'); return; }
    const norm = normalizePhone(phone);
    if (!/^\+263\d{9}$/.test(norm)) { setError('Enter a valid Zimbabwe number e.g. 0771234567'); return; }
    const id = idNumber.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9/-]{3,39}$/.test(id)) { setError('Enter your national ID number e.g. 63-123456A42'); return; }
    if (!/^\d{4}$/.test(pin))        { setError('PIN must be exactly 4 digits'); return; }
    if (pin !== confirmPin)           { setError('PINs do not match'); return; }

    const result = await register(fullName.trim(), norm, pin, id);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <ImageBackground source={require('../../assets/login-bg.png')} style={S.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">

            {/* Logo */}
            <Image source={require('../../assets/logo-mark-transparent.png')} style={S.logoImg} resizeMode="contain" />

            <Text style={S.title}>Create Account</Text>

            {error !== '' && <View style={S.errBox}><Text style={S.errTxt}>{error}</Text></View>}

            {/* Full name */}
            <Text style={S.lbl}>Full Name</Text>
            <TextInput value={fullName} onChangeText={setFullName}
              placeholder="e.g. Tinashe Moyo" placeholderTextColor={Colors.textSecondary}
              style={S.input} returnKeyType="next" />

            {/* Mobile */}
            <Text style={S.lbl}>Mobile Number</Text>
            <TextInput value={phone} onChangeText={setPhone}
              placeholder="e.g. 0771234567" placeholderTextColor={Colors.textSecondary}
              keyboardType="phone-pad" style={S.input} returnKeyType="next" />

            {/* National ID */}
            <Text style={S.lbl}>ID Number</Text>
            <TextInput value={idNumber} onChangeText={(v) => setIdNumber(v.toUpperCase())}
              placeholder="e.g. 63-123456A42" placeholderTextColor={Colors.textSecondary}
              autoCapitalize="characters" autoCorrect={false} style={S.input} returnKeyType="next" />

            {/* PIN */}
            <Text style={S.lbl}>4-Digit PIN</Text>
            <View style={S.pinRow}>
              <TextInput value={pin} onChangeText={(v) => setPin(v.replace(/\D/g,'').slice(0,4))}
                placeholder="Choose a PIN" placeholderTextColor={Colors.textSecondary}
                secureTextEntry={!showPin} keyboardType="numeric" maxLength={4}
                style={[S.input, { flex: 1, marginBottom: 0 }]} returnKeyType="next" />
              <TouchableOpacity onPress={() => setShowPin(!showPin)} style={S.eyeBtn}>
                <Ionicons name={showPin ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Confirm PIN */}
            <Text style={[S.lbl, { marginTop: 16 }]}>Confirm PIN</Text>
            <TextInput value={confirmPin} onChangeText={(v) => setConfirmPin(v.replace(/\D/g,'').slice(0,4))}
              placeholder="Repeat your PIN" placeholderTextColor={Colors.textSecondary}
              secureTextEntry={!showPin} keyboardType="numeric" maxLength={4}
              style={S.input} returnKeyType="done" onSubmitEditing={handleSubmit} />

            <View style={{ height: 8 }} />

            {/* Register button */}
            <TouchableOpacity style={[S.btnRegister, loading && { opacity: 0.7 }]}
              onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
              <Text style={S.btnTxt}>{loading ? 'Creating account...' : 'Register'}</Text>
            </TouchableOpacity>

            {/* Back to login */}
            <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
              <Text style={S.backTxt}>Already have an account? Login</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const S = themed(() => ({
  root:   { flex: 1, backgroundColor: Colors.cardBg },
  scroll: { flexGrow: 1, padding: 32, justifyContent: 'center' },

  logoImg: { width: 82, height: 120, alignSelf: 'center', marginBottom: 24 },

  title: { fontSize: 24, fontWeight: 'bold', color: Colors.primary, textAlign: 'center', marginBottom: 24, fontFamily: 'Rubik_700Bold' },

  errBox: { backgroundColor: Colors.errorBg, borderRadius: 12, padding: 12, marginBottom: 16 },
  errTxt: { color: Colors.red, fontSize: 14, fontFamily: 'Nunito_400Regular' },

  lbl: { fontSize: 14, color: Colors.textPrimary, fontFamily: 'Nunito_400Regular', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.inputBorder,
    borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 16, color: Colors.textPrimary, fontFamily: 'Nunito_400Regular', marginBottom: 4,
  },
  pinRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.inputBorder, borderRadius: 24 },
  eyeBtn:  { paddingHorizontal: 14, paddingVertical: 14 },

  btnRegister: {
    backgroundColor: Colors.accent, borderRadius: 24,
    paddingVertical: 16, alignItems: 'center', marginTop: 20, marginBottom: 12,
  },
  btnTxt:  { color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'Rubik_700Bold' },
  backBtn: { paddingVertical: 12, alignItems: 'center' },
  backTxt: { fontSize: 14, fontWeight: 'bold', color: Colors.primary, fontFamily: 'Rubik_700Bold' },
}));
