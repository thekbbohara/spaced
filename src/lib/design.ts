// Design tokens adapted from DESIGN.md (Cal.com-inspired) for native UI.
// Cal Sans is not publicly available; display type uses the system font at
// weight 600 with negative letter-spacing, the documented substitute.
import { Platform, TextStyle } from 'react-native';

export const colors = {
  primary: '#111111',
  primaryActive: '#242424',
  primaryDisabled: '#e5e7eb',
  ink: '#111111',
  body: '#374151',
  muted: '#6b7280',
  mutedSoft: '#898989',
  hairline: '#e5e7eb',
  hairlineSoft: '#f3f4f6',
  canvas: '#ffffff',
  surfaceSoft: '#f8f9fa',
  surfaceCard: '#f5f5f5',
  surfaceStrong: '#e5e7eb',
  surfaceDark: '#101010',
  surfaceDarkElevated: '#1a1a1a',
  onPrimary: '#ffffff',
  onDark: '#ffffff',
  onDarkSoft: '#a1a1aa',
  brandAccent: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  badgeOrange: '#fb923c',
  badgePink: '#ec4899',
  badgeViolet: '#8b5cf6',
  badgeEmerald: '#34d399',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 96,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
  full: 9999,
} as const;

const display: TextStyle = {
  color: colors.ink,
  fontWeight: '600',
  ...Platform.select({ default: {}, ios: { fontFamily: 'System' } }),
};

export const type = {
  displayXl: { ...display, fontSize: 40, lineHeight: 44, letterSpacing: -1.5 },
  displayLg: { ...display, fontSize: 34, lineHeight: 38, letterSpacing: -1.2 },
  displayMd: { ...display, fontSize: 28, lineHeight: 32, letterSpacing: -0.8 },
  displaySm: { ...display, fontSize: 24, lineHeight: 28, letterSpacing: -0.5 },
  titleLg: { color: colors.ink, fontSize: 22, fontWeight: '600', letterSpacing: -0.3 },
  titleMd: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  titleSm: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  bodyMd: { color: colors.body, fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodySm: { color: colors.body, fontSize: 14, fontWeight: '400', lineHeight: 21 },
  caption: { color: colors.muted, fontSize: 13, fontWeight: '500' },
  button: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
} satisfies Record<string, TextStyle>;
