import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { RULE_SPACING } from '@/constants/backgrounds';
import { useBackground } from '@/providers/background-provider';

const HOLE_TOPS = ['16%', '47%', '78%'] as const;

/**
 * Ruled paper for background H: rule lines, red margin and hole punches. It stays fixed
 * behind the scroll view and ignores touches. Renders nothing for F and G.
 */
export function ScreenBackdrop() {
  const { notebook } = useBackground();
  const { height } = useWindowDimensions();
  if (!notebook) return null;

  const rules = Math.ceil(height / RULE_SPACING);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}>
      {Array.from({ length: rules }, (_, i) => (
        <View key={i} style={[styles.rule, { top: (i + 1) * RULE_SPACING - 1 }]} />
      ))}
      <View style={styles.margin} />
      {HOLE_TOPS.map(top => (
        <View key={top} style={[styles.hole, { top }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#BCCDF0',
  },
  margin: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 26,
    width: 2,
    backgroundColor: '#F08A8A',
  },
  hole: {
    position: 'absolute',
    left: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E4E1D8',
  },
});
