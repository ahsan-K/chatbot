import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { collection, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from '@/config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Native: register Expo push token ────────────────────────────────────────

export async function registerForPushNotifications(uid: string): Promise<void> {
  if (Platform.OS === 'web') {
    await requestWebNotificationPermission();
    return;
  }
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0059f7',
      sound: 'default',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await updateDoc(doc(db, 'users', uid), { expoPushToken: token });
}

// ── Native: send push to another user via Expo Push API ─────────────────────

export async function sendPushNotification(
  toUid: string,
  senderName: string,
  message: string
): Promise<void> {
  if (Platform.OS === 'web') return; // web uses local notifications instead
  try {
    const snap = await getDoc(doc(db, 'users', toUid));
    const token = snap.data()?.expoPushToken;
    if (!token) return;

    await fetch('https://exp.host/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: token,
        title: senderName,
        body: message,
        sound: 'default',
        priority: 'high',
        channelId: 'messages',
        data: { senderUid: toUid },
      }),
    });
  } catch {
    // Never block message sending due to notification failure
  }
}

// ── Web: browser Notification API ───────────────────────────────────────────

async function requestWebNotificationPermission(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function showWebNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return; // app is in focus, no need
  new Notification(title, { body, icon: '/icon.png' });
}

// ── Web: listen for incoming messages via unread count changes ───────────────

let _prevUnread: Record<string, number> = {};
let _initialized = false;

export function listenForIncomingMessages(
  myUid: string,
  onNotify: (senderName: string, message: string, senderUid: string) => void
): () => void {
  _prevUnread = {};
  _initialized = false;

  const q = collection(db, 'contacts', myUid, 'list');
  return onSnapshot(q, snap => {
    snap.docs.forEach(d => {
      const data = d.data();
      const uid = d.id;
      const unread: number = data.unreadCount ?? 0;

      if (_initialized) {
        const prev = _prevUnread[uid] ?? 0;
        if (unread > prev && data.lastSenderId !== myUid) {
          onNotify(data.name, data.lastMessage ?? 'New message', uid);
        }
      }

      _prevUnread[uid] = unread;
    });
    _initialized = true;
  });
}

// ── Unified: show notification on current platform ──────────────────────────

export async function showLocalNotification(
  title: string,
  body: string,
  senderUid: string
): Promise<void> {
  if (Platform.OS === 'web') {
    showWebNotification(title, body);
  } else {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { senderUid }, sound: 'default' },
      trigger: null,
    });
  }
}
