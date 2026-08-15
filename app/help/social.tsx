import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors } from '../../constants/colors';

const SOCIALS = [
  { icon: 'logo-whatsapp' as const,  label: 'WhatsApp',  handle: '+263 719 183 557', color: '#25D366', onPress: () => Linking.openURL('https://wa.me/263719183557') },
  { icon: 'logo-facebook' as const,  label: 'Facebook',  handle: '@PayportFin',      color: '#1877F2', onPress: () => Linking.openURL('https://web.facebook.com/PayportFin/') },
  { icon: 'logo-twitter' as const,   label: 'X',          handle: '@Payportfin',      color: '#000000', onPress: () => Linking.openURL('https://x.com/Payportfin') },
  { icon: 'logo-instagram' as const, label: 'Instagram',  handle: '@payportfin',      color: '#E4405F', onPress: () => Linking.openURL('https://www.instagram.com/payportfin/') },
  { icon: 'logo-linkedin' as const,  label: 'LinkedIn',   handle: 'Payport',          color: '#0A66C2', onPress: () => Linking.openURL('https://www.linkedin.com/company/105393711/') },
];

export default function SocialScreen() {
  return (
    <GradientScreen>
      <AppBar title="Social Media" showBack />
      <ScrollView contentContainerStyle={S.body} showsVerticalScrollIndicator={false}>
        {SOCIALS.map((s) => (
          <TouchableOpacity key={s.label} onPress={s.onPress} style={S.card} activeOpacity={0.8}>
            <View style={[S.iconBadge, { backgroundColor: `${s.color}18` }]}>
              <Ionicons name={s.icon} size={22} color={s.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardLabel}>{s.label}</Text>
              <Text style={S.cardHandle}>{s.handle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </GradientScreen>
  );
}

const S = StyleSheet.create({
  body: { padding: 20, paddingTop: 24, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff',
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.borderLight,
  },
  iconBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  cardHandle: { fontSize: 12.5, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', marginTop: 1 },
});
