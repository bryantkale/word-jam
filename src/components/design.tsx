import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { sticker } from '@/constants/backgrounds';
import { AppFonts } from '@/constants/fonts';
import { useBackground } from '@/providers/background-provider';

/** DM Mono 11pt uppercase label with tracking. */
export function MonoLabel({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useBackground();
  return (
    <Text
      style={[
        {
          color: color ?? colors.muted,
          fontFamily: AppFonts.mono,
          fontSize: 11,
          letterSpacing: 0.9,
          textTransform: 'uppercase',
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

/**
 * Italic serif sentence with the first case-insensitive match of `word` highlighted
 * in lemon (upright). Renders plain when there is no match.
 */
export function HighlightedSentence({
  sentence,
  word,
  size = 18,
  color,
  style,
}: {
  sentence: string;
  word: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useBackground();
  const index = word ? sentence.toLocaleLowerCase().indexOf(word.toLocaleLowerCase()) : -1;
  const base: TextStyle = {
    color: color ?? colors.ink,
    fontFamily: AppFonts.serifItalic,
    fontSize: size,
    lineHeight: Math.round(size * 1.28),
  };

  if (index < 0) return <Text style={[base, style]}>{sentence}</Text>;

  const end = index + word.length;
  return (
    <Text style={[base, style]}>
      {sentence.slice(0, index)}
      <Text
        style={{
          backgroundColor: colors.highlight,
          color: colors.ink,
          fontFamily: AppFonts.serif,
          fontStyle: 'normal',
        }}>
        {' '}
        {sentence.slice(index, end)}
        {' '}
      </Text>
      {sentence.slice(end)}
    </Text>
  );
}

/** Tilted letter tile (44x44 by default). */
export function InitialTile({
  letter,
  fill,
  tilt = 0,
  size = 44,
}: {
  letter: string;
  fill: string;
  tilt?: number;
  size?: number;
}) {
  const { colors } = useBackground();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tile,
        sticker(colors, { fill, radius: 12, shadow: 0 }),
        { width: size, height: size, transform: [{ rotate: `${tilt}deg` }] },
      ]}>
      <Text style={{ color: colors.ink, fontFamily: AppFonts.serif, fontSize: 26, lineHeight: 30 }}>
        {letter}
      </Text>
    </View>
  );
}

/** 56x32 sticker toggle. A real switch for screen readers. */
export function StickerToggle({
  value,
  onPress,
  disabled,
  label,
  children,
}: {
  value: boolean;
  onPress: () => void;
  disabled?: boolean;
  label: string;
  children?: ReactNode;
}) {
  const { colors } = useBackground();
  const track = useMemo(
    () => ({
      width: 56,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.ink,
      backgroundColor: value ? colors.primary : colors.softNeutral,
      justifyContent: 'center' as const,
      paddingHorizontal: 2,
    }),
    [colors, value],
  );
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={[track, disabled && styles.disabled]}>
      {children ?? (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: colors.ink,
            backgroundColor: colors.paper,
            alignSelf: value ? 'flex-end' : 'flex-start',
          }}
        />
      )}
    </Pressable>
  );
}

export { AppText };

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
