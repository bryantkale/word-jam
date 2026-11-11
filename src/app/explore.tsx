import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';
import { getUserDisplayName } from '@/services/google-auth';
import {
  disableDailyReminders,
  enableDailyReminders,
  isDailyReminderEnabled,
} from '@/services/reminders';
import { isSupabaseConfigured } from '@/services/supabase';
import { getWordHistory } from '@/services/wordbook';
import type { SavedWord } from '@/types/word';

const colors = {
  background: '#F7F6F0',
  paper: '#FFFFFF',
  ink: '#20231D',
  muted: '#777B70',
  line: '#E8E8DF',
  green: '#D8EF86',
  deepGreen: '#334927',
  paleGreen: '#EEF4DF',
  orange: '#F1A265',
};

function getDayLabel(date: string) {
  const lookedUpDate = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (lookedUpDate.toDateString() === today.toDateString()) return 'Today';
  if (lookedUpDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return lookedUpDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
      setHistory([]);
      setRemindersEnabled(false);
    } catch {
      return;
    }
  };

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const wordsThisWeek = history.filter(word => new Date(word.lookedUpAt) >= weekStart).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR WORD JOURNAL</Text>
          <Text style={styles.title}>Words worth{'\n'}remembering.</Text>
          <Text style={styles.subtitle}>
            {isAuthenticated
              ? 'Every word you save gets a little place in your collection.'
              : 'Look up words freely. Sign in when you want to keep them.'}
          </Text>
          {isAuthenticated && user ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleSignOut()}
              style={({ pressed }) => [styles.accountButton, pressed && styles.pressed]}>
              <Text numberOfLines={1} style={styles.accountName}>
                {getUserDisplayName(user)}
              </Text>
              <Text style={styles.accountAction}>Sign out</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsMark}>
            <Text style={styles.statsMarkText}>Aa</Text>
          </View>
          <View style={styles.statsCopy}>
            <Text style={styles.statsNumber}>{wordsThisWeek}</Text>
            <Text style={styles.statsLabel}>lookups in the last 7 days</Text>
          </View>
          <View style={styles.statsBadge}>
            <Text style={styles.statsBadgeText}>THIS WEEK</Text>
          </View>
        </View>

        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderIcon}>
              <Text style={styles.reminderIconText}>✳</Text>
            </View>
            <View style={styles.reminderCopy}>
              <Text style={styles.reminderTitle}>A word a day</Text>
              <Text style={styles.reminderDescription}>
                Get a sentence from your word list every morning.
              </Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{
                checked: remindersEnabled,
                disabled: history.length === 0 || Platform.OS === 'web' || !isAuthenticated,
              }}
              accessibilityLabel="Daily word reminders"
              disabled={
                history.length === 0 ||
                isChangingReminder ||
                Platform.OS === 'web' ||
                !isAuthenticated
              }
              onPress={() => void toggleReminders()}
              style={[
                styles.switchTrack,
                remindersEnabled && styles.switchTrackOn,
                (history.length === 0 || isChangingReminder || !isAuthenticated) &&
                styles.switchDisabled,
              ]}>
              {isChangingReminder ? (
                <ActivityIndicator color={colors.deepGreen} size="small" />
              ) : (
                <View style={[styles.switchKnob, remindersEnabled && styles.switchKnobOn]} />
              )}
            </Pressable>
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
                    : 'Turn on reminders to practice words you have looked up.'}
          </Text>
        </View>

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listEyebrow}>KEEP GROWING</Text>
            <Text style={styles.listTitle}>Your collection</Text>
          </View>
          <Text style={styles.wordCount}>{history.length} WORDS</Text>
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
            <ActivityIndicator color={colors.deepGreen} />
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
            <View style={styles.emptyMark}>
              <Text style={styles.emptyMarkText}>Aa</Text>
            </View>
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
              style={[styles.retryButton, isSigningIn && styles.switchDisabled]}>
              {isSigningIn ? (
                <ActivityIndicator color={colors.paper} size="small" />
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
            {history.map((word, index) => (
              <View
                key={word.id}
                style={[styles.wordRow, index === history.length - 1 && styles.lastWordRow]}>
                <View style={styles.wordInitial}>
                  <Text style={styles.wordInitialText}>{word.word.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.wordCopy}>
                  <View style={styles.wordTitleRow}>
                    <Text style={styles.wordName}>{word.word}</Text>
                    <Text style={styles.wordDate}>{getDayLabel(word.lookedUpAt)}</Text>
                  </View>
                  <Text style={styles.wordDefinition} numberOfLines={2}>
                    {word.definition}
                  </Text>
                  {word.examples[0] ? (
                    <Text style={styles.wordExample} numberOfLines={2}>
                      “{word.examples[0]}”
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyMark}>
              <Text style={styles.emptyMarkText}>Aa</Text>
            </View>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 38,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 22,
  },
  eyebrow: {
    color: '#79825F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  title: {
    color: colors.ink,
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -1.5,
    lineHeight: 40,
  },
  subtitle: {
    maxWidth: 310,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  accountButton: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  accountName: {
    flexShrink: 1,
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  accountAction: {
    color: colors.deepGreen,
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 19,
    backgroundColor: colors.deepGreen,
    paddingHorizontal: 17,
    paddingVertical: 16,
  },
  statsMark: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.green,
    transform: [{ rotate: '-6deg' }],
  },
  statsMarkText: {
    color: colors.deepGreen,
    fontSize: 17,
    fontWeight: '800',
  },
  statsCopy: {
    flex: 1,
    marginLeft: 13,
  },
  statsNumber: {
    color: colors.paper,
    fontSize: 23,
    fontWeight: '700',
  },
  statsLabel: {
    color: '#DCE5D3',
    fontSize: 11,
    marginTop: 1,
  },
  statsBadge: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statsBadgeText: {
    color: '#E8EFD9',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  reminderCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    padding: 16,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  reminderIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: '#FFF0E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderIconText: {
    color: '#A96A37',
    fontSize: 18,
  },
  reminderCopy: {
    flex: 1,
  },
  reminderTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  reminderDescription: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  switchTrack: {
    width: 47,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#E8E9E2',
    justifyContent: 'center',
    padding: 3,
  },
  switchTrackOn: {
    backgroundColor: colors.green,
  },
  switchDisabled: {
    opacity: 0.6,
  },
  switchKnob: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: colors.paper,
    shadowColor: '#1D2616',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  switchKnobOn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.deepGreen,
  },
  reminderRule: {
    height: 1,
    backgroundColor: colors.line,
    marginTop: 14,
    marginBottom: 10,
  },
  reminderFootnote: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 12,
  },
  listEyebrow: {
    color: '#79825F',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  listTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  wordCount: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    paddingBottom: 4,
  },
  wordList: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 14,
  },
  lastWordRow: {
    borderBottomWidth: 0,
  },
  wordInitial: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paleGreen,
    marginRight: 12,
  },
  wordInitialText: {
    color: colors.deepGreen,
    fontSize: 16,
    fontWeight: '700',
  },
  wordCopy: {
    flex: 1,
  },
  wordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  wordName: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  wordDate: {
    color: colors.muted,
    fontSize: 10,
  },
  wordDefinition: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  wordExample: {
    color: '#505845',
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 6,
  },
  loadingCard: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.paper,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  emptyMark: {
    width: 47,
    height: 47,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
  },
  emptyMarkText: {
    color: colors.deepGreen,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 5,
  },
  retryButton: {
    borderRadius: 12,
    backgroundColor: colors.deepGreen,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 15,
  },
  retryText: {
    color: colors.paper,
    fontSize: 12,
    fontWeight: '700',
  },
  inlineError: {
    color: '#834A2A',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
});
