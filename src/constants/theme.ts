/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#541414',
    background: '#FFF8F7',
    backgroundElement: '#FFFEFD',
    backgroundSelected: '#FCE8E7',
    textSecondary: '#80696A',
  },
  dark: {
    text: '#FFF4F3',
    background: '#1C1114',
    backgroundElement: '#2A1D20',
    backgroundSelected: '#4A292D',
    textSecondary: '#D5BABB',
  },
} as const;

export const Palette = {
  burgundy: '#541414',
  coral: '#F36363',
  rose: '#EF8182',
  stone: '#D0D0C8',
  background: '#FFF8F7',
  paper: '#FFFEFD',
  ink: '#35191B',
  muted: '#80696A',
  line: '#EADCDD',
  softRose: '#FCE8E7',
  softStone: '#F5F2F1',
  errorBackground: '#FFF0EF',
  errorText: '#9A4146',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Helvetica Neue',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-rounded',
    mono: 'monospace',
  },
  default: {
    sans: 'Helvetica, Arial, sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: 'Helvetica, Arial, sans-serif',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
