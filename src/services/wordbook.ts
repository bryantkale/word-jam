import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseClient } from '@/services/supabase';
import type { DictionaryEntry, SavedWord } from '@/types/word';

const PENDING_WORD_KEY = 'word-jam-pending-word';

type DictionaryApiMeaning = {
  partOfSpeech?: string;
  definitions?: {
    definition?: string;
    example?: string;
  }[];
};

type DictionaryApiEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: {
    text?: string;
  }[];
  meanings?: DictionaryApiMeaning[];
};

type WordRow = {
  id: string;
  word: string;
  pronunciation: string | null;
  part_of_speech: string | null;
  definition: string;
  examples: string[] | null;
  looked_up_at: string;
};

function mapWordRow(row: WordRow): SavedWord {
  return {
    id: row.id,
    word: row.word,
    pronunciation: row.pronunciation,
    partOfSpeech: row.part_of_speech,
    definition: row.definition,
    examples: row.examples ?? [],
    lookedUpAt: row.looked_up_at,
  };
}

function isDictionaryEntry(value: unknown): value is DictionaryEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'word' in value &&
    typeof value.word === 'string' &&
    'definition' in value &&
    typeof value.definition === 'string' &&
    'examples' in value &&
    Array.isArray(value.examples) &&
    value.examples.every(example => typeof example === 'string') &&
    'pronunciation' in value &&
    (value.pronunciation === null || typeof value.pronunciation === 'string') &&
    'partOfSpeech' in value &&
    (value.partOfSpeech === null || typeof value.partOfSpeech === 'string')
  );
}

export async function fetchDefinition(searchTerm: string): Promise<DictionaryEntry> {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(searchTerm)}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`We couldn't find “${searchTerm}”. Check the spelling and try again.`);
    }
    throw new Error('The dictionary is unavailable right now. Please try again.');
  }

  const result = (await response.json()) as DictionaryApiEntry[];
  const entry = result[0];
  const meaning = entry?.meanings?.find(item => item.definitions?.length);
  const definition = meaning?.definitions?.[0]?.definition;

  if (!entry?.word || !definition) {
    throw new Error('We found the word, but there is no definition to show yet.');
  }

  const examples = Array.from(
    new Set(
      (meaning?.definitions ?? [])
        .map(item => item.example?.trim())
        .filter((example): example is string => Boolean(example)),
    ),
  ).slice(0, 3);

  return {
    word: entry.word,
    pronunciation:
      entry.phonetic ?? entry.phonetics?.find(item => item.text)?.text ?? null,
    partOfSpeech: meaning?.partOfSpeech ?? null,
    definition,
    examples,
  };
}

async function getAuthenticatedUserId() {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user || user.is_anonymous) {
    throw new Error('Sign in with Google to save words to your account.');
  }
  return user.id;
}

export async function saveWord(entry: DictionaryEntry): Promise<SavedWord> {
  const supabase = getSupabaseClient();
  const userId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from('word_lookups')
    .insert({
      user_id: userId,
      word: entry.word,
      pronunciation: entry.pronunciation,
      part_of_speech: entry.partOfSpeech,
      definition: entry.definition,
      examples: entry.examples,
    })
    .select('id, word, pronunciation, part_of_speech, definition, examples, looked_up_at')
    .single();

  if (error) throw error;
  return mapWordRow(data as WordRow);
}

export async function getWordHistory(): Promise<SavedWord[]> {
  const supabase = getSupabaseClient();
  const userId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from('word_lookups')
    .select('id, word, pronunciation, part_of_speech, definition, examples, looked_up_at')
    .eq('user_id', userId)
    .order('looked_up_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data as WordRow[]).map(mapWordRow);
}

export async function queueWordForSaving(entry: DictionaryEntry) {
  await AsyncStorage.setItem(PENDING_WORD_KEY, JSON.stringify(entry));
}

export async function clearQueuedWord() {
  await AsyncStorage.removeItem(PENDING_WORD_KEY);
}

export async function saveQueuedWord(): Promise<SavedWord | null> {
  const serializedEntry = await AsyncStorage.getItem(PENDING_WORD_KEY);
  if (!serializedEntry) return null;

  let entry: unknown;
  try {
    entry = JSON.parse(serializedEntry);
  } catch {
    await clearQueuedWord();
    throw new Error('The word queued for saving is invalid. Please look it up again.');
  }
  if (!isDictionaryEntry(entry)) {
    await clearQueuedWord();
    throw new Error('The word queued for saving is invalid. Please look it up again.');
  }

  const savedWord = await saveWord(entry);
  await clearQueuedWord();
  return savedWord;
}
