/**
 * Page backgrounds from the "Ink & Paper" design: F (mist), G (sage) and H (ruled paper).
 * F is the default.
 */

const shared = {
  paper: '#FFFFFF',
  ink: '#111111',
  muted: '#5C5B55',
  placeholder: '#6B6963',
  line: '#111111',
  hairline: 'rgba(17,17,17,0.15)',
  primary: '#2B45FF',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: '#E6E9FF',
  accent: '#F3F26B',
  highlight: '#F3F26B',
  lavender: '#C9B8FF',
  mint: '#A8EBC4',
  softNeutral: '#F3F3EC',
  errorBackground: '#FFE3E0',
  errorText: '#B3261E',
} as const;

export type BackgroundId = 'F' | 'G' | 'H';

export type BackgroundColors = {
  [K in keyof typeof shared]: string;
} & {
  background: string;
  /** Pastel used for the first "recent" row and as an accent fill. */
  softAccent: string;
};

export type BackgroundTheme = {
  id: BackgroundId;
  name: string;
  /** Ruled paper: rule lines, margin line, hole punches and a wider leading inset. */
  notebook: boolean;
  colors: BackgroundColors;
};

export const BACKGROUNDS: Record<BackgroundId, BackgroundTheme> = {
  F: {
    id: 'F',
    name: 'Mist',
    notebook: false,
    colors: { ...shared, background: '#E7EDFB', softAccent: shared.mint },
  },
  G: {
    id: 'G',
    name: 'Sage',
    notebook: false,
    // On sage, lilac keeps the first recent row from blending into the page.
    colors: { ...shared, background: '#E4EFE2', softAccent: shared.lavender },
  },
  H: {
    id: 'H',
    name: 'Ruled paper',
    notebook: true,
    colors: { ...shared, background: '#FFFFFF', softAccent: shared.mint },
  },
};

export const BACKGROUND_IDS: BackgroundId[] = ['F', 'G', 'H'];
export const DEFAULT_BACKGROUND_ID: BackgroundId = 'F';

/** Hard offset "sticker" shadow. Never blurred. */
export const hardShadow = (color: string, offset = 4) => ({
  boxShadow: `${offset}px ${offset}px 0px ${color}`,
});

/** Outline + hard shadow + fill used by cards, inputs, tiles and buttons. */
export function sticker(
  colors: BackgroundColors,
  { fill = colors.paper, radius = 20, shadow = 4 }: { fill?: string; radius?: number; shadow?: number } = {},
) {
  return {
    backgroundColor: fill,
    borderRadius: radius,
    borderWidth: 2,
    borderColor: colors.ink,
    ...(shadow > 0 ? hardShadow(colors.ink, shadow) : null),
  };
}

export const NOTEBOOK_CONTENT_INSET = 36;
export const DEFAULT_CONTENT_INSET = 20;
/** Spacing between ruled-paper lines. The hero/title text uses a 56pt line height (two rules). */
export const RULE_SPACING = 28;
