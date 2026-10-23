import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import GradientScreen from '../components/ui/GradientScreen';
import AppBar from '../components/ui/AppBar';
import { Colors } from '../constants/colors';
import { authApi } from '../lib/api';

export default function ChangePinScreen() {
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (currentPin.length !== 4) { Alert.alert('Invalid PIN', 'Enter your current 4-digit PIN.'); return; }
    if (newPin.length !== 4) { Alert.alert('Invalid PIN', 'New PIN must be exactly 4 digits.'); return; }
    if (newPin !== confirmPin) { Alert.alert('PINs do not match', 'Please re-enter your new PIN.'); return; }
    if (newPin === currentPin) { Alert.alert('Choose a different PIN', 'Your new PIN must be different from your current one.'); return; }

    setLoading(true);
    try {
      await authApi.changePin(currentPin, newPin);
      Alert.alert('PIN Changed', 'Your PIN has been updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Could not change PIN', e?.response?.data?.message || 'Please check your current PIN and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientScreen>
      <AppBar title="Change PIN" showBack />
      <View style={S.body}>
        <Text style={S.label}>Current PIN</Text>
        <TextInput
          style={S.input} value={currentPin} onChangeText={t => setCurrentPin(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="••••" placeholderTextColor={Colors.textSecondary}
        />

        <Text style={S.label}>New PIN</Text>
        <TextInput
          style={S.input} value={newPin} onChangeText={t => setNewPin(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="••••" placeholderTextColor={Colors.textSecondary}
        />

        <Text style={S.label}>Confirm New PIN</Text>
        <TextInput
          style={S.input} value={confirmPin} onChangeText={t => setConfirmPin(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="••••" placeholderTextColor={Colors.textSecondary}
        />

        <TouchableOpacity style={[S.btn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={S.btnTxt}>Change PIN</Text>}
        </TouchableOpacity>
      </View>
    </GradientScreen>
  );
}

const S = StyleSheet.create({
  body: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, fontFamily: 'Rubik_600SemiBold', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: Colors.cardBg, borderRadius: 12, padding: 16, fontSize: 20, letterSpacing: 8,
    borderWidth: 1, borderColor: Colors.borderLight, fontFamily: 'Rubik_700Bold', color: Colors.textPrimary,
  },
  btn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Rubik_700Bold' },
});
