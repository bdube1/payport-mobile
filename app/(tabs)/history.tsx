import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors } from '../../constants/colors';
import { transactionsApi, formatAmount } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

function fmtDate(val: any) {
  if (!val) return '—';
  try {
    if (Array.isArray(val)) { const [y,mo,d]=val; return new Date(y,mo-1,d).toLocaleDateString('en-ZW',{day:'numeric',month:'short',year:'numeric'}); }
    return new Date(val).toLocaleDateString('en-ZW',{day:'numeric',month:'short'});
  } catch { return '—'; }
}

const STATUS_COLOR: Record<string,string> = { COMPLETED: Colors.green, PAYMENT_PENDING: Colors.primary, PAYMENT_FAILED: Colors.red, FULFILMENT_FAILED: Colors.red, FULFILMENT_PENDING: Colors.orange };

export default function HistoryScreen() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const [txs,        setTxs]        = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const r = await transactionsApi.getMyHistory(0, 20);
      setTxs((r.data?.data || r.data)?.content || []);
    } catch { setError('Failed to load transactions'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (user) load(); else setLoading(false); }, [user]);

  return (
    <GradientScreen>
      <AppBar title="Transaction History" />
      {!user ? (
        <View style={S.centre}>
          <Ionicons name="time-outline" size={44} color={Colors.textSecondary} />
          <Text style={S.emptyTitle}>Sign in to view history</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={S.btn}><Text style={S.btnTxt}>Sign In</Text></TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={S.centre}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : error ? (
        <View style={S.centre}>
          <Text style={S.emptyTitle}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={S.btn}><Text style={S.btnTxt}>Retry</Text></TouchableOpacity>
        </View>
      ) : txs.length === 0 ? (
        <View style={S.centre}>
          <Ionicons name="time-outline" size={44} color={Colors.textSecondary} />
          <Text style={S.emptyTitle}>No transactions yet</Text>
        </View>
      ) : (
        <FlatList
          data={txs} keyExtractor={(item) => item.reference}
          contentContainerStyle={{ padding: 12 }}
          onRefresh={() => load(true)} refreshing={refreshing}
          renderItem={({ item }) => {
            const sc = STATUS_COLOR[item.status] || Colors.textSecondary;
            return (
              <TouchableOpacity onPress={() => router.push(`/status/${item.reference}`)} style={S.card} activeOpacity={0.85}>
                <View style={S.cardRow}>
                  <Text style={S.txName} numberOfLines={1}>{item.productName || 'Transaction'}</Text>
                  <Text style={[S.txAmount, { color: Colors.primary }]}>{formatAmount(item.amountCents, item.currency)}</Text>
                </View>
                <View style={S.cardRow}>
                  <Text style={S.txDate}>{item.recipientIdentifier}  ·  {fmtDate(item.createdAt)}</Text>
                  <Text style={[S.txStatus, { color: sc }]}>{item.status.replace(/_/g,' ')}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </GradientScreen>
  );
}

const S = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: Colors.primary, borderRadius: 24, paddingHorizontal: 32, paddingVertical: 14 },
  btnTxt: { color: '#fff', fontWeight: '700', fontFamily: 'Rubik_700Bold', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  txName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  txAmount: { fontSize: 15, fontWeight: '700', fontFamily: 'Rubik_700Bold' },
  txDate: { flex: 1, fontSize: 12, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  txStatus: { fontSize: 12, fontWeight: '700', fontFamily: 'Rubik_700Bold' },
});
