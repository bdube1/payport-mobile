import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { walletApi, productsApi, startPayment, paymentError, generateReference, formatAmount, normalizePhone, liveCurrencies } from '../../lib/api';

type W = { walletRef: string; currency: string; balanceMinor: number; status: string; dailyOutMinor?: number; usedTodayMinor?: number };
type Tab = 'topup' | 'send' | 'cashout' | 'convert' | 'merchant' | 'cards';
const ACTIONS: [Tab, string][] = [['topup', 'Top up'], ['send', 'Send money'], ['cashout', 'Cash out'], ['convert', 'Convert'], ['merchant', 'Pay merchant'], ['cards', 'Cards']];

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
  const [tab, setTab] = useState<Tab>(ACTIONS.some(([k]) => k === params.a) ? (params.a as Tab) : 'topup');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

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
    try { const r = await fn(); setNotice(ok(r?.data?.data || {})); await load(); return true; }
    catch (e) { setError(errMsg(e, 'That did not work. Please try again.')); return false; }
    finally { setBusy(false); }
  };

  const w = wallets.find((x) => x.walletRef === selected) || wallets[0];

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
                {ACTIONS.map(([k, t]) => (
                  <TouchableOpacity key={k} onPress={() => { setTab(k); setError(''); setNotice(''); }} style={[S.chip, tab === k && S.chipOn]}>
                    <Text style={[S.chipTxt, tab === k && S.white]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={S.card}>
                {tab === 'topup' && <TopUp w={w} phone={user.phone} onError={setError} onStarted={(ref) => router.push(`/processing/${ref}` as any)} />}
                {tab === 'send' && <Send w={w} busy={busy} run={run} />}
                {tab === 'convert' && <Convert w={w} wallets={wallets} busy={busy} run={run} onError={setError} />}
                {tab === 'cashout' && <CashOut w={w} busy={busy} run={run} onError={setError} />}
                {tab === 'merchant' && <PayMerchant w={w} busy={busy} run={run} onError={setError} />}
                {tab === 'cards' && <Cards wallets={wallets} onError={setError} onNotice={setNotice} />}
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
  const charge = useCharge('P2P_TRANSFER', w, cents);
  const ok = to.trim().length >= 9 && cents > 0 && pin.length >= 4 && !busy;
  return <>
    <Text style={S.h}>Send money</Text>
    <Field label="To (phone or wallet number)" value={to} onChangeText={setTo} placeholder="+263771234567 or W…" autoCapitalize="characters" />
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
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
  return <Text style={[S.muted, { marginTop: 8 }]}>Charge {formatAmount(charge.chargeMinor, ccy)}{charge.taxMinor ? ` + tax ${formatAmount(charge.taxMinor, ccy)}` : ''} · Total {formatAmount(charge.totalMinor, ccy)}</Text>;
}

function CodeStep({ title, label, code, setCode, onNext }: any) {
  return <>
    <Text style={S.h}>{title}</Text>
    <Text style={S.lbl}>{label}</Text>
    <TextInput style={[S.input, S.code]} value={code} onChangeText={(t: string) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor={Colors.textSecondary} />
    <Btn title="Continue" color={Colors.primary} disabled={code.length !== 6} onPress={onNext} />
  </>;
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
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [clientRef, setClientRef] = useState(() => 'mob-co-' + Date.now().toString(36));
  const cents = toMinor(amount);
  const charge = useCharge('CASH_OUT', w, cents);
  const reset = () => { setCode(''); setAgent(null); setAmount(''); setPin(''); setClientRef('mob-co-' + Date.now().toString(36)); };
  if (!agent) return <CodeStep title="Cash out at an agent" label="Agent code" code={code} setCode={setCode} onNext={async () => {
    onError('');
    try { const r = await walletApi.agent(code); setAgent(r.data?.data); } catch (e) { onError(errMsg(e, 'No agent with that code.')); }
  }} />;
  return <>
    <Text style={S.h}>Cash out at an agent</Text>
    <Party kind="Agent" code={agent.code} name={agent.name} place={agent.location} onChange={reset} />
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
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
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pin, setPin] = useState('');
  const cents = toMinor(amount);
  const charge = useCharge('MERCHANT_PAYMENT', w, cents);
  const reset = () => { setCode(''); setM(null); setAmount(''); setNote(''); setPin(''); };
  if (!m) return <CodeStep title="Pay a merchant" label="Merchant code" code={code} setCode={setCode} onNext={async () => {
    onError('');
    try { const r = await walletApi.merchant(code); setM(r.data?.data); } catch (e) { onError(errMsg(e, 'No merchant with that code.')); }
  }} />;
  const takes = !m.currencies?.length || m.currencies.includes(w.currency);
  return <>
    <Text style={S.h}>Pay a merchant</Text>
    <Party kind="Merchant" code={m.code} name={m.name} place={m.address} onChange={reset} />
    {!takes ? <Text style={S.errTxt}>{m.name} takes {m.currencies.join(', ')}. Choose that wallet above.</Text> : null}
    <Field label={`Amount (${w.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
    <ChargeLine charge={charge} ccy={w.currency} />
    <Field label="Note (optional)" value={note} onChangeText={setNote} maxLength={80} />
    <Field label="PIN" value={pin} onChangeText={(t: string) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} />
    <Btn title={`Pay ${cents ? formatAmount(cents, w.currency) : ''}`} disabled={!takes || !cents || pin.length < 4 || busy} onPress={async () => {
      if (await run(() => walletApi.payMerchant(m.code, w.currency, cents, pin, note.trim() || null),
        (d: any) => `Paid ${formatAmount(cents, w.currency)} to ${d.merchantName || m.name}.`)) reset();
    }} />
  </>;
}

const SCHEME: Record<string, string> = { VISA: 'VISA', ZIMSWITCH: 'ZimSwitch' };
const CARD_STATUS: Record<string, string> = { REQUESTED: 'Requested', ACTIVE: 'Active', FROZEN: 'Frozen', BLOCKED: 'Blocked', CANCELLED: 'Cancelled', REFUSED: 'Refused' };

function Cards({ wallets, onError, onNotice }: { wallets: W[]; onError: (m: string) => void; onNotice: (m: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => walletApi.cards().then((r) => setData(r.data?.data || { cards: [] })).catch((e) => { setData({ cards: [] }); onError(errMsg(e, 'Could not load your cards.')); });
  useEffect(() => { load(); }, []);
  const act = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true); onError(''); onNotice('');
    try { await fn(); onNotice(ok); setPin(''); setForm(null); await load(); }
    catch (e) { onError(errMsg(e, 'That did not work. Please try again.')); }
    finally { setBusy(false); }
  };
  if (!data) return <ActivityIndicator color={Colors.primary} />;
  const schemes: string[] = (data.options?.schemes || [{ scheme: 'VISA' }, { scheme: 'ZIMSWITCH' }]).map((x: any) => x.scheme);
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
  return <>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={S.h}>My cards</Text>
      {!form ? <TouchableOpacity onPress={() => setForm({ walletRef: wallets[0]?.walletRef || '', scheme: 'VISA', form: 'VIRTUAL', nameOnCard: '', deliveryAddress: '' })} style={[S.chip, S.chipOn]}>
        <Text style={[S.chipTxt, S.white]}>Get a card</Text></TouchableOpacity> : null}
    </View>
    {form ? <View style={[S.party, { marginTop: 10 }]}>
      <Text style={S.lbl}>Wallet</Text>
      <View style={S.chipRow}>{wallets.map((x) => <TouchableOpacity key={x.walletRef} onPress={() => set('walletRef', x.walletRef)} style={[S.chip, form.walletRef === x.walletRef && S.chipOn]}><Text style={[S.chipTxt, form.walletRef === x.walletRef && S.white]}>{x.currency}</Text></TouchableOpacity>)}</View>
      <Text style={S.lbl}>Card</Text>
      <View style={S.chipRow}>{schemes.map((c) => <TouchableOpacity key={c} onPress={() => set('scheme', c)} style={[S.chip, form.scheme === c && S.chipOn]}><Text style={[S.chipTxt, form.scheme === c && S.white]}>{SCHEME[c] || c}</Text></TouchableOpacity>)}</View>
      <Text style={S.lbl}>Type</Text>
      <View style={S.chipRow}>{[['VIRTUAL', 'Virtual'], ['PHYSICAL', 'Physical']].map(([v, t]) => <TouchableOpacity key={v} onPress={() => set('form', v)} style={[S.chip, form.form === v && S.chipOn]}><Text style={[S.chipTxt, form.form === v && S.white]}>{t}</Text></TouchableOpacity>)}</View>
      <Field label="Name on card" value={form.nameOnCard} onChangeText={(t: string) => set('nameOnCard', t.toUpperCase())} maxLength={26} autoCapitalize="characters" />
      {form.form === 'PHYSICAL' ? <Field label="Delivery address" value={form.deliveryAddress} onChangeText={(t: string) => set('deliveryAddress', t)} /> : null}
      <Field label="PIN" value={pin} onChangeText={(t: string) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} />
      <Btn title="Request card" disabled={busy || pin.length < 4 || !form.nameOnCard.trim()} onPress={() => act(() => walletApi.requestCard({ ...form, pin }), 'Card requested.')} />
      <TouchableOpacity onPress={() => setForm(null)}><Text style={[S.link, { textAlign: 'center', marginTop: 10 }]}>Cancel</Text></TouchableOpacity>
    </View> : null}
    {data.cards.length === 0 && !form ? <Text style={[S.muted, { marginTop: 8 }]}>No cards yet.</Text> : null}
    {data.cards.map((c: any) => (
      <View key={c.cardRef} style={[S.cardFace, { backgroundColor: c.scheme === 'VISA' ? '#1a1f71' : '#0b6b3a' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.cardSmall}>{c.form === 'VIRTUAL' ? 'Virtual' : 'Physical'} · {c.currency} {c.walletRef}</Text>
          <Text style={[S.cardSmall, { fontWeight: '800' }]}>{SCHEME[c.scheme]}</Text>
        </View>
        <Text style={S.cardPan}>{c.maskedPan || (c.last4 ? `•••• •••• •••• ${c.last4}` : '•••• •••• •••• ••••')}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.cardSmall}>{c.nameOnCard}</Text><Text style={S.cardSmall}>{c.expiry || ''}</Text>
        </View>
        <Text style={[S.cardSmall, { marginTop: 8 }]}>{CARD_STATUS[c.status] || c.status}{c.note ? ` · ${c.note}` : ''}</Text>
        {['REQUESTED', 'ACTIVE', 'FROZEN'].includes(c.status) ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <TextInput value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="PIN" placeholderTextColor="#ccc" style={S.cardPin} />
          {c.status === 'ACTIVE' ? <CardBtn t="Freeze" disabled={busy || pin.length < 4} onPress={() => act(() => walletApi.cardAction(c.cardRef, 'FREEZE', pin), 'Card frozen.')} /> : null}
          {c.status === 'FROZEN' ? <CardBtn t="Unfreeze" disabled={busy || pin.length < 4} onPress={() => act(() => walletApi.cardAction(c.cardRef, 'UNFREEZE', pin), 'Card unfrozen.')} /> : null}
          <CardBtn t="Cancel" disabled={busy || pin.length < 4} onPress={() => Alert.alert('Cancel card', 'Are you sure?', [{ text: 'No' }, { text: 'Yes', style: 'destructive', onPress: () => act(() => walletApi.cardAction(c.cardRef, 'CANCEL', pin), 'Card cancelled.') }])} />
        </View> : null}
      </View>
    ))}
  </>;
}

function CardBtn({ t, onPress, disabled }: { t: string; onPress: () => void; disabled?: boolean }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[S.cardBtn, disabled && { opacity: 0.5 }]}><Text style={S.cardBtnTxt}>{t}</Text></TouchableOpacity>;
}

const S = StyleSheet.create({
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
  okTxt: { color: Colors.green, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  rowL: { fontSize: 14, color: Colors.textPrimary },
  rowR: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
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
});
