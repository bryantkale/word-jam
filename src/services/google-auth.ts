import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { User } from '@supabase/supabase-js';

import { disableDailyReminders } from '@/services/reminders';
import { getSupabaseClient } from '@/services/supabase';
import { clearQueuedWord } from '@/services/wordbook';

const APP_SCHEME = 'com.supabase';

function getCallbackUrl() {
  if (Platform.OS === 'web') {
    return new URL('/', window.location.origin).toString();
  }

  return Linking.createURL('', { scheme: APP_SCHEME });
}

function getCallbackParams(callbackUrl: string) {
  const url = new URL(callbackUrl);
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const params = new URLSearchParams(url.search);
  new URLSearchParams(hash).forEach((value, key) => params.set(key, value));
  return params;
}

async function applyOAuthCallback(callbackUrl: string) {
  const supabase = getSupabaseClient();
  const params = getCallbackParams(callbackUrl);
  const errorDescription =
    params.get('error_description') ?? params.get('error') ?? params.get('error_code');
  if (errorDescription) throw new Error(errorDescription);

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return;
  }

  throw new Error('Google sign-in did not return a valid session. Please try again.');
}

let callbackKeyInProgress: string | null = null;
let callbackPromise: Promise<void> | null = null;

export async function completeGoogleOAuthCallback(callbackUrl: string): Promise<boolean> {
  const params = getCallbackParams(callbackUrl);
  const hasOAuthResponse = [
    'code',
    'access_token',
    'error',
    'error_description',
    'error_code',
  ].some(key => params.has(key));
  if (!hasOAuthResponse) return false;

  const callbackKey = params.get('code') ?? params.get('access_token') ?? callbackUrl;
  if (callbackKeyInProgress === callbackKey && callbackPromise) {
    await callbackPromise;
    return true;
  }

  callbackKeyInProgress = callbackKey;
  const currentCallbackPromise = applyOAuthCallback(callbackUrl);
  callbackPromise = currentCallbackPromise;
  try {
    await currentCallbackPromise;
    return true;
  } catch (error) {
    if (callbackKeyInProgress === callbackKey && callbackPromise === currentCallbackPromise) {
      callbackKeyInProgress = null;
      callbackPromise = null;
    }
    throw error;
  }
}

export async function signInWithGoogle(): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const redirectTo = getCallbackUrl();
  const credentials = {
    provider: 'google' as const,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  };
  const { data, error } = sessionData.session?.user.is_anonymous
    ? await supabase.auth.linkIdentity(credentials)
    : await supabase.auth.signInWithOAuth(credentials);

  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in could not be started. Please try again.');

  if (Platform.OS === 'web') {
    window.location.assign(data.url);
    return true;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  const callbackCompleted = await completeGoogleOAuthCallback(result.url);
  if (!callbackCompleted) {
    throw new Error('Google sign-in returned without a session. Please try again.');
  }
  return true;
}

export async function signOutFromGoogle() {
  await disableDailyReminders();
  await clearQueuedWord();
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}

export function getUserDisplayName(user: User) {
  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name;
  return typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : (user.email ?? 'Google account');
}
