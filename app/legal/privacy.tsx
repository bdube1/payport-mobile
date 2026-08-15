import { ScrollView, View, Text, StyleSheet } from 'react-native';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors } from '../../constants/colors';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: [
      'Personal Information: When you use our services or interact with our website, we may collect personal information such as your name, email address, phone number, and payment details.',
      'Usage Information: We may collect information about your interactions with our website, including your IP address, browser type, pages visited, and other usage data.',
      'Cookies: We use cookies and similar tracking technologies to enhance your browsing experience and analyse website traffic.',
    ],
  },
  {
    title: 'How We Use Your Information',
    body: [
      'Provide Services: We use your personal information to process payments, fulfil orders, and provide customer support.',
      'Improve Our Services: We may use usage data and feedback to enhance our services, optimize performance, and tailor our offerings to your needs.',
      'Marketing: With your consent, we may send you promotional messages about our products and services. You can opt out at any time.',
    ],
  },
  {
    title: 'Data Security',
    body: [
      'We implement industry-standard security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction.',
      'We regularly review and update our security practices to ensure compliance with applicable laws and regulations.',
    ],
  },
  {
    title: 'Data Retention',
    body: [
      'We retain your personal information only for as long as necessary to fulfil the purposes outlined in this policy or as required by law.',
      'You may request deletion of your personal information at any time, subject to legal obligations and legitimate business interests.',
    ],
  },
  {
    title: 'Disclosure of Information',
    body: [
      'We may share your personal information with trusted third parties, including payment processors, banks, and service providers, to facilitate payment processing and service delivery.',
      'We may disclose your information in response to legal requests, court orders, or to comply with applicable laws and regulations.',
    ],
  },
  {
    title: 'Your Rights',
    body: [
      'You have the right to access, update, or delete your personal information, and to object to certain processing.',
      'To exercise your rights, contact us using the details below.',
    ],
  },
  {
    title: 'Changes to This Policy',
    body: ['We may update this Privacy Policy from time to time. Changes will be posted here and on our website.'],
  },
];

export default function PrivacyScreen() {
  return (
    <GradientScreen>
      <AppBar title="Privacy Policy" showBack />
      <ScrollView contentContainerStyle={S.body} showsVerticalScrollIndicator={false}>
        <Text style={S.intro}>
          PAYPORT FINANCIAL SERVICES (PVT) LIMITED ("we", "us", or "our") is committed to protecting the privacy and
          security of your personal information. This policy outlines how we collect, use, disclose, and safeguard
          your information when you use our website or app.
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
