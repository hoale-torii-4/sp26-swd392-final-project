import { Platform } from 'react-native';

// ── Lộc Xuân Color Palette ──
export const AppColors = {
  primary: '#8B1A1A',       // burgundy red
  primaryDark: '#701515',
  accent: '#C0A062',        // gold
  accentLight: '#D4B876',
  dark: '#1B3022',          // forest green
  background: '#F5F5F0',    // warm off-white
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  error: '#DC2626',
  success: '#16A34A',
  overlay: 'rgba(0,0,0,0.5)',
};

export const Colors = {
  light: {
    text: AppColors.text,
    background: AppColors.background,
    tint: AppColors.primary,
    icon: AppColors.textSecondary,
    tabIconDefault: AppColors.textMuted,
    tabIconSelected: AppColors.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System' as string,
    serif: 'Georgia' as string,
    mono: 'Menlo' as string,
  },
  default: {
    sans: 'normal' as string,
    serif: 'serif' as string,
    mono: 'monospace' as string,
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
