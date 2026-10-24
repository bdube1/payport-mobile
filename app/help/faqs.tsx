import { View, Text, StyleSheet, ScrollView } from 'react-native';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors, themed } from '../../constants/colors';

const FAQS = [
  { q: 'How long does airtime delivery take?',        a: 'Most top-ups are delivered within 30 seconds.' },
  { q: 'What payment methods are accepted?',          a: 'EcoCash, OneMoney, InnBucks, Omari, ZimSwitch, Visa/Mastercard and UnionPay.' },
  { q: 'Do I need an account to transact?',           a: 'No. You can transact as a guest without registering.' },
  { q: 'What currencies are supported?',              a: 'USD and Zimbabwe Gold (ZWG) across all services.' },
  { q: 'My payment was deducted but nothing arrived.',a: 'Contact support with your reference number. We resolve within 24 hours.' },
  { q: 'How do I track a transaction?',               a: 'Go to Home → Track Order and enter your reference number.' },
];

export default function FaqsScreen() {
  return (
    <GradientScreen>
      <AppBar title="FAQs" showBack />
      <ScrollView contentContainerStyle={S.body} showsVerticalScrollIndicator={false}>
        {FAQS.map((item, i) => (
          <View key={i} style={S.card}>
            <Text style={S.q}>{item.q}</Text>
            <Text style={S.a}>{item.a}</Text>
          </View>
        ))}
      </ScrollView>
    </GradientScreen>
  );
}

const S = themed(() => ({
  body: { padding: 20, paddingTop: 24, gap: 10 },
  card: { backgroundColor: Colors.cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  q: { fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 6 },
  a: { fontSize: 13.5, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', lineHeight: 20 },
}));
