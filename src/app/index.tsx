import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getWordHistory, fetchDefinition, saveWord } from '@/services/wordbook';
import { isSupabaseConfigured } from '@/services/supabase';
import { refreshDailyRemindersIfEnabled } from '@/services/reminders';
import type { DictionaryEntry, SavedWord } from '@/types/word';
import { normalizeDefinitionPhrase } from '@/utils/word-sentences';

const colors = {
  background: '#F7F6F0',
  paper: '#FFFFFF',
  ink: '#20231D',
  muted: '#777B70',
  line: '#E8E8DF',
  green: '#D8EF86',
  deepGreen: '#334927',
  orange: '#F1A265',
  paleGreen: '#EEF4DF',
};

function SearchIcon() {
  return (
    <View style={styles.searchIcon}>
      <View style={styles.searchCircle} />
      <View style={styles.searchHandle} />
    </View>
  );
}

function WordCard({ entry }: { entry: DictionaryEntry }) {
  return (
    <View style={styles.definitionCard}>
      <View style={styles.wordHeading}>
        <View style={styles.wordTitleGroup}>
          <Text style={styles.wordTitle}>{entry.word}</Text>
          {entry.pronunciation ? (
            <Text style={styles.pronunciation}>{entry.pronunciation}</Text>
          ) : null}
        </View>
        {entry.partOfSpeech ? (
          <Text style={styles.partOfSpeech}>{entry.partOfSpeech}</Text>
        ) : null}
      </View>
      <View style={styles.cardDivider} />
      <Text style={styles.sectionLabel}>THE MEANING</Text>
      <Text style={styles.definitionText}>{entry.definition}</Text>
      {entry.examples.length > 0 ? (
        <View style={styles.exampleBox}>
          <Text style={styles.exampleLabel}>IN A SENTENCE</Text>
          <Text style={styles.exampleText}>“{entry.examples[0]}”</Text>
        </View>
      ) : (
        <View style={styles.exampleBox}>
          <Text style={styles.exampleLabel}>IN A SENTENCE</Text>
          <Text style={styles.exampleText}>
            “{entry.word}” means {normalizeDefinitionPhrase(entry.definition)}.
          </Text>
        </View>
      )}
    </View>
  );
}

