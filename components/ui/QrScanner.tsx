import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, themed } from '../../constants/colors';

/** The six-digit merchant code in a PayPort QR (PAYPORT-MERCHANT:123456, a link ending in the code, or the code alone). */
export function codeFromQr(data: string): string | null {
  const m = String(data || '').match(/([1-9]\d{5})(?!.*\d)/);
  return m ? m[1] : null;
}

export default function QrScanner({ visible, onCode, onClose }: { visible: boolean; onCode: (code: string) => void; onClose: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [bad, setBad] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => { setDone(false); setBad(false); }}>
      <View style={S.root}>
        {!permission ? null : !permission.granted ? (
          <View style={S.centre}>
            <Ionicons name="camera-outline" size={48} color="#fff" />
            <Text style={S.msg}>Allow the camera to scan the merchant's QR code.</Text>
            <TouchableOpacity onPress={requestPermission} style={S.btn}><Text style={S.btnTxt}>Allow camera</Text></TouchableOpacity>
          </View>
        ) : (
          <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={done ? undefined : ({ data }) => {
              const code = codeFromQr(data);
              if (!code) { setBad(true); return; }
              setDone(true);
              onCode(code);
            }} />
        )}
        <View style={S.frameWrap} pointerEvents="none"><View style={S.frame} /></View>
        <View style={S.bottom}>
          <Text style={S.msg}>{bad ? 'That is not a PayPort merchant QR code.' : 'Point the camera at the merchant QR code'}</Text>
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
