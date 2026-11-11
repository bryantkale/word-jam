# Wordjam

Wordjam helps you look up English words, see their definitions and example sentences, and revisit your saved-word history. You can also schedule a week of daily local reminders featuring sentences for words in your collection.

## Run the app

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and add your Supabase project URL and publishable key (or anon key).
3. Run or re-run the SQL in [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
4. Configure Google as an Auth provider in Supabase (steps below).
5. Add `wordjam://auth/callback` to Supabase Auth's allowed redirect URLs.
6. Start the app with `npx expo start` or use a development build for device testing.

The app uses the free Dictionary API at `dictionaryapi.dev` for definitions and examples. A word is only added to the journal after Supabase confirms it was saved.

## Supabase setup

Create an `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Expo only exposes variables prefixed with `EXPO_PUBLIC_` to the app. If your `.env` already has unprefixed Supabase variable names, copy their values to the public-prefixed names above.

Only a Supabase publishable/anon key belongs in the client app. Row-level security in the included schema limits each signed-in account to its own lookup history and blocks anonymous sessions. Never put a Supabase service-role key in the app.

Looking up definitions does not require an account. Sign in with Google to save words and sync your collection across devices. If an earlier app version saved words under an anonymous session on this device, choosing Google sign-in links that session to the Google identity so its words remain available. Existing Supabase anonymous sign-ins must remain enabled for this upgrade path, and identity linking must be enabled in Supabase Auth settings.

## Google sign-in setup

1. In Google Cloud Console, create an OAuth consent screen and OAuth client credentials for your app. Add the required iOS bundle ID and Android package name/SHA-1 fingerprints for native builds.
2. In Supabase Dashboard, open **Authentication → Providers → Google**, enable the provider, and enter the Google web client ID and client secret. Add the native client IDs there as well.
3. In **Authentication → URL Configuration → Redirect URLs**, allow `wordjam://auth/callback` for iOS and Android. For web, add your deployed site URL and local development URL; web OAuth returns to the site root.
4. If you use Expo Go for development, also allow its redirect URL (typically `exp://<your-dev-host>/--/auth/callback`). A development build with the `wordjam` scheme is recommended for testing the production-style callback.

In the Google web OAuth client, add your Supabase project's Auth callback URL (shown in the Supabase Google provider setup page) as an **Authorized redirect URI**. Add your web app origin as an **Authorized JavaScript origin** if you will use Google sign-in on web.

The app uses Supabase's hosted Google OAuth flow in the system browser on iOS/Android and a normal OAuth redirect on web. Google credentials stay in Supabase and are never bundled in the client.

Daily reminders are local notifications and do not require a push-notification server. The app schedules a rolling seven-morning window at 9:00 AM, refreshing it when you open the app or look up a word. Notification permission is required; reminders are supported on iOS and Android.
