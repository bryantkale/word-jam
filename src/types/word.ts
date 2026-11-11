export type DictionaryEntry = {
  word: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  definition: string;
  examples: string[];
};

export type SavedWord = DictionaryEntry & {
  id: string;
  lookedUpAt: string;
};
