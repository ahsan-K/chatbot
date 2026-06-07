import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Image, Modal, PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

// On web: handle browser popstate (back button / refresh) — always have a fallback route
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      if (!router.canGoBack()) router.replace('/conversations');
    }, 0);
  });
}

// Inject CSS directly into DOM — removes all browser focus rings globally
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    *:focus, *:focus-visible, *:focus-within {
      outline: none !important; outline-width: 0 !important;
      box-shadow: none !important; -webkit-box-shadow: none !important;
    }
    input, input:focus, textarea, textarea:focus, select, select:focus {
      outline: none !important; outline-width: 0 !important;
      box-shadow: none !important; -webkit-box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);
}

import * as Notifications from 'expo-notifications';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useAuth } from '@/hooks/use-auth';
import { listenForIncomingCalls, rejectCall, CallData } from '@/services/call-service';
import { listenForIncomingMessages, registerForPushNotifications, showLocalNotification } from '@/services/notification-service';
import { getUserProfile, setOnlineStatus } from '@/services/user-service';
import { syncFromFirebaseUser, setCurrentUser } from '@/store/app-store';
import { startContactsListener, stopContactsListener } from '@/store/conversations-store';

function getInitials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function IncomingCallOverlay({ call, onAccept, onReject }: {
  call: CallData;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <View style={overlayStyles.overlay}>
      <View style={overlayStyles.card}>
        <Text style={overlayStyles.callLabel}>📞 Incoming Call</Text>
        {call.callerPhotoURL ? (
          <Image source={{ uri: call.callerPhotoURL }} style={overlayStyles.avatarImg} />
        ) : (
          <View style={[overlayStyles.avatar, { backgroundColor: call.callerColor }]}>
            <Text style={overlayStyles.avatarText}>{getInitials(call.callerName)}</Text>
          </View>
        )}
        <Text style={overlayStyles.callerName}>{call.callerName}</Text>
        <Text style={overlayStyles.callerSub}>is calling you...</Text>
        <View style={overlayStyles.btnRow}>
          <TouchableOpacity style={overlayStyles.rejectBtn} onPress={onReject} activeOpacity={0.8}>
            <Text style={overlayStyles.btnIcon}>📵</Text>
            <Text style={overlayStyles.btnLabel}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={overlayStyles.acceptBtn} onPress={onAccept} activeOpacity={0.8}>
            <Text style={overlayStyles.btnIcon}>📞</Text>
            <Text style={overlayStyles.btnLabel}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#1a1a2e', borderRadius: 24,
    padding: 32, alignItems: 'center', gap: 12,
    width: '80%', maxWidth: 320,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 20,
  },
  callLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  callerName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  callerSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  btnRow: { flexDirection: 'row', gap: 24, marginTop: 8 },
  rejectBtn: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#e63946', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  acceptBtn: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#2d6a4f', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  btnIcon: { fontSize: 28 },
  btnLabel: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
});

async function requestAppPermissions() {
  if (Platform.OS !== 'android') return;
  try {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
    ]);
  } catch {}
  // Android 13+ POST_NOTIFICATIONS (separate request)
  try {
    const postNotif = (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS;
    if (postNotif) {
      const result = await PermissionsAndroid.request(postNotif);
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Notifications Blocked',
          'Call notifications ke liye Settings mein Notifications allow karein.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => { try { require('react-native').Linking.openSettings(); } catch {} } },
          ]
        );
      }
    }
  } catch {}
}

// Web ringtone using Web Audio API
let _audioCtx: any = null;
let _ringtoneInterval: any = null;

function startWebRingtone() {
  if (typeof window === 'undefined') return;
  try {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    function beep() {
      if (!_audioCtx) return;
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.connect(gain); gain.connect(_audioCtx.destination);
      osc.frequency.value = 480; osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, _audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.4);
      osc.start(_audioCtx.currentTime); osc.stop(_audioCtx.currentTime + 0.4);
    }
    beep();
    _ringtoneInterval = setInterval(beep, 1200);
  } catch {}
}

function stopWebRingtone() {
  if (_ringtoneInterval) { clearInterval(_ringtoneInterval); _ringtoneInterval = null; }
  if (_audioCtx) { _audioCtx.close().catch(() => {}); _audioCtx = null; }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);

  // Request permissions + register notification category (iOS only for categories)
  useEffect(() => {
    requestAppPermissions();
    if (Platform.OS === 'ios') {
      Notifications.setNotificationCategoryAsync('INCOMING_CALL', [
        { identifier: 'ACCEPT', buttonTitle: '✅ Accept', options: { opensAppToForeground: true } },
        { identifier: 'DECLINE', buttonTitle: '❌ Decline', options: { opensAppToForeground: false } },
      ]).catch(() => {});
    }
    // Android channels set up via @react-native-firebase/messaging
  }, []);

  // Handle notification taps — iOS only (Android uses @react-native-firebase background handler)
  useEffect(() => {
    if (Platform.OS === 'android') return;
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const action = response.actionIdentifier;

      if (data?.type === 'call') {
        const callId = data.callId as string;
        const callerId = data.callerId as string;
        if (action === 'DECLINE') {
          rejectCall(callId);
        } else {
          router.push(`/call/${callerId}?callId=${callId}` as any);
        }
      } else if (data?.senderUid) {
        router.push(`/chat/${data.senderUid as string}` as any);
      }
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
      registerForPushNotifications(user.uid).catch(() => {});
      setOnlineStatus(user.uid, true);
      const appStateSub = AppState.addEventListener('change', state => {
        setOnlineStatus(user.uid, state === 'active');
      });
      const unsubContacts = startContactsListener(user.uid);
      const unsubNotif = listenForIncomingMessages(user.uid, (name, msg, senderUid) => {
        showLocalNotification(name, msg, senderUid);
      });
      const unsubCalls = listenForIncomingCalls(user.uid, call => {
        setIncomingCall(call);
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

  // Ringtone — play when incoming call arrives, stop when answered/rejected
  useEffect(() => {
    if (incomingCall) {
      if (Platform.OS === 'web') {
        startWebRingtone();
      } else {
        try { const InCallManager = require('react-native-incall-manager').default; InCallManager.startRingtone('_DEFAULT_'); } catch {}
      }
    } else {
      if (Platform.OS === 'web') {
        stopWebRingtone();
      } else {
        try { const InCallManager = require('react-native-incall-manager').default; InCallManager.stopRingtone(); } catch {}
      }
    }
    return () => {
      if (Platform.OS === 'web') stopWebRingtone();
      else { try { const InCallManager = require('react-native-incall-manager').default; InCallManager.stopRingtone(); } catch {} }
    };
  }, [incomingCall]);

  function handleAcceptCall() {
    if (!incomingCall) return;
    const call = incomingCall;
    setIncomingCall(null);
    router.push(`/call/${call.callerId}?callId=${call.id}` as any);
  }

  function handleRejectCall() {
    if (!incomingCall) return;
    rejectCall(incomingCall.id);
    setIncomingCall(null);
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      <Modal visible={!!incomingCall} transparent animationType="fade" onRequestClose={handleRejectCall}>
        {incomingCall && (
          <IncomingCallOverlay
            call={incomingCall}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        )}
      </Modal>
    </ThemeProvider>
  );
}
