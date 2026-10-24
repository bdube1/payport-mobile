// ============================================================
// Payport Colors — the brand system used on payport.africa and the web apps,
// in a light and a dark palette. The palette is chosen when the app starts:
// the user's choice (Profile > Appearance), else the phone's setting.
// Changing it restarts the app's JavaScript so every screen picks it up.
// ============================================================
import { Appearance, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark';
export const THEME_KEY = 'pp_theme';

function savedMode(): ThemeMode | null {
    try {
        const v = SecureStore.getItem(THEME_KEY);
        return v === 'dark' || v === 'light' ? v : null;
    } catch {
        return null;
    }
}

export let themeMode: ThemeMode = savedMode() ?? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
export let isDark = themeMode === 'dark';

const brand = {
    primary:       '#06A3DA',
    primaryDark:   '#0487B8',
    accent:        '#091E3E',
    green:         '#34AD54',
    orange:        '#F59E0B',
    red:           '#E53E3E',
    cardAirtime:   '#06A3DA',
    cardData:      '#091E3E',
    cardBills:     '#0487B8',
    cardTrack:     '#06A3DA',
    cardSupport:   '#091E3E',
    white: '#FFFFFF',
    black: '#000000',
    shadowGlow:    '#3306A3DA',
};

const light = {
    ...brand,
    background:    '#FBFDFF',
    cardBg:        '#FFFFFF',
    pageBg:        '#FBFDFF',
    gradientTop:   '#EAF6FC',
    gradientMid:   '#F6FAFD',
    border:        'rgba(6,163,218,0.18)',
    divider:       'rgba(6,163,218,0.12)',
    borderLight:   'rgba(6,163,218,0.10)',
    inputBorder:   '#DDDDDD',
    textPrimary:   '#091E3E',
    textSecondary: '#5A7A91',
    errorBg:       '#FFEBEE',
    successBg:     '#E8F5E9',
    subtleBg:      '#F9F9F9',
    glassOverlay:  '#CC091E3E',
    lightCyan:     '#EAF8FE',
    tabBar:        '#FFFFFF',
    dark:   '#091E3E',
    muted:  '#5A7A91',
    light:  '#EAF8FE',
    card:   '#FFFFFF',
};

const dark: typeof light = {
    ...brand,
    accent:        '#0B1730',
    cardData:      '#132A52',
    cardSupport:   '#132A52',
    background:    '#070C18',
    cardBg:        '#101A2E',
    pageBg:        '#070C18',
    gradientTop:   '#0B1A30',
    gradientMid:   '#08111F',
    border:        'rgba(6,163,218,0.28)',
    divider:       'rgba(6,163,218,0.18)',
    borderLight:   'rgba(6,163,218,0.16)',
    inputBorder:   '#2A3A55',
    textPrimary:   '#E8F1FA',
    textSecondary: '#93A9BE',
    errorBg:       'rgba(229,62,62,0.16)',
    successBg:     'rgba(52,173,84,0.16)',
    subtleBg:      '#14203A',
    glassOverlay:  '#CC050A14',
    lightCyan:     'rgba(6,163,218,0.12)',
    tabBar:        '#0B1324',
    dark:   '#E8F1FA',
    muted:  '#93A9BE',
    light:  'rgba(6,163,218,0.12)',
    card:   '#101A2E',
};

/** The live palette: switching theme updates it in place, so the app redraws without restarting or signing out. */
export const Colors: typeof light = { ...(isDark ? dark : light) };

let version = 0;
const listeners = new Set<(v: number) => void>();

/** Current theme version (changes on every switch). */
export const themeVersion = () => version;

export function onThemeChange(fn: (v: number) => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

/** Saves the choice and switches the palette at once; the session and the screen stay as they are. */
export async function setThemeMode(mode: ThemeMode) {
    try { await SecureStore.setItemAsync(THEME_KEY, mode); } catch { /* not saved */ }
    if (mode === themeMode) return;
    themeMode = mode;
    isDark = mode === 'dark';
    Object.assign(Colors, isDark ? dark : light);
    version += 1;
    listeners.forEach((fn) => fn(version));
}

/**
 * A style sheet that follows the theme: the styles are built from the current palette and rebuilt after a switch.
 * Use like StyleSheet.create: const S = themed(() => ({ card: { backgroundColor: Colors.cardBg } }));
 */
export function themed<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(build: () => T & StyleSheet.NamedStyles<any>): T {
    let built: T | null = null;
    let at = -1;
    const current = () => {
        if (!built || at !== version) { built = StyleSheet.create(build()) as T; at = version; }
        return built;
    };
    return new Proxy({} as T, {
        get: (_t, key) => (current() as any)[key],
        has: (_t, key) => key in current(),
        ownKeys: () => Reflect.ownKeys(current()),
        getOwnPropertyDescriptor: (_t, key) => ({ enumerable: true, configurable: true, value: (current() as any)[key] }),
    });
}
