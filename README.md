# Wordjam

Wordjam helps you look up English words, see their definitions and example sentences, and revisit your lookup history. You can also schedule a week of daily local reminders featuring sentences for words you have looked up.

## Run the app

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and add your Supabase project URL and publishable key (or anon key).
3. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
4. In Supabase Authentication settings, enable anonymous sign-ins.
5. Start the app with `npx expo start`.

The app uses the free Dictionary API at `dictionaryapi.dev` for definitions and examples. A word is only added to the journal after Supabase confirms it was saved.

## Supabase setup

Create an `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Expo only exposes variables prefixed with `EXPO_PUBLIC_` to the app. If your `.env` already has unprefixed Supabase variable names, copy their values to the public-prefixed names above.

Only a Supabase publishable/anon key belongs in the client app. Row-level security in the included schema limits each anonymous account to its own lookup history. Never put a Supabase service-role key in the app.

Word lists use a private anonymous Supabase session saved on the device; there is no sign-in or cross-device recovery in this first version. Add a user sign-in flow if people should be able to restore or sync their collection across devices.

Daily reminders are local notifications and do not require a push-notification server. The app schedules a rolling seven-morning window at 9:00 AM, refreshing it when you open the app or look up a word. Notification permission is required; reminders are supported on iOS and Android.
