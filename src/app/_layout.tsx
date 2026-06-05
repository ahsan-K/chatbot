import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfile } from '@/services/user-service';
import { syncFromFirebaseUser, setCurrentUser } from '@/store/app-store';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  useEffect(() => {
    syncFromFirebaseUser(user ?? null);
    if (user) {
      getUserProfile(user.uid).then(profile => {
        if (profile) {
          setCurrentUser({
            id: user.uid,
            name: profile.name,
            username: profile.username,
            color: profile.color,
          });
        }
      });
    }
  }, [user]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </ThemeProvider>
  );
}
