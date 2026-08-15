import { ScrollView, View, Text, StyleSheet } from 'react-native';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors } from '../../constants/colors';

const SECTIONS = [
  {
    title: 'Services',
    body: [
      'We provide online payment solutions, including payment gateway integration, secure transaction processing, and related services, alongside our School, Books and Docs products.',
      'By using our services, you agree to comply with all applicable laws, regulations, and industry standards.',
    ],
  },
  {
    title: 'Account Registration',
    body: [
      'To access certain features (like transaction history and saved contacts), you may create an account and provide accurate, up-to-date information.',
      'You are responsible for maintaining the confidentiality of your account and for all activity under it.',
    ],
  },
  {
    title: 'Payment Processing',
    body: [
      'We facilitate payment processing for individuals and merchants, including EcoCash, OneMoney, ZimSwitch, Visa, Mastercard, and other supported methods.',
      'Payments are subject to processing terms set by our partners, banks, and payment processors.',
    ],
  },
  {
    title: 'Acceptable Use',
    body: [
      'You agree to use our services only for lawful purposes and in accordance with these Terms.',
      'You may not engage in activity that violates applicable laws, infringes on others\' rights, or disrupts our services.',
    ],
  },
  {
    title: 'Intellectual Property',
    body: [
      'All content, logos, trademarks, and intellectual property on our platforms belong to PAYPORT FINANCIAL SERVICES (PVT) LIMITED or our licensors.',
    ],
  },
  {
    title: 'Limitation of Liability',
    body: [
      'We are not liable for indirect, incidental, or consequential damages arising from your use of our services.',
      'Our total liability shall not exceed the total amount paid by you for the services in question.',
    ],
  },
  {
    title: 'Governing Law',
    body: ['These Terms are governed by the laws of Zimbabwe, and disputes are subject to the jurisdiction of Zimbabwean courts.'],
  },
];

export default function TermsScreen() {
  return (
    <GradientScreen>
      <AppBar title="Terms of Service" showBack />
      <ScrollView contentContainerStyle={S.body} showsVerticalScrollIndicator={false}>
        <Text style={S.intro}>
          These Terms govern your use of the services provided by PAYPORT FINANCIAL SERVICES (PVT) LIMITED and your
          access to our app and website. By using our services, you agree to be bound by these Terms.
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.title} style={S.section}>
            <Text style={S.sectionTitle}>{s.title}</Text>
            {s.body.map((p, i) => (
              <Text key={i} style={S.para}>• {p}</Text>
            ))}
          </View>
        ))}

        <View style={S.contactCard}>
          <Text style={S.contactTitle}>Contact Us</Text>
          <Text style={S.contactLine}>PAYPORT FINANCIAL SERVICES (PVT) LIMITED</Text>
          <Text style={S.contactLine}>232 Herbert Chitepo Avenue, Harare, Zimbabwe</Text>
          <Text style={S.contactLine}>support@payport.africa</Text>
          <Text style={S.contactLine}>+263 71 918 3557</Text>
        </View>
      </ScrollView>
    </GradientScreen>
  );
}

const S = StyleSheet.create({
  body: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', lineHeight: 22, marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 8 },
  para: { fontSize: 13.5, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', lineHeight: 21, marginBottom: 6 },
  contactCard: { backgroundColor: 'rgba(6,163,218,0.06)', borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: 'rgba(6,163,218,0.15)' },
  contactTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, fontFamily: 'Rubik_700Bold', marginBottom: 8 },
  contactLine: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', lineHeight: 20 },
});
