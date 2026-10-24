import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import PinModal from '../../components/ui/PinModal';
import { SchemeMark, CardData } from '../../components/ui/PayportCard';
import { Colors, themed } from '../../constants/colors';
import { walletApi } from '../../lib/api';

const errMsg = (e: any, f: string) => e?.response?.data?.error?.message || e?.response?.data?.message || f;
const group = (pan: string) => pan.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();

export default function CardDetail() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const [c, setC] = useState<CardData | null>(null);
  const [secret, setSecret] = useState<{ pan?: string; expiry?: string; cvv?: string } | null>(null);
  const [show, setShow] = useState({ pan: false, cvv: false });
  const [ask, setAsk] = useState<null | 'reveal-pan' | 'reveal-cvv' | 'BLOCK' | 'UNBLOCK'>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await walletApi.cards();
      setC((r.data?.data?.cards || []).find((x: CardData) => x.cardRef === ref) || null);
    } catch (e) { setError(errMsg(e, 'Could not load the card.')); }
  }, [ref]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const withPin = async (pin: string) => {
    if (!c || !ask) return;
    setBusy(true); setError('');
    try {
      if (ask === 'BLOCK' || ask === 'UNBLOCK') {
        await walletApi.cardAction(c.cardRef, ask, pin);
        await load();
      } else {
        const r = await walletApi.revealCard(c.cardRef, pin);
        setSecret(r.data?.data || null);
        setShow((s) => ({ ...s, [ask === 'reveal-pan' ? 'pan' : 'cvv']: true }));
      }
      setAsk(null);
    } catch (e) { setError(errMsg(e, 'That did not work.')); setAsk(null); }
    finally { setBusy(false); }
  };
  const toggle = (k: 'pan' | 'cvv') => {
    if (show[k]) { setShow((s) => ({ ...s, [k]: false })); return; }
    if (secret) { setShow((s) => ({ ...s, [k]: true })); return; }
    setAsk(k === 'pan' ? 'reveal-pan' : 'reveal-cvv');
  };

  const last4 = c?.last4 || (c?.maskedPan ? c.maskedPan.replace(/\D/g, '').slice(-4) : '');
  const pan = show.pan && secret?.pan ? group(secret.pan) : `xxxx xxxx xxxx ${last4 || 'xxxx'}`;
  const expiry = (show.pan || show.cvv) && secret?.expiry ? secret.expiry : (c?.expiry || '-- / --');
  const blocked = c?.status === 'FROZEN';
  return (
    <GradientScreen>
      <AppBar title={c?.form === 'PHYSICAL' ? 'Physical Card' : 'Virtual Card'} showBack />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {!c ? (error ? <Text style={S.err}>{error}</Text> : <ActivityIndicator color={Colors.primary} />) : <>
          <View style={S.face}>
            <View style={S.blobA} /><View style={S.blobB} />
            <Text style={S.brand}>Payport</Text>
            <View style={S.panRow}>
              <Text style={S.pan}>{pan}</Text>
              <TouchableOpacity onPress={() => toggle('pan')} hitSlop={10}><Ionicons name={show.pan ? 'eye-off-outline' : 'eye-outline'} size={24} color="#fff" /></TouchableOpacity>
            </View>
            <View style={S.bottom}>
              <View><Text style={S.lbl}>NICKNAME</Text><Text style={S.val}>{c.nickname || c.nameOnCard || '—'}</Text></View>
              <View><Text style={S.lbl}>EXPIRY DATE</Text><Text style={S.val}>{expiry}</Text></View>
              <View>
                <Text style={S.lbl}>CVV</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={S.val}>{show.cvv && secret?.cvv ? secret.cvv : '***'}</Text>
                  <TouchableOpacity onPress={() => toggle('cvv')} hitSlop={10}><Ionicons name={show.cvv ? 'eye-off-outline' : 'eye-outline'} size={18} color="#fff" /></TouchableOpacity>
                </View>
              </View>
              <SchemeMark scheme={c.scheme} />
            </View>
          </View>
          {error ? <Text style={[S.err, { marginTop: 12 }]}>{error}</Text> : null}
          {c.status === 'ACTIVE' || c.status === 'FROZEN' ? (
            <TouchableOpacity style={S.action} onPress={() => setAsk(blocked ? 'UNBLOCK' : 'BLOCK')}>
              <View style={S.actionIcon}><Ionicons name="ban-outline" size={22} color="#fff" /></View>
              <Text style={S.actionTxt}>{blocked ? 'Unblock Card' : 'Block Card'}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={S.status}>{c.status === 'REQUESTED' ? (c.note || 'Requested') : c.status.charAt(0) + c.status.slice(1).toLowerCase()}</Text>
          )}
        </>}
      </ScrollView>
      <PinModal visible={!!ask} busy={busy} title={ask === 'BLOCK' ? 'Block card' : ask === 'UNBLOCK' ? 'Unblock card' : 'Show card details'}
        onClose={() => setAsk(null)} onSubmit={withPin} />
    </GradientScreen>
  );
}

const S = themed(() => ({
  face: { backgroundColor: '#1565D8', borderRadius: 16, padding: 20, overflow: 'hidden' },
  blobA: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.06)', top: -40, left: 110 },
  blobB: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -50, left: 210 },
  brand: { color: '#fff', fontSize: 18, fontWeight: '600', fontFamily: 'Rubik_600SemiBold' },
  panRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  pan: { color: '#fff', fontSize: 19, letterSpacing: 2, fontWeight: '600' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 22 },
  lbl: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, letterSpacing: 0.4, fontFamily: 'Nunito_700Bold' },
  val: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 3 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26, paddingVertical: 6 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F28C6B', alignItems: 'center', justifyContent: 'center' },
  actionTxt: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_600SemiBold' },
  status: { marginTop: 20, fontSize: 14, color: Colors.textSecondary },
  err: { color: Colors.red },
}));
