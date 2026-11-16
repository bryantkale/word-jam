/** Font files bundled in assets/fonts (all SIL OFL). Keys are the family names used in styles. */
export const FONT_FILES = {
  InstrumentSerif: require('../../assets/fonts/InstrumentSerif_400Regular.ttf'),
  'InstrumentSerif-Italic': require('../../assets/fonts/InstrumentSerif_400Regular_Italic.ttf'),
  'InterTight-Regular': require('../../assets/fonts/InterTight_400Regular.ttf'),
  'InterTight-Medium': require('../../assets/fonts/InterTight_500Medium.ttf'),
  'InterTight-SemiBold': require('../../assets/fonts/InterTight_600SemiBold.ttf'),
  'InterTight-Bold': require('../../assets/fonts/InterTight_700Bold.ttf'),
  'DMMono-Regular': require('../../assets/fonts/DMMono_400Regular.ttf'),
  'DMMono-Medium': require('../../assets/fonts/DMMono_500Medium.ttf'),
} as const;

export const AppFonts = {
  serif: 'InstrumentSerif',
  serifItalic: 'InstrumentSerif-Italic',
  mono: 'DMMono-Regular',
  monoMedium: 'DMMono-Medium',
} as const;

/** Inter Tight family name for a numeric/string font weight. */
export function interFamilyForWeight(weight: unknown) {
  const value = weight === 'bold' ? 700 : Number(weight) || 400;
  if (value >= 700) return 'InterTight-Bold';
  if (value >= 600) return 'InterTight-SemiBold';
  if (value >= 500) return 'InterTight-Medium';
  return 'InterTight-Regular';
}
