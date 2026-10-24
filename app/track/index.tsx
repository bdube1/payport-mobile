import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors, themed } from '../../constants/colors';
import { transactionsApi } from '../../lib/api';

export default function TrackOrderScreen() {
  const router = useRouter();
  const [ref,     setRef]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleTrack = async () => {
    const trimmed = ref.trim().toUpperCase();
    if (!trimmed) { setError('Enter a transaction reference'); return; }
    setError(''); setLoading(true);
    try {
      await transactionsApi.getStatus(trimmed);
      router.push(`/status/${trimmed}`);
    } catch (e: any) {
      setError(e.response?.status === 404 ? 'Transaction not found. Check your reference.' : 'Could not find transaction. Check your connection.');
    } finally { setLoading(false); }
  };

  return (
    <GradientScreen>
      <AppBar title="Track Order" showBack />
      <View style={S.body}>
        <Text style={S.hint}>Your reference looks like: PP-MOB-20260315-001234</Text>
        {error !== '' && <View style={S.err}><Text style={S.errTxt}>{error}</Text></View>}
        <Text style={S.lbl}>Transaction Reference</Text>
        <TextInput value={ref} onChangeText={v => { setRef(v); setError(''); }}
          placeholder="PP-MOB-YYYYMMDD-XXXXXX"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="characters" style={S.input}
          returnKeyType="search" onSubmitEditing={handleTrack} />
        <TouchableOpacity style={[S.btn, (!ref.trim() || loading) && { opacity: 0.5 }]} onPress={handleTrack} disabled={!ref.trim() || loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="search" size={16} color="#fff" /><Text style={S.btnTxt}>Track Order</Text></>}
        </TouchableOpacity>

        <View style={S.tipCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="bulb-outline" size={17} color={Colors.primary} />
            <Text style={S.tipTitle}>Where do I find my reference?</Text>
          </View>
          <Text style={S.tipTxt}>• Check your SMS after payment{'\n'}• Look in the History tab if signed in{'\n'}• It was shown on the processing screen</Text>
        </View>
      </View>
    </GradientScreen>
  );
}

const S = themed(() => ({
  body: { padding: 20 },
  hint: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', marginBottom: 20 },
  err: { backgroundColor: Colors.errorBg, borderRadius: 12, padding: 12, marginBottom: 12 },
  errTxt: { color: Colors.red, fontSize: 14, fontFamily: 'Nunito_400Regular' },
  lbl: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, backgroundColor: Colors.cardBg, fontFamily: 'Nunito_400Regular', marginBottom: 20 },
  btn: { flexDirection: 'row', gap: 8, backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'Rubik_700Bold' },
  tipCard: { backgroundColor: 'rgba(6,163,218,0.06)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(6,163,218,0.15)' },
  tipTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, fontFamily: 'Rubik_700Bold' },
  tipTxt: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', lineHeight: 22 },
}));
