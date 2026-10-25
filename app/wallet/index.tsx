import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import QrScanner from '../../components/ui/QrScanner';
import { Colors, themed } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { walletApi, productsApi, startPayment, paymentError, generateReference, formatAmount, normalizePhone, liveCurrencies } from '../../lib/api';

type W = { walletRef: string; currency: string; balanceMinor: number; status: string; dailyOutMinor?: number; usedTodayMinor?: number };
type Tab = 'topup' | 'send' | 'cashout' | 'convert' | 'merchant';
const ACTIONS: [Tab, string][] = [['topup', 'Top up'], ['send', 'Send money'], ['cashout', 'Cash out'], ['convert', 'Convert'], ['merchant', 'Pay merchant']];

const toMinor = (s: string) => {
  const v = Number(String(s).replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : 0;
};
const errMsg = (e: any, f: string) => e?.response?.data?.error?.message || e?.response?.data?.message || f;
const when = (v: any) => {
  if (v == null) return '';
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
};

/** Wallet actions for a registered customer, opened from the home screen. */
export default function WalletScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [wallets, setWallets] = useState<W[]>([]);
  const [selected, setSelected] = useState('');
  const params = useLocalSearchParams<{ a?: string; ref?: string }>();
  const [tab] = useState<Tab>(ACTIONS.some(([k]) => k === params.a) ? (params.a as Tab) : 'topup');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await walletApi.list();
      const d = r.data?.data || {};
      setEnabled(!!d.enabled);
      setWallets(d.wallets || []);
      setSelected((s) => s || (params.ref && (d.wallets || []).some((x: W) => x.walletRef === params.ref) ? String(params.ref) : d.wallets?.[0]?.walletRef || ''));
    } catch (e) {
      setError(errMsg(e, 'Could not load your wallet.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { if (user) load(); else setLoading(false); }, [user, load]);
  // Refresh each time the tab is opened, so a wallet switched on in ops shows without restarting the app.
  useFocusEffect(useCallback(() => { if (user) load(); }, [user, load]));

  const run = async (fn: () => Promise<any>, ok: (d: any) => string) => {
    setBusy(true); setError(''); setNotice('');
    try { const r = await fn(); setDone(ok(r?.data?.data || {})); await load(); return true; }
    catch (e) { setError(errMsg(e, 'That did not work. Please try again.')); return false; }
    finally { setBusy(false); }
  };

  const w = wallets.find((x) => x.walletRef === selected) || wallets[0];

  // A completed payment, transfer or conversion stays on a success screen until it is closed.
  if (done) return (
    <GradientScreen>
      <View style={S.doneWrap}>
        <View style={S.doneIcon}><Ionicons name="checkmark" size={46} color="#fff" /></View>
        <Text style={S.doneTitle}>Successful</Text>
        <Text style={S.doneMsg}>{done}</Text>
        <TouchableOpacity style={[S.btn, { backgroundColor: Colors.primary, alignSelf: 'stretch' }]}
          onPress={() => { setDone(''); if (router.canGoBack()) router.back(); else router.replace('/(tabs)' as any); }}>
          <Text style={S.btnTxt}>Close</Text>
        </TouchableOpacity>
      </View>
    </GradientScreen>
  );

  return (
    <GradientScreen>
      <AppBar title={ACTIONS.find(([k]) => k === tab)?.[1] || 'Wallet'} showBack />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={S.body} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
        {loading ? <ActivityIndicator color={Colors.primary} /> : !user ? (
          <Text style={S.muted}>Log in to use your PayPort wallet.</Text>
        ) : error && wallets.length === 0 ? (
          <View style={S.card}><Text style={S.h}>PayPort Wallet</Text><Text style={S.errTxt}>{error}</Text><Text style={S.muted}>Pull down to try again.</Text></View>
        ) : !enabled && wallets.length === 0 ? (
          <View style={S.card}><Text style={S.h}>PayPort Wallet</Text><Text style={S.muted}>The wallet is not available yet. You can keep paying with mobile money and cards.</Text></View>
        ) : (
          <>
            {error ? <View style={S.err}><Text style={S.errTxt}>{error}</Text></View> : null}
            {notice ? <View style={S.ok}><Text style={S.okTxt}>{notice}</Text></View> : null}
            {enabled && wallets.length === 0 ? <OpenWallet existing={[]} busy={busy}
              onOpen={(c) => run(() => walletApi.open(c), (d) => `Your ${d.currency} wallet ${d.walletRef} is ready.`)} /> : null}
            {w ? <>
              <View style={S.card}>
                {wallets.length > 1 ? <WalletPick wallets={wallets} value={w.walletRef} onChange={setSelected} /> : null}
                {tab === 'topup' && <TopUp w={w} phone={user.phone} onError={setError} onStarted={(ref) => router.push(`/processing/${ref}` as any)} />}
                {tab === 'send' && <Send w={w} busy={busy} run={run} />}
                {tab === 'convert' && <Convert w={w} wallets={wallets} busy={busy} run={run} onError={setError} />}
                {tab === 'cashout' && <CashOut w={w} busy={busy} run={run} onError={setError} />}
                {tab === 'merchant' && <PayMerchant w={w} busy={busy} run={run} onError={setError} />}
              </View>
            </> : null}
          </>
        )}
      </ScrollView>
    </GradientScreen>
  );
}

function Field({ label, ...p }: any) {
  return <><Text style={S.lbl}>{label}</Text><TextInput placeholderTextColor={Colors.textSecondary} style={S.input} {...p} /></>;
}

function Btn({ title, onPress, disabled, color = Colors.green }: any) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[S.btn, { backgroundColor: disabled ? '#ccc' : color }]}><Text style={S.btnTxt}>{title}</Text></TouchableOpacity>;
}

