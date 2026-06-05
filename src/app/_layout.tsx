import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Alert, AppState, Platform, useColorScheme } from 'react-native';

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

import * as Notifications from 'expo-notifications';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useAuth } from '@/hooks/use-auth';
import { listenForIncomingCalls, rejectCall } from '@/services/call-service';
import { listenForIncomingMessages, registerForPushNotifications, showLocalNotification } from '@/services/notification-service';
import { getUserProfile, setOnlineStatus } from '@/services/user-service';
import { syncFromFirebaseUser, setCurrentUser } from '@/store/app-store';
import { startContactsListener, stopContactsListener } from '@/store/conversations-store';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  // Navigate to chat when user taps a notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const senderUid = response.notification.request.content.data?.senderUid;
      if (senderUid) router.push(`/chat/${senderUid}` as any);
    });
    return () => sub.remove();
  }, []);

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
            photoURL: profile.photoURL,
          });
        }
      });
      registerForPushNotifications(user.uid);
      setOnlineStatus(user.uid, true);
      const appStateSub = AppState.addEventListener('change', state => {
        setOnlineStatus(user.uid, state === 'active');
      });
      const unsubContacts = startContactsListener(user.uid);
      const unsubNotif = listenForIncomingMessages(user.uid, (name, msg, senderUid) => {
        showLocalNotification(name, msg, senderUid);
      });
      const unsubCalls = listenForIncomingCalls(user.uid, call => {
        Alert.alert(
          `📞 Incoming Call`,
          `${call.callerName} call kar raha hai`,
          [
            { text: 'Reject', style: 'destructive', onPress: () => rejectCall(call.id) },
            { text: 'Accept', onPress: () => router.push(`/call/${call.callerId}?callId=${call.id}` as any) },
          ],
          { cancelable: false }
        );
      });
      return () => {
        setOnlineStatus(user.uid, false);
        appStateSub.remove();
        unsubContacts();
        unsubNotif();
        unsubCalls();
      };
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
