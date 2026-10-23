import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors } from '../../constants/colors';

const VALUES = [
  { icon: 'flash-outline' as const,   title: 'Fast',    desc: 'Most transactions complete in seconds, not minutes.' },
  { icon: 'shield-checkmark-outline' as const, title: 'Secure', desc: 'Every transaction is verified and tracked end to end.' },
  { icon: 'people-outline' as const,  title: 'Simple',  desc: 'No account required — just a number and an amount.' },
];

export default function AboutScreen() {
  return (
    <GradientScreen>
      <AppBar title="About Payport" showBack />
      <ScrollView contentContainerStyle={S.body} showsVerticalScrollIndicator={false}>
        <Text style={S.title}>Simple, everyday payments</Text>
        <Text style={S.lede}>
          Payport Pay lets you buy airtime, data bundles and pay bills — ZESA, DStv, TelOne and more — instantly,
          without needing an account. Create one if you'd like to save contacts and see your transaction history,
          but it's never required to pay.
        </Text>

        <View style={S.valuesRow}>
          {VALUES.map((v) => (
            <View key={v.title} style={S.valueCard}>
              <View style={S.iconBadge}><Ionicons name={v.icon} size={22} color={Colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={S.valueTitle}>{v.title}</Text>
                <Text style={S.valueDesc}>{v.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={S.addressCard}>
          <Ionicons name="location-outline" size={20} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={S.addressTitle}>Based in Harare</Text>
            <Text style={S.addressLine}>232 Herbert Chitepo Avenue, Harare, Zimbabwe</Text>
          </View>
        </View>
      </ScrollView>
    </GradientScreen>
  );
}

const S = StyleSheet.create({
  body: { padding: 20, paddingTop: 24 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, fontFamily: 'Rubik_800ExtraBold', marginBottom: 10 },
  lede: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', lineHeight: 22, marginBottom: 24 },
  valuesRow: { gap: 12, marginBottom: 20 },
  valueCard: { backgroundColor: Colors.cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.borderLight, flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(6,163,218,0.1)', alignItems: 'center', justifyContent: 'center' },
  valueTitle: { fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 2 },
  valueDesc: { fontSize: 12.5, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  addressCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: 'rgba(6,163,218,0.06)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(6,163,218,0.15)' },
  addressTitle: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 2 },
  addressLine: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
});
