import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, themed } from '../../constants/colors';

/** A PayPort QR: PAYPORT-QR:<token> (current QRs), or an older QR / text holding the six-digit code. */
export function isPayportQr(data: string): boolean {
  const s = String(data || '').trim();
  return /^PAYPORT-QR:[A-Z]{16}$/i.test(s) || /([1-9]\d{5})(?!.*\d)/.test(s);
}

export default function QrScanner({ visible, onCode, onClose, what = 'merchant' }: { visible: boolean; onCode: (payload: string) => void; onClose: () => void; what?: string }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [bad, setBad] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => { setDone(false); setBad(false); }}>
      <View style={S.root}>
        {!permission ? null : !permission.granted ? (
          <View style={S.centre}>
            <Ionicons name="camera-outline" size={48} color="#fff" />
            <Text style={S.msg}>Allow the camera to scan the {what}'s QR code.</Text>
            <TouchableOpacity onPress={requestPermission} style={S.btn}><Text style={S.btnTxt}>Allow camera</Text></TouchableOpacity>
          </View>
        ) : (
          <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={done ? undefined : ({ data }) => {
              if (!isPayportQr(data)) { setBad(true); return; }
              setDone(true);
              onCode(String(data).trim());
            }} />
        )}
        <View style={S.frameWrap} pointerEvents="none"><View style={S.frame} /></View>
        <View style={S.bottom}>
          <Text style={S.msg}>{bad ? 'That is not a PayPort QR code.' : `Point the camera at the ${what} QR code`}</Text>
          <TouchableOpacity onPress={onClose} style={[S.btn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}><Text style={S.btnTxt}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const S = themed(() => ({
  root: { flex: 1, backgroundColor: '#000' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  frameWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: Colors.primary },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center', gap: 14, paddingHorizontal: 24 },
  msg: { color: '#fff', fontSize: 15, textAlign: 'center' },
  btn: { backgroundColor: Colors.primary, borderRadius: 24, paddingHorizontal: 28, paddingVertical: 12 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
}));
