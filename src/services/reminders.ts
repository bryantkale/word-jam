import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { SavedWord } from '@/types/word';
import { normalizeDefinitionPhrase } from '@/utils/word-sentences';

const REMINDER_IDS_KEY = 'word-jam-reminder-ids';
const REMINDER_ENABLED_KEY = 'word-jam-reminder-enabled';
const REMINDER_DAYS = 7;

function getPracticeSentence(word: SavedWord, dayIndex: number) {
  if (dayIndex < word.examples.length) return word.examples[dayIndex];

  const definition = normalizeDefinitionPhrase(word.definition);
  const prompts = [
    `I learned that “${word.word}” means ${definition}.`,
    `Today’s new word is “${word.word},” which means ${definition}.`,
    `“${word.word}” is another way to express ${definition}.`,
    `Try using “${word.word}” when you mean ${definition}.`,
    `The word “${word.word}” describes ${definition}.`,
    `Can you write a sentence with “${word.word}” to express ${definition}?`,
    `Remember “${word.word}” next time you need a word for ${definition}.`,
  ];
  return prompts[(dayIndex - word.examples.length) % prompts.length];
}

async function cancelScheduledWordReminders() {
  const Notifications = await import('expo-notifications');
  const storedIds = await AsyncStorage.getItem(REMINDER_IDS_KEY);
  const ids = storedIds ? (JSON.parse(storedIds) as string[]) : [];
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
  await AsyncStorage.removeItem(REMINDER_IDS_KEY);
}

async function scheduleWordReminders(words: SavedWord[]) {
  const uniqueWords = words.filter(
    (word, index, list) =>
      list.findIndex(item => item.word.toLocaleLowerCase() === word.word.toLocaleLowerCase()) ===
      index,
  );

  if (uniqueWords.length === 0) {
    throw new Error('Look up a word before turning on daily reminders.');
  }

  const storedIds = await AsyncStorage.getItem(REMINDER_IDS_KEY);
  const previousIds = storedIds ? (JSON.parse(storedIds) as string[]) : [];
  const Notifications = await import('expo-notifications');
  const ids: string[] = [];
  const now = new Date();
  const firstReminderOffset = now.getHours() < 9 ? 0 : 1;

  try {
    for (let day = 0; day < REMINDER_DAYS; day += 1) {
      const word = uniqueWords[day % uniqueWords.length];
      const date = new Date(now);
      date.setDate(now.getDate() + firstReminderOffset + day);
      date.setHours(9, 0, 0, 0);

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `A word to remember: ${word.word}`,
          body: getPracticeSentence(word, day),
          data: { word: word.word },
          ...(Platform.OS === 'android' ? { channelId: 'word-reminders' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
      ids.push(id);
    }
  } catch (error) {
    await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    throw error;
  }

  await AsyncStorage.setItem(REMINDER_IDS_KEY, JSON.stringify(ids));
  await Promise.all(previousIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function isDailyReminderEnabled() {
  return (await AsyncStorage.getItem(REMINDER_ENABLED_KEY)) === 'true';
}

export async function enableDailyReminders(words: SavedWord[]) {
  if (Platform.OS === 'web') {
    throw new Error('Daily reminders are available in the iOS and Android apps.');
  }
  if (words.length === 0) {
    throw new Error('Look up a word before turning on daily reminders.');
  }

  const Notifications = await import('expo-notifications');

  if (Platform.OS === 'android') {
    const { AndroidImportance } = Notifications;
    await Notifications.setNotificationChannelAsync('word-reminders', {
      name: 'Daily word reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  const { status } =
    existingStatus === 'granted'
      ? { status: existingStatus }
      : await Notifications.requestPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Allow notifications in your device settings to get daily word reminders.');
  }

  await scheduleWordReminders(words);
  await AsyncStorage.setItem(REMINDER_ENABLED_KEY, 'true');
}

export async function disableDailyReminders() {
  await cancelScheduledWordReminders();
  await AsyncStorage.removeItem(REMINDER_ENABLED_KEY);
}

export async function refreshDailyRemindersIfEnabled(words: SavedWord[]) {
  if (Platform.OS !== 'web' && (await isDailyReminderEnabled())) {
    await scheduleWordReminders(words);
  }
}
