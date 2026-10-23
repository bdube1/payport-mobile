import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors } from '../../constants/colors';
import { transactionsApi, formatAmount } from '../../lib/api';

function fmtDate(val: any) {
  if (!val) return '—';
  try {
    if (Array.isArray(val)) { const [y,mo,d,h=0,m=0]=val; return new Date(y,mo-1,d,h,m).toLocaleString('en-ZW',{dateStyle:'medium',timeStyle:'short'}); }
    return new Date(val).toLocaleString('en-ZW',{dateStyle:'medium',timeStyle:'short'});
  } catch { return '—'; }
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: Colors.green, PAYMENT_PENDING: Colors.primary,
  PAYMENT_FAILED: Colors.red, FULFILMENT_FAILED: Colors.red,
  FULFILMENT_PENDING: Colors.orange, FULFILMENT_RETRY: Colors.orange, MANUAL_FULFILMENT: Colors.orange,
  PAYMENT_TIMEOUT: Colors.textSecondary, REFUND_PENDING: Colors.primary, REFUNDED: Colors.primary, CANCELLED: Colors.textSecondary,
};

export default function StatusScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const router  = useRouter();
  const [tx,    setTx]    = useState<any>(null);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const receiptRef = useRef<View>(null);

  useEffect(() => {
    transactionsApi.getStatus(ref).then(r => setTx(r.data?.data || r.data)).catch(() => setError('Could not load transaction'));
  }, [ref]);

  // Backend field is initiatedAt/completedAt, not createdAt -- that mismatch
  // is exactly why this date was showing blank. Prefer completedAt (when the
  // transaction actually finished) over initiatedAt (when it was started).
  const txDate = tx?.completedAt || tx?.initiatedAt;

  // Shares an actual image of the rendered receipt (everything inside
  // receiptRef), not a text message -- a screenshot can't be edited the way
  // a copy-pasted text summary could be.
  const handleShareReceipt = async () => {
    if (!receiptRef.current) return;
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
        return;
      }
      const uri = await captureRef(receiptRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Receipt' });
    } catch (e) {
      Alert.alert('Could not share receipt', 'Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const statusColor = tx ? (STATUS_COLOR[tx.status] || Colors.textSecondary) : Colors.textSecondary;
  const isSuccess = tx?.status === 'COMPLETED';

  return (
    <GradientScreen>
      <AppBar title="Transaction Details" showBack />
      <ScrollView showsVerticalScrollIndicator={false}>
        {!tx ? (
          <View style={S.centre}><Text style={S.emptyTxt}>{error || 'Loading...'}</Text></View>
        ) : (
          <View style={S.body}>
            {/* Everything inside this View is what gets captured for the
                shared receipt image -- action buttons live outside it. */}
            <View ref={receiptRef} collapsable={false} style={{ backgroundColor: Colors.background }}>
            {/* Status card */}
            <View style={[S.statusCard, { borderLeftColor: statusColor }]}>
              <Text style={[S.statusTxt, { color: statusColor }]}>
                {tx.status === 'COMPLETED' ? '✓ ' : (tx.status.includes('FAIL') || tx.status === 'PAYMENT_TIMEOUT') ? '✗ ' : '⏳ '}
                {tx.status.replace(/_/g, ' ')}
              </Text>
              {!!tx.outcomeMessage && <Text style={[S.statusDate, { color: statusColor }]}>{tx.outcomeMessage}</Text>}
              <Text style={S.statusDate}>{fmtDate(txDate)}</Text>
            </View>

            {/* Amount */}
            <View style={S.amountCard}>
              <Text style={S.amountLbl}>Amount</Text>
              <Text style={[S.amountVal, { color: Colors.primary }]}>{formatAmount(tx.amountCents, tx.currency)}</Text>
            </View>

            {/* Details */}
            <View style={S.detailCard}>
              {[['Reference', tx.reference], ['Service', tx.productName || tx.productTypeCode], ['Recipient', tx.recipientIdentifier], ['Payment via', tx.paymentMethodCode], ['Channel', tx.channel], ['Date', fmtDate(txDate)], tx.failureReason ? ['Failure reason', tx.failureReason] : null].filter(Boolean).map((row: any, i) => (
                <View key={i} style={[S.detailRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.borderLight }]}>
                  <Text style={S.detailLbl}>{row[0]}</Text>
                  <Text style={S.detailVal}>{row[1] || '—'}</Text>
                </View>
              ))}
            </View>

            {/* ZESA token */}
            {tx.deliveryPayload?.token && (
              <View style={S.tokenCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="flash" size={15} color={Colors.textPrimary} />
                  <Text style={S.tokenTitle}>ZESA Token</Text>
                </View>
                <Text style={S.tokenVal}>{tx.deliveryPayload.token}</Text>
                {tx.deliveryPayload.units && <Text style={S.tokenUnits}>{tx.deliveryPayload.units}</Text>}
              </View>
            )}
            </View>

            <View style={S.btnRow}>
              <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={S.btnOutline}><Text style={S.btnOutlineTxt}>Home</Text></TouchableOpacity>
              {isSuccess ? (
                <TouchableOpacity onPress={handleShareReceipt} disabled={sharing} style={[S.btnPrimary, sharing && { opacity: 0.7 }]}>
                  {sharing ? <ActivityIndicator color="#fff" /> : <Text style={S.btnTxt}>Share Receipt</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => router.push('/airtime')} style={S.btnPrimary}><Text style={S.btnTxt}>Top Up Again</Text></TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </GradientScreen>
  );
}

const S = StyleSheet.create({
  centre: { flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 16, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  body: { padding: 16 },
  statusCard: { backgroundColor: Colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.borderLight },
  statusTxt: { fontSize: 16, fontWeight: 'bold', fontFamily: 'Rubik_700Bold', marginBottom: 4 },
  statusDate: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  amountCard: { backgroundColor: Colors.cardBg, borderRadius: 16, padding: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  amountLbl: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', marginBottom: 4 },
  amountVal: { fontSize: 36, fontWeight: 'bold', fontFamily: 'Rubik_700Bold' },
  detailCard: { backgroundColor: Colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  detailLbl: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', flex: 1 },
  detailVal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', flex: 1, textAlign: 'right' },
  tokenCard: { backgroundColor: '#E3F2FD', borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#90CAF9' },
  tokenTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, fontFamily: 'Rubik_700Bold', marginBottom: 8 },
  tokenVal: { fontSize: 28, fontWeight: 'bold', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', letterSpacing: 4 },
  tokenUnits: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  btnOutline: { flex: 1, paddingVertical: 14, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  btnOutlineTxt: { color: Colors.primary, fontWeight: '700', fontFamily: 'Rubik_700Bold' },
  btnPrimary: { flex: 1, paddingVertical: 14, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontFamily: 'Rubik_700Bold' },
});
