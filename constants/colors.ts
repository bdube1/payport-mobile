// ============================================================
// Payport Colors — unified with payport.africa and the Payport Pay
// web app. Previously matched an older native app's own cyan/teal
// palette; now uses the single brand system used everywhere else.
// ============================================================

export const Colors = {
    // PRIMARY BRAND COLORS — same navy/blue/green used on the website and web app
    primary:       '#06A3DA',   // brand blue — app bar, buttons, active states
    primaryDark:   '#0487B8',   // darker blue — pressed states
    accent:        '#091E3E',   // navy — headers, dark surfaces, emphasis

    // Background
    background:    '#FBFDFF',   // subtle tinted background, matches web
    cardBg:        '#FFFFFF',
    pageBg:        '#FBFDFF',

    // Borders / dividers
    border:        'rgba(6,163,218,0.18)',
    divider:       'rgba(6,163,218,0.12)',
    borderLight:   'rgba(6,163,218,0.10)',

    // Text
    textPrimary:   '#091E3E',
    textSecondary: '#5A7A91',

    // Semantic
    green:         '#34AD54',
    orange:        '#F59E0B',
    red:           '#E53E3E',

    // Glass / glow effects — kept for any screen still using them, now blue-tinted instead of cyan
    glassOverlay:  '#CC091E3E',
    shadowGlow:    '#3306A3DA',
    lightCyan:     '#EAF8FE',

    // Service card colours (home screen) — all one brand blue/navy now, not per-card colours
    cardAirtime:   '#06A3DA',
    cardData:      '#091E3E',
    cardBills:     '#0487B8',
    cardTrack:     '#06A3DA',
    cardSupport:   '#091E3E',

    // Always
    white: '#FFFFFF',
    black: '#000000',

    // Legacy aliases
    dark:   '#091E3E',
    muted:  '#5A7A91',
    light:  '#EAF8FE',
    card:   '#FFFFFF',
};
