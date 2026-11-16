import { useEffect } from 'react';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { FONT_FILES } from '@/constants/fonts';
import { AuthProvider } from '@/providers/auth-provider';
import { BackgroundProvider } from '@/providers/background-provider';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  // The design is light-only for now; fonts load before first render (falls back if they fail).
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void import('expo-notifications').then(Notifications => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    });
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={DefaultTheme}>
      <BackgroundProvider>
        <AuthProvider>
          <AnimatedSplashOverlay />
          <AppTabs />
        </AuthProvider>
      </BackgroundProvider>
    </ThemeProvider>
  );
}
