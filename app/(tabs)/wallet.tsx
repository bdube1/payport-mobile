import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { walletApi, productsApi, startPayment, paymentError, generateReference, formatAmount, normalizePhone, liveCurrencies } from '../../lib/api';

type W = { walletRef: string; currency: string; balanceMinor: number; status: string; dailyOutMinor?: number; usedTodayMinor?: number };
type Tab = 'topup' | 'send' | 'convert' | 'cashout' | 'statement';

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
const KIND: Record<string, string> = { TOPUP: 'Top-up', PAYMENT: 'Payment', P2P_OUT: 'Sent', P2P_IN: 'Received', CASH_IN: 'Cash in', CASH_OUT: 'Cash out', FX_OUT: 'Converted out', FX_IN: 'Converted in', REFUND: 'Refund' };

/** PayPort wallet: balances, top-up, send, convert, cash-out code, statement. Shown only when signed in. */
export default function WalletScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [wallets, setWallets] = useState<W[]>([]);
  const [selected, setSelected] = useState('');
  const [tab, setTab] = useState<Tab>('topup');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await walletApi.list();
      const d = r.data?.data || {};
      setEnabled(!!d.enabled);
      setWallets(d.wallets || []);
      setSelected((s) => s || d.wallets?.[0]?.walletRef || '');
    } catch (e) {
      setError(errMsg(e, 'Could not load your wallet.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { if (user) load(); else setLoading(false); }, [user, load]);

  const run = async (fn: () => Promise<any>, ok: (d: any) => string) => {
    setBusy(true); setError(''); setNotice('');
    try { const r = await fn(); setNotice(ok(r?.data?.data || {})); await load(); return true; }
    catch (e) { setError(errMsg(e, 'That did not work. Please try again.')); return false; }
    finally { setBusy(false); }
  };

  const w = wallets.find((x) => x.walletRef === selected) || wallets[0];

  return (
    <GradientScreen>
      <AppBar title="Wallet" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={S.body} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
        {loading ? <ActivityIndicator color={Colors.primary} /> : !user ? (
          <Text style={S.muted}>Log in to use your PayPort wallet.</Text>
        ) : !enabled && wallets.length === 0 ? (
          <View style={S.card}><Text style={S.h}>PayPort Wallet</Text><Text style={S.muted}>The wallet is not available yet. You can keep paying with mobile money and cards.</Text></View>
        ) : (
          <>
            {error ? <View style={S.err}><Text style={S.errTxt}>{error}</Text></View> : null}
            {notice ? <View style={S.ok}><Text style={S.okTxt}>{notice}</Text></View> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {wallets.map((x) => (
                <TouchableOpacity key={x.walletRef} onPress={() => setSelected(x.walletRef)} style={[S.wcard, x.walletRef === w?.walletRef && S.wcardOn]}>
                  <Text style={[S.wsub, x.walletRef === w?.walletRef && S.white]}>{x.currency} · {x.walletRef}{x.status !== 'ACTIVE' ? ` · ${x.status}` : ''}</Text>
                  <Text style={[S.wbal, x.walletRef === w?.walletRef && S.white]}>{formatAmount(x.balanceMinor, x.currency)}</Text>
                  {x.dailyOutMinor != null ? <Text style={[S.wsub, x.walletRef === w?.walletRef && S.white]}>Today {formatAmount(x.usedTodayMinor || 0, x.currency)} / {formatAmount(x.dailyOutMinor, x.currency)}</Text> : null}
                </TouchableOpacity>
              ))}
              {enabled ? <OpenWallet existing={wallets.map((x) => x.currency)} busy={busy}
                onOpen={(c) => run(() => walletApi.open(c), (d) => `Your ${d.currency} wallet ${d.walletRef} is ready.`)} /> : null}
            </ScrollView>
            {w ? <>
              <View style={S.chipRow}>
                {([['topup', 'Top up'], ['send', 'Send'], ['convert', 'Convert'], ['cashout', 'Cash out'], ['statement', 'Statement']] as [Tab, string][]).map(([k, t]) => (
                  <TouchableOpacity key={k} onPress={() => { setTab(k); setError(''); setNotice(''); }} style={[S.chip, tab === k && S.chipOn]}>
                    <Text style={[S.chipTxt, tab === k && S.white]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={S.card}>
                {tab === 'topup' && <TopUp w={w} phone={user.phone} onError={setError} onStarted={(ref) => router.push(`/processing/${ref}` as any)} />}
                {tab === 'send' && <Send w={w} busy={busy} run={run} />}
                {tab === 'convert' && <Convert w={w} wallets={wallets} busy={busy} run={run} onError={setError} />}
                {tab === 'cashout' && <CashOut w={w} busy={busy} run={run} />}
                {tab === 'statement' && <Statement w={w} />}
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
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
    <Text style={S.lbl}>Pay with</Text>
    <View style={S.chipRow}>{methods.map((m) => <TouchableOpacity key={m.code} onPress={() => setMethod(m.code)} style={[S.chip, method === m.code && S.chipOn]}><Text style={[S.chipTxt, method === m.code && S.white]}>{m.name}</Text></TouchableOpacity>)}</View>
    <Field label="Paying phone number" value={payPhone} onChangeText={setPayPhone} keyboardType="phone-pad" placeholder="+263771234567" />
    <Btn title={busy ? 'Starting…' : 'Top up'} onPress={go} disabled={!ok} />
  </>;
}

function Send({ w, busy, run }: { w: W; busy: boolean; run: any }) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [clientRef] = useState(() => 'mob-' + Date.now().toString(36));
  const cents = toMinor(amount);
  const ok = to.trim().length >= 9 && cents > 0 && pin.length >= 4 && !busy;
  return <>
    <Text style={S.h}>Send money</Text>
    <Field label="To (phone or wallet number)" value={to} onChangeText={setTo} placeholder="+263771234567 or W…" autoCapitalize="characters" />
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
    <Field label="PIN" value={pin} onChangeText={(t: string) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} />
    <Btn title="Send" disabled={!ok} onPress={async () => {
      const dest = to.trim().toUpperCase().startsWith('W') ? to.trim() : normalizePhone(to);
      if (await run(() => walletApi.transfer(dest, w.currency, cents, pin, clientRef), (d: any) => `Sent ${formatAmount(d.amountMinor, d.currency)} to ${d.to}.`)) setPin('');
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
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={(t: string) => { setAmount(t); setQuote(null); }} keyboardType="decimal-pad" placeholder="0.00" />
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

function CashOut({ w, busy, run }: { w: W; busy: boolean; run: any }) {
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [codes, setCodes] = useState<any[]>([]);
  const refresh = () => walletApi.cashOutCodes().then((r) => setCodes(r.data?.data || [])).catch(() => {});
  useEffect(() => { refresh(); }, []);
  const cents = toMinor(amount);
  return <>
    <Text style={S.h}>Cash out at an agent</Text>
    <Text style={S.muted}>Get a one-time code, then give the code and your phone number to a PayPort agent for cash.</Text>
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
    <Field label="PIN" value={pin} onChangeText={(t: string) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} />
    <Btn title="Get code" disabled={!cents || pin.length < 4 || busy} onPress={async () => {
      if (await run(() => walletApi.cashOutCode(w.currency, cents, pin),
        (d: any) => `Your cash-out code: ${d.code}\n${formatAmount(d.amountMinor, d.currency)}, valid until ${when(d.expiresAt)}. It works once.`)) { setPin(''); refresh(); }
    }} />
    {codes.map((c) => <View key={c.id} style={S.row}><Text style={S.rowL}>{when(c.created_at)}</Text><Text style={S.rowR}>{formatAmount(c.amount_minor, c.currency)} · {c.status}</Text></View>)}
  </>;
}

function Statement({ w }: { w: W }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { walletApi.statement(w.walletRef).then((r) => setRows(r.data?.data || [])).catch(() => setRows([])); }, [w.walletRef]);
  if (rows === null) return <ActivityIndicator color={Colors.primary} />;
  if (rows.length === 0) return <Text style={S.muted}>No transactions yet.</Text>;
  return <>{rows.map((r) => (
    <View key={r.op_ref + r.kind} style={S.row}>
      <View style={{ flex: 1 }}><Text style={S.rowL}>{KIND[r.kind] || r.kind}{r.counterparty ? ` · ${r.counterparty}` : ''}</Text><Text style={S.muted}>{when(r.created_at)}</Text></View>
      <Text style={[S.rowR, { color: r.direction === 'CR' ? Colors.green : Colors.textPrimary }]}>{r.direction === 'CR' ? '+' : '−'}{formatAmount(r.amount_minor, r.currency)}</Text>
    </View>
  ))}</>;
}

const S = StyleSheet.create({
  body: { padding: 20, paddingBottom: 60 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.borderLight },
  h: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  muted: { fontSize: 13, color: Colors.textSecondary },
  lbl: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16, color: Colors.textPrimary, backgroundColor: '#fff' },
  btn: { borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: '#fff' },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  white: { color: '#fff' },
  wcard: { width: 210, marginRight: 10, borderRadius: 16, padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.borderLight },
  wcardOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  wsub: { fontSize: 12, color: Colors.textSecondary },
  wbal: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginVertical: 6 },
  err: { backgroundColor: '#FFEBEE', borderRadius: 12, padding: 12, marginBottom: 12 },
  errTxt: { color: Colors.red, fontSize: 14 },
  ok: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginBottom: 12 },
  okTxt: { color: Colors.green, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  rowL: { fontSize: 14, color: Colors.textPrimary },
  rowR: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
});
