import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors, themed } from '../../constants/colors';

const ITEMS = [
  { icon: 'information-circle-outline' as const, label: 'About Us',                       route: '/help/about'    },
  { icon: 'headset-outline' as const,             label: 'Contact Us',                     route: '/help/contact'  },
  { icon: 'share-social-outline' as const,        label: 'Social Media',                   route: '/help/social'   },
  { icon: 'help-buoy-outline' as const,           label: 'FAQs',                           route: '/help/faqs'     },
  { icon: 'shield-checkmark-outline' as const,    label: 'Privacy Policy',                 route: '/legal/privacy' },
  { icon: 'document-text-outline' as const,       label: 'Terms & Conditions',              route: '/legal/terms'   },
];

export default function HelpHubScreen() {
  const router = useRouter();
  return (
    <GradientScreen>
      <AppBar title="Help & Support" showBack />
      <ScrollView contentContainerStyle={S.body} showsVerticalScrollIndicator={false}>
        <View style={S.grid}>
          {ITEMS.map((item) => (
            <TouchableOpacity key={item.route} style={S.card} onPress={() => router.push(item.route as any)} activeOpacity={0.8}>
              <View style={S.iconBadge}>
                <Ionicons name={item.icon} size={26} color={Colors.primary} />
              </View>
              <Text style={S.cardLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </GradientScreen>
  );
}

const S = themed(() => ({
  body: { padding: 20, paddingTop: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  card: {
    width: '47%', backgroundColor: Colors.cardBg, borderRadius: 16, paddingVertical: 26, paddingHorizontal: 10,
    alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: 'rgba(6,163,218,0.25)',
    shadowColor: '#091E3E', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  iconBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(6,163,218,0.1)', alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', textAlign: 'center' },
}));
