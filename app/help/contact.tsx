import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors } from '../../constants/colors';

const CONTACTS = [
  { icon: 'logo-whatsapp' as const, label: 'WhatsApp Live Chat', value: '+263 719 183 557',        onPress: () => Linking.openURL('https://wa.me/263719183557'), color: '#25D366' },
  { icon: 'mail-outline' as const,  label: 'Email',              value: 'support@payport.africa',   onPress: () => Linking.openURL('mailto:support@payport.africa'), color: Colors.primary },
  { icon: 'globe-outline' as const, label: 'Website',            value: 'www.payport.africa',        onPress: () => Linking.openURL('https://www.payport.africa'), color: Colors.primary },
];

export default function ContactScreen() {
  return (
    <GradientScreen>
      <AppBar title="Contact Us" showBack />
      <ScrollView contentContainerStyle={S.body} showsVerticalScrollIndicator={false}>
        {CONTACTS.map((c) => (
          <TouchableOpacity key={c.label} onPress={c.onPress} style={S.card} activeOpacity={0.8}>
            <Text style={S.cardLabel}>{c.label}</Text>
            <View style={[S.iconBadge, { backgroundColor: `${c.color}18` }]}>
              <Ionicons name={c.icon} size={30} color={c.color} />
            </View>
            <Text style={S.cardValue}>{c.value}</Text>
          </TouchableOpacity>
        ))}

        <View style={S.addressCard}>
          <Ionicons name="location-outline" size={20} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={S.addressTitle}>Visit us</Text>
            <Text style={S.addressLine}>232 Herbert Chitepo Avenue, Harare, Zimbabwe</Text>
          </View>
        </View>
      </ScrollView>
    </GradientScreen>
  );
}

const S = StyleSheet.create({
  body: { padding: 20, paddingTop: 24, gap: 16 },
  card: {
    backgroundColor: Colors.cardBg, borderRadius: 16, padding: 22, alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: 'rgba(6,163,218,0.25)',
    shadowColor: '#091E3E', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  cardLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  iconBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  cardValue: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  addressCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: 'rgba(6,163,218,0.06)',
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(6,163,218,0.15)', marginTop: 4,
  },
  addressTitle: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 2 },
  addressLine: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', lineHeight: 19 },
});