function OpenWallet({ existing, busy, onOpen }: { existing: string[]; busy: boolean; onOpen: (c: string) => void }) {
  const [all, setAll] = useState<string[]>([]);
  useEffect(() => { liveCurrencies().then(setAll); }, []);
  const options = all.filter((c) => !existing.includes(c));
  if (options.length === 0) return null;
  return <View style={S.wcard}>
    <Text style={S.wsub}>Open a wallet</Text>
    <View style={[S.chipRow, { marginTop: 8 }]}>
      {options.map((c) => <TouchableOpacity key={c} disabled={busy} onPress={() => onOpen(c)} style={S.chip}><Text style={S.chipTxt}>{c}</Text></TouchableOpacity>)}
    </View>
  </View>;
}

function TopUp({ w, phone, onError, onStarted }: { w: W; phone: string; onError: (m: string) => void; onStarted: (ref: string) => void }) {
  const [methods, setMethods] = useState<any[]>([]);
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [payPhone, setPayPhone] = useState(phone || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    productsApi.getPaymentMethods().then((r) => {
      const m = (r.data?.data || r.data || []).filter((x: any) => x.isActive && x.code !== 'WALLET');
      setMethods(m); setMethod(m[0]?.code || '');
    }).catch(() => {});
  }, []);
  const cents = toMinor(amount);
  const ok = cents > 0 && !!method && normalizePhone(payPhone).length >= 12 && !busy;
  const go = async () => {
    setBusy(true); onError('');
    const ref = generateReference('MOB');
    try {
      await startPayment({ reference: ref, productTypeCode: 'WALLET_TOPUP', recipientIdentifier: w.walletRef, amountCents: cents, currency: w.currency,
        customerPhone: normalizePhone(payPhone), channel: 'MOB' } as any, { paymentMethodCode: method, customerPhone: normalizePhone(payPhone) });
      onStarted(ref);
    } catch (e) {
      onError(paymentError(e, 'Top-up could not be started.').message);
    } finally {
      setBusy(false);
    }
  };
  return <>
    <Text style={S.h}>Top up {w.currency} wallet</Text>
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
    <Text style={S.lbl}>Pay with</Text>
    <View style={S.chipRow}>{methods.map((m) => <TouchableOpacity key={m.code} onPress={() => setMethod(m.code)} style={[S.chip, method === m.code && S.chipOn]}><Text style={[S.chipTxt, method === m.code && S.white]}>{m.name}</Text></TouchableOpacity>)}</View>
    <Field label="Paying phone number" value={payPhone} onChangeText={setPayPhone} keyboardType="phone-pad" />
    <Btn title={busy ? 'Starting…' : 'Top up'} onPress={go} disabled={!ok} />
  </>;
}

