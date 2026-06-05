import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

// On web: handle browser popstate (back button / refresh) — always have a fallback route
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    // If no Expo Router history, fall back to conversations
    setTimeout(() => {
      if (!router.canGoBack()) {
        router.replace('/conversations');
      }
    }, 0);
  });
}

// Inject CSS directly into DOM — removes all browser focus rings globally
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    *:focus, *:focus-visible, *:focus-within {
      outline: none !important;
      outline-width: 0 !important;
      box-shadow: none !important;
      -webkit-box-shadow: none !important;
    }
    input, input:focus, input:focus-visible,
    textarea, textarea:focus,
    select, select:focus {
      outline: none !important;
      outline-width: 0 !important;
      box-shadow: none !important;
      -webkit-box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);
}

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfile } from '@/services/user-service';
import { syncFromFirebaseUser, setCurrentUser } from '@/store/app-store';
import { startContactsListener, stopContactsListener } from '@/store/conversations-store';

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
      const unsub = startContactsListener(user.uid);
      return unsub;
    } else {
      stopContactsListener();
    }
  }, [user]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </ThemeProvider>
  );
}
