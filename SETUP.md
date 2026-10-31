# Payport Mobile App — Setup Guide

## IDE: Use VS Code (not IntelliJ or Android Studio)

For React Native / Expo development you need **VS Code**, not IntelliJ or Android Studio.

### VS Code extensions to install:
- ESLint
- Prettier - Code formatter  
- React Native Tools (by Microsoft)
- Expo Tools (by Expo)
- TypeScript (built in)

You only need Android Studio **if you want the Android emulator** on your computer.
For daily development, just use your physical phone — it's faster.

---

## Prerequisites

Install these on your computer:

```bash
# Node.js 18+ (download from nodejs.org)
node --version   # should be 18+

# npm (comes with Node)
npm --version

# Expo CLI
npm install -g eas-cli

# For iOS builds (Mac only)
# Xcode from Mac App Store + command line tools:
xcode-select --install
```

---

## Step 1: Create the project folder

Copy all the files from this delivery into a folder called `payport-mobile`.

---

## Step 2: Install dependencies

```bash
cd payport-mobile
npm install
```

---

## Step 3: Configure your API URL

Edit `app.json` and find the `extra` section. Add your gateway URL:

```json
"extra": {
  "apiUrl": "http://YOUR_GATEWAY_IP:8080",
  "eas": { "projectId": "YOUR_EAS_PROJECT_ID" }
}
```

For local testing, if your phone and computer are on the same WiFi:
- Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)  
- Use: `"apiUrl": "http://192.168.x.x:8080"`

---

## Step 4: Install Expo Go on your phone

- iPhone: App Store → search "Expo Go"
- Android: Play Store → search "Expo Go"

---

## Step 5: Run the app

```bash
npm start
# or
npx expo start
```

A QR code will appear in your terminal.
- **iPhone**: Open the Camera app and scan the QR code
- **Android**: Open the Expo Go app and scan the QR code

The app will load on your phone instantly. Every time you save a file, the app updates automatically.

---

## Step 6: Run on emulator (optional)

```bash
# Android emulator (requires Android Studio)
npm run android

# iOS simulator (Mac only, requires Xcode)
npm run ios
```

---

## Building for App Store / Play Store

### One-time setup:
```bash
# Create an Expo account at expo.dev
eas login
eas build:configure
```

### Build for testing (internal):
```bash
# Android APK for testing
eas build --platform android --profile preview

# iOS TestFlight build  
eas build --platform ios --profile preview
```

### Build for production:
```bash
# Both platforms at once
eas build --platform all --profile production
```

### Submit to stores:
```bash
eas submit --platform android
eas submit --platform ios
```

---

## Project structure explained

```
payport-mobile/
├── app/                    ← All screens (Expo Router file-based routing)
│   ├── _layout.tsx         ← Root layout (fonts, auth hydration)
│   ├── (tabs)/             ← Bottom tab screens
│   │   ├── index.tsx       ← Home screen
│   │   ├── history.tsx     ← Transaction history
│   │   ├── beneficiaries.tsx ← Saved contacts
│   │   └── profile.tsx     ← Settings & profile
│   ├── (auth)/             ← Login & register screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── airtime/index.tsx   ← Airtime top-up flow (4 steps)
│   ├── data/index.tsx      ← Data bundles flow (4 steps)
│   ├── bills/index.tsx     ← Bill payments flow (4 steps)
│   ├── processing/[ref].tsx ← Real-time transaction status
│   └── status/[ref].tsx    ← Transaction receipt
│
├── components/ui/          ← Reusable UI components
│   ├── Button.tsx          ← Primary/green/outline/danger buttons
│   ├── Card.tsx            ← White card container
│   ├── PhoneInput.tsx      ← Zimbabwe phone input (+263 prefix)
│   ├── StepBar.tsx         ← Multi-step progress indicator
│   ├── ErrorBanner.tsx     ← Inline error message
│   └── NetworkBadge.tsx    ← "Econet detected" badge
│
├── constants/
│   └── colors.ts           ← All Payport brand colours
│
├── lib/
│   ├── api.ts              ← All API calls (translated from web portal)
│   ├── auth.ts             ← Secure storage (Keychain/Keystore)
│   └── biometric.ts        ← Face ID / fingerprint helper
│
├── store/
│   └── authStore.ts        ← Zustand auth state (login/register/logout)
│
├── app.json                ← Expo config (bundle IDs, permissions, etc.)
├── eas.json                ← Build profiles for EAS
├── babel.config.js         ← Required for Reanimated
└── package.json            ← Dependencies
```

---

## Making changes that apply to both web and mobile

The API layer (`lib/api.ts`) mirrors the web portal's `src/lib/api.js` exactly.
Any change to an API endpoint should be made in both files:

| Web portal                    | Mobile app              |
|-------------------------------|-------------------------|
| `src/lib/api.js`              | `lib/api.ts`            |
| `src/pages/Airtime.jsx`       | `app/airtime/index.tsx` |
| `src/pages/Data.jsx`          | `app/data/index.tsx`    |
| `src/pages/Bills.jsx`         | `app/bills/index.tsx`   |
| `src/pages/Processing.jsx`    | `app/processing/[ref].tsx` |
| `src/pages/History.jsx`       | `app/(tabs)/history.tsx` |
| `src/pages/Beneficiaries.jsx` | `app/(tabs)/beneficiaries.tsx` |

---

## Security notes

- JWT token stored in Keychain (iOS) / Keystore (Android) via expo-secure-store — never in AsyncStorage
- Biometrics (Face ID/Touch ID/fingerprint) required on every "Confirm & Pay" screen
- All API calls use HTTPS in production
- No sensitive data logged to console in production

---

## Common issues

**"Network request failed"**  
→ Make sure your phone and computer are on the same WiFi network  
→ Check that the gateway is running: `http://YOUR_IP:8080/api/v1/products`

**Fonts not loading**  
→ Run `npm install` again, then restart with `npm start -- --clear`

**Biometrics not working in emulator**  
→ Biometrics only work on real devices. The app falls back to PIN in simulators.

**"Could not connect to development server"**  
→ Stop the server (Ctrl+C), run `npm start -- --clear`

## Build-time settings (app.config.js)

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | API base URL (defaults to the production API in app.json) |
| `EAS_PROJECT_ID` | EAS project id for push notifications (`eas init`). Without it, push registration is skipped and the app says so. |

Example: `EAS_PROJECT_ID=xxxxxxxx-xxxx-... eas build -p android --profile preview`.

## Wallet

The Wallet tab appears for signed-in customers. It shows "not available yet" until Payport switches the
WALLETS product line on in the ops console (licence recorded, then switched on). Paying with the wallet
asks for the customer's PIN, which is sent only to the wallet endpoints.
