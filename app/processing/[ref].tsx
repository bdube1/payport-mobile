import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { transactionsApi } from '../../lib/api';

const STEPS = [
  { key: 'INITIATED',           label: 'Order created'     },
  { key: 'PAYMENT_PENDING',     label: 'Awaiting payment'  },
  { key: 'PAYMENT_CONFIRMED',   label: 'Payment confirmed' },
  { key: 'FULFILMENT_PENDING',  label: 'Processing'        },
  { key: 'COMPLETED',           label: 'Delivered!'        },
];
const FINAL = ['COMPLETED', 'PAYMENT_FAILED', 'FULFILMENT_FAILED', 'REFUNDED', 'TIMEOUT'];

export default function ProcessingScreen() {
  const { ref }  = useLocalSearchParams<{ ref: string }>();
  const router   = useRouter();
  const [tx,     setTx]    = useState<any>(null);
  const [dots,   setDots]  = useState('');
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotsRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const hapticFired = useRef(false);

  const poll = async () => {
    try {
      const r = await transactionsApi.getStatus(ref);
      const data = r.data?.data || r.data;
      setTx(data);
      if (FINAL.includes(data.status)) {
        clearInterval(pollRef.current!);
        if (!hapticFired.current) {
          hapticFired.current = true;
          await Haptics.notificationAsync(data.status === 'COMPLETED' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch {}
  };

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 3000);
    dotsRef.current = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => { clearInterval(pollRef.current!); clearInterval(dotsRef.current!); };
  }, []);

  const status     = tx?.status || 'INITIATED';
  const isComplete = status === 'COMPLETED';
  const isFailed   = ['PAYMENT_FAILED', 'FULFILMENT_FAILED', 'TIMEOUT'].includes(status);
  const stepIdx    = STEPS.findIndex(s => s.key === status);
  const displayIdx = stepIdx === -1 ? 1 : stepIdx;

  return (
    <GradientScreen edges={['top', 'bottom']}>
      <View style={S.container}>
        <View style={[S.icon, { backgroundColor: isComplete ? Colors.green : isFailed ? Colors.red : Colors.primary }]}>
          {isComplete ? <Ionicons name="checkmark" size={40} color="#fff" /> :
           isFailed   ? <Ionicons name="close" size={40} color="#fff" /> :
                         <ActivityIndicator size="large" color="#fff" />}
        </View>
        <Text style={S.title}>{isComplete ? 'Payment Successful!' : isFailed ? 'Transaction Failed' : `Processing${dots}`}</Text>
        <Text style={S.sub}>{isComplete ? 'Your order has been delivered.' : isFailed ? (tx?.failureReason || 'Something went wrong.') : 'Approve the USSD prompt on your phone.'}</Text>
        <View style={S.refChip}><Text style={S.refTxt}>{ref}</Text></View>

        <View style={S.stepsCard}>
          {STEPS.map((s, idx) => {
            const done   = idx < displayIdx;
            const active = idx === displayIdx && !isComplete && !isFailed;
            return (
              <View key={s.key} style={[S.stepRow, idx < STEPS.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.borderLight }]}>
                <View style={[S.dot, done && { backgroundColor: Colors.green }, active && { backgroundColor: Colors.primary }]}>
                  {active ? <ActivityIndicator color="#fff" size="small" /> : done ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{String(idx + 1)}</Text>}
                </View>
                <Text style={[S.stepLbl, done && { color: Colors.green, fontWeight: '700' }, active && { color: Colors.primary, fontWeight: '700' }]}>{s.label}</Text>
              </View>
            );
          })}
        </View>

        {!isComplete && !isFailed && <Text style={S.hint}>Check your phone for a USSD prompt and enter your PIN.</Text>}

        {isComplete && (
          <View style={S.btnRow}>
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={S.btnOutline}><Text style={S.btnOutlineTxt}>Home</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(`/status/${ref}`)} style={S.btnPrimary}><Text style={S.btnTxt}>View Receipt</Text></TouchableOpacity>
          </View>
        )}
        {isFailed && (
          <View style={S.btnRow}>
            <TouchableOpacity onPress={() => router.back()} style={S.btnOutline}><Text style={S.btnOutlineTxt}>Try Again</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={S.btnPrimary}><Text style={S.btnTxt}>Home</Text></TouchableOpacity>
          </View>
        )}
      </View>
    </GradientScreen>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  refChip: { backgroundColor: '#F0F4FF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 24, borderWidth: 1, borderColor: '#C5CAE9' },
  refTxt: { fontSize: 12, color: Colors.primary, fontFamily: 'Nunito_400Regular' },
  stepsCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.borderLight },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.divider, alignItems: 'center', justifyContent: 'center' },
  stepLbl: { flex: 1, fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  hint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', fontFamily: 'Nunito_400Regular', marginBottom: 24 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btnOutline: { flex: 1, paddingVertical: 14, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  btnOutlineTxt: { color: Colors.primary, fontWeight: '700', fontFamily: 'Rubik_700Bold' },
  btnPrimary: { flex: 2, paddingVertical: 14, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontFamily: 'Rubik_700Bold' },
});
