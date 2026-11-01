import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import * as Haptics from 'expo-haptics';
import { Colors, themed } from '../../constants/colors';
import { transactionsApi } from '../../lib/api';

const STEPS = [
  { key: 'INITIATED',           label: 'Order created'     },
  { key: 'PAYMENT_PENDING',     label: 'Awaiting payment'  },
  { key: 'PAYMENT_CONFIRMED',   label: 'Payment confirmed' },
  { key: 'FULFILMENT_PENDING',  label: 'Processing'        },
  { key: 'COMPLETED',           label: 'Successful'        },
];
// Driven by the backend's `outcome` (the same answer the web app, USSD and push give).
// REQUIRES_PAYMENT and PROCESSING are in progress; everything else is final. TIMED_OUT is
// final: money that arrives after the window is refunded, never delivered.
const IN_PROGRESS = ['REQUIRES_PAYMENT', 'PROCESSING'];
// Paid and the purchase is being sent: the screen keeps waiting for the provider's final answer (success or failure).
const DELIVERING = ['FULFILMENT_PENDING', 'PAYMENT_CONFIRMED', 'FULFILMENT_RETRY'];

function outcomeOf(tx: any): string {
  if (!tx) return 'PROCESSING';
  if (tx.outcome) return tx.outcome;
  switch (tx.status) {
    case 'COMPLETED': return 'SUCCEEDED';
    case 'PAYMENT_FAILED': case 'FULFILMENT_FAILED': case 'MANUAL_FULFILMENT': return 'FAILED';
    case 'PAYMENT_TIMEOUT': return 'TIMED_OUT';
    case 'REFUND_PENDING': case 'REFUNDED': return 'REFUNDED';
    case 'CANCELLED': return 'CANCELLED';
    case 'INITIATED': return 'REQUIRES_PAYMENT';
    default: return 'PROCESSING';
  }
}

