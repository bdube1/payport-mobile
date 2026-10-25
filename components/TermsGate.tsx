import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, themed } from '../constants/colors';
import { SECTIONS as TERMS } from '../app/legal/terms';
import { SECTIONS as PRIVACY } from '../app/legal/privacy';

type Doc = 'terms' | 'privacy';

/** Shown once after installing: the Terms of Service and the Privacy Policy must be accepted before the app opens. */
export default function TermsGate({ onAccept }: { onAccept: () => void }) {
  const [doc, setDoc] = useState<Doc>('terms');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const sections = doc === 'terms' ? TERMS : PRIVACY;

  const Check = ({ on, label, toggle }: { on: boolean; label: string; toggle: () => void }) => (
    <TouchableOpacity style={S.check} onPress={toggle} activeOpacity={0.8}>
      <View style={[S.box, on && S.boxOn]}>{on && <Ionicons name="checkmark" size={16} color="#fff" />}</View>
      <Text style={S.checkText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={S.root} edges={['top', 'bottom']}>
      <View style={S.head}>
        <Image source={require('../assets/logo-mark-transparent.png')} style={S.logo} resizeMode="contain" />
        <Text style={S.title}>Welcome to Payport</Text>
      </View>
      <View style={S.tabs}>
        {(['terms', 'privacy'] as Doc[]).map((d) => (
          <TouchableOpacity key={d} style={[S.tab, doc === d && S.tabOn]} onPress={() => setDoc(d)}>
            <Text style={[S.tabText, doc === d && S.tabTextOn]}>{d === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={S.doc} contentContainerStyle={{ padding: 18 }}>
        {sections.map((s) => (
          <View key={s.title} style={{ marginBottom: 16 }}>
            <Text style={S.secTitle}>{s.title}</Text>
            {s.body.map((p, i) => <Text key={i} style={S.para}>• {p}</Text>)}
          </View>
        ))}
      </ScrollView>
      <View style={S.foot}>
        <Check on={terms} label="I accept the Terms of Service" toggle={() => setTerms((v) => !v)} />
        <Check on={privacy} label="I accept the Privacy Policy" toggle={() => setPrivacy((v) => !v)} />
        <TouchableOpacity style={[S.btn, !(terms && privacy) && S.btnOff]} disabled={!(terms && privacy)} onPress={onAccept} activeOpacity={0.85}>
          <Text style={S.btnText}>Accept and continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const S = themed(() => ({
  root: { flex: 1, backgroundColor: Colors.background },
  head: { alignItems: 'center', paddingTop: 18, paddingBottom: 12 },
  logo: { width: 64, height: 64 },
  title: { fontSize: 22, fontFamily: 'Rubik_700Bold', color: Colors.textPrimary, marginTop: 8 },
  tabs: { flexDirection: 'row', marginHorizontal: 18, backgroundColor: Colors.cardBg, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabOn: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13.5, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary },
  tabTextOn: { color: '#fff' },
  doc: { flex: 1, margin: 18, marginBottom: 10, backgroundColor: Colors.cardBg, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  secTitle: { fontSize: 15, fontFamily: 'Rubik_700Bold', color: Colors.textPrimary, marginBottom: 6 },
  para: { fontSize: 13.5, fontFamily: 'Nunito_400Regular', color: Colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  foot: { paddingHorizontal: 18, paddingBottom: 12 },
  check: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  boxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkText: { fontSize: 14.5, fontFamily: 'Nunito_600SemiBold', color: Colors.textPrimary },
  btn: { marginTop: 10, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnOff: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
}));
