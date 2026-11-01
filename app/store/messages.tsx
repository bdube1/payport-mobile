import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import GradientScreen from '../../components/ui/GradientScreen';
import AppBar from '../../components/ui/AppBar';
import { Colors, themed } from '../../constants/colors';
import { storeApi } from '../../lib/api';

const S = themed(() => ({
  body: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border },
  store: { fontSize: 15, color: Colors.textPrimary, fontFamily: 'Rubik_700Bold' },
  preview: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Nunito_400Regular', marginTop: 2 },
  time: { fontSize: 11, color: Colors.textSecondary },
  badge: { backgroundColor: Colors.primary, borderRadius: 10, minWidth: 20, paddingHorizontal: 6, alignItems: 'center', marginTop: 6, alignSelf: 'flex-end' },
  badgeTxt: { color: '#fff', fontSize: 12, fontFamily: 'Rubik_700Bold' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40, fontFamily: 'Nunito_400Regular' },
}));

/** Every conversation with a store, kept for the record (messages are never deleted); tap one to continue it. */
export default function StoreMessages() {
  const router = useRouter();
  const [chats, setChats] = useState<any[] | null>(null);
  useFocusEffect(useCallback(() => {
    storeApi.chats().then(r => setChats(r.data?.data || [])).catch(() => setChats([]));
  }, []));
  return (
    <GradientScreen>
      <AppBar title="Messages" showBack />
      <ScrollView contentContainerStyle={S.body}>
        {chats === null ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          : chats.length === 0 ? <Text style={S.empty}>No messages yet. Use Contact seller on a store to ask a question.</Text>
            : chats.map((c, i) => (
              <TouchableOpacity key={i} style={S.row} onPress={() => router.push({ pathname: '/store/chat', params: { slug: c.slug, name: c.store } } as any)}>
                <View style={{ flex: 1 }}>
                  <Text style={S.store}>{c.store}</Text>
                  <Text style={S.preview} numberOfLines={1}>{c.preview}</Text>
                </View>
                <View>
                  <Text style={S.time}>{c.time}</Text>
                  {c.unread > 0 && <View style={S.badge}><Text style={S.badgeTxt}>{c.unread}</Text></View>}
                </View>
              </TouchableOpacity>
            ))}
      </ScrollView>
    </GradientScreen>
  );
}
