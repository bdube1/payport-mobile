import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors, themed } from '../../constants/colors';
import { storeApi } from '../../lib/api';

// The colour of each kind of store (the same as the Payport Store website).
export const TYPE_COLOURS: Record<string, string> = {
  FOOD: '#F07A45', CLOTHING: '#E46FA2', DRINKS: '#2AA3AE', SERVICES: '#2A86CC', BEAUTY: '#A16EE8',
  ELECTRONICS: '#6C7FE8', HOME: '#45B97A', CRAFTS: '#F7B44C', SHOP: '#4C9AD6', OTHER: '#4C9AD6',
};
const TYPE_ICONS: Record<string, any> = {
  FOOD: 'restaurant-outline', CLOTHING: 'shirt-outline', DRINKS: 'cafe-outline', SERVICES: 'briefcase-outline', BEAUTY: 'sparkles-outline',
  ELECTRONICS: 'laptop-outline', HOME: 'home-outline', CRAFTS: 'gift-outline', SHOP: 'bag-handle-outline', OTHER: 'bag-handle-outline',
};

const S = themed(() => ({
  body: { padding: 16, paddingBottom: 40 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: 16, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  searchIn: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15, color: Colors.textPrimary, fontFamily: 'Nunito_400Regular' },
  chips: { gap: 8, paddingBottom: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt: { fontSize: 13, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 10 },
  h2: { fontSize: 18, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  link: { fontSize: 13, color: Colors.primary, fontFamily: 'Rubik_700Bold' },
  card: { backgroundColor: Colors.cardBg, borderRadius: 18, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight },
  art: { height: 96, alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: 96 },
  open: { position: 'absolute', top: 10, left: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22A05B' },
  openTxt: { fontSize: 11, color: '#0B6B35', fontFamily: 'Rubik_700Bold' },
  cardBody: { padding: 14, gap: 4 },
  name: { fontSize: 16, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  meta: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular' },
  tags: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  tag: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', fontFamily: 'Rubik_700Bold' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontFamily: 'Nunito_400Regular' },
  err: { color: Colors.red, textAlign: 'center', marginTop: 20, fontFamily: 'Nunito_400Regular' },
}));

export default function StoreDirectory() {
  const router = useRouter();
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const load = (t = type, query = q) => {
    setError('');
    storeApi.stores(t, query).then(r => setData(r.data?.data || r.data)).catch(e => setError(e?.response?.data?.message || 'The store could not be reached.'));
  };
  useEffect(() => { load(); }, []);
  const types: any[] = data?.types || [];
  const stores: any[] = data?.stores || [];
  return (
    <GradientScreen>
      <AppBar title="Payport Store" showBack rightElement={
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity onPress={() => router.push('/store/messages' as any)} accessibilityLabel="Messages"><Ionicons name="chatbubbles-outline" size={22} color="#fff" /></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/store/orders' as any)} accessibilityLabel="My orders"><Ionicons name="receipt-outline" size={22} color="#fff" /></TouchableOpacity>
        </View>} />
      <ScrollView contentContainerStyle={S.body} keyboardShouldPersistTaps="handled">
        <View style={S.search}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput style={S.searchIn} placeholder="Search stores and products" placeholderTextColor={Colors.textSecondary} value={q}
            onChangeText={setQ} onSubmitEditing={() => load(type, q)} returnKeyType="search" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chips}>
          {[{ code: '', name: 'All' }, ...types].map((t: any) => (
            <TouchableOpacity key={t.code || 'all'} style={[S.chip, type === t.code && S.chipOn]} onPress={() => { setType(t.code); load(t.code, q); }}>
              <Ionicons name={t.code ? TYPE_ICONS[t.code] || 'bag-handle-outline' : 'grid-outline'} size={15} color={type === t.code ? '#fff' : Colors.primary} />
              <Text style={[S.chipTxt, type === t.code && { color: '#fff' }]}>{t.name}{t.stores ? ` ${t.stores}` : ''}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={S.head}><Text style={S.h2}>{q ? 'Results' : 'All stores'}</Text><Text style={S.link}>{stores.length} open now</Text></View>
        {!data && !error && <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />}
        {!!error && <Text style={S.err}>{error}</Text>}
        {data && stores.length === 0 && <Text style={S.empty}>No stores here yet.</Text>}
        {stores.map((s: any) => (
          <TouchableOpacity key={s.slug} style={S.card} activeOpacity={0.85} onPress={() => router.push(`/store/${s.slug}` as any)}>
            {s.banner ? <Image source={{ uri: s.banner }} style={S.img} /> : (
              <View style={[S.art, { backgroundColor: TYPE_COLOURS[s.type] || TYPE_COLOURS.OTHER }]}>
                <Ionicons name={TYPE_ICONS[s.type] || 'bag-handle-outline'} size={42} color="#fff" />
              </View>
            )}
            <View style={S.open}><View style={S.dot} /><Text style={S.openTxt}>Open</Text></View>
            <View style={S.cardBody}>
              <Text style={S.name}>{s.name}</Text>
              <Text style={S.meta}>{s.typeName} · {s.items} {s.items === 1 ? 'item' : 'items'}</Text>
              {(s.payOnDelivery || s.rating) && <View style={S.tags}>
                {s.payOnDelivery && <Text style={[S.tag, { backgroundColor: '#E1F1FA', color: '#0C6CA6' }]}>Pay on delivery</Text>}
                {!!s.rating && <Text style={[S.tag, { backgroundColor: '#FFF4E0', color: '#9A5B00' }]}>{s.rating}</Text>}
              </View>}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </GradientScreen>
  );
}
