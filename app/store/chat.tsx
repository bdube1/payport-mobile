import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors, themed } from '../../constants/colors';
import { storeApi } from '../../lib/api';

const S = themed(() => ({
  body: { padding: 16, paddingBottom: 24, gap: 8 },
  mine: { alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: Colors.primary, borderRadius: 16, borderBottomRightRadius: 4, padding: 12 },
  theirs: { alignSelf: 'flex-start', maxWidth: '82%', backgroundColor: Colors.cardBg, borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, borderWidth: 1, borderColor: Colors.border },
  txtMine: { color: '#fff', fontSize: 15, fontFamily: 'Nunito_400Regular' },
  txt: { color: Colors.textPrimary, fontSize: 15, fontFamily: 'Nunito_400Regular' },
  time: { fontSize: 11, marginTop: 4, opacity: 0.7, color: Colors.textSecondary },
  bar: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: Colors.border, alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary, backgroundColor: Colors.cardBg, maxHeight: 120 },
  send: { backgroundColor: Colors.primary, borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40, fontFamily: 'Nunito_400Regular' },
  note: { textAlign: 'center', color: Colors.textSecondary, fontSize: 12, marginTop: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt: { fontSize: 14, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  btn: { backgroundColor: Colors.green, borderRadius: 24, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  btnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_700Bold' },
}));

/** Chat with a store's seller, or report the store (the same conversations and reports as the website, WhatsApp and USSD). */
export default function StoreChat() {
  const { slug, name, report } = useLocalSearchParams<{ slug: string; name?: string; report?: string }>();
  const [messages, setMessages] = useState<any[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const scroll = useRef<ScrollView>(null);
  const reporting = report === '1';

  const load = () => storeApi.chat(String(slug)).then(r => setMessages(r.data?.data?.messages || [])).catch(() => setMessages(m => m || []));
  useEffect(() => {
    if (reporting) { storeApi.reportReasons().then(r => setReasons(r.data?.data || {})).catch(() => {}); return undefined; }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [slug, reporting]);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { const r = await storeApi.say(String(slug), text.trim()); setMessages(r.data?.data?.messages || []); setText(''); }
    catch (e: any) { Alert.alert('Not sent', e?.response?.data?.message || 'Please try again.'); }
    finally { setBusy(false); }
  };

  const sendReport = () => Alert.alert('Report this store', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Report', style: 'destructive', onPress: async () => {
      setBusy(true);
      try {
        const r = await storeApi.report(String(slug), reason, details || undefined);
        const ref = r.data?.data?.complaintRef;
        Alert.alert('Reported', ref ? `Payport customer care will look into it. Reference ${ref}.` : 'Payport customer care will look into it.');
        setReason(''); setDetails('');
      } catch (e: any) { Alert.alert('Not sent', e?.response?.data?.message || 'Please try again.'); }
      finally { setBusy(false); }
    } },
  ]);

  if (reporting) return (
    <GradientScreen>
      <AppBar title={`Report ${name || 'store'}`} showBack />
      <ScrollView contentContainerStyle={S.body}>
        {Object.entries(reasons).map(([k, v]) => (
          <TouchableOpacity key={k} style={[S.chip, reason === k && S.chipOn]} onPress={() => setReason(k)}>
            <Text style={[S.chipTxt, reason === k && { color: '#fff' }]}>{v}</Text>
          </TouchableOpacity>
        ))}
        <TextInput style={[S.input, { minHeight: 100, textAlignVertical: 'top' }]} value={details} onChangeText={setDetails} placeholder="Details" placeholderTextColor={Colors.textSecondary} multiline maxLength={1000} />
        <TouchableOpacity style={[S.btn, (!reason || busy) && { opacity: 0.6 }]} disabled={!reason || busy} onPress={sendReport}>
          <Text style={S.btnTxt}>{busy ? 'Sending…' : 'Send report'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </GradientScreen>
  );

  return (
    <GradientScreen>
      <AppBar title={name || 'Chat'} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={S.body} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          {messages === null ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
            : messages.length === 0 ? <Text style={S.empty}>Ask the seller anything before you order or pay.</Text>
              : messages.map(m => (
                <View key={m.id} style={m.from === 'customer' ? S.mine : S.theirs}>
                  <Text style={m.from === 'customer' ? S.txtMine : S.txt}>{m.text}</Text>
                  <Text style={[S.time, m.from === 'customer' && { color: '#fff' }]}>{m.time}</Text>
                </View>
              ))}
          <Text style={S.note}>Messages are encrypted. Pay only through Payport.</Text>
        </ScrollView>
        <View style={S.bar}>
          <TextInput style={S.input} value={text} onChangeText={setText} placeholder="Type a message" placeholderTextColor={Colors.textSecondary} multiline maxLength={1000} />
          <TouchableOpacity style={[S.send, (busy || !text.trim()) && { opacity: 0.6 }]} disabled={busy || !text.trim()} onPress={send}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </GradientScreen>
  );
}
