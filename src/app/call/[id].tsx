import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { answerCall, endCall, startCall, stopLocalStream, toggleMute } from '@/services/call-service';
import { db } from '@/config/firebase';
import { getUserProfile } from '@/services/user-service';
import { useCurrentUser } from '@/store/app-store';
import { getConvId } from '@/services/message-service';

function getInitials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

type CallState = 'connecting' | 'ringing' | 'active' | 'ended';

export default function CallScreen() {
  const { id, callId: incomingCallId } = useLocalSearchParams<{ id: string; callId?: string }>();
  const { user: firebaseUser } = useAuth();
  const me = useCurrentUser();
  const isIncoming = !!incomingCallId;

  const [callState, setCallState] = useState<CallState>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [otherName, setOtherName] = useState('');
  const [otherColor, setOtherColor] = useState('#0059f7');
  const [otherPhoto, setOtherPhoto] = useState<string | undefined>();
  const [duration, setDuration] = useState(0);
  const callId = useRef<string>(incomingCallId ?? '');
  const unsubRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!firebaseUser || !me || startedRef.current) return;
    startedRef.current = true;
    if (Platform.OS !== 'web') {
      try {
        const InCallManager = require('react-native-incall-manager').default;
        InCallManager.start({ media: 'audio' });
      } catch {}
    }
    getUserProfile(id).then(p => {
      if (p) { setOtherName(p.name); setOtherColor(p.color); setOtherPhoto(p.photoURL); }
    });
    if (isIncoming) {
      handleAnswerCall();
    } else {
      initiateCall();
    }
    return () => {
      unsubRef.current?.();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [firebaseUser, me]);

  async function initiateCall() {
    if (!firebaseUser || !me) {
      return;
    }
    try {
      callId.current = `${getConvId(firebaseUser.uid, id)}_${Date.now()}`;
      const unsub = await startCall(callId.current, firebaseUser.uid, me.name, me.color, id, me.photoURL);
      setCallState('ringing');

      // Listen to call document for status changes (active/ended/rejected)
      const unsubStatus = onSnapshot(doc(db, 'calls', callId.current), snap => {
        const data = snap.data();
        if (data?.status === 'active') setCallState('active');
        if (data?.status === 'ended' || data?.status === 'rejected') {
          setCallState('ended');
          setTimeout(() => router.canGoBack() ? router.back() : router.replace('/conversations'), 800);
        }
      });

      unsubRef.current = () => { unsub(); unsubStatus(); };
    } catch (e: any) {
      Alert.alert('Error', 'Call start nahi hua: ' + (e?.message ?? ''));
      router.back();
    }
  }

  async function handleAnswerCall() {
    if (!incomingCallId) return;
    try {
      const unsub = await answerCall(incomingCallId);
      setCallState('active');

      // Listen for caller ending the call
      const unsubStatus = onSnapshot(doc(db, 'calls', incomingCallId), snap => {
        const data = snap.data();
        if (data?.status === 'ended' || data?.status === 'rejected') {
          stopLocalStream();
          if (Platform.OS !== 'web') {
            try { const InCallManager = require('react-native-incall-manager').default; InCallManager.stop(); } catch {}
          }
          setCallState('ended');
          setTimeout(() => router.canGoBack() ? router.back() : router.replace('/conversations'), 800);
        }
      });

      unsubRef.current = () => { unsub(); unsubStatus(); };
    } catch (e: any) {
      Alert.alert('Error', 'Call answer nahi hua: ' + (e?.message ?? ''));
      router.back();
    }
  }

  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [callState]);

  function formatDuration(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  async function handleHangUp() {
    if (Platform.OS !== 'web') {
      try { const InCallManager = require('react-native-incall-manager').default; InCallManager.stop(); } catch {}
    }
    if (callId.current) await endCall(callId.current);
    setCallState('ended');
    setTimeout(() => router.canGoBack() ? router.back() : router.replace('/conversations'), 800);
  }

  function handleMute() {
    const muted = toggleMute();
    setIsMuted(muted);
  }

  function handleSpeaker() {
    if (Platform.OS === 'web') return;
    try {
      const InCallManager = require('react-native-incall-manager').default;
      const next = !isSpeaker;
      InCallManager.setSpeakerphoneOn(next);
      setIsSpeaker(next);
    } catch {}
  }

  const statusText =
    callState === 'connecting' ? 'Connecting...' :
    callState === 'ringing' ? 'Ringing...' :
    callState === 'active' ? formatDuration(duration) :
    'Call Ended';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, { borderColor: otherColor }]}>
            {otherPhoto ? (
              <Image source={{ uri: otherPhoto }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: otherColor }]}>
                <Text style={styles.avatarText}>{getInitials(otherName)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{otherName}</Text>
          <Text style={styles.status}>{statusText}</Text>
          {callState === 'ringing' && <ActivityIndicator color="rgba(255,255,255,0.6)" style={{ marginTop: 8 }} />}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Mute */}
          <View style={styles.controlItem}>
            <TouchableOpacity
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              onPress={handleMute}
              activeOpacity={0.7}>
              <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
            </TouchableOpacity>
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </View>

          {/* Hang up */}
          <View style={styles.controlItem}>
            <TouchableOpacity style={styles.hangUpBtn} onPress={handleHangUp} activeOpacity={0.8}>
              <Text style={styles.hangUpIcon}>📵</Text>
            </TouchableOpacity>
            <Text style={styles.controlLabel}>End</Text>
          </View>

          {/* Speaker - native only */}
          {Platform.OS !== 'web' && (
            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
                onPress={handleSpeaker}
                activeOpacity={0.7}>
                <Text style={styles.controlIcon}>🔊</Text>
              </TouchableOpacity>
              <Text style={styles.controlLabel}>Speaker</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  screen: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 60 },

  avatarSection: { alignItems: 'center', gap: 16 },
  avatarRing: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 120, height: 120, borderRadius: 60 },
  avatarText: { fontSize: 44, fontWeight: '700', color: '#FFFFFF' },
  name: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  status: { fontSize: 16, color: 'rgba(255,255,255,0.6)' },

  controls: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: 32, paddingBottom: 20,
  },
  controlItem: { alignItems: 'center', gap: 8 },
  controlBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: 'rgba(255,255,255,0.4)' },
  controlIcon: { fontSize: 26 },
  controlLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  hangUpBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#e63946',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#e63946', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  hangUpIcon: { fontSize: 30 },
});