function RecentWord({ word }: { word: SavedWord }) {
  return (
    <View style={styles.recentRow}>
      <View style={styles.recentWordIcon}>
        <Text style={styles.recentWordInitial}>{word.word.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.recentCopy}>
        <Text style={styles.recentWord}>{word.word}</Text>
        <Text numberOfLines={1} style={styles.recentDefinition}>
          {word.definition}
        </Text>
      </View>
      <Text style={styles.recentArrow}>›</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DictionaryEntry | null>(null);
  const [history, setHistory] = useState<SavedWord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState('');

  const loadRecentWords = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const recentWords = await getWordHistory();
      setHistory(recentWords);
      try {
        await refreshDailyRemindersIfEnabled(recentWords);
      } catch (error) {
        setMessage(
          `Daily reminders could not be refreshed: ${
            error instanceof Error ? error.message : 'Please try again.'
          }`,
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load your saved words.');
    }
  }, []);

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

    try {
      const entry = await fetchDefinition(searchTerm);
      setResult(entry);

      try {
        const savedWord = await saveWord(entry);
        setHistory(current => [savedWord, ...current.filter(word => word.id !== savedWord.id)].slice(0, 5));
        try {
          await refreshDailyRemindersIfEnabled([savedWord, ...history]);
        } catch (error) {
          setMessage(
            `Word saved, but daily reminders could not be refreshed: ${
              error instanceof Error ? error.message : 'Please try again.'
            }`,
          );
        }
      } catch (error) {
        setMessage(
          `Definition found, but it wasn't saved: ${
            error instanceof Error ? error.message : 'Please check your Supabase connection.'
          }`,
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>w</Text>
            </View>
            <Text style={styles.brandName}>WORDJAM</Text>
          </View>
          <View style={styles.streakPill}>
            <Text style={styles.streakSpark}>✳</Text>
            <Text style={styles.streakText}>A little every day</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>MAKE WORDS YOURS</Text>
          <Text style={styles.headline}>Find the{'\n'}right word.</Text>
          <Text style={styles.subhead}>
            Look it up, learn how it lives in a sentence, and keep it close.
          </Text>
        </View>

        <View style={styles.searchRow}>
          <SearchIcon />
          <TextInput
            accessibilityLabel="Word to look up"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            onSubmitEditing={() => void handleLookup()}
            placeholder="Type a word to look up"
            placeholderTextColor="#9A9D93"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Look up word"
            disabled={!query.trim() || isSearching}
            onPress={() => void handleLookup()}
            style={({ pressed }) => [
              styles.searchButton,
              (!query.trim() || isSearching) && styles.searchButtonDisabled,
              pressed && styles.pressed,
            ]}>
            {isSearching ? (
              <ActivityIndicator color={colors.paper} size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Go</Text>
            )}
          </Pressable>
        </View>

        {!isSupabaseConfigured() ? (
          <Text style={styles.setupHint}>
            Add your Supabase keys to .env to save words and build your history.
          </Text>
        ) : null}

        {message ? (
          <View style={styles.messageBox} accessibilityLiveRegion="polite">
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        {result ? <WordCard entry={result} /> : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>YOUR WORD JOURNAL</Text>
            <Text style={styles.sectionTitle}>Recently looked up</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/explore')}
            style={({ pressed }) => [styles.seeAllButton, pressed && styles.pressed]}>
            <Text style={styles.seeAllText}>See all</Text>
            <Text style={styles.seeAllArrow}>↗</Text>
          </Pressable>
        </View>

        {history.length > 0 ? (
          <View style={styles.recentList}>
            {history.slice(0, 3).map(word => (
              <RecentWord key={word.id} word={word} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyJournal}>
            <View style={styles.emptyIllustration}>
              <Text style={styles.emptyIllustrationText}>Aa</Text>
            </View>
            <Text style={styles.emptyTitle}>Your next favorite word is out there.</Text>
            <Text style={styles.emptyDescription}>
              Look up a word and it’ll be waiting for you here.
            </Text>
          </View>
        )}

        <View style={styles.reminderNote}>
          <View style={styles.reminderDot} />
          <Text style={styles.reminderNoteText}>
            Keep the words you find. Practice them a little each day.
          </Text>
        </View>
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
    paddingBottom: 36,
  },
  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: colors.deepGreen,
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 25,
  },
  brandName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
    backgroundColor: colors.paper,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  streakSpark: {
    color: '#A16C36',
    fontSize: 13,
  },
  streakText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  hero: {
    paddingTop: 34,
    paddingBottom: 23,
  },
  eyebrow: {
    color: '#79825F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  headline: {
    color: colors.ink,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -2,
    lineHeight: 50,
  },
  subhead: {
    maxWidth: 310,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
  },
  searchRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.line,
    paddingLeft: 17,
    paddingRight: 7,
    shadowColor: '#343B2B',
    shadowOpacity: 0.045,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  searchIcon: {
    width: 20,
    height: 21,
    marginRight: 12,
    justifyContent: 'center',
  },
  searchCircle: {
    width: 13,
    height: 13,
    borderWidth: 1.8,
    borderColor: '#6E7565',
    borderRadius: 8,
  },
  searchHandle: {
    position: 'absolute',
    left: 12,
    top: 14,
    height: 6,
    width: 1.8,
    backgroundColor: '#6E7565',
    transform: [{ rotate: '-45deg' }],
  },
  searchInput: {
    flex: 1,
    minWidth: 80,
    color: colors.ink,
    fontSize: 15,
    paddingVertical: 14,
  },
  searchButton: {
    minWidth: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.deepGreen,
  },
  searchButtonDisabled: {
    opacity: 0.48,
  },
  searchButtonText: {
    color: colors.paper,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  setupHint: {
    color: '#777B70',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    marginHorizontal: 4,
  },
  messageBox: {
    backgroundColor: '#FFF0E7',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  messageText: {
    color: '#834A2A',
    fontSize: 13,
    lineHeight: 19,
  },
  definitionCard: {
    marginTop: 19,
    backgroundColor: colors.paper,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
  },
  wordHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  wordTitleGroup: {
    flexShrink: 1,
  },
  wordTitle: {
    color: colors.ink,
    fontSize: 31,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  pronunciation: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  partOfSpeech: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: colors.paleGreen,
    color: colors.deepGreen,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 7,
    textTransform: 'capitalize',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 17,
  },
  sectionLabel: {
    color: '#79825F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  definitionText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  exampleBox: {
    backgroundColor: '#F7F8F1',
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
    borderRadius: 11,
    padding: 13,
    marginTop: 18,
  },
  exampleLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  exampleText: {
    color: '#3D4436',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 21,
    marginTop: 7,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 34,
    marginBottom: 12,
  },
  sectionEyebrow: {
    color: '#79825F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
  },
  seeAllText: {
    color: colors.deepGreen,
    fontSize: 12,
    fontWeight: '700',
  },
  seeAllArrow: {
    color: colors.deepGreen,
    fontSize: 15,
  },
  recentList: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  recentRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  recentWordIcon: {
    height: 38,
    width: 38,
    borderRadius: 13,
    backgroundColor: colors.paleGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentWordInitial: {
    color: colors.deepGreen,
    fontSize: 17,
    fontWeight: '700',
  },
  recentCopy: {
    flex: 1,
  },
  recentWord: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  recentDefinition: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  recentArrow: {
    color: '#A1A597',
    fontSize: 23,
    paddingLeft: 10,
  },
  emptyJournal: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 24,
    paddingVertical: 25,
  },
  emptyIllustration: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    transform: [{ rotate: '-7deg' }],
  },
  emptyIllustrationText: {
    color: colors.deepGreen,
    fontSize: 20,
    fontWeight: '800',
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
  },
  emptyDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  reminderNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 23,
    paddingHorizontal: 3,
  },
  reminderDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  reminderNoteText: {
    flex: 1,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
});
