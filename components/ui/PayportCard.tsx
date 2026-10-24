import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themed } from '../../constants/colors';

export type CardData = {
  cardRef: string; walletRef: string; currency: string; scheme: string; form: string; status: string;
  maskedPan?: string | null; last4?: string | null; expiry?: string | null; nickname?: string | null; nameOnCard?: string | null; note?: string | null;
};

export function SchemeMark({ scheme }: { scheme: string }) {
  return scheme === 'ZIMSWITCH'
    ? <Text style={S.zim}>ZimSwitch</Text>
    : <Text style={S.visa}>VISA</Text>;
}

/** The card as listed: brand, arrow, nickname, scheme mark. */
export function CardTile({ c, onOpen }: { c: CardData; onOpen: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onOpen} style={S.tile}>
      <View style={S.blobA} /><View style={S.blobB} />
      <View style={S.row}>
        <Text style={S.brand}>Payport</Text>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </View>
      <View style={[S.row, { alignItems: 'flex-end', marginTop: 18 }]}>
        <View>
          <Text style={S.lbl}>NICKNAME</Text>
          <Text style={S.val}>{c.nickname || c.nameOnCard || '—'}</Text>
        </View>
        <SchemeMark scheme={c.scheme} />
      </View>
    </TouchableOpacity>
  );
}

export const cardStyles = themed(() => ({
  face: { backgroundColor: '#1565D8', borderRadius: 16, padding: 20, overflow: 'hidden' as const },
}));

const S = themed(() => ({
  tile: { backgroundColor: '#004A93', borderRadius: 16, padding: 18, marginBottom: 14, overflow: 'hidden' },
  blobA: { position: 'absolute', width: 160, height: 160, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', top: -30, left: 120, transform: [{ rotate: '35deg' }] },
  blobB: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -70, left: 230 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#fff', fontSize: 18, fontWeight: '600', fontFamily: 'Rubik_600SemiBold' },
  lbl: { color: 'rgba(255,255,255,0.8)', fontSize: 11, letterSpacing: 0.5, fontFamily: 'Nunito_600SemiBold' },
  val: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2, fontFamily: 'Rubik_600SemiBold' },
  visa: { color: '#fff', fontSize: 22, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
  zim: { color: '#fff', fontSize: 15, fontWeight: '800', fontStyle: 'italic' },
}));
