import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import PinModal from '../../components/ui/PinModal';
import { Colors, themed } from '../../constants/colors';
import { walletApi, formatAmount } from '../../lib/api';

// The NFC tag emulation is Android only (iPhones do not let other apps act as a contactless card here).
const hce: any = Platform.OS === 'android' ? (() => { try { return require('react-native-hce'); } catch { return null; } })() : null;

type State = 'pick' | 'ready' | 'paid' | 'failed' | 'expired';
const errMsg = (e: any, f: string) => e?.response?.data?.error?.message || e?.response?.data?.message || f;

/**
 * Payport Tap: confirm with the PIN, then hold the phone to the merchant's phone or POS. The phone offers a one-time
 * token over NFC for 90 seconds; the merchant charges it; this screen shows the result.
 */
export default function TapToPay() {
  const router = useRouter();
  const [wallets, setWallets] = useState<any[]>([]);
  const [ccy, setCcy] = useState('');
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<State>('pick');
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const session = useRef<any>(null);
  const timers = useRef<any[]>([]);

  useEffect(() => {
    walletApi.list().then(r => {
      const ws = r.data?.data?.wallets || [];
      setWallets(ws);
      if (ws.length) setCcy(ws[0].currency);
    }).catch(() => setError('Your wallets could not be loaded.'));
    return () => { stop(); };
  }, []);

  const stop = async () => {
    timers.current.forEach(clearInterval);
    timers.current = [];
    try { if (session.current) await session.current.setEnabled(false); } catch { /* already off */ }
  };

  const begin = async (p: string) => {
    setBusy(true); setError('');
    try {
      const t = (await walletApi.tap(ccy, p)).data?.data;
      const { HCESession, NFCTagType4, NFCTagType4NDEFContentType } = hce;
      const tag = new NFCTagType4({ type: NFCTagType4NDEFContentType.Text, content: t.nfc, writable: false });
      session.current = await HCESession.getInstance();
      session.current.setApplication(tag);
      await session.current.setEnabled(true);
      setPin(false);
      setState('ready');
      setLeft(t.validSeconds || 90);
      timers.current.push(setInterval(() => setLeft(s => {
        if (s <= 1) { stop(); setState(x => (x === 'ready' ? 'expired' : x)); return 0; }
        return s - 1;
      }), 1000));
      timers.current.push(setInterval(async () => {
        try {
          const st = (await walletApi.tapStatus(t.token)).data?.data;
          if (st?.state === 'PAID' || st?.state === 'FAILED') {
            await stop();
            setResult(st);
            setState(st.state === 'PAID' ? 'paid' : 'failed');
            Haptics.notificationAsync(st.state === 'PAID' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
          }
        } catch { /* keep waiting */ }
      }, 2000));
    } catch (e: any) {
      setError(errMsg(e, 'Tap to pay could not start.'));
      setPin(false);
    } finally { setBusy(false); }
  };

  if (!hce) {
    return (
      <GradientScreen><AppBar title="Tap to pay" showBack />
        <View style={S.centre}>
          <Ionicons name="phone-portrait-outline" size={56} color={Colors.textSecondary} />
          <Text style={S.h}>Tap to pay works on Android phones with NFC</Text>
          <Text style={S.sub}>On this phone, pay a merchant with Scan QR or the merchant's code.</Text>
          <TouchableOpacity style={S.btn} onPress={() => router.replace('/wallet?tab=merchant' as any)}><Text style={S.btnTxt}>Pay merchant</Text></TouchableOpacity>
        </View>
      </GradientScreen>
    );
  }

  return (
    <GradientScreen>
      <AppBar title="Tap to pay" showBack />
      <View style={S.centre}>
        {state === 'pick' && <>
          <Ionicons name="wifi" size={64} color={Colors.primary} style={{ transform: [{ rotate: '90deg' }] }} />
          <Text style={S.h}>Pay with a tap</Text>
          <Text style={S.sub}>Confirm with your PIN, then hold your phone to the merchant's phone or POS. Turn on NFC in your phone's settings.</Text>
          <View style={S.row}>
            {wallets.map(w => (
              <TouchableOpacity key={w.currency} onPress={() => setCcy(w.currency)} style={[S.chip, ccy === w.currency && S.chipOn]}>
                <Text style={[S.chipTxt, ccy === w.currency && { color: '#fff' }]}>{w.currency} · {formatAmount(w.balanceMinor, w.currency)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!error && <Text style={S.err}>{error}</Text>}
          <TouchableOpacity style={[S.btn, !ccy && { opacity: 0.5 }]} disabled={!ccy} onPress={() => setPin(true)}><Text style={S.btnTxt}>Get ready to tap</Text></TouchableOpacity>
        </>}
        {state === 'ready' && <>
          <View style={S.pulse}><Ionicons name="wifi" size={72} color="#fff" style={{ transform: [{ rotate: '90deg' }] }} /></View>
          <Text style={S.h}>Hold your phone to the merchant's phone</Text>
          <Text style={S.sub}>Ready for {left} s · {ccy}</Text>
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
          <TouchableOpacity style={[S.btn, S.btnGhost]} onPress={() => { stop(); setState('pick'); }}><Text style={[S.btnTxt, { color: Colors.textPrimary }]}>Cancel</Text></TouchableOpacity>
        </>}
        {(state === 'paid' || state === 'failed') && <>
          <Ionicons name={state === 'paid' ? 'checkmark-circle' : 'close-circle'} size={80} color={state === 'paid' ? Colors.green : Colors.red} />
          <Text style={S.h}>{state === 'paid' ? 'Payment successful' : 'Payment failed'}</Text>
          {!!result?.amountMinor && <Text style={S.sub}>{formatAmount(result.amountMinor, result.currency)}{result.merchant ? ` to ${result.merchant}` : ''}</Text>}
          {state === 'failed' && !!result?.message && <Text style={S.err}>{result.message}</Text>}
          {!!result?.reference && <Text style={S.sub}>Ref {result.reference}</Text>}
          <TouchableOpacity style={S.btn} onPress={() => router.replace('/(tabs)' as any)}><Text style={S.btnTxt}>Done</Text></TouchableOpacity>
        </>}
        {state === 'expired' && <>
          <Ionicons name="time-outline" size={64} color={Colors.textSecondary} />
          <Text style={S.h}>The tap was not used in time</Text>
          <Text style={S.sub}>Nothing was paid. Try again when the merchant is ready.</Text>
          <TouchableOpacity style={S.btn} onPress={() => setState('pick')}><Text style={S.btnTxt}>Try again</Text></TouchableOpacity>
        </>}
      </View>
      <PinModal visible={pin} title="Enter your Payport PIN" busy={busy} onClose={() => setPin(false)} onSubmit={begin} />
    </GradientScreen>
  );
}

const S = themed(() => ({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  h: { fontSize: 20, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', textAlign: 'center', marginTop: 8 },
  sub: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
  err: { fontSize: 14, color: Colors.red, fontFamily: 'Rubik_700Bold', textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt: { color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', fontSize: 13 },
  btn: { marginTop: 16, backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 15, paddingHorizontal: 32, alignSelf: 'stretch', alignItems: 'center' },
  btnGhost: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border },
  btnTxt: { color: '#fff', fontSize: 15, fontFamily: 'Rubik_700Bold' },
  pulse: { width: 150, height: 150, borderRadius: 75, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
}));
