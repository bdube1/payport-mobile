import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import * as Haptics from 'expo-haptics';
import { Colors, themed } from '../../constants/colors';
import { useCharge, useWalletBalances, methodLabel, chargeRows } from '../../lib/useCharges';
import { startPayment, paymentError, billersApi, productsApi, normalizePhone, formatAmount, generateReference, visibleMethods } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { fetchActiveBillers, getFallbackIcon, Biller } from '../../lib/billers';
import { authenticateWithBiometric, isBiometricAvailable } from '../../lib/biometric';
import { isBiometricEnabled } from '../../lib/auth';

export default function BillsScreen() {
  const router = useRouter();
  const { biller: prefillBillerCode, account: prefillAccount } = useLocalSearchParams<{ biller?: string; account?: string }>();
  const [billers, setBillers] = useState<any[]>([]);
  const [billersLoading, setBillersLoading] = useState(true);
  const [biller, setBiller] = useState<any>(null);
  const [accountRef, setAccountRef] = useState(prefillAccount || '');
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [walletPin, setWalletPin] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    productsApi.getPaymentMethods()
      .then(r => { const m = visibleMethods((r.data?.data || r.data || []).filter((m: any) => m.isActive), !!useAuthStore.getState().user); setPaymentMethods(m); if (m.length > 0) setPaymentMethod(m[0].code); })
      .catch(() => {});

    // Billers are entirely admin-driven — same source of truth (and same
    // mapping) as the website, not a fixed list baked into the app. Whatever
    // is active in the ops back office shows up here automatically.
    fetchActiveBillers()
      .then(setBillers)
      .catch(() => {})
      .finally(() => setBillersLoading(false));
  }, []);

  // Apply a beneficiary hand-off once the real billers list has loaded —
  // can't select from it before it exists.
  useEffect(() => {
    if (prefillBillerCode && billers.length > 0 && !biller) {
      const match = billers.find(b => b.code === prefillBillerCode);
      if (match) setBiller(match);
    }
  }, [billers, prefillBillerCode]);

  const selectBiller = (b: any) => { setBiller(b); setAccountRef(''); setCustomerInfo(null); setAmount(''); setError(''); };

  const lookupCustomer = async () => {
    if (!accountRef.trim()) { setError('Enter the account/meter number'); return; }
    setInfoLoading(true); setError('');
    try {
      const r = await billersApi.lookup(biller.code, accountRef.trim().replace(/\s+/g, ''), currency);
      const a = r.data?.data || {};
      if (!a.payable) { setCustomerInfo(null); setError(a.notPayableReason || 'This account cannot be paid right now.'); return; }
      const accepted: string[] = a.acceptedCurrencies?.length ? a.acceptedCurrencies : [a.currency || currency];
      if (!accepted.includes(currency)) { setCustomerInfo(null); setError(`This account accepts ${accepted.join(' or ')} only.`); return; }
      const d = a.details || {};
      setCustomerInfo({ customerName: a.holderName, outstandingBalance: d.balanceMinor ? Number(d.balanceMinor) / 100 : 0, acceptedCurrencies: accepted });
    }
    catch (e: any) { setError(e.response?.data?.message || 'Account not found'); setCustomerInfo(null); }
    finally { setInfoLoading(false); }
  };

  const pm = paymentMethods.find((m: any) => m.code === paymentMethod);
  const amtCents = amount ? Math.round(parseFloat(amount) * 100) : 0;
  const quote = useCharge(biller?.productCode, currency, amtCents);
  const balances = useWalletBalances();
  const payTotal = quote ? quote.totalCents : amtCents;

  const handleReview = () => {
    setError('');
    if (!biller) { setError('Select a biller'); return; }
    if (!accountRef.trim()) { setError('Enter the account number'); return; }
    if (!amount || amtCents < 1) { setError('Enter a valid amount'); return; }
    if (!paymentMethod) { setError('Select a payment method'); return; }
    if (normalizePhone(paymentPhone).length < 12) { setError('Enter your wallet number'); return; }
    setShowConfirm(true);
  };

  const handlePay = async () => {
    if (await isBiometricAvailable() && await isBiometricEnabled()) {
      const r = await authenticateWithBiometric('Confirm bill payment'); if (!r.success) { setShowConfirm(false); return; }
    }
    setLoading(true);
    const ref = generateReference('MOB');
    const payPhone = normalizePhone(paymentPhone);
    try {
      await startPayment({ reference: ref, productTypeCode: biller.productCode, recipientIdentifier: accountRef.trim(), amountCents: amtCents, currency, customerPhone: payPhone, channel: 'MOB' },
        { paymentMethodCode: paymentMethod, customerPhone: payPhone, pin: walletPin });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConfirm(false); router.push(`/processing/${ref}`);
    } catch (e: any) {
      setError(paymentError(e).message); setLoading(false); setShowConfirm(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <GradientScreen>
      <AppBar title="Pay Bills" showBack />
      <ScrollView style={S.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={S.body}>
          {error !== '' && <View style={S.err}><Text style={S.errTxt}>{error}</Text></View>}

          {/* 1. Biller */}
          <Text style={S.lbl}>Select Biller</Text>
          {billersLoading ? (
            <View style={S.billersLoading}><ActivityIndicator color={Colors.primary} /></View>
          ) : billers.length === 0 ? (
            <View style={S.billersEmpty}><Text style={S.billersEmptyTxt}>No billers available at the moment</Text></View>
          ) : (
            <View style={S.billerGrid}>
              {billers.map(b => {
                const showLogo = b.fullLogoUrl && !logoError[b.code];
                const active = biller?.code === b.code;
                return (
                  <TouchableOpacity key={b.code} onPress={() => selectBiller(b)}
                    style={[S.billerCard, active && { borderColor: b.color, backgroundColor: `${b.color}12` }]}>
                    {showLogo ? (
                      <Image
                        source={{ uri: b.fullLogoUrl }}
                        style={S.billerLogo}
                        resizeMode="contain"
                        onError={() => setLogoError(p => ({ ...p, [b.code]: true }))}
                      />
                    ) : (
                      <View style={[S.billerIconBadge, { backgroundColor: `${b.color}20` }]}>
                        <Ionicons name={getFallbackIcon(b.code)} size={20} color={b.color} />
                      </View>
                    )}
                    <Text style={[S.billerName, active && { color: b.color }]}>{b.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {biller && <>
            {/* 2. Account number */}
            <Text style={S.lbl}>{biller.field}</Text>
            <View style={S.lookupRow}>
              <TextInput value={accountRef} onChangeText={v => { setAccountRef(v); setCustomerInfo(null); }}
                placeholder={`Enter ${biller.field.toLowerCase()}`} placeholderTextColor={Colors.textSecondary}
                keyboardType={biller.code === 'ZESA' ? 'numeric' : 'default'}
                style={[S.lookupInput, customerInfo && { borderColor: Colors.green }]} />
              <TouchableOpacity onPress={lookupCustomer} disabled={infoLoading || !accountRef.trim()}
                style={[S.lookupBtn, !accountRef.trim() && { opacity: 0.4 }]}>
                {infoLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={S.lookupBtnTxt}>Look up</Text>}
              </TouchableOpacity>
            </View>
            {customerInfo && (
              <View style={S.customerCard}>
                <Text style={S.customerName}>✓ {customerInfo.customerName || 'Account verified'}</Text>
                {customerInfo.outstandingBalance > 0 && <Text style={S.customerBal}>Outstanding: {formatAmount(customerInfo.outstandingBalance * 100, currency)}</Text>}
              </View>
            )}

            {/* 3. Currency */}
            <Text style={S.lbl}>Currency</Text>
            <View style={S.chipRow}>
              {['USD', 'ZWG'].map(c => <TouchableOpacity key={c} onPress={() => setCurrency(c)} style={[S.chip, currency === c && S.chipActive]}><Text style={[S.chipTxt, currency === c && S.chipActiveTxt]}>{c}</Text></TouchableOpacity>)}
            </View>

            {/* 4. Amount */}
            <Text style={S.lbl}>Amount ({currency})</Text>
            <TextInput value={amount} onChangeText={setAmount} placeholder="Enter amount e.g. 20.00"
              placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" style={S.input} />

            {/* 5. Payment method */}
            {paymentMethods.length > 0 && <>
              <Text style={S.lbl}>Payment Method</Text>
              <View style={S.chipRow}>
                {paymentMethods.map((m: any) => <TouchableOpacity key={m.code} onPress={() => setPaymentMethod(m.code)} style={[S.chip, paymentMethod === m.code && S.chipActive]}><Text style={[S.chipTxt, paymentMethod === m.code && S.chipActiveTxt]}>{methodLabel(m, balances, currency)}</Text></TouchableOpacity>)}
              </View>
            </>}

            {/* 6. Wallet */}
            {paymentMethod === 'WALLET' && <><Text style={S.lbl}>Wallet PIN</Text><TextInput value={walletPin} onChangeText={t => setWalletPin(t.replace(/\D/g, ''))} placeholder="Your PayPort PIN" placeholderTextColor={Colors.textSecondary} keyboardType="number-pad" secureTextEntry maxLength={6} style={S.input} /></>}
            <Text style={S.lbl}>Payment Wallet Number</Text>
            <View style={S.phoneRow}><View style={S.pfx}><Text style={S.pfxTxt}>+263</Text></View><TextInput value={paymentPhone} onChangeText={setPaymentPhone} placeholder="Wallet for USSD prompt" placeholderTextColor={Colors.textSecondary} keyboardType="phone-pad" style={S.phoneIn} /></View>
            <TouchableOpacity style={S.btnPrimary} onPress={handleReview}><Text style={S.btnTxt}>Confirm and Pay</Text></TouchableOpacity>
          </>}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showConfirm} transparent animationType="slide" onRequestClose={() => setShowConfirm(false)}>
        <View style={S.overlay}><View style={S.sheet}><View style={S.sheetHandle} />
          <Text style={S.sheetTitle}>Confirm Payment</Text>
          <View style={S.summaryBox}>
            {[['Biller', biller?.name], [biller?.field || 'Account', accountRef], customerInfo?.customerName ? ['Account holder', customerInfo.customerName] : null, ['Currency', currency], ['Amount', `${currency} ${parseFloat(amount || '0').toFixed(2)}`], ...chargeRows(quote, currency), ['Pay via', pm ? methodLabel(pm, balances, currency) : paymentMethod], paymentMethod === 'WALLET' ? null : ['Wallet', normalizePhone(paymentPhone)]].filter(Boolean).map((row: any) => <View key={row[0]} style={S.sumRow}><Text style={S.sumLbl}>{row[0]}</Text><Text style={S.sumVal}>{row[1]}</Text></View>)}
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

const S = themed(() => ({
  scroll: { flex: 1 }, body: { padding: 20 },
  err: { backgroundColor: Colors.errorBg, borderRadius: 12, padding: 12, marginBottom: 16 },
  errTxt: { color: Colors.red, fontSize: 14, fontFamily: 'Nunito_400Regular' },
  lbl: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 8, marginTop: 18 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, backgroundColor: Colors.cardBg, fontFamily: 'Nunito_400Regular', marginBottom: 4 },
  phoneRow: { flexDirection: 'row', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, overflow: 'hidden', marginBottom: 6 },
  pfx: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.primary, justifyContent: 'center' },
  pfxTxt: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: 'Rubik_700Bold' },
  phoneIn: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, fontFamily: 'Nunito_400Regular' },
  billerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  billersLoading: { paddingVertical: 30, alignItems: 'center' },
  billersEmpty: { padding: 24, borderRadius: 12, backgroundColor: Colors.subtleBg, alignItems: 'center' },
  billersEmptyTxt: { fontSize: 13.5, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  billerCard: { width: '47%', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, alignItems: 'center', gap: 6, minHeight: 96, justifyContent: 'center' },
  billerIconBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  billerLogo: { width: 40, height: 40, borderRadius: 6 },
  billerName: { fontSize: 11.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', textAlign: 'center' },
  lookupRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  lookupInput: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, backgroundColor: Colors.cardBg, fontFamily: 'Nunito_400Regular' },
  lookupBtn: { backgroundColor: Colors.primary, borderRadius: 24, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  lookupBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: 'Rubik_700Bold' },
  customerCard: { backgroundColor: Colors.successBg, borderRadius: 12, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: '#A5D6A7' },
  customerName: { fontSize: 14, fontWeight: '700', color: Colors.green, fontFamily: 'Rubik_700Bold' },
  customerBal: { fontSize: 12, color: Colors.orange, fontFamily: 'Rubik_700Bold', marginTop: 2 },
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
