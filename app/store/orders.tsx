import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors, themed } from '../../constants/colors';
import { storeApi } from '../../lib/api';

/** How an order stands, in the customer's words (the same on every channel). */
export function orderState(o: any): string {
  if (o.orderStatus === 'CANCELLED') return 'Cancelled';
  if (o.deliveryStatus === 'READY') return 'Ready to collect';
  if (o.deliveryStatus === 'OUT') return 'On its way';
  if (o.deliveryStatus === 'DELIVERED' || o.deliveryStatus === 'COLLECTED') return 'Done';
  switch (o.paymentStatus) {
    case 'PAID': return 'Paid';
    case 'ON_DELIVERY': return 'Pay on delivery';
    case 'PENDING': case 'CONFIRMING': return 'Waiting for payment';
    case 'FAILED': case 'EXPIRED': return 'Not paid';
    default: return 'Awaiting payment';
  }
}

const S = themed(() => ({
  body: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  ref: { fontSize: 15, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  total: { fontSize: 15, color: Colors.primary, fontFamily: 'Rubik_700Bold' },
  meta: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, fontFamily: 'Nunito_400Regular' },
  state: { fontSize: 13, color: Colors.green, marginTop: 6, fontFamily: 'Rubik_700Bold' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontFamily: 'Nunito_400Regular' },
}));

export default function StoreOrders() {
  const router = useRouter();
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { storeApi.orders().then(r => setRows(r.data?.data || [])).catch(e => setError(e?.response?.data?.message || 'Your orders could not be loaded.')); }, []);
  return (
    <GradientScreen>
      <AppBar title="My orders" showBack />
      <ScrollView contentContainerStyle={S.body}>
        {!rows && !error && <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />}
        {!!error && <Text style={S.empty}>{error}</Text>}
        {rows && rows.length === 0 && <Text style={S.empty}>No store orders yet.</Text>}
        {(rows || []).map(o => (
          <TouchableOpacity key={o.orderRef} style={S.card} onPress={() => router.push(`/store/order/${o.orderRef}` as any)}>
            <View style={S.row}><Text style={S.ref}>{o.store}</Text><Text style={S.total}>{o.total}</Text></View>
            <Text style={S.meta}>{o.orderRef} · {o.summary}</Text>
            {!!o.booking && <Text style={S.meta}>{o.booking}</Text>}
            <Text style={S.state}>{orderState(o)}</Text>
            {!!o.paymentReason && orderState(o) === 'Not paid' && <Text style={[S.meta, { color: Colors.red }]}>{o.paymentReason}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </GradientScreen>
  );
}
