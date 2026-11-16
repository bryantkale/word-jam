import { StyleSheet, Text, type TextProps } from 'react-native';

import { interFamilyForWeight } from '@/constants/fonts';

/**
 * Text that defaults to Inter Tight. Custom font families are weight-specific, so a
 * fontWeight in the style picks the matching family. Pass fontFamily to use another font.
 */
export function AppText({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, fontFamily, ...rest } = flat;
  return (
    <Text
      {...props}
      style={[rest, { fontFamily: fontFamily ?? interFamilyForWeight(fontWeight) }]}
    />
  );
}
