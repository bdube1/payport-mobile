import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GradientScreen from '../../components/ui/GradientScreen';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

// All four are real products/utilities — deliberately equal size and weight,
// no single one (e.g. Airtime) treated as "the" product.
const SERVICES = [
    { icon: 'phone-portrait-outline' as const, title: 'Airtime',       subtitle: 'Any network',       route: '/airtime' },
    { icon: 'wifi-outline' as const,           title: 'Data',          subtitle: 'Econet, NetOne, Telecel', route: '/data' },
    { icon: 'receipt-outline' as const,        title: 'Bills',         subtitle: 'ZESA, ZOL & more',   route: '/bills' },
    { icon: 'cube-outline' as const,           title: 'Track Order',   subtitle: 'Check status',       route: '/track' },
];

export default function HomeScreen() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);

    return (
        <GradientScreen>
            {/* Header — logo only, no coloured bar */}
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Image source={require('../../assets/logo-lockup.png')} style={styles.logoImg} resizeMode="contain" />
                </View>
                {user ? (
                    <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatar}>
                        <Text style={styles.avatarText}>{user.fullName[0].toUpperCase()}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.signInPill}>
                        <Text style={styles.signInPillText}>Sign In</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {/* Hero — brand moment, not tied to any one product */}
                <LinearGradient colors={[Colors.primary, Colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                    {user ? (
                        <>
                            <Text style={styles.heroTitle}>Welcome {user.fullName.split(' ')[0]}</Text>
                            <Text style={styles.heroSub}>What would you like to do today?</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.heroTitle}>Pay for anything{'\n'}Instantly.</Text>
                            <Text style={styles.heroSub}>Airtime, data & bills — no account needed.</Text>
                        </>
                    )}
                    <View style={styles.heroIconRow}>
                        {SERVICES.map((s) => (
                            <View key={s.route} style={styles.heroIconChip}>
                                <Ionicons name={s.icon} size={16} color="#fff" />
                            </View>
                        ))}
                    </View>
                </LinearGradient>

                {/* Services — equal weight, 2x2 */}
                <View style={styles.grid}>
                    {SERVICES.map((item) => (
                        <TouchableOpacity
                            key={item.route}
                            style={styles.card}
                            onPress={() => router.push(item.route as any)}
                            activeOpacity={0.85}
                        >
                            <View style={styles.iconBadge}>
                                <Ionicons name={item.icon} size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardSub}>{item.subtitle}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Support — quiet, not a product */}
                <TouchableOpacity style={styles.supportRow} onPress={() => router.push('/help')} activeOpacity={0.85}>
                    <View style={styles.supportIconBadge}>
                        <Ionicons name="help-circle-outline" size={20} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.supportTitle}>Need help?</Text>
                        <Text style={styles.supportSub}>Support, FAQs & policies</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
            </ScrollView>
        </GradientScreen>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
    },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoImg: { height: 52, width: 82 },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Rubik_700Bold' },
    signInPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primary },
    signInPillText: { fontSize: 12.5, fontWeight: '700', color: Colors.primary, fontFamily: 'Rubik_700Bold' },

    hero: {
        marginHorizontal: 20, marginTop: 6, borderRadius: 22, paddingTop: 46, paddingBottom: 24, paddingHorizontal: 24,
        shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4,
    },
    heroEyebrow: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.7)', fontFamily: 'Rubik_800ExtraBold', letterSpacing: 1.5, marginBottom: 10 }, // unused now, kept in case eyebrow text is wanted back
    heroTitle: { fontSize: 25, fontWeight: '800', color: '#fff', fontFamily: 'Rubik_800ExtraBold', lineHeight: 30, marginBottom: 8 },
    heroSub: { fontSize: 13.5, color: 'rgba(255,255,255,0.85)', fontFamily: 'Nunito_400Regular', marginBottom: 18 },
    heroIconRow: { flexDirection: 'row', gap: 8 },
    heroIconChip: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },

    grid: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
        paddingHorizontal: 20, gap: 14, marginTop: 22,
    },
    card: {
        width: '47%', backgroundColor: Colors.cardBg, borderRadius: 18,
        paddingVertical: 22, paddingHorizontal: 16,
        borderWidth: 1, borderColor: Colors.borderLight,
        shadowColor: '#091E3E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    },
    iconBadge: {
        width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(6,163,218,0.1)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    cardTitle: { fontSize: 15.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold', marginBottom: 3 },
    cardSub:   { fontSize: 12, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },

    supportRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 16,
        backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.borderLight,
    },
    supportIconBadge: {
        width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(6,163,218,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    supportTitle: { fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
    supportSub: { fontSize: 12, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', marginTop: 1 },
});
