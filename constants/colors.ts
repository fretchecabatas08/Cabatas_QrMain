export const COLORS = {
  primary: '#123B6D',
  primaryDark: '#0B2545',
  background: '#F5F7FB',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  textPrimary: '#172B4D',
  textSecondary: '#64748B',
  textOnPrimary: '#FFFFFF',
  border: '#E2E8F0',
  shadow: '#0F172A',
  warning: '#F59E0B',
  success: '#16A34A',
  danger: '#DC2626',
} as const;

export type AppColors = typeof COLORS;
