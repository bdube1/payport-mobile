import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Modal, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import PinModal from '../../components/ui/PinModal';
import { Colors, themed } from '../../constants/colors';
import { storeApi, walletApi, formatAmount, normalizePhone, newIdempotencyKey } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { TYPE_COLOURS } from './index';

const METHOD_NAMES: Record<string, string> = { WALLET: 'PayPort Wallet', ECOCASH: 'EcoCash', ONEMONEY: 'OneMoney', OMARI: 'Omari', INNBUCKS: 'InnBucks', ZIMSWITCH: 'Card', CASH: 'Pay on delivery' };

const S = themed(() => ({
  body: { padding: 16, paddingBottom: 120 },
  hero: { borderRadius: 18, padding: 16, marginBottom: 12 },
  heroName: { color: '#fff', fontSize: 22, fontFamily: 'Rubik_700Bold' },
  heroTxt: { color: '#fff', opacity: 0.92, fontSize: 13, marginTop: 4, fontFamily: 'Nunito_400Regular' },
  announce: { backgroundColor: '#0A1F44', borderRadius: 12, padding: 10, marginBottom: 12 },
  announceTxt: { color: '#fff', textAlign: 'center', fontSize: 13, fontFamily: 'Rubik_700Bold' },
  chips: { gap: 8, paddingBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt: { fontSize: 13, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  item: { flexDirection: 'row', backgroundColor: Colors.cardBg, borderRadius: 16, padding: 10, marginBottom: 10, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.borderLight },
  pic: { width: 64, height: 64, borderRadius: 12, backgroundColor: Colors.subtleBg },
  itemName: { fontSize: 15, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  itemMeta: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  price: { fontSize: 14, color: Colors.primary, fontFamily: 'Rubik_700Bold' },
  was: { fontSize: 12, color: Colors.textSecondary, textDecorationLine: 'line-through' },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qbtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  qtxt: { minWidth: 18, textAlign: 'center', fontSize: 15, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  bar: { position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between' },
  barTxt: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_700Bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  sheetBody: { padding: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 20, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 6 },
  lbl: { fontSize: 14, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary, backgroundColor: Colors.cardBg },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sum: { backgroundColor: Colors.subtleBg, borderRadius: 12, padding: 14, marginTop: 18 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sumLbl: { color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  sumVal: { color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  btn: { backgroundColor: Colors.green, borderRadius: 24, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  btnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_700Bold' },
  err: { backgroundColor: Colors.errorBg, borderRadius: 12, padding: 12, marginTop: 14 },
  errTxt: { color: Colors.red, fontFamily: 'Nunito_400Regular' },
}));

function Choice({ options, value, onChange }: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={S.opts}>
      {options.map(o => (
        <TouchableOpacity key={o.v} style={[S.chip, value === o.v && S.chipOn]} onPress={() => onChange(o.v)}>
          <Text style={[S.chipTxt, value === o.v && { color: '#fff' }]}>{o.l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function StorePage() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuthStore();
  const [st, setSt] = useState<any>(null);
  const [col, setCol] = useState('');
  const [error, setError] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [open, setOpen] = useState(false);
  const [how, setHow] = useState('');
  const [zone, setZone] = useState('');
  const [address, setAddress] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [slot, setSlot] = useState('');
  const [code, setCode] = useState('');
  const [pay, setPay] = useState('');
  const [phone, setPhone] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [offers, setOffers] = useState(false);
  const key = useRef(newIdempotencyKey().replace(/-/g, ''));

  const load = (c = col) => storeApi.store(slug, c).then(r => setSt(r.data?.data || r.data)).catch(e => setError(e?.response?.data?.message || 'This store could not be opened.'));
  useEffect(() => { load(); }, [slug]);
  useEffect(() => { if (user?.phone) setPhone(user.phone.replace(/^\+263/, '0')); }, [user]);

  const items: any[] = st?.items || [];
  const lines = useMemo(() => Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => ({ productId: Number(id), quantity: q })), [cart]);
  const count = lines.reduce((a, l) => a + l.quantity, 0);
  const chosen = items.filter(i => cart[i.id] > 0);
  const servicesOnly = chosen.length > 0 && chosen.every(i => i.service);
  const anyService = chosen.some(i => i.service);
  const total = chosen.reduce((a, i) => a + i.priceMinor * cart[i.id], 0);
  const ccy = chosen[0]?.currency || 'USD';
  const ways = [st?.pickup && { v: 'PICKUP', l: 'Collect' }, st?.delivery && { v: 'DELIVERY', l: 'Delivery' }].filter(Boolean) as any[];
  const pays = [...(user ? ['WALLET'] : []), ...((st?.methods?.length ? st.methods : ['ECOCASH', 'ONEMONEY', 'OMARI', 'INNBUCKS', 'ZIMSWITCH']) as string[]), ...(st?.payOnDelivery ? ['CASH'] : [])];

  const add = (id: number, d: number) => setCart(c => ({ ...c, [id]: Math.max(0, Math.min(20, (c[id] || 0) + d)) }));
  const order = () => ({ store: slug, items: lines, method: servicesOnly ? undefined : how, zone: zone || undefined, address: address || undefined,
    slot: slot || undefined, code: code || undefined, pay: pay === 'WALLET' ? undefined : pay || undefined, key: key.current,
    points: usePoints || undefined, offers: offers || undefined, phone: user?.phone });

  const checkout = async () => {
    if (!user) { router.push('/(auth)/login' as any); return; }
    setProblem(''); setQuote(null); setOpen(true);
    setHow(ways[0]?.v || ''); setPay(pays[0] || '');
    if (anyService && st?.bookings) {
      try { const r = await storeApi.slots(slug, lines); setSlots(r.data?.data || []); } catch { setSlots([]); }
    }
  };
  useEffect(() => {
    if (!open) return;
    storeApi.quote(order()).then(r => { setQuote(r.data?.data || r.data); setProblem(''); })
      .catch(e => { setQuote(null); setProblem(e?.response?.data?.message || 'Check your order.'); });
  }, [open, how, zone, code, slot, pay, usePoints]);

  const place = async (walletPin?: string) => {
    setBusy(true); setProblem('');
    try {
      const r = await storeApi.order(order());
      const o = r.data?.data || r.data;
      if (pay === 'CASH') { setOpen(false); router.replace(`/store/order/${o.orderRef}` as any); return; }
      if (!o.checkoutSessionId) { setProblem(o.problem || 'Your order is saved; pay it from My orders.'); return; }
      if (pay === 'WALLET') await walletApi.payCheckout(o.checkoutSessionId, walletPin || '');
      else if (pay === 'ZIMSWITCH') { if (o.checkoutUrl) await Linking.openURL(o.checkoutUrl); }
      else await storeApi.payCheckout(o.checkoutSessionId, normalizePhone(phone), pay);
      setOpen(false);
      router.replace(`/store/order/${o.orderRef}` as any);
    } catch (e: any) {
      setProblem(e?.response?.data?.message || 'The order could not be placed. No money was taken.');
    } finally { setBusy(false); setPin(false); }
  };

  if (!st) return (
    <GradientScreen><AppBar title="Store" showBack />
      {error ? <Text style={[S.errTxt, { textAlign: 'center', marginTop: 30 }]}>{error}</Text> : <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />}
    </GradientScreen>
  );
  return (
    <GradientScreen>
      <AppBar title={st.name} showBack />
      <ScrollView contentContainerStyle={S.body}>
        {!!st.announcement && <View style={S.announce}><Text style={S.announceTxt}>{st.announcement}</Text></View>}
        <View style={[S.hero, { backgroundColor: TYPE_COLOURS.SHOP }]}>
          <Text style={S.heroName}>{st.name}</Text>
          {!!st.about && <Text style={S.heroTxt}>{st.about}</Text>}
          {!!st.rating && <Text style={S.heroTxt}>{st.rating}</Text>}
          {!st.open && <Text style={S.heroTxt}>Not taking orders at the moment.</Text>}
        </View>
        {(st.collections || []).length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chips}>
            {[{ slug: '', name: 'All' }, ...st.collections].map((c: any) => (
              <TouchableOpacity key={c.slug || 'all'} style={[S.chip, col === c.slug && S.chipOn]} onPress={() => { setCol(c.slug); load(c.slug); }}>
                <Text style={[S.chipTxt, col === c.slug && { color: '#fff' }]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {items.map(i => (
          <View key={i.id} style={S.item}>
            {i.image ? <Image source={{ uri: i.image }} style={S.pic} /> : <View style={S.pic} />}
            <View style={{ flex: 1 }}>
              <Text style={S.itemName}>{i.name}</Text>
              {!!i.rating && <Text style={S.itemMeta}>{i.rating}</Text>}
              <Text><Text style={S.price}>{i.price}</Text>{i.wasMinor ? <Text style={S.was}>  {formatAmount(i.wasMinor, i.currency)}</Text> : null}</Text>
              {i.soldOut && <Text style={S.itemMeta}>Sold out</Text>}
            </View>
            {!i.soldOut && st.open && (cart[i.id] ? (
              <View style={S.qty}>
                <TouchableOpacity style={S.qbtn} onPress={() => add(i.id, -1)}><Ionicons name="remove" size={18} color="#fff" /></TouchableOpacity>
                <Text style={S.qtxt}>{cart[i.id]}</Text>
                <TouchableOpacity style={S.qbtn} onPress={() => add(i.id, i.service ? 0 : 1)}><Ionicons name="add" size={18} color="#fff" /></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[S.chip, S.chipOn]} onPress={() => add(i.id, 1)}><Text style={[S.chipTxt, { color: '#fff' }]}>{i.service ? 'Book' : 'Add'}</Text></TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
      {count > 0 && (
        <TouchableOpacity style={S.bar} onPress={checkout} activeOpacity={0.9}>
          <Text style={S.barTxt}>{count} {count === 1 ? 'item' : 'items'}</Text>
          <Text style={S.barTxt}>Checkout · {formatAmount(total, ccy)}</Text>
        </TouchableOpacity>
      )}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={S.overlay}>
          <View style={S.sheet}>
            <ScrollView contentContainerStyle={S.sheetBody} keyboardShouldPersistTaps="handled">
              <Text style={S.sheetTitle}>Checkout</Text>
              {!servicesOnly && ways.length > 0 && <>
                <Text style={S.lbl}>How do you want it?</Text>
                <Choice options={ways} value={how} onChange={setHow} />
              </>}
              {how === 'DELIVERY' && !servicesOnly && <>
                {(st.zones || []).length > 0 && <>
                  <Text style={S.lbl}>Your area</Text>
                  <Choice options={st.zones.map((z: any) => ({ v: String(z.id), l: `${z.name} · ${formatAmount(z.feeMinor, ccy)}` }))} value={zone} onChange={setZone} />
                </>}
                <Text style={S.lbl}>Delivery address</Text>
                <TextInput style={S.input} value={address} onChangeText={setAddress} placeholder="Street, suburb, city" placeholderTextColor={Colors.textSecondary} />
              </>}
              {anyService && st.bookings && <>
                <Text style={S.lbl}>Appointment time</Text>
                {slots.length === 0 ? <Text style={S.itemMeta}>No free times in the next two weeks.</Text>
                  : <Choice options={slots.slice(0, 24).map(s => ({ v: s.value, l: s.label }))} value={slot} onChange={setSlot} />}
              </>}
              <Text style={S.lbl}>Discount code</Text>
              <TextInput style={S.input} value={code} onChangeText={t => setCode(t.toUpperCase())} autoCapitalize="characters" placeholder="Optional" placeholderTextColor={Colors.textSecondary} />
              <Text style={S.lbl}>Pay with</Text>
              <Choice options={pays.map(p => ({ v: p, l: p === 'CASH' && servicesOnly ? 'Pay at the appointment' : METHOD_NAMES[p] || p }))} value={pay} onChange={setPay} />
              {!!pay && !['WALLET', 'CASH', 'ZIMSWITCH'].includes(pay) && <>
                <Text style={S.lbl}>{METHOD_NAMES[pay]} number</Text>
                <TextInput style={S.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07..." placeholderTextColor={Colors.textSecondary} />
              </>}
              {quote?.pointsUsable > 0 && (
                <TouchableOpacity style={[S.chip, usePoints && S.chipOn, { marginTop: 14, alignSelf: 'flex-start' }]} onPress={() => setUsePoints(!usePoints)}>
                  <Text style={[S.chipTxt, usePoints && { color: '#fff' }]}>{usePoints ? '✓ ' : ''}Use {quote.pointsUsable} of your {quote.pointsBalance} points</Text>
                </TouchableOpacity>
              )}
              {quote?.askOffers && (
                <TouchableOpacity style={[S.chip, offers && S.chipOn, { marginTop: 10, alignSelf: 'flex-start' }]} onPress={() => setOffers(!offers)}>
                  <Text style={[S.chipTxt, offers && { color: '#fff' }]}>{offers ? '✓ ' : ''}Send me offers from {st.name} by SMS</Text>
                </TouchableOpacity>
              )}
              {quote && <View style={S.sum}>
                {(quote.lines || []).map((l: any, n: number) => <View key={n} style={S.sumRow}><Text style={S.sumLbl}>{l.quantity} x {l.name}</Text><Text style={S.sumVal}>{l.line}</Text></View>)}
                {quote.pointsUsedMinor > 0 && <View style={S.sumRow}><Text style={S.sumLbl}>Points</Text><Text style={S.sumVal}>−{formatAmount(quote.pointsUsedMinor, quote.currency)}</Text></View>}
                {quote.discountMinor > 0 && <View style={S.sumRow}><Text style={S.sumLbl}>Discount</Text><Text style={S.sumVal}>−{formatAmount(quote.discountMinor, quote.currency)}</Text></View>}
                {quote.deliveryFeeMinor > 0 && <View style={S.sumRow}><Text style={S.sumLbl}>Delivery</Text><Text style={S.sumVal}>{formatAmount(quote.deliveryFeeMinor, quote.currency)}</Text></View>}
                <View style={S.sumRow}><Text style={[S.sumVal, { fontSize: 16 }]}>Total</Text><Text style={[S.sumVal, { fontSize: 18, color: Colors.primary }]}>{quote.total}</Text></View>
              </View>}
              {!!problem && <View style={S.err}><Text style={S.errTxt}>{problem}</Text></View>}
              <TouchableOpacity style={[S.btn, (busy || !quote) && { opacity: 0.6 }]} disabled={busy || !quote}
                onPress={() => (pay === 'WALLET' ? setPin(true) : place())}>
                <Text style={S.btnTxt}>{busy ? 'Placing order…' : pay === 'CASH' ? 'Place order' : `Pay ${quote?.total || ''}`}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOpen(false)} style={{ alignItems: 'center', marginTop: 14 }}><Text style={S.itemMeta}>Back to the store</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <PinModal visible={pin} title="Enter your PayPort PIN" busy={busy} onClose={() => setPin(false)} onSubmit={(p) => place(p)} />
    </GradientScreen>
  );
}