function Send({ w, busy, run }: { w: W; busy: boolean; run: any }) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [clientRef] = useState(() => 'mob-' + Date.now().toString(36));
  const cents = toMinor(amount);
  const charge = useCharge('P2P_TRANSFER', w, cents);
  const ok = to.trim().length >= 9 && cents > 0 && pin.length >= 4 && !busy;
  return <>
    <Text style={S.h}>Send money</Text>
    <Field label="To (phone or wallet number)" value={to} onChangeText={setTo} autoCapitalize="characters" />
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
    <ChargeLine charge={charge} ccy={w.currency} />
    <Field label="PIN" value={pin} onChangeText={(t: string) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} />
    <Btn title="Send" disabled={!ok} onPress={async () => {
      const dest = to.trim().toUpperCase().startsWith('W') ? to.trim() : normalizePhone(to);
      if (await run(() => walletApi.transfer(dest, w.currency, cents, pin, clientRef), (d: any) => `Sent ${formatAmount(d.amountMinor, d.currency)} to ${d.toName || d.to}.`)) setPin('');
    }} />
  </>;
}

function Convert({ w, wallets, busy, run, onError }: { w: W; wallets: W[]; busy: boolean; run: any; onError: (m: string) => void }) {
  const targets = wallets.filter((x) => x.currency !== w.currency);
  const [to, setTo] = useState(targets[0]?.currency || '');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [pin, setPin] = useState('');
  const cents = toMinor(amount);
  if (targets.length === 0) return <Text style={S.muted}>Open a wallet in another currency to convert between your wallets.</Text>;
  return <>
    <Text style={S.h}>Convert between your wallets</Text>
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={(t: string) => { setAmount(t); setQuote(null); }} keyboardType="decimal-pad" />
    <Text style={S.lbl}>To</Text>
    <View style={S.chipRow}>{targets.map((t) => <TouchableOpacity key={t.currency} onPress={() => { setTo(t.currency); setQuote(null); }} style={[S.chip, to === t.currency && S.chipOn]}><Text style={[S.chipTxt, to === t.currency && S.white]}>{t.currency}</Text></TouchableOpacity>)}</View>
    {!quote ? <Btn title="Get quote" color={Colors.primary} disabled={!cents || busy} onPress={async () => {
      onError('');
      try { const r = await walletApi.quote(w.currency, to, cents); setQuote(r.data?.data); } catch (e) { onError(errMsg(e, 'No quote available right now.')); }
    }} /> : <>
      <Text style={[S.muted, { marginTop: 12 }]}>You give {formatAmount(quote.amountMinor, quote.from)} and get {formatAmount(quote.convertedMinor, quote.to)} (rate {quote.rate}, valid until {when(quote.validUntil)}).</Text>
      <Field label="PIN" value={pin} onChangeText={(t: string) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} />
      <Btn title="Convert now" disabled={pin.length < 4 || busy} onPress={async () => {
        if (await run(() => walletApi.convert(quote.quoteRef, pin), (d: any) => `Converted: ${formatAmount(d.debitedMinor, quote.from)} → ${formatAmount(d.creditedMinor, quote.to)}.`)) { setQuote(null); setPin(''); }
      }} />
    </>}
  </>;
}

function useCharge(product: string, w: W, cents: number) {
  const [charge, setCharge] = useState<any>(null);
  useEffect(() => {
    setCharge(null);
    if (!cents) return undefined;
    const t = setTimeout(() => { walletApi.charges(product, w.currency, cents).then((r) => setCharge(r.data?.data || null)).catch(() => {}); }, 400);
    return () => clearTimeout(t);
  }, [product, w.currency, cents]);
  return charge;
}

function ChargeLine({ charge, ccy }: { charge: any; ccy: string }) {
  if (!charge || !(charge.chargeMinor || charge.taxMinor)) return null;
  return <Text style={[S.muted, { marginTop: 8 }]}>Total {formatAmount(charge.totalMinor, ccy)}</Text>;
}

function Party({ kind, code, name, place, onChange }: { kind: string; code: string; name: string; place?: string; onChange: () => void }) {
  return <>
    <View style={S.party}>
      <Text style={S.muted}>{kind} {code}</Text>
      <Text style={S.partyName}>{name}</Text>
      {place ? <Text style={S.muted}>{place}</Text> : null}
    </View>
    <TouchableOpacity onPress={onChange}><Text style={S.link}>Not this {kind.toLowerCase()}</Text></TouchableOpacity>
  </>;
}

