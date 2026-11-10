import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
      (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function getSupabaseClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publicKey) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and an EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.',
    );
  }

  if (!client) {
    client = createClient(url, publicKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}
