import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppMenu } from '@/components/app-menu';
import { AppText as Text } from '@/components/app-text';
import { HighlightedSentence, InitialTile, MonoLabel, StickerToggle } from '@/components/design';
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
import { getUserDisplayName } from '@/services/google-auth';
import {
  disableDailyReminders,
  enableDailyReminders,
  isDailyReminderEnabled,
} from '@/services/reminders';
import { isSupabaseConfigured } from '@/services/supabase';
import { getWordHistory } from '@/services/wordbook';
import type { SavedWord } from '@/types/word';

const TILT = [-5, 4, -3];

/** "NOV 11", or '' when the date is missing or unparseable (the label is then hidden). */
function formatSavedDate(date: string) {
  const parsed = new Date(date);
  if (!date || Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export default function HistoryScreen() {
  const {
    user,
    isLoading: isAuthLoading,
    isSigningIn,
    isAuthenticated,
    authError,
    clearAuthError,
    signIn,
    signOut,
  } = useAuth();
  const { colors, notebook } = useBackground();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [history, setHistory] = useState<SavedWord[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingReminder, setIsChangingReminder] = useState(false);
  const [error, setError] = useState('');
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      if (isAuthenticated && isSupabaseConfigured()) {
        setHistory(await getWordHistory());
      } else {
        setHistory([]);
      }
      setRemindersEnabled(
        isAuthenticated ? await isDailyReminderEnabled() : false,
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your word journal.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const toggleReminders = async () => {
    if (isChangingReminder) return;
    setIsChangingReminder(true);
    setError('');
    try {
      if (remindersEnabled) {
        await disableDailyReminders();
        setRemindersEnabled(false);
      } else {
        await enableDailyReminders(history);
        setRemindersEnabled(true);
      }
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Could not update reminders.');
    } finally {
      setIsChangingReminder(false);
    }
  };

  const handleSignIn = async () => {
    clearAuthError();
    try {
      await signIn();
    } catch {
      return;
    }
  };

  const handleSignOut = async () => {
    clearAuthError();
    try {
      await signOut();
    } catch {
      return;
    }
  };

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const wordsThisWeek = history.filter(word => new Date(word.lookedUpAt) >= weekStart).length;

  const tileFills = [colors.mint, colors.lavender, colors.accent];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenBackdrop />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingLeft: notebook ? NOTEBOOK_CONTENT_INSET : DEFAULT_CONTENT_INSET },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <AppMenu />
        </View>

        <View style={styles.header} accessible accessibilityRole="header">
          <Text maxFontSizeMultiplier={1.2} style={styles.title}>
            Words worth
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={[styles.title, styles.titleItalic]}>
            remembering.
          </Text>
        </View>
        <Text style={styles.subtitle}>
          {isAuthenticated
            ? 'Every word you save gets a little place in your collection.'
            : 'Look up words freely. Sign in when you want to keep them.'}
        </Text>

        {isAuthenticated && user ? (
          <View style={styles.accountPill}>
            <Text numberOfLines={1} style={styles.accountName}>
              {getUserDisplayName(user)}
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => void handleSignOut()}
              style={styles.signOutButton}>
              <Text style={styles.accountAction}>Sign out</Text>
            </Pressable>
          </View>
        ) : null}

        <View
          accessible
          accessibilityLabel={`${wordsThisWeek} lookups in the last 7 days`}
          style={styles.statsCard}>
          <View style={styles.statsMark}>
            <Text style={styles.statsMarkText}>Aa</Text>
          </View>
          <View style={styles.statsCopy}>
            <Text style={styles.statsNumber}>{wordsThisWeek}</Text>
            <Text style={styles.statsLabel}>lookups in the last 7 days</Text>
          </View>
          <View style={styles.statsBadge}>
            <MonoLabel color={colors.onPrimary}>This week</MonoLabel>
          </View>
        </View>

        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderIcon}>
              <View style={styles.bellDome} />
              <View style={styles.bellBase} />
            </View>
            <View style={styles.reminderCopy}>
              <Text style={styles.reminderTitle}>A word a day</Text>
              <Text style={styles.reminderDescription}>
                Get a sentence from your word list every morning.
              </Text>
            </View>
            <StickerToggle
              label="Daily word reminders"
              value={remindersEnabled}
              disabled={
                history.length === 0 ||
                isChangingReminder ||
                Platform.OS === 'web' ||
                !isAuthenticated
              }
              onPress={() => void toggleReminders()}>
              {isChangingReminder ? <ActivityIndicator color={colors.ink} size="small" /> : undefined}
            </StickerToggle>
          </View>
          <View style={styles.reminderRule} />
          <Text style={styles.reminderFootnote}>
            {remindersEnabled
              ? 'You’re all set. Your next word arrives at 9:00 AM.'
              : Platform.OS === 'web'
                ? 'Daily reminders are available in the iOS and Android apps.'
                : !isAuthenticated
                  ? 'Sign in with Google to save words and create reminders.'
                  : history.length === 0
                    ? 'Look up a word first to add it to your daily reminders.'
                    : 'Turn on to get a sentence from your word list every morning.'}
          </Text>
        </View>

        <View style={styles.listHeader}>
          <View style={styles.listHeading}>
            <MonoLabel>Keep growing</MonoLabel>
            <Text style={styles.listTitle}>Your collection</Text>
          </View>
          <MonoLabel>
            {history.length} {history.length === 1 ? 'word' : 'words'}
          </MonoLabel>
        </View>

        {!isSupabaseConfigured() ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Connect your word journal</Text>
            <Text style={styles.emptyText}>
              Add your Supabase project keys and run the included database setup to save your
              lookups here.
            </Text>
          </View>
        ) : isAuthLoading || isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : authError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Could not sign in</Text>
            <Text style={styles.emptyText}>{authError}</Text>
            {!isAuthenticated ? (
              <Pressable
                accessibilityRole="button"
                disabled={isSigningIn}
                onPress={() => void handleSignIn()}
                style={styles.retryButton}>
                <Text style={styles.retryText}>
                  {isSigningIn ? 'Connecting…' : 'Try Google sign-in again'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : !isAuthenticated ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Keep your words with you.</Text>
            <Text style={styles.emptyText}>
              Sign in with Google to save your lookups to your account and access them on your
              other devices.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
              disabled={isSigningIn}
              onPress={() => void handleSignIn()}
              style={[styles.retryButton, isSigningIn && styles.disabled]}>
              {isSigningIn ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.retryText}>Continue with Google</Text>
              )}
            </Pressable>
          </View>
        ) : error && history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>We couldn’t load your collection</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable onPress={() => void loadHistory()} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : history.length > 0 ? (
          <View style={styles.wordList}>
            {history.map((word, index) => {
              const savedDate = formatSavedDate(word.lookedUpAt);
              const example = word.examples.find(item => item.trim().length > 1);
              return (
                <View
                  key={word.id}
                  accessible
                  accessibilityLabel={[
                    word.word,
                    savedDate ? `Saved ${savedDate.toLowerCase()}` : '',
                    word.definition,
                    example ? `Example: ${example}` : '',
                  ]
                    .filter(Boolean)
                    .join('. ')}
                  style={[styles.wordRow, index === history.length - 1 && styles.lastWordRow]}>
                  <InitialTile
                    letter={word.word.charAt(0).toUpperCase()}
                    fill={tileFills[index % tileFills.length]}
                    tilt={TILT[index % TILT.length]}
                  />
                  <View style={styles.wordCopy}>
                    <View style={styles.wordTitleRow}>
                      <Text style={styles.wordName}>{word.word}</Text>
                      {savedDate ? <MonoLabel>{savedDate}</MonoLabel> : null}
                    </View>
                    <Text style={styles.wordDefinition} numberOfLines={3}>
                      {word.definition}
                    </Text>
                    {example ? (
                      <HighlightedSentence
                        sentence={example}
                        word={word.word}
                        size={18}
                        style={styles.wordExample}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>A fresh page.</Text>
            <Text style={styles.emptyText}>
              Look up your first word and we’ll keep it safe here.
            </Text>
          </View>
        )}

        {error && history.length > 0 ? (
          <Text style={styles.inlineError} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
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
      justifyContent: 'flex-end',
    },
    header: { marginTop: RULE_SPACING },
    title: {
      color: colors.ink,
      fontFamily: AppFonts.serif,
      fontSize: 54,
      lineHeight: RULE_SPACING * 2,
      letterSpacing: -1.35,
    },
    titleItalic: { fontFamily: AppFonts.serifItalic },
    subtitle: { color: colors.muted, fontSize: 16, lineHeight: 22, marginTop: 12 },
    accountPill: {
      ...sticker(colors, { radius: 22, shadow: 0 }),
      alignSelf: 'flex-start',
      maxWidth: '100%',
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      marginTop: 16,
    },
    accountName: { flexShrink: 1, color: colors.muted, fontSize: 14 },
    signOutButton: { minHeight: 44, justifyContent: 'center' },
    accountAction: { color: colors.primary, fontSize: 14, fontWeight: '700' },
    statsCard: {
      ...sticker(colors, { fill: colors.primary, radius: 20, shadow: 4 }),
      minHeight: 96,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginTop: 18,
    },
    statsMark: {
      ...sticker(colors, { fill: colors.accent, radius: 16, shadow: 0 }),
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-8deg' }],
    },
    statsMarkText: { color: colors.ink, fontFamily: AppFonts.serifItalic, fontSize: 30, lineHeight: 36 },
    statsCopy: { flex: 1, marginLeft: 14 },
    statsNumber: { color: colors.onPrimary, fontFamily: AppFonts.serif, fontSize: 44, lineHeight: 48 },
    statsLabel: { color: colors.onPrimaryMuted, fontSize: 14, lineHeight: 18 },
    statsBadge: {
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    reminderCard: { ...sticker(colors), padding: 16, marginTop: 16 },
    reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    reminderIcon: {
      ...sticker(colors, { fill: colors.lavender, radius: 14, shadow: 0 }),
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellDome: {
      width: 16,
      height: 14,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderWidth: 2,
      borderBottomWidth: 0,
      borderColor: colors.ink,
    },
    bellBase: { width: 22, height: 2, borderRadius: 1, backgroundColor: colors.ink },
    reminderCopy: { flex: 1 },
    reminderTitle: { color: colors.ink, fontFamily: AppFonts.serif, fontSize: 25, lineHeight: 28 },
    reminderDescription: { color: colors.muted, fontSize: 14, lineHeight: 19, marginTop: 2 },
    reminderRule: { height: 1, backgroundColor: colors.hairline, marginTop: 14, marginBottom: 12 },
    reminderFootnote: { color: colors.muted, fontSize: 13, lineHeight: 18 },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginTop: 30,
      marginBottom: 14,
    },
    listHeading: { gap: 2 },
    listTitle: { color: colors.ink, fontFamily: AppFonts.serif, fontSize: 36, lineHeight: 38 },
    wordList: { ...sticker(colors), overflow: 'hidden' },
    wordRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    lastWordRow: { borderBottomWidth: 0 },
    wordCopy: { flex: 1 },
    wordTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    wordName: {
      flex: 1,
      color: colors.ink,
      fontFamily: AppFonts.serif,
      fontSize: 28,
      lineHeight: 32,
      textTransform: 'capitalize',
    },
    wordDefinition: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 2 },
    wordExample: { marginTop: 8 },
    loadingCard: {
      ...sticker(colors),
      minHeight: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCard: { ...sticker(colors), alignItems: 'center', paddingHorizontal: 22, paddingVertical: 24 },
    emptyTitle: {
      color: colors.ink,
      fontFamily: AppFonts.serif,
      fontSize: 26,
      lineHeight: 30,
      textAlign: 'center',
    },
    emptyText: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
    retryButton: {
      ...sticker(colors, { fill: colors.primary, radius: 16, shadow: 3 }),
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 18,
      marginTop: 16,
    },
    retryText: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },
    disabled: { opacity: 0.6 },
    inlineError: { color: colors.errorText, fontSize: 13, lineHeight: 18, marginTop: 12 },
  });
}
