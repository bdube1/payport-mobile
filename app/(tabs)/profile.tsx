import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { isBiometricAvailable, getBiometricType } from '../../lib/biometric';
import { isBiometricEnabled, setBiometricEnabled, saveBiometricCredentials } from '../../lib/auth';
import { normalizePhone } from '../../lib/api';

function Row({ label, value, onPress, toggle, toggleVal, onToggle }: any) {
  return (
    <TouchableOpacity onPress={onPress} disabled={toggle || !onPress} style={S.row} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={S.rowLabel}>{label}</Text>
        {value ? <Text style={S.rowValue}>{value}</Text> : null}
      </View>
      {toggle ? <Switch value={toggleVal} onValueChange={onToggle} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#fff" /> : <Text style={{ fontSize: 18, color: Colors.textSecondary }}>›</Text>}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const login  = useAuthStore((s) => s.login);
  const [bioAvail, setBioAvail] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioType, setBioType] = useState('Biometrics');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinChecking, setPinChecking] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvail);
    isBiometricEnabled().then(setBioOn);
    getBiometricType().then(setBioType);
  }, []);

  const handleToggleBiometric = async (v: boolean) => {
    if (!v) {
      // Turning off — no PIN needed, setBiometricEnabled already clears stored credentials.
      await setBiometricEnabled(false);
      setBioOn(false);
      return;
    }
    // Turning on — we don't have the PIN in memory here, so ask for it once
    // to store it securely behind the biometric gate.
    setConfirmPin('');
    setPinError('');
    setPinModalOpen(true);
  };

  const confirmEnableBiometric = async () => {
    if (!/^\d{4}$/.test(confirmPin)) { setPinError('Enter your 4-digit PIN'); return; }
    if (!user) return;
    setPinChecking(true);
    setPinError('');
    // Verify the PIN is actually correct before storing it — otherwise a
    // typo here would silently store a PIN that can never log in.
    const result = await login(normalizePhone(user.phone), confirmPin);
    setPinChecking(false);
    if (!result.success) { setPinError('That PIN is incorrect'); return; }
    await setBiometricEnabled(true);
    await saveBiometricCredentials(normalizePhone(user.phone), confirmPin);
    setBioOn(true);
    setPinModalOpen(false);
  };

  if (!user) {
    return (
      <GradientScreen>
        <AppBar title="Profile" />
        <View style={S.centre}>
          <Ionicons name="person-outline" size={44} color={Colors.textSecondary} />
          <Text style={S.emptyTitle}>Not signed in</Text>
          <Text style={S.emptySub}>Sign in to view your profile and history</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={S.btn}><Text style={S.btnTxt}>Sign In</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={[S.btn, S.btnAccent]}><Text style={S.btnTxt}>Register</Text></TouchableOpacity>
        </View>
      </GradientScreen>
    );
  }

  return (
    <GradientScreen>
      <AppBar title="Profile" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={S.avatarSection}>
          <View style={S.avatarCircle}><Text style={S.avatarTxt}>{user.fullName[0].toUpperCase()}</Text></View>
          <Text style={S.userName}>{user.fullName}</Text>
          <Text style={S.userPhone}>{user.phone}</Text>
          <View style={S.rolePill}><Text style={S.roleText}>{user.role || 'Customer'}</Text></View>
        </View>

        {/* Security */}
        <Text style={S.sectionTitle}>Security</Text>
        <View style={S.section}>
          {bioAvail && <Row label={`${bioType} Login`} toggle toggleVal={bioOn} onToggle={handleToggleBiometric} />}
          <Row label="Change PIN" onPress={() => router.push('/change-pin')} />
        </View>

        {/* Danger zone */}
        <Text style={S.sectionTitle}>Danger Zone</Text>
        <View style={S.section}>
          <Row
            label="Delete My Account"
            onPress={() => Alert.alert(
              'Delete your account?',
              'This sends a request to Payport support to permanently delete your account and personal data. Your transaction records may be retained where required by law. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Request Deletion', style: 'destructive', onPress: () => {
                    const subject = encodeURIComponent('Account deletion request');
                    const body = encodeURIComponent(`Please delete my Payport account.\n\nRegistered phone number: ${user.phone}\nName: ${user.fullName}`);
                    Linking.openURL(`mailto:support@payport.africa?subject=${subject}&body=${body}`);
                  }
                },
              ]
            )}
          />
        </View>

        {/* Sign out */}
        <View style={{ padding: 20, paddingTop: 8 }}>
          <TouchableOpacity style={S.logoutBtn} onPress={() => Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(tabs)'); } }])}>
            <Text style={S.logoutTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* PIN confirmation modal — required once to securely store credentials behind biometrics */}
      <Modal visible={pinModalOpen} transparent animationType="fade" onRequestClose={() => setPinModalOpen(false)}>
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Confirm your PIN</Text>
            <Text style={S.modalSub}>Enter your PIN once to enable {bioType} login.</Text>
            <TextInput
              value={confirmPin}
              onChangeText={(v) => { setConfirmPin(v.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
              placeholder="4-digit PIN"
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              style={S.modalInput}
              autoFocus
            />
            {pinError !== '' && <Text style={S.modalError}>{pinError}</Text>}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setPinModalOpen(false)} style={[S.btn, { flex: 1, backgroundColor: Colors.borderLight }]}>
                <Text style={[S.btnTxt, { color: Colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmEnableBiometric} disabled={pinChecking} style={[S.btn, { flex: 1 }]}>
                <Text style={S.btnTxt}>{pinChecking ? 'Checking...' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GradientScreen>
  );
}

const S = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 }, emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
  btn: { backgroundColor: Colors.primary, borderRadius: 24, paddingHorizontal: 40, paddingVertical: 14, width: '100%', alignItems: 'center' },
  btnAccent: { backgroundColor: Colors.accent },
  btnTxt: { color: '#fff', fontWeight: '700', fontFamily: 'Rubik_700Bold', fontSize: 15 },
  avatarSection: { alignItems: 'center', paddingVertical: 28, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarTxt: { fontSize: 28, fontWeight: '700', color: '#fff', fontFamily: 'Rubik_700Bold' },
  userName: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 4 },
  userPhone: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', marginBottom: 8 },
  rolePill: { backgroundColor: '#E8EAF6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  roleText: { fontSize: 12, color: Colors.primary, fontWeight: '700', fontFamily: 'Rubik_700Bold', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, fontFamily: 'Rubik_700Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8, marginHorizontal: 16 },
  section: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  rowLabel: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary, fontFamily: 'Nunito_500Medium' },
  rowValue: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', marginTop: 2 },
  logoutBtn: { backgroundColor: Colors.accent, borderRadius: 24, paddingVertical: 16, alignItems: 'center' },
  logoutTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'Rubik_700Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(9,30,62,0.55)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, fontFamily: 'Rubik_800ExtraBold', marginBottom: 6 },
  modalSub: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', marginBottom: 16 },
  modalInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 18, letterSpacing: 4, textAlign: 'center', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  modalError: { fontSize: 12.5, color: Colors.red, fontFamily: 'Nunito_400Regular', marginTop: 8 },
});
