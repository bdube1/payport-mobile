import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../../components/ui/GradientScreen';
import AppBar from '../../../components/ui/AppBar';
import { Colors, themed } from '../../../constants/colors';
import { storeApi } from '../../../lib/api';
import { orderState } from '../orders';

const S = themed(() => ({
  body: { padding: 20, paddingBottom: 40, alignItems: 'stretch' },
  icon: { alignSelf: 'center', marginTop: 10, marginBottom: 10 },
  state: { fontSize: 22, textAlign: 'center', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  sub: { fontSize: 14, textAlign: 'center', color: Colors.textSecondary, marginTop: 6, fontFamily: 'Nunito_400Regular' },
  box: { backgroundColor: Colors.cardBg, borderRadius: 16, padding: 16, marginTop: 20, borderWidth: 1, borderColor: Colors.borderLight },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  lbl: { color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  val: { color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  btn: { backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  btnTxt: { color: '#fff', fontSize: 15, fontFamily: 'Rubik_700Bold' },
}));

export default function StoreOrder() {
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const [o, setO] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stop = false;
    const tick = () => storeApi.get(ref).then(r => { if (!stop) setO(r.data?.data || r.data); }).catch(e => setError(e?.response?.data?.message || 'This order could not be loaded.'));
    tick();
    const t = setInterval(tick, 4000);   // the payment and the store's updates show by themselves
    return () => { stop = true; clearInterval(t); };
  }, [ref]);
  if (!o) return <GradientScreen><AppBar title="Order" showBack />{error ? <Text style={[S.sub, { marginTop: 30 }]}>{error}</Text> : <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />}</GradientScreen>;
  const state = orderState(o);
  const good = ['Paid', 'Pay on delivery', 'Ready to collect', 'On its way', 'Done'].includes(state);
  return (
    <GradientScreen>
      <AppBar title={o.orderRef} showBack />
      <ScrollView contentContainerStyle={S.body}>
        <Ionicons style={S.icon} name={good ? 'checkmark-circle' : state === 'Not paid' || state === 'Cancelled' ? 'close-circle' : 'time'} size={64}
          color={good ? Colors.green : state === 'Not paid' || state === 'Cancelled' ? Colors.red : Colors.primary} />
        <Text style={S.state}>{state}</Text>
        <Text style={S.sub}>{o.store}</Text>
        {!!o.paymentReason && state === 'Not paid' && <Text style={[S.sub, { color: Colors.red, fontFamily: 'Rubik_700Bold' }]}>{o.paymentReason}</Text>}
        {state === 'Waiting for payment' && o.payMethod !== 'CASH' && <><ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} /><Text style={S.sub}>The result shows here as soon as the payment is done.</Text></>}
        <View style={S.box}>
          <View style={S.row}><Text style={S.lbl}>Order</Text><Text style={S.val}>{o.summary}</Text></View>
          {!!o.booking && <View style={S.row}><Text style={S.lbl}>Appointment</Text><Text style={S.val}>{o.booking}</Text></View>}
          <View style={S.row}><Text style={S.lbl}>{o.deliveryMethod === 'DELIVERY' ? 'Delivery' : o.deliveryMethod === 'PICKUP' ? 'Collect' : 'Service'}</Text><Text style={S.val}>{o.payMethod === 'CASH' ? 'Pay on delivery' : 'Paid online'}</Text></View>
          <View style={S.row}><Text style={S.lbl}>Total</Text><Text style={[S.val, { color: Colors.primary }]}>{o.total}</Text></View>
        </View>
        {(state === 'Not paid' || state === 'Awaiting payment') && !!o.orderUrl && (
          <TouchableOpacity style={S.btn} onPress={() => Linking.openURL(o.orderUrl)}><Text style={S.btnTxt}>Pay this order</Text></TouchableOpacity>
        )}
        <TouchableOpacity style={[S.btn, { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border }]} onPress={() => router.replace('/store' as any)}>
          <Text style={[S.btnTxt, { color: Colors.textPrimary }]}>Back to the store</Text>
        </TouchableOpacity>
      </ScrollView>
    </GradientScreen>
  );
}
