
export const COLORS = {
  // Primary brand colors
  primary: '#123B6D',
  primaryDark: '#0B2545',
  primaryLight: '#E8F0FA',

  // Gold / yellow accents
  accent: '#FFC928',
  accentDark: '#D9A514',
  accentLight: '#FFF5CC',

  // App backgrounds and cards
  background: '#F3F6FA',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',

  // Text colors
  textPrimary: '#172B4D',
  textSecondary: '#64748B',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#102A43',

  // Borders and shadows
  border: '#E2E8F0',
  shadow: '#0F172A',

  // Status colors
  warning: '#F59E0B',
  success: '#16A34A',
  danger: '#DC2626',
  info: '#2563EB',
} as const;

export type AppColors = typeof COLORS;
