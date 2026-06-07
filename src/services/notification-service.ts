import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from '@/config/firebase';

// ── Native: register push token ──────────────────────────────────────────────
// Android: uses @react-native-firebase/messaging directly (avoids expo-notifications crash)
// iOS/Web: uses expo-notifications

export async function registerForPushNotifications(uid: string): Promise<void> {
  if (Platform.OS === 'web') {
    await requestWebNotificationPermission();
    return;
  }

  if (Platform.OS === 'android') {
    try {
      const messaging = require('@react-native-firebase/messaging').default;
      await messaging().requestPermission();
      const fcmToken = await messaging().getToken();
      if (!fcmToken) return;

      // Register FCM token with Expo Push Service to get ExponentPushToken
      const res = await fetch('https://exp.host/--/api/v2/push/getExpoPushToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceToken: fcmToken,
          type: 'fcm',
          experienceId: '@june2000/chatbot',
          appId: '6bf07534-be49-48c3-b405-ec7d948ec3df',
          development: false,
        }),
      });
      const data = await res.json();
      const expoPushToken = data?.data?.expoPushToken;
      if (expoPushToken) {
        await setDoc(doc(db, 'users', uid), { expoPushToken }, { merge: true });
      }
    } catch {}
    return;
  }

  // iOS: use expo-notifications
  try {
    const Notifications = require('expo-notifications');
    const Constants = require('expo-constants').default;
    await Notifications.requestPermissionsAsync();
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    if (tokenData?.data) {
      await setDoc(doc(db, 'users', uid), { expoPushToken: tokenData.data }, { merge: true });
    }
  } catch {}
}

// ── Send push notifications ───────────────────────────────────────────────────

export async function sendPushNotification(
  toUid: string,
  senderName: string,
  message: string
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const snap = await getDoc(doc(db, 'users', toUid));
    const token = snap.data()?.expoPushToken;
    if (!token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
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
  } catch {}
}

export async function sendCallPushNotification(
  toUid: string,
  callerName: string,
  callId: string,
  callerId: string
): Promise<void> {
  try {
    const snap = await getDoc(doc(db, 'users', toUid));
    const token = snap.data()?.expoPushToken;
    if (!token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: token,
        title: '📞 Incoming Call',
        body: `${callerName} is calling you...`,
        sound: 'default',
        priority: 'high',
        channelId: 'calls',
        data: { type: 'call', callId, callerId },
        _displayInForeground: true,
      }),
    });
  } catch {}
}

// ── Web notifications ─────────────────────────────────────────────────────────

async function requestWebNotificationPermission(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function showWebNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  new Notification(title, { body, icon: '/icon.png' });
}

// ── Web: listen for incoming messages ────────────────────────────────────────

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

// ── Unified: show local notification ─────────────────────────────────────────

export async function showLocalNotification(
  title: string,
  body: string,
  _senderUid: string
): Promise<void> {
  if (Platform.OS === 'web') {
    showWebNotification(title, body);
  }
  // Android: handled via Firestore-based in-app overlay
}