function CashOut({ w, busy, run, onError }: { w: W; busy: boolean; run: any; onError: (m: string) => void }) {
  const [code, setCode] = useState('');
  const [agent, setAgent] = useState<any>(null);
  const [mode, setMode] = useState<'scan' | 'code'>('code');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [clientRef, setClientRef] = useState(() => 'mob-co-' + Date.now().toString(36));
  const cents = toMinor(amount);
  const charge = useCharge('CASH_OUT', w, cents);
  const reset = () => { setCode(''); setAgent(null); setAmount(''); setPin(''); setClientRef('mob-co-' + Date.now().toString(36)); };
  const findAgent = async (c: string) => {
    onError('');
    try { const r = await walletApi.agent(c); setAgent(r.data?.data); } catch (e) { onError(errMsg(e, 'No agent with that code.')); }
  };
  if (!agent) return <>
    <Text style={S.h}>Cash out at an agent</Text>
    <View style={[S.chipRow, { marginTop: 12 }]}>
      <TouchableOpacity onPress={() => setMode('scan')} style={[S.modeBtn, mode === 'scan' && S.modeOn]}>
        <Ionicons name="qr-code-outline" size={22} color={mode === 'scan' ? '#fff' : Colors.primary} />
        <Text style={[S.modeTxt, mode === 'scan' && S.white]}>Scan QR</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setMode('code')} style={[S.modeBtn, mode === 'code' && S.modeOn]}>
        <Ionicons name="keypad-outline" size={22} color={mode === 'code' ? '#fff' : Colors.primary} />
        <Text style={[S.modeTxt, mode === 'code' && S.white]}>Enter code</Text>
      </TouchableOpacity>
    </View>
    {mode === 'code' ? <>
      <Text style={S.lbl}>Agent code</Text>
      <TextInput style={[S.input, S.code]} value={code} onChangeText={(t: string) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholderTextColor={Colors.textSecondary} />
      <Btn title="Continue" color={Colors.primary} disabled={code.length !== 6} onPress={() => findAgent(code)} />
    </> : null}
    <QrScanner what="agent" visible={mode === 'scan'} onClose={() => setMode('code')} onCode={async (payload) => {
      setMode('code'); onError('');
      try {
        const r = await walletApi.scan(payload);
        const d = r.data?.data || {};
        if (d.type !== 'AGENT') { onError('That is not an agent QR code.'); return; }
        setCode(d.code); setAgent(d);
      } catch (e) { onError(errMsg(e, 'This QR code is not valid.')); }
    }} />
  </>;
  return <>
    <Text style={S.h}>Cash out at an agent</Text>
    <Party kind="Agent" code={agent.code} name={agent.name} place={agent.location} onChange={reset} />
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
    <ChargeLine charge={charge} ccy={w.currency} />
    <Field label="PIN" value={pin} onChangeText={(t: string) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} />
    <Btn title={`Cash out ${cents ? formatAmount(cents, w.currency) : ''}`} disabled={!cents || pin.length < 4 || busy} onPress={async () => {
      if (await run(() => walletApi.cashOut(agent.code, w.currency, cents, pin, clientRef),
        (d: any) => `Collect ${formatAmount(d.amountMinor, d.currency)} cash from ${d.agentName}.\nReference ${d.opRef}.`)) reset();
    }} />
  </>;
}