export default function ProcessingScreen() {
  const { ref }  = useLocalSearchParams<{ ref: string }>();
  const router   = useRouter();
  const [tx,     setTx]    = useState<any>(null);
  const [dots,   setDots]  = useState('');
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotsRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const hapticFired = useRef(false);
  const [otp, setOtp] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState('');

  const submitOtp = async () => {
    if (!otp.trim()) return;
    setOtpBusy(true); setOtpError('');
    try {
      const r = await transactionsApi.confirmOmariOtp(ref, otp.trim());
      setTx(r.data?.data || r.data);
      setOtp('');
    } catch (e: any) {
      setOtpError(e?.response?.data?.message || e?.response?.data?.error?.message || 'The code could not be checked');
    } finally { setOtpBusy(false); }
  };

  const poll = async () => {
    try {
      const r = await transactionsApi.getStatus(ref);
      const data = r.data?.data || r.data;
      setTx(data);
      const outcome = outcomeOf(data);
      if (!IN_PROGRESS.includes(outcome)) {
        clearInterval(pollRef.current!);
        // Paid, the provider has not answered about the purchase yet: keep waiting for its final answer.
        if (outcome === 'NO_RESPONSE' && DELIVERING.includes(data.status)) { pollRef.current = setInterval(poll, 4000); return; }
        if (!hapticFired.current) {
          hapticFired.current = true;
          await Haptics.notificationAsync(outcome === 'SUCCEEDED' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
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
  const outcome    = outcomeOf(tx);
  const message    = tx?.outcomeMessage || tx?.failureReason || '';
  const isComplete = outcome === 'SUCCEEDED';
  const confirmingDelivery = outcome === 'NO_RESPONSE' && DELIVERING.includes(status);
  const isTimedOut = outcome === 'TIMED_OUT' || (outcome === 'NO_RESPONSE' && !confirmingDelivery);
  const isRefunded = outcome === 'REFUNDED';
  const isFailed   = outcome === 'FAILED' || isTimedOut || outcome === 'CANCELLED';
  const stepIdx    = STEPS.findIndex(s => s.key === status);
  const displayIdx = stepIdx === -1 ? (['FULFILMENT_RETRY', 'MANUAL_FULFILMENT', 'FULFILMENT_FAILED'].includes(status) ? 3 : 1) : stepIdx;
  const title = isComplete ? 'Payment Successful!'
    : isTimedOut ? 'Payment not completed in time'
    : outcome === 'CANCELLED' ? 'Cancelled'
    : isFailed ? 'Transaction Failed'
    : isRefunded ? 'Refunded'
    : DELIVERING.includes(status) ? `Payment approved${dots}`
    : `Processing${dots}`;
  const what = tx?.productName || 'your purchase';
  const deliveryFailed = isFailed && ['FULFILMENT_FAILED', 'MANUAL_FULFILMENT'].includes(status);
  const subtitle = isComplete ? `${what} was successful.`
    : deliveryFailed ? `${message || 'The provider could not complete it.'} Your payment will be refunded.`
    : isFailed ? (message || 'The payment was not successful. No money was taken.')
    : isRefunded ? (message || 'Your payment has been refunded.')
    : DELIVERING.includes(status) ? `Sending ${what} now. Please wait for the result.`
    : 'Approve the prompt on your phone.';

  return (
    <GradientScreen edges={['top', 'bottom']}>
      <View style={S.container}>
        <View style={[S.icon, { backgroundColor: isComplete ? Colors.green : isFailed ? Colors.red : Colors.primary }]}>
          {isComplete ? <Ionicons name="checkmark" size={40} color="#fff" /> :
           isFailed   ? <Ionicons name="close" size={40} color="#fff" /> :
                         <ActivityIndicator size="large" color="#fff" />}
        </View>
        <Text style={S.title}>{title}</Text>
        <Text style={S.sub}>{subtitle}</Text>
        {isTimedOut && <Text style={S.hint}>If money left your wallet after this, it will be refunded automatically. A late payment is never used.</Text>}
        <View style={S.refChip}><Text style={S.refTxt}>{ref}</Text></View>

        <View style={S.stepsCard}>
          {STEPS.map((s, idx) => {
            const done   = idx < displayIdx;
            const active = idx === displayIdx && !isComplete && !isFailed && !isRefunded;
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

        {!isComplete && !isFailed && tx?.requiresOtpEntry && (
          <View style={S.otpCard}>
            <Text style={S.otpLbl}>Enter the code O'mari sent to your phone</Text>
            {!!otpError && <Text style={S.otpErr}>{otpError}</Text>}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput value={otp} onChangeText={t => setOtp(t.replace(/\s/g, ''))} keyboardType="number-pad" placeholder="Code"
                placeholderTextColor={Colors.textSecondary} style={S.otpInput} maxLength={10} />
              <TouchableOpacity onPress={submitOtp} disabled={otpBusy || !otp.trim()} style={[S.btnPrimary, { flex: 0, paddingHorizontal: 18, opacity: otpBusy ? 0.6 : 1 }]}>
                <Text style={S.btnTxt}>{otpBusy ? '…' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!isComplete && !isFailed && !!tx?.paymentCode && (
          <View style={S.otpCard}>
            <Text style={S.otpLbl}>Your InnBucks payment code</Text>
            <Text style={S.code} selectable>{tx.paymentCode}</Text>
            <Text style={S.hint}>Open the InnBucks app and approve this code.</Text>
          </View>
        )}

        {!isComplete && !isFailed && !isRefunded && displayIdx < 2 && !tx?.requiresOtpEntry && !tx?.paymentCode && <Text style={S.hint}>Check your phone for a USSD prompt and enter your PIN.</Text>}

        {isComplete && (
          <View style={S.btnRow}>
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={S.btnOutline}><Text style={S.btnOutlineTxt}>Home</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(`/status/${ref}`)} style={S.btnPrimary}><Text style={S.btnTxt}>View Receipt</Text></TouchableOpacity>
          </View>
        )}
        {(isFailed || isRefunded) && (
          <View style={S.btnRow}>
            <TouchableOpacity onPress={() => router.back()} style={S.btnOutline}><Text style={S.btnOutlineTxt}>Try Again</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={S.btnPrimary}><Text style={S.btnTxt}>Home</Text></TouchableOpacity>
          </View>
        )}
      </View>
    </GradientScreen>
  );
}

const S = themed(() => ({
  otpCard: { width: '100%', backgroundColor: Colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  otpLbl: { fontSize: 13, color: Colors.textPrimary, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  otpErr: { fontSize: 12.5, color: Colors.red, marginBottom: 8, textAlign: 'center' },
  otpInput: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 18, letterSpacing: 4, color: Colors.textPrimary, backgroundColor: Colors.subtleBg },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: Colors.textPrimary, textAlign: 'center', marginVertical: 6 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  refChip: { backgroundColor: Colors.subtleBg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 24, borderWidth: 1, borderColor: '#C5CAE9' },
  refTxt: { fontSize: 12, color: Colors.primary, fontFamily: 'Nunito_400Regular' },
  stepsCard: { width: '100%', backgroundColor: Colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.borderLight },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.divider, alignItems: 'center', justifyContent: 'center' },
  stepLbl: { flex: 1, fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  hint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', fontFamily: 'Nunito_400Regular', marginBottom: 24 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btnOutline: { flex: 1, paddingVertical: 14, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  btnOutlineTxt: { color: Colors.primary, fontWeight: '700', fontFamily: 'Rubik_700Bold' },
  btnPrimary: { flex: 2, paddingVertical: 14, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontFamily: 'Rubik_700Bold' },
}));
