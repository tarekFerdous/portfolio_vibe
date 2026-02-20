/* Configure colors manually based on design brief */
const colors = {
  primary: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1F2937',
    900: '#111827',
    // Fallbacks for any existing UI relying on these aliases
    lighter: '#F1F5F9', // 100
    light: '#CBD5E1', // 300
    main: '#64748B', // 500
    dark: '#334155', // 700
    darker: '#111827', // 900
  },
  secondary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
    // Fallbacks for any existing UI relying on these aliases
    lighter: '#E0E7FF', // 100
    light: '#A5B4FC', // 300
    main: '#6366F1', // 500
    dark: '#4338CA', // 700
    darker: '#312E81', // 900
  },
  grays: {
    '025': '#FCFCFD',
    '050': '#F7F7F8',
    100: '#ECEDEF',
    150: '#DFE2E6',
    200: '#D1D5DB',
    300: '#B9C0C9',
    400: '#8C96A3',
    500: '#697586',
    700: '#2D3642',
    800: '#1B222C',
    850: '#141A22',
    875: '#10151C',
    900: '#0C1016',
    950: '#070A0E',
    white: '#FFFFFF',
    black: '#000000',
  },
  accents: {
    badgeRedBase: '#EF4444',
    badgeRedTextOn: '#FFFFFF',
    statusGreenBase: '#22C55E',
    statusGreenGlow: 'rgba(34,197,94,0.35)',
    chipIconDark: 'rgba(255,255,255,0.75)',
    chipIconLight: 'rgba(0,0,0,0.60)',
    backgroundGhostTextDark: 'rgba(255,255,255,0.06)',
    backgroundGhostTextLight: 'rgba(0,0,0,0.05)',
  }
};

module.exports = { colors };
