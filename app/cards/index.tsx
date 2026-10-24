import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { CardTile, CardData } from '../../components/ui/PayportCard';
import { Colors, themed } from '../../constants/colors';
import { walletApi } from '../../lib/api';

type Form = 'PHYSICAL' | 'VIRTUAL';
const errMsg = (e: any, f: string) => e?.response?.data?.error?.message || e?.response?.data?.message || f;

export default function CardsScreen() {
  const router = useRouter();
  const [form, setForm] = useState<Form>('VIRTUAL');
  const [cards, setCards] = useState<CardData[] | null>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [schemes, setSchemes] = useState<string[]>(['VISA', 'ZIMSWITCH']);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, w] = await Promise.all([walletApi.cards(), walletApi.list()]);
      setCards(c.data?.data?.cards || []);
      setSchemes((c.data?.data?.options?.schemes || []).map((x: any) => x.scheme).filter(Boolean).length ? c.data.data.options.schemes.map((x: any) => x.scheme) : ['VISA', 'ZIMSWITCH']);
      setWallets(w.data?.data?.wallets || []);
      setError('');
    } catch (e) { setCards([]); setError(errMsg(e, 'Could not load your cards.')); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = (cards || []).filter((c) => c.form === form && !['CANCELLED', 'REFUSED'].includes(c.status));
  return (
    <GradientScreen>
      <AppBar title="Cards" showBack />
      <View style={S.seg}>
        {(['PHYSICAL', 'VIRTUAL'] as Form[]).map((f) => (
          <TouchableOpacity key={f} onPress={() => setForm(f)} style={[S.segBtn, form === f && S.segOn]}>
            <Text style={[S.segTxt, form === f && { color: '#fff' }]}>{f === 'PHYSICAL' ? 'Physical Cards' : 'Virtual Cards'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {cards === null ? <ActivityIndicator color={Colors.primary} /> : null}
        {error ? <Text style={S.err}>{error}</Text> : null}
        {shown.map((c) => <CardTile key={c.cardRef} c={c} onOpen={() => router.push(`/cards/${c.cardRef}` as any)} />)}
      </ScrollView>
      <TouchableOpacity style={S.fab} onPress={() => setAdding(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
      <AddCard visible={adding} form={form} wallets={wallets} schemes={schemes} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />
    </GradientScreen>
  );
}

function AddCard({ visible, form, wallets, schemes, onClose, onDone }: { visible: boolean; form: Form; wallets: any[]; schemes: string[]; onClose: () => void; onDone: () => void }) {
  const [scheme, setScheme] = useState('VISA');
  const [nickname, setNickname] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // VISA: the USD wallet. ZimSwitch (dual interface): the USD and ZWG wallets together.
  const linked = scheme === 'VISA' ? wallets.filter((w) => w.currency === 'USD') : wallets.filter((w) => w.currency === 'USD' || w.currency === 'ZWG');
  const linkedText = linked.length ? `Linked to your ${linked.map((w) => w.currency).join(' and ')} wallet${linked.length > 1 ? 's' : ''}` : scheme === 'VISA' ? 'Open a USD wallet first' : 'Open a USD or ZWG wallet first';
  const ok = linked.length > 0 && nickname.trim().length > 0 && pin.length >= 4 && (form === 'VIRTUAL' || address.trim().length >= 5) && !busy;
  const submit = async () => {
    setBusy(true); setError('');
    try {
      await walletApi.requestCard({ scheme, form, nickname: nickname.trim(), deliveryAddress: form === 'PHYSICAL' ? address.trim() : null, pin });
      setNickname(''); setAddress(''); setPin('');
      onDone();
    } catch (e) { setError(errMsg(e, 'The card could not be requested.')); }
    finally { setBusy(false); }
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={S.sheetBack}>
        <View style={S.sheet}>
          <Text style={S.sheetTitle}>New {form === 'VIRTUAL' ? 'virtual' : 'physical'} card</Text>
          {error ? <Text style={S.err}>{error}</Text> : null}
          <Text style={S.lbl}>Card</Text>
          <View style={S.chips}>{schemes.map((s) => (
            <TouchableOpacity key={s} onPress={() => setScheme(s)} style={[S.chip, scheme === s && S.chipOn]}>
              <Text style={[S.chipTxt, scheme === s && { color: '#fff' }]}>{s === 'ZIMSWITCH' ? 'ZimSwitch' : 'VISA'}</Text>
            </TouchableOpacity>))}</View>
          <Text style={[S.lbl, { fontWeight: '600', color: linked.length ? Colors.textSecondary : Colors.red }]}>{linkedText}</Text>
          <Text style={S.lbl}>Nickname</Text>
          <TextInput value={nickname} onChangeText={setNickname} maxLength={40} style={S.input} placeholderTextColor={Colors.textSecondary} />
          {form === 'PHYSICAL' ? <><Text style={S.lbl}>Delivery address</Text>
            <TextInput value={address} onChangeText={setAddress} style={S.input} placeholderTextColor={Colors.textSecondary} /></> : null}
          <Text style={S.lbl}>PIN</Text>
          <TextInput value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} style={S.input} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <TouchableOpacity onPress={onClose} style={[S.btn, { backgroundColor: Colors.borderLight }]}><Text style={[S.btnTxt, { color: Colors.textPrimary }]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity disabled={!ok} onPress={submit} style={[S.btn, { backgroundColor: ok ? Colors.primary : '#9bb' }]}><Text style={S.btnTxt}>{busy ? '…' : 'Request card'}</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = themed(() => ({
  seg: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, padding: 5, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  segBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  segOn: { backgroundColor: '#0A5DB5' },
  segTxt: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, fontFamily: 'Rubik_600SemiBold' },
  fab: { position: 'absolute', right: 22, bottom: 34, width: 64, height: 64, borderRadius: 32, backgroundColor: '#1565D8', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  err: { color: Colors.red, marginBottom: 10 },
  sheetBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.cardBg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  lbl: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.border },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: Colors.textPrimary },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
}));
