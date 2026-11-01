// Payport Tap: lets the Android app act as an NFC tag (host card emulation) for 90 seconds after the customer confirms
// with their PIN, so a merchant's phone or POS can read the one-time payment token. Adds the NFC permission, the
// emulation service of react-native-hce and its AID list (NFC Forum Type 4 tag). Phones without NFC can still install.
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const AID_LIST = `<?xml version="1.0" encoding="utf-8"?>
<host-apdu-service xmlns:android="http://schemas.android.com/apk/res/android"
                   android:description="@string/app_name"
                   android:requireDeviceUnlock="true">
  <aid-group android:category="other" android:description="@string/app_name">
    <aid-filter android:name="D2760000850101" />
  </aid-group>
</host-apdu-service>
`;

function withManifest(config) {
  return withAndroidManifest(config, (c) => {
    const m = c.modResults.manifest;
    m['uses-permission'] = m['uses-permission'] || [];
    if (!m['uses-permission'].some((p) => p.$['android:name'] === 'android.permission.NFC'))
      m['uses-permission'].push({ $: { 'android:name': 'android.permission.NFC' } });
    m['uses-feature'] = m['uses-feature'] || [];
    if (!m['uses-feature'].some((p) => p.$['android:name'] === 'android.hardware.nfc.hce'))
      m['uses-feature'].push({ $: { 'android:name': 'android.hardware.nfc.hce', 'android:required': 'false' } });
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    app.service = app.service || [];
    if (!app.service.some((s) => s.$['android:name'] === 'com.reactnativehce.services.CardService')) {
      app.service.push({
        $: {
          'android:name': 'com.reactnativehce.services.CardService',
          'android:exported': 'true',
          'android:enabled': 'false',
          'android:permission': 'android.permission.BIND_NFC_SERVICE',
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.nfc.cardemulation.action.HOST_APDU_SERVICE' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        }],
        'meta-data': [{ $: { 'android:name': 'android.nfc.cardemulation.host_apdu_service', 'android:resource': '@xml/aid_list' } }],
      });
    }
    return c;
  });
}

function withAidList(config) {
  return withDangerousMod(config, ['android', async (c) => {
    const dir = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'aid_list.xml'), AID_LIST);
    return c;
  }]);
}

module.exports = function withPayportTap(config) {
  return withAidList(withManifest(config));
};
