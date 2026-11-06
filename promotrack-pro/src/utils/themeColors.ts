/**
 * Dynamic Theme Color Customizer for PromoTrack PWA
 */

export interface ThemeColorPreset {
  id: string;
  name: string;
  nameLao: string;
  primary: string;
  primaryDark: string;
  surfaceSecondary: string;
}

export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  {
    id: 'sage',
    name: 'Sage Green (Default)',
    nameLao: 'ຂຽວໃບຊາ (ມາດຕະຖານ)',
    primary: '#248A60',
    primaryDark: '#176B4A',
    surfaceSecondary: '#EEF4EF'
  },
  {
    id: 'emerald',
    name: 'Forest Emerald',
    nameLao: 'ຂຽວມໍລະກົດ',
    primary: '#059669',
    primaryDark: '#047857',
    surfaceSecondary: '#ECFDF5'
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    nameLao: 'ຟ້າທະເລ',
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    surfaceSecondary: '#EFF6FF'
  },
  {
    id: 'indigo',
    name: 'Indigo Violet',
    nameLao: 'ມ່ວງຄາມ',
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    surfaceSecondary: '#EEF2FF'
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    nameLao: 'ມ່ວງຫຼວງ',
    primary: '#9333EA',
    primaryDark: '#7E22CE',
    surfaceSecondary: '#FAF5FF'
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    nameLao: 'ສົ້ມທອງອ່ອນ',
    primary: '#D97706',
    primaryDark: '#B45309',
    surfaceSecondary: '#FFFBEB'
  },
  {
    id: 'rose',
    name: 'Crimson Rose',
    nameLao: 'ແດງກຸຫຼາບ',
    primary: '#E11D48',
    primaryDark: '#BE123C',
    surfaceSecondary: '#FFF1F2'
  },
  {
    id: 'teal',
    name: 'Modern Teal',
    nameLao: 'ຂຽວໄຂ່ການົກ',
    primary: '#0D9488',
    primaryDark: '#0F766E',
    surfaceSecondary: '#F0FDFA'
  }
];

export function applyThemeColor(colorId: string, isDark: boolean = false) {
  if (typeof document === 'undefined') return;

  const preset = THEME_COLOR_PRESETS.find((p) => p.id === colorId) || THEME_COLOR_PRESETS[0];
  const root = document.documentElement;

  if (isDark) {
    root.style.setProperty('--color-primary', preset.primary);
    root.style.setProperty('--color-primary-dark', preset.primaryDark);
  } else {
    root.style.setProperty('--color-primary', preset.primary);
    root.style.setProperty('--color-primary-dark', preset.primaryDark);
    root.style.setProperty('--color-surface-secondary', preset.surfaceSecondary);
  }
}