function PayMerchant({ w, busy, run, onError }: { w: W; busy: boolean; run: any; onError: (m: string) => void }) {
  const [code, setCode] = useState('');
  const [m, setM] = useState<any>(null);
  const [mode, setMode] = useState<'scan' | 'code'>('code');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const cents = toMinor(amount);
  const charge = useCharge('MERCHANT_PAYMENT', w, cents);
  const reset = () => { setCode(''); setM(null); setAmount(''); setPin(''); };
  const find = async (c: string) => {
    onError('');
    try { const r = await walletApi.merchant(c); setM(r.data?.data); } catch (e) { onError(errMsg(e, 'No merchant with that code.')); }
  };
  if (!m) return <>
    <Text style={S.h}>Pay a merchant</Text>
    <View style={[S.chipRow, { marginTop: 12 }]}>
      <TouchableOpacity onPress={() => setMode('scan')} style={[S.modeBtn, mode === 'scan' && S.modeOn]}>
        <Ionicons name="qr-code-outline" size={22} color={mode === 'scan' ? '#fff' : Colors.primary} />
        <Text style={[S.modeTxt, mode === 'scan' && S.white]}>Scan QR</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setMode('code')} style={[S.modeBtn, mode === 'code' && S.modeOn]}>
        <Ionicons name="keypad-outline" size={22} color={mode === 'code' ? '#fff' : Colors.primary} />
        <Text style={[S.modeTxt, mode === 'code' && S.white]}>Enter code</Text>
      </TouchableOpacity>
    </View>
    {mode === 'code' ? <>
      <Text style={S.lbl}>Merchant code</Text>
      <TextInput style={[S.input, S.code]} value={code} onChangeText={(t: string) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholderTextColor={Colors.textSecondary} />
      <Btn title="Continue" color={Colors.primary} disabled={code.length !== 6} onPress={() => find(code)} />
    </> : null}
    <QrScanner visible={mode === 'scan'} onClose={() => setMode('code')} onCode={async (payload) => {
      setMode('code'); onError('');
      try {
        const r = await walletApi.scan(payload);
        const d = r.data?.data || {};
        if (d.type !== 'MERCHANT') { onError('That is not a merchant QR code.'); return; }
        setCode(d.code); setM(d);
      } catch (e) { onError(errMsg(e, 'This QR code is not valid.')); }
    }} />
  </>;
  const takes = !m.currencies?.length || m.currencies.includes(w.currency);
  return <>
    <Text style={S.h}>Pay a merchant</Text>
    <Party kind="Merchant" code={m.code} name={m.name} place={m.address} onChange={reset} />
    {!takes ? <Text style={S.errTxt}>{m.name} takes {m.currencies.join(', ')}. Choose that wallet above.</Text> : null}
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
    <ChargeLine charge={charge} ccy={w.currency} />
    <Field label="PIN" value={pin} onChangeText={(t: string) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} />
    <Btn title={`Pay ${cents ? formatAmount(cents, w.currency) : ''}`} disabled={!takes || !cents || pin.length < 4 || busy} onPress={async () => {
      if (await run(() => walletApi.payMerchant(m.code, w.currency, cents, pin, null),
        (d: any) => `Paid ${formatAmount(cents, w.currency)} to ${d.merchantName || m.name}.`)) reset();
    }} />
  </>;
}

function WalletPick({ wallets, value, onChange }: { wallets: W[]; value: string; onChange: (ref: string) => void }) {
  return <>
    <Text style={[S.lbl, { marginTop: 0 }]}>Wallet</Text>
    <View style={S.chipRow}>
      {wallets.map((x) => (
        <TouchableOpacity key={x.walletRef} onPress={() => onChange(x.walletRef)} style={[S.pick, value === x.walletRef && S.pickOn]}>
          <Text style={[S.pickBal, value === x.walletRef && S.white]}>{x.currency} wallet</Text>
          <Text style={[S.pickCcy, value === x.walletRef && S.white]}>{x.walletRef}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </>;
}

const S = themed(() => ({
  body: { padding: 20, paddingBottom: 60 },
  card: { backgroundColor: Colors.cardBg, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.borderLight },
  h: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  muted: { fontSize: 13, color: Colors.textSecondary },
  lbl: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16, color: Colors.textPrimary, backgroundColor: Colors.cardBg },
  btn: { borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  white: { color: '#fff' },
  wcard: { width: 210, marginRight: 10, borderRadius: 16, padding: 16, backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.borderLight },
  wcardOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  wsub: { fontSize: 12, color: Colors.textSecondary },
  wbal: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginVertical: 6 },
  err: { backgroundColor: Colors.errorBg, borderRadius: 12, padding: 12, marginBottom: 12 },
  errTxt: { color: Colors.red, fontSize: 14 },
  ok: { backgroundColor: Colors.successBg, borderRadius: 12, padding: 12, marginBottom: 12 },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  doneIcon: { width: 92, height: 92, borderRadius: 46, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  doneTitle: { fontSize: 24, fontFamily: 'Rubik_700Bold', color: Colors.textPrimary, marginBottom: 10 },
  doneMsg: { fontSize: 15.5, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  okTxt: { color: Colors.green, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  rowL: { fontSize: 14, color: Colors.textPrimary },
  rowR: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  modeOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeTxt: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  pick: { flex: 1, minWidth: 120, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  pickOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pickCcy: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  pickBal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  code: { fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  party: { backgroundColor: Colors.lightCyan, borderRadius: 14, padding: 14, marginTop: 12 },
  partyName: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginVertical: 2 },
  link: { color: Colors.primary, fontWeight: '700', paddingVertical: 8 },
  cardFace: { borderRadius: 16, padding: 18, marginTop: 12 },
  cardSmall: { color: '#fff', fontSize: 12, opacity: 0.92 },
  cardPan: { color: '#fff', fontSize: 19, letterSpacing: 2, marginVertical: 14, fontWeight: '700' },
  cardPin: { width: 70, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' },
  cardBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  cardBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
}));
