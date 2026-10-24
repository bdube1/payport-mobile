import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Colors, themed } from '../../constants/colors';

/** Asks for the wallet PIN before a sensitive card action. */
export default function PinModal({ visible, title, onSubmit, onClose, busy }: { visible: boolean; title: string; busy?: boolean; onSubmit: (pin: string) => void; onClose: () => void }) {
  const [pin, setPin] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={() => setPin('')}>
      <View style={S.back}>
        <View style={S.box}>
          <Text style={S.title}>{title}</Text>
          <TextInput value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={6} autoFocus
            placeholder="PIN" placeholderTextColor={Colors.textSecondary} style={S.input} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity onPress={onClose} style={[S.btn, { backgroundColor: Colors.borderLight }]}><Text style={[S.btnTxt, { color: Colors.textPrimary }]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity disabled={pin.length < 4 || busy} onPress={() => onSubmit(pin)} style={[S.btn, { backgroundColor: pin.length < 4 || busy ? '#9bb' : Colors.primary }]}>
              <Text style={S.btnTxt}>{busy ? '…' : 'Continue'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const S = themed(() => ({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 360, backgroundColor: Colors.cardBg, borderRadius: 18, padding: 20 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 20, letterSpacing: 6, textAlign: 'center', color: Colors.textPrimary },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
}));
