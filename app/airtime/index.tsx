import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import * as Haptics from 'expo-haptics';
import { Colors, themed } from '../../constants/colors';
import { useCharge, methodLabel } from '../../lib/useCharges';
import { productsApi, startPayment, paymentError, normalizePhone, formatAmount, generateReference, visibleMethods } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { authenticateWithBiometric, isBiometricAvailable } from '../../lib/biometric';
import { isBiometricEnabled } from '../../lib/auth';

const S = themed(() => ({
  scroll: { flex: 1 }, body: { padding: 20 },
  err: { backgroundColor: Colors.errorBg, borderRadius: 12, padding: 12, marginBottom: 16 },
  errTxt: { color: Colors.red, fontSize: 14, fontFamily: 'Nunito_400Regular' },
  lbl: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 8, marginTop: 18 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, backgroundColor: Colors.cardBg, fontFamily: 'Nunito_400Regular' },
  phoneRow: { flexDirection: 'row', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, overflow: 'hidden', marginBottom: 6 },
  pfx: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.primary, justifyContent: 'center' },
  pfxTxt: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: 'Rubik_700Bold' },
  phoneIn: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, fontFamily: 'Nunito_400Regular' },
  detecting: { fontSize: 13, color: Colors.primary, fontFamily: 'Nunito_400Regular', marginBottom: 8 },
  netBadge: { backgroundColor: Colors.successBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 4 },
  netBadgeTxt: { fontSize: 13, fontWeight: '700', color: Colors.green, fontFamily: 'Rubik_700Bold' },
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
  chip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  chipTxt: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  chipActiveTxt: { color: '#fff' },
  btnPrimary: { backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  btnGreen: { flex: 2, backgroundColor: Colors.green, borderRadius: 24, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { flex: 1, paddingVertical: 16, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  btnOutlineTxt: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'Rubik_700Bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 20 },
  summaryBox: { backgroundColor: Colors.subtleBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 20 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  sumLbl: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  sumVal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', textAlign: 'right', flex: 1, marginLeft: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4 },
  totalLbl: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  totalVal: { fontSize: 20, fontWeight: 'bold', color: Colors.primary, fontFamily: 'Rubik_700Bold' },
  modalBtns: { flexDirection: 'row', gap: 12 },
}));

export default function AirtimeScreen() {
  const router = useRouter();
  const { phone: prefillPhone, amount: prefillAmount } = useLocalSearchParams<{ phone?: string; amount?: string }>();
  const [recipientPhone, setRecipientPhone] = useState(prefillPhone || '');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [currency, setCurrency] = useState('');
  const [customAmt, setCustomAmt] = useState(prefillAmount || '');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [network, setNetwork] = useState<any>(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [walletPin, setWalletPin] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    productsApi.getAll().then(r => setProducts((r.data?.data || r.data || []).filter((p: any) => p.category === 'AIRTIME'))).catch(() => {});
    productsApi.getPaymentMethods().then(r => { const m = visibleMethods((r.data?.data || r.data || []).filter((m: any) => m.isActive), !!useAuthStore.getState().user); setPaymentMethods(m); if (m.length > 0) setPaymentMethod(m[0].code); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setNetwork(null); setCurrencies([]); setCurrency('');
    const norm = normalizePhone(recipientPhone);
    if (norm.length < 12) return;
    debounceRef.current = setTimeout(async () => {
      setNetworkLoading(true);
      try {
        const r = await productsApi.detectNetwork(norm);
        const det = r.data?.data || r.data;
        setNetwork(det);
        const prod = products.find((p: any) => p.code === `AIRTIME_${det.networkCode}`);
        const active = prod?.enabledCurrencies?.filter((c: any) => c.isActive !== false).map((c: any) => c.currency) || ['USD', 'ZWG'];
        setCurrencies(active);
        if (active.length === 1) setCurrency(active[0]);
      } catch { setNetwork(null); } finally { setNetworkLoading(false); }
    }, 500);
  }, [recipientPhone, products]);

  const networkDetected = !!network && !networkLoading;
  const pm = paymentMethods.find((m: any) => m.code === paymentMethod);
  const amtCents = customAmt ? Math.round(parseFloat(customAmt) * 100) : 0;
  const quote = useCharge(network?.networkCode ? `AIRTIME_${network.networkCode}` : null, currency, amtCents);
  const payTotal = quote ? quote.totalCents : amtCents;

  const handleReview = () => {
    setError('');
    if (normalizePhone(recipientPhone).length < 12) { setError('Enter a valid recipient number'); return; }
    if (!networkDetected) { setError('Wait for network detection'); return; }
    if (!currency) { setError('Select a currency'); return; }
    if (!customAmt || amtCents < 1) { setError('Enter an amount'); return; }
    if (!paymentMethod) { setError('Select a payment method'); return; }
    if (paymentMethod === 'WALLET' ? walletPin.length < 4 : normalizePhone(paymentPhone).length < 12) { setError(paymentMethod === 'WALLET' ? 'Enter your PIN' : 'Enter your wallet number'); return; }
    setShowConfirm(true);
  };

  const handlePay = async () => {
    if (await isBiometricAvailable() && await isBiometricEnabled()) {
      const r = await authenticateWithBiometric('Confirm airtime payment');
      if (!r.success) { setShowConfirm(false); return; }
    }
    setLoading(true);
    const ref = generateReference('MOB');
    const me = useAuthStore.getState().user;
    const payPhone = paymentMethod === 'WALLET' && me ? normalizePhone(me.phone) : normalizePhone(paymentPhone);
    try {
      await startPayment({ reference: ref, productTypeCode: `AIRTIME_${network.networkCode}`, recipientIdentifier: normalizePhone(recipientPhone), amountCents: amtCents, currency, customerPhone: payPhone, channel: 'MOB' },
        { paymentMethodCode: paymentMethod, customerPhone: payPhone, pin: walletPin });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConfirm(false);
      router.push(`/processing/${ref}`);
    } catch (e: any) {
      setError(paymentError(e).message);
      setLoading(false); setShowConfirm(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <GradientScreen>
      <AppBar title="Buy Airtime" showBack />
      <ScrollView style={S.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={S.body}>
          {error !== '' && <View style={S.err}><Text style={S.errTxt}>{error}</Text></View>}
          <Text style={S.lbl}>Recipient Number</Text>
          <View style={[S.phoneRow, networkDetected && { borderColor: Colors.green }]}>
            <View style={S.pfx}><Text style={S.pfxTxt}>+263</Text></View>
            <TextInput value={recipientPhone} onChangeText={setRecipientPhone} placeholderTextColor={Colors.textSecondary} keyboardType="phone-pad" style={S.phoneIn} autoFocus={!prefillPhone} />
            {networkLoading && <ActivityIndicator color={Colors.primary} size="small" style={{ marginRight: 12 }} />}
          </View>
          {networkLoading && <Text style={S.detecting}>Detecting network...</Text>}
          {networkDetected && <View style={S.netBadge}><Text style={S.netBadgeTxt}>✓ {network.networkName} detected</Text></View>}
          {networkDetected && <>
            {currencies.length > 0 && <><Text style={S.lbl}>Currency</Text><View style={S.chipRow}>{currencies.map(c => <TouchableOpacity key={c} onPress={() => setCurrency(c)} style={[S.chip, currency === c && S.chipActive]}><Text style={[S.chipTxt, currency === c && S.chipActiveTxt]}>{c}</Text></TouchableOpacity>)}</View></>}
            <Text style={S.lbl}>Amount{currency ? ` (${currency})` : ''}</Text>
            <TextInput value={customAmt} onChangeText={setCustomAmt} placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" style={S.input} />
            {paymentMethods.length > 0 && <><Text style={S.lbl}>Payment Method</Text><View style={S.chipRow}>{paymentMethods.map((m: any) => <TouchableOpacity key={m.code} onPress={() => setPaymentMethod(m.code)} style={[S.chip, paymentMethod === m.code && S.chipActive]}><Text style={[S.chipTxt, paymentMethod === m.code && S.chipActiveTxt]}>{methodLabel(m)}</Text></TouchableOpacity>)}</View></>}
            {paymentMethod === 'WALLET' && <><Text style={S.lbl}>Wallet PIN</Text><TextInput value={walletPin} onChangeText={t => setWalletPin(t.replace(/\D/g, ''))} placeholder="Your Payport PIN" placeholderTextColor={Colors.textSecondary} keyboardType="number-pad" secureTextEntry maxLength={6} style={S.input} /></>}
            {paymentMethod !== 'WALLET' && <><Text style={S.lbl}>Payment Wallet Number</Text>
            <View style={S.phoneRow}><View style={S.pfx}><Text style={S.pfxTxt}>+263</Text></View><TextInput value={paymentPhone} onChangeText={setPaymentPhone} placeholder="Wallet for USSD prompt" placeholderTextColor={Colors.textSecondary} keyboardType="phone-pad" style={S.phoneIn} /></View></>}
            <TouchableOpacity style={S.btnPrimary} onPress={handleReview}><Text style={S.btnTxt}>Confirm and Pay</Text></TouchableOpacity>
          </>}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
      <Modal visible={showConfirm} transparent animationType="slide" onRequestClose={() => setShowConfirm(false)}>
        <View style={S.overlay}><View style={S.sheet}><View style={S.sheetHandle} />
          <Text style={S.sheetTitle}>Confirm payment</Text>
          <View style={S.summaryBox}>
            {[['Service', `${network?.networkName || ''} Airtime`], ['Recipient', normalizePhone(recipientPhone)], ['Amount', formatAmount(payTotal, currency)], ['Pay via', pm ? methodLabel(pm) : paymentMethod], ...(paymentMethod === 'WALLET' ? [] : [['Wallet', normalizePhone(paymentPhone)]])].map(([l, v]) => <View key={l} style={S.sumRow}><Text style={S.sumLbl}>{l}</Text><Text style={S.sumVal}>{v}</Text></View>)}
          </View>
          <View style={S.modalBtns}>
            <TouchableOpacity style={S.btnOutline} onPress={() => setShowConfirm(false)}><Text style={S.btnOutlineTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[S.btnGreen, loading && { opacity: 0.6 }]} onPress={handlePay} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={S.btnTxt}>Pay {formatAmount(payTotal, currency)}</Text>}
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </GradientScreen>
  );
}
