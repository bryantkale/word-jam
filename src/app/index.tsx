import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppMenu } from '@/components/app-menu';
import { AppText as Text } from '@/components/app-text';
import { HighlightedSentence, MonoLabel } from '@/components/design';
import { ScreenBackdrop } from '@/components/screen-backdrop';
import {
  DEFAULT_CONTENT_INSET,
  NOTEBOOK_CONTENT_INSET,
  RULE_SPACING,
  sticker,
  type BackgroundColors,
} from '@/constants/backgrounds';
import { AppFonts } from '@/constants/fonts';
import { useAuth } from '@/providers/auth-provider';
import { useBackground } from '@/providers/background-provider';
import {
  getNextReminder,
  refreshDailyRemindersIfEnabled,
  type NextReminder,
} from '@/services/reminders';
import { isSupabaseConfigured } from '@/services/supabase';
import {
  clearQueuedWord,
  fetchDefinition,
  getWordHistory,
  queueWordForSaving,
  saveQueuedWord,
  saveWord,
} from '@/services/wordbook';
import type { DictionaryEntry, SavedWord } from '@/types/word';
import { normalizeDefinitionPhrase } from '@/utils/word-sentences';

function useStyles() {
  const { colors } = useBackground();
  return useMemo(() => createStyles(colors), [colors]);
}

function formatNudgeTime(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'NEXT NUDGE';
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const day =
    date.toDateString() === today.toDateString()
      ? 'TODAY'
      : date.toDateString() === tomorrow.toDateString()
        ? 'TOMORROW'
        : date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
  return `NEXT NUDGE · ${day} ${time}`;
}

function SearchIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20 }}>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 12,
          top: 13,
          width: 2,
          height: 7,
          backgroundColor: color,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 20, height: 22, alignItems: 'center' }}>
      <View
        style={{
          width: 14,
          height: 14,
          borderTopLeftRadius: 7,
          borderTopRightRadius: 7,
          borderWidth: 2,
          borderBottomWidth: 0,
          borderColor: color,
        }}
      />
      <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View
        style={{
          width: 6,
          height: 3,
          marginTop: 1,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function WordCard({ entry }: { entry: DictionaryEntry }) {
  const styles = useStyles();
  const sentence =
    entry.examples[0] ?? `“${entry.word}” means ${normalizeDefinitionPhrase(entry.definition)}.`;
  return (
    <View style={styles.definitionCard}>
      <View style={styles.wordHeading}>
        <View style={styles.wordTitleGroup}>
          <Text style={styles.wordTitle}>{entry.word}</Text>
          {entry.pronunciation ? (
            <Text style={styles.pronunciation}>{entry.pronunciation}</Text>
          ) : null}
        </View>
        {entry.partOfSpeech ? <Text style={styles.partOfSpeech}>{entry.partOfSpeech}</Text> : null}
      </View>
      <View style={styles.cardDivider} />
      <MonoLabel>The meaning</MonoLabel>
      <Text style={styles.definitionText}>{entry.definition}</Text>
      <View style={styles.exampleBox}>
        <MonoLabel>In a sentence</MonoLabel>
        <HighlightedSentence sentence={sentence} word={entry.word} size={19} style={styles.exampleText} />
      </View>
    </View>
  );
}

function RecentWord({ word, fill }: { word: SavedWord; fill: string }) {
  const styles = useStyles();
  return (
    <View
      accessible
      accessibilityLabel={`${word.word}${word.partOfSpeech ? `, ${word.partOfSpeech}` : ''}`}
      style={[styles.recentRow, { backgroundColor: fill }]}>
      <Text numberOfLines={1} style={styles.recentWord}>
        {word.word}
      </Text>
      {word.partOfSpeech ? (
        <MonoLabel color="#111111">{abbreviatePartOfSpeech(word.partOfSpeech)}</MonoLabel>
      ) : null}
    </View>
  );
}

function abbreviatePartOfSpeech(partOfSpeech: string) {
  const value = partOfSpeech.toLowerCase();
  if (value.startsWith('adj')) return 'adj.';
  if (value.startsWith('adv')) return 'adv.';
  if (value.startsWith('verb')) return 'verb';
  return value;
}

export default function HomeScreen() {
  const { isAuthenticated, authError, signIn } = useAuth();
  const { colors, notebook } = useBackground();
  const styles = useStyles();
  const [nextReminder, setNextReminder] = useState<NextReminder | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DictionaryEntry | null>(null);
  const [history, setHistory] = useState<SavedWord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedWordId, setSavedWordId] = useState('');
  const [message, setMessage] = useState('');

  const loadRecentWords = useCallback(async () => {
    if (!isSupabaseConfigured() || !isAuthenticated) {
      setHistory([]);
      setNextReminder(null);
      return;
    }
    try {
      if (Platform.OS === 'web') {
        const queuedWord = await saveQueuedWord();
        if (queuedWord) {
          setMessage(`“${queuedWord.word}” was saved to your words.`);
        }
      }
      const recentWords = await getWordHistory();
      setHistory(recentWords);
      try {
        await refreshDailyRemindersIfEnabled(recentWords);
        setNextReminder(await getNextReminder());
      } catch (error) {
        setMessage(
          `Daily reminders could not be refreshed: ${error instanceof Error ? error.message : 'Please try again.'
          }`,
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load your saved words.');
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void loadRecentWords();
    }, [loadRecentWords]),
  );

  const handleLookup = async () => {
    const searchTerm = query.trim();
    if (!searchTerm || isSearching) return;

    Keyboard.dismiss();
    setIsSearching(true);
    setMessage('');
    setResult(null);
    setSavedWordId('');

    try {
      const entry = await fetchDefinition(searchTerm);
      setResult(entry);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveWord = async () => {
    if (!result || isSaving) return;
    setIsSaving(true);
    setMessage('');

    try {
      if (!isAuthenticated) {
        if (Platform.OS === 'web') {
          await queueWordForSaving(result);
          await signIn();
          return;
        }
        const signedIn = await signIn();
        if (!signedIn) {
          setMessage('Sign-in was cancelled. The word is still here if you want to try again.');
          return;
        }
      }

      const savedWord = await saveWord(result);
      setSavedWordId(savedWord.id);
      setHistory(current =>
        [savedWord, ...current.filter(word => word.id !== savedWord.id)].slice(0, 100),
      );
      await clearQueuedWord();
      try {
        await refreshDailyRemindersIfEnabled([savedWord, ...history]);
      } catch (error) {
        setMessage(
          `Word saved, but daily reminders could not be refreshed: ${error instanceof Error ? error.message : 'Please try again.'
          }`,
        );
      }
    } catch (error) {
      let saveError = error instanceof Error ? error.message : 'Could not save this word.';
      if (Platform.OS === 'web' && !isAuthenticated) {
        try {
          await clearQueuedWord();
        } catch (cleanupError) {
          saveError += ` The pending save could not be cleared: ${cleanupError instanceof Error ? cleanupError.message : 'Please try again.'
            }`;
        }
      }
      setMessage(saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const savedId = isAuthenticated ? savedWordId : '';

  const recent = history.slice(0, 2);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenBackdrop />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingLeft: notebook ? NOTEBOOK_CONTENT_INSET : DEFAULT_CONTENT_INSET },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View accessible accessibilityRole="header" style={styles.brandLockup}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>W</Text>
            </View>
            <Text style={styles.brandName}>WordJam</Text>
          </View>
          <AppMenu />
        </View>

        <View style={styles.hero} accessible accessibilityRole="header">
          <Text maxFontSizeMultiplier={1.2} style={styles.headline}>
            Look it up.
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.headline}>
            Keep it.
          </Text>
          <View style={styles.useItChip}>
            <Text maxFontSizeMultiplier={1.2} style={styles.useItText}>
              Use it.
            </Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            accessibilityLabel="Word to look up"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            onSubmitEditing={() => void handleLookup()}
            placeholder="Look up a word…"
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Look up word"
            disabled={!query.trim() || isSearching}
            hitSlop={4}
            onPress={() => void handleLookup()}
            style={({ pressed }) => [
              styles.searchButton,
              (!query.trim() || isSearching) && styles.searchButtonDisabled,
              pressed && styles.pressed,
            ]}>
            {isSearching ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <SearchIcon color={colors.onPrimary} />
            )}
          </Pressable>
        </View>

        {!isSupabaseConfigured() ? (
          <Text style={styles.setupHint}>Add your Supabase keys to .env to sign in and save words.</Text>
        ) : null}

        {authError || message ? (
          <View style={styles.messageBox} accessibilityLiveRegion="polite">
            <Text style={styles.messageText}>{authError || message}</Text>
          </View>
        ) : null}

        {result ? (
          <>
            <WordCard entry={result} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={savedId ? 'Word saved' : 'Save word to your account'}
              disabled={isSaving || Boolean(savedId) || !isSupabaseConfigured()}
              onPress={() => void handleSaveWord()}
              style={({ pressed }) => [
                styles.saveButton,
                (isSaving || savedId || !isSupabaseConfigured()) && styles.searchButtonDisabled,
                pressed && styles.pressed,
              ]}>
              {isSaving ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {savedId
                    ? 'Saved to your words'
                    : isAuthenticated
                      ? 'Save to my words'
                      : 'Continue with Google to save'}
                </Text>
              )}
            </Pressable>
          </>
        ) : null}

        {nextReminder && isAuthenticated ? (
          <View
            accessible
            accessibilityLabel={`${formatNudgeTime(nextReminder.date).toLowerCase()}. ${nextReminder.word}. ${nextReminder.sentence}`}
            style={styles.nudgeStack}>
            <View style={styles.nudgeBack} />
            <View style={styles.nudgeMiddle} />
            <View style={styles.nudgeFront}>
              <View style={styles.nudgeTop}>
                <MonoLabel color={colors.onPrimary}>{formatNudgeTime(nextReminder.date)}</MonoLabel>
                <BellIcon color={colors.onPrimary} />
              </View>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.nudgeWord}>
                {nextReminder.word}
              </Text>
              <View style={styles.nudgeRule} />
              <HighlightedSentence
                sentence={nextReminder.sentence}
                word={nextReminder.word}
                size={19}
                color={colors.onPrimary}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <MonoLabel>Recently looked up</MonoLabel>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.push('/explore')}
            style={({ pressed }) => [styles.seeAllButton, pressed && styles.pressed]}>
            <Text style={styles.seeAllText}>See all →</Text>
          </Pressable>
        </View>

        {recent.length > 0 ? (
          <View style={styles.recentList}>
            {recent.map((word, index) => (
              <RecentWord
                key={word.id}
                word={word}
                fill={index === 0 ? colors.softAccent : colors.paper}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyJournal}>
            <Text style={styles.emptyTitle}>
              {isAuthenticated ? 'Your next favorite word is out there.' : 'Words are yours to find.'}
            </Text>
            <Text style={styles.emptyDescription}>
              {isAuthenticated
                ? 'Look up a word and save it to your collection.'
                : 'Look up words freely. Sign in with Google whenever you want to save one.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: BackgroundColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: {
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
      paddingRight: 20,
      paddingBottom: 32,
    },
    topBar: {
      height: RULE_SPACING * 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    brandMark: {
      ...sticker(colors, { fill: colors.accent, radius: 10, shadow: 2 }),
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-7deg' }],
    },
    brandMarkText: {
      color: colors.ink,
      fontFamily: AppFonts.serifItalic,
      fontSize: 24,
      lineHeight: 30,
    },
    brandName: {
      color: colors.ink,
      fontFamily: AppFonts.serifItalic,
      fontSize: 28,
      lineHeight: 34,
    },
    hero: { marginTop: RULE_SPACING },
    headline: {
      color: colors.ink,
      fontFamily: AppFonts.serif,
      fontSize: 56,
      lineHeight: 64,
      letterSpacing: -1.45,
    },
    useItChip: {
      ...sticker(colors, { fill: colors.accent, radius: 10, shadow: 0 }),
      alignSelf: 'flex-start',
      minHeight: 68,
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 2,
      marginTop: 2,
      transform: [{ rotate: '-1.5deg' }],
    },
    useItText: {
      color: colors.ink,
      fontFamily: AppFonts.serifItalic,
      fontSize: 56,
      lineHeight: 64,
      letterSpacing: -1.45,
    },
    // 28 * 2 - 6 = 56
    searchRow: {
      ...sticker(colors, { radius: 16, shadow: 4 }),
      height: 60,
      marginTop: 22,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 16,
      paddingRight: 7,
    },
    searchInput: {
      flex: 1,
      minWidth: 80,
      color: colors.ink,
      fontFamily: AppFonts.serif,
      fontSize: 28,
      paddingVertical: 8,
    },
    searchButton: {
      ...sticker(colors, { fill: colors.primary, radius: 12, shadow: 0 }),
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchButtonDisabled: { opacity: 0.55 },
    pressed: { opacity: 0.75 },
    setupHint: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 12 },
    messageBox: {
      backgroundColor: colors.errorBackground,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.ink,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginTop: 16,
    },
    messageText: { color: colors.errorText, fontSize: 14, lineHeight: 20 },
    definitionCard: { ...sticker(colors), marginTop: 22, padding: 18 },
    saveButton: {
      ...sticker(colors, { fill: colors.primary, radius: 16, shadow: 3 }),
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    saveButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },
    wordHeading: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    wordTitleGroup: { flexShrink: 1 },
    wordTitle: { color: colors.ink, fontFamily: AppFonts.serif, fontSize: 40, lineHeight: 44 },
    pronunciation: { color: colors.muted, fontSize: 14, marginTop: 2 },
    partOfSpeech: {
      ...sticker(colors, { fill: colors.softAccent, radius: 14, shadow: 0 }),
      overflow: 'hidden',
      color: colors.ink,
      fontFamily: AppFonts.mono,
      fontSize: 11,
      letterSpacing: 0.9,
      paddingHorizontal: 10,
      paddingVertical: 6,
      textTransform: 'uppercase',
    },
    cardDivider: { height: 1, backgroundColor: colors.hairline, marginVertical: 16 },
    definitionText: { color: colors.ink, fontSize: 16, lineHeight: 24, marginTop: 8 },
    exampleBox: {
      backgroundColor: colors.softNeutral,
      borderRadius: 12,
      padding: 14,
      marginTop: 18,
    },
    exampleText: { marginTop: 8 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 28,
      marginBottom: 10,
    },
    seeAllButton: { minHeight: 32, justifyContent: 'center' },
    seeAllText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
    nudgeStack: { marginTop: 30, height: 206 },
    nudgeBack: {
      ...sticker(colors, { fill: colors.lavender, radius: 20, shadow: 0 }),
      position: 'absolute',
      left: 10,
      right: 6,
      top: 14,
      height: 184,
      transform: [{ rotate: '4deg' }],
    },
    nudgeMiddle: {
      ...sticker(colors, { fill: colors.accent, radius: 20, shadow: 0 }),
      position: 'absolute',
      left: 4,
      right: 12,
      top: 16,
      height: 184,
      transform: [{ rotate: '-2.5deg' }],
    },
    nudgeFront: {
      ...sticker(colors, { fill: colors.primary, radius: 20, shadow: 5 }),
      minHeight: 184,
      paddingHorizontal: 18,
      paddingVertical: 14,
      marginRight: 5,
    },
    nudgeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    nudgeWord: {
      color: colors.onPrimary,
      fontFamily: AppFonts.serif,
      fontSize: 54,
      lineHeight: 60,
      marginTop: 4,
    },
    nudgeRule: { height: 1, backgroundColor: 'rgba(255,255,255,0.4)', marginTop: 6, marginBottom: 10 },
    recentList: { gap: 8 },
    recentRow: {
      ...sticker(colors, { radius: 14, shadow: 0 }),
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 12,
    },
    recentWord: { flex: 1, color: colors.ink, fontFamily: AppFonts.serif, fontSize: 26, lineHeight: 32 },
    emptyJournal: { ...sticker(colors, { radius: 20, shadow: 4 }), alignItems: 'center', padding: 22 },
    emptyTitle: {
      color: colors.ink,
      fontFamily: AppFonts.serif,
      fontSize: 26,
      lineHeight: 30,
      textAlign: 'center',
    },
    emptyDescription: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 8,
    },
  });
}
