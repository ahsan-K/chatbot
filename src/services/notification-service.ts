import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from '@/config/firebase';

// ── Native: register push token ──────────────────────────────────────────────

export async function registerForPushNotifications(_uid: string): Promise<void> {
  if (Platform.OS === 'web') {
    await requestWebNotificationPermission();
    return;
  }
  // Android: expo-notifications requires Firebase Messaging SDK to be initialized.
  // Notification channels and local notifications handled via in-app Firestore listeners.
  // To enable background push: ensure Firebase Cloud Messaging is enabled in Firebase Console
  // and FCM V1 credentials are configured via: eas credentials -p android
}

// ── Native: send push to another user via Expo Push API ─────────────────────

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

// ── Native: send call push notification ──────────────────────────────────────

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
  if (document.visibilityState === 'visible') return;
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

// ── Unified: show notification ────────────────────────────────────────────────

export async function showLocalNotification(
  title: string,
  body: string,
  _senderUid: string
): Promise<void> {
  if (Platform.OS === 'web') {
    showWebNotification(title, body);
  }
  // Android: notifications shown via in-app overlay (Firestore-based)
}
