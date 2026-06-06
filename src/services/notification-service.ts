import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from '@/config/firebase';

// ── Native: register Expo push token ────────────────────────────────────────

export async function registerForPushNotifications(uid: string): Promise<void> {
  if (Platform.OS === 'web') {
    await requestWebNotificationPermission();
    return;
  }
  if (!Device.isDevice) return;

  // Set handler here (not at module level) to avoid crash before Firebase init
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {}

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch {}

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages', importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250], lightColor: '#0059f7', sound: 'default',
    }).catch(() => {});
    Notifications.setNotificationChannelAsync('calls', {
      name: 'Calls', importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 500, 500], lightColor: '#0059f7', sound: 'default',
    }).catch(() => {});
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    if (token) {
      await setDoc(doc(db, 'users', uid), { expoPushToken: token }, { merge: true });
    }
  } catch {}
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

// ── Native: send call push notification with Accept/Decline actions ──────────

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

    // Also update the call doc with a 'notified' flag as fallback
    await setDoc(doc(db, 'calls', callId), { pushSentAt: new Date().toISOString() }, { merge: true });

    await fetch('https://exp.host/push/send', {
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
