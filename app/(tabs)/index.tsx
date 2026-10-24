import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GradientScreen from '../../components/ui/GradientScreen';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { walletApi, formatAmount } from '../../lib/api';

// All four are real products/utilities — deliberately equal size and weight,
// no single one (e.g. Airtime) treated as "the" product.
const SERVICES = [
    { icon: 'phone-portrait-outline' as const, title: 'Airtime',       subtitle: 'Any network',       route: '/airtime' },
    { icon: 'wifi-outline' as const,           title: 'Data',          subtitle: 'Econet, NetOne, Telecel', route: '/data' },
    { icon: 'receipt-outline' as const,        title: 'Bills',         subtitle: 'ZESA, ZOL & more',   route: '/bills' },
    { icon: 'cube-outline' as const,           title: 'Track Order',   subtitle: 'Check status',       route: '/track' },
];

const WALLET_SERVICES = [
    { icon: 'add-circle-outline' as const,      title: 'Top up',       route: '/wallet?a=topup' },
    { icon: 'paper-plane-outline' as const,     title: 'Send money',   route: '/wallet?a=send' },
    { icon: 'cash-outline' as const,            title: 'Cash out',     route: '/wallet?a=cashout' },
    { icon: 'swap-horizontal-outline' as const, title: 'Convert',      route: '/wallet?a=convert' },
    { icon: 'storefront-outline' as const,      title: 'Pay merchant', route: '/wallet?a=merchant' },
    { icon: 'phone-portrait-outline' as const,  title: 'Airtime',      route: '/airtime' },
    { icon: 'wifi-outline' as const,            title: 'Data',         route: '/data' },
    { icon: 'receipt-outline' as const,         title: 'Bills',        route: '/bills' },
    { icon: 'card-outline' as const,            title: 'Cards',        route: '/wallet?a=cards' },
];

type W = { walletRef: string; currency: string; balanceMinor: number; status: string };
const ORDER: Record<string, number> = { USD: 0, ZWG: 1 };

/** Home for a registered customer: wallets and every service in one place. */
function RegisteredHome() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user)!;
    const [wallets, setWallets] = useState<W[] | null>(null);
    const [enabled, setEnabled] = useState(false);
    const [hide, setHide] = useState(false);
    const load = useCallback(() => walletApi.list()
        .then((r) => { const d = r.data?.data || {}; setEnabled(!!d.enabled); setWallets([...(d.wallets || [])].sort((a: W, b: W) => (ORDER[a.currency] ?? 9) - (ORDER[b.currency] ?? 9))); })
        .catch(() => setWallets([])), []);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    return (
        <GradientScreen>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
                <LinearGradient colors={[Colors.primary, Colors.primaryDark, Colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dashHeader}>
                    <View style={styles.dashTop}>
                        <View style={styles.logoPill}><Image source={require('../../assets/logo-lockup.png')} style={styles.dashLogo} resizeMode="contain" /></View>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.dashAvatar}>
                            <Text style={styles.avatarText}>{user.fullName[0].toUpperCase()}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 }}>
                        <View>
                            <Text style={styles.dashHello}>Welcome back</Text>
                            <Text style={styles.dashName}>{user.fullName.split(' ')[0]}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setHide((h) => !h)} style={styles.eye}>
                            <Ionicons name={hide ? 'eye-off-outline' : 'eye-outline'} size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.wrow}>
                        {wallets === null ? <View style={styles.wcard}><Text style={styles.wlabel}>Loading…</Text></View> : null}
                        {(wallets || []).map((w) => (
                            <TouchableOpacity key={w.walletRef} style={styles.wcard} activeOpacity={0.85} onPress={() => router.push(`/history?tab=wallet` as any)}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={styles.wlabel}>{w.currency} Wallet</Text>
                                    {w.status !== 'ACTIVE' ? <Text style={styles.wlabel}>{w.status}</Text> : null}
                                </View>
                                <Text style={styles.wbal} numberOfLines={1} adjustsFontSizeToFit>{hide ? '••••••' : formatAmount(w.balanceMinor, w.currency)}</Text>
                                <Text style={styles.wref}>{w.walletRef}</Text>
                            </TouchableOpacity>
                        ))}
                        {wallets && wallets.length === 0 ? (
                            <TouchableOpacity style={styles.wcard} onPress={() => enabled && router.push('/wallet?a=topup' as any)}>
                                <Text style={styles.wlabel}>PayPort Wallet</Text>
                                <Text style={[styles.wbal, { fontSize: 18 }]}>{enabled ? 'Open your wallet' : 'Coming soon'}</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </LinearGradient>

                <View style={styles.grid3}>
                    {WALLET_SERVICES.map((s) => (
                        <TouchableOpacity key={s.title} style={styles.tile} activeOpacity={0.85} onPress={() => router.push(s.route as any)}>
                            <View style={styles.tileIcon}><Ionicons name={s.icon} size={26} color={Colors.primary} /></View>
                            <Text style={styles.tileTxt} numberOfLines={1}>{s.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.helpCard} onPress={() => router.push('/help')} activeOpacity={0.85}>
                    <View style={styles.helpIcon}><Ionicons name="help-circle-outline" size={24} color="#fff" /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.supportTitle}>Need help?</Text>
                        <Text style={styles.supportSub}>Chat with us or track an order</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                </TouchableOpacity>
            </ScrollView>
        </GradientScreen>
    );
}

export default function HomeScreen() {
    const user = useAuthStore((s) => s.user);
    return user ? <RegisteredHome /> : <GuestHome />;
}

function GuestHome() {
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
    dashHeader: { paddingTop: 52, paddingBottom: 22, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    dashTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logoPill: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 2 },
    dashLogo: { height: 36, width: 62 },
    dashAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
    dashHello: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontFamily: 'Nunito_400Regular' },
    dashName: { fontSize: 26, fontWeight: '800', color: '#fff', fontFamily: 'Rubik_800ExtraBold' },
    eye: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
    wrow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, marginHorizontal: -4 },
    wcard: { flexGrow: 1, flexBasis: '45%', margin: 4, borderRadius: 18, padding: 16, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
    wlabel: { fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontFamily: 'Rubik_700Bold' },
    wbal: { fontSize: 20, fontWeight: '800', color: '#fff', fontFamily: 'Rubik_800ExtraBold', marginVertical: 8 },
    wref: { fontSize: 12, color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
    grid3: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, marginTop: 20 },
    tile: {
        width: '30.6%', marginHorizontal: '1.35%', marginBottom: 12, backgroundColor: Colors.cardBg, borderRadius: 18, paddingVertical: 16, alignItems: 'center',
        borderWidth: 1, borderColor: Colors.borderLight, shadowColor: '#091E3E', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    tileIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(6,163,218,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    tileTxt: { fontSize: 12.5, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
    helpCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, marginTop: 8, padding: 16, borderRadius: 18, backgroundColor: Colors.lightCyan },
    helpIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
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
