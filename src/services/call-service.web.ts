import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/config/firebase';

export interface CallData {
  id: string;
  callerId: string;
  callerName: string;
  callerColor: string;
  callerPhotoURL?: string | null;
  receiverId: string;
  status: 'ringing' | 'active' | 'ended' | 'rejected';
  offer?: any;
  answer?: any;
}

const STUN = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

let _pc: RTCPeerConnection | null = null;
let _localStream: MediaStream | null = null;

export async function getLocalAudioStream(): Promise<MediaStream> {
  if (_localStream) return _localStream;
  _localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  return _localStream;
}

export function stopLocalStream() {
  if (_localStream) {
    _localStream.getTracks().forEach(t => t.stop());
    _localStream = null;
  }
}

export async function startCall(
  callId: string,
  myUid: string,
  myName: string,
  myColor: string,
  otherUid: string,
  myPhotoURL?: string
): Promise<() => void> {
  // Step 1: Immediately notify receiver
  console.log('[call] Creating call doc, receiverId:', otherUid);
  await setDoc(doc(db, 'calls', callId), {
    callerId: myUid, callerName: myName, callerColor: myColor,
    callerPhotoURL: myPhotoURL ?? null,
    receiverId: otherUid, status: 'ringing',
    offer: null, createdAt: new Date().toISOString(),
  });
  console.log('[call] Doc created, callId:', callId);

  // Step 2: Get mic and create offer
  _pc = new RTCPeerConnection(STUN);
  const stream = await getLocalAudioStream();
  stream.getTracks().forEach(t => _pc!.addTrack(t, stream));

  _pc.onicecandidate = async e => {
    if (e.candidate) {
      await addDoc(collection(db, 'calls', callId, 'callerCandidates'), e.candidate.toJSON());
    }
  };

  const offer = await _pc.createOffer();
  await _pc.setLocalDescription(offer);

  // Step 3: Update with offer
  await updateDoc(doc(db, 'calls', callId), {
    offer: { type: offer.type, sdp: offer.sdp },
  });

  const unsubAnswer = onSnapshot(doc(db, 'calls', callId), async snap => {
    const data = snap.data();
    console.log('[call] Doc snapshot:', data?.status, 'callId:', callId);
    if (data?.answer && _pc && !_pc.remoteDescription) {
      await _pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
    if (data?.status === 'ended' || data?.status === 'rejected') endCall(callId);
  });

  const unsubCandidates = onSnapshot(collection(db, 'calls', callId, 'receiverCandidates'), snap => {
    snap.docChanges().forEach(async change => {
      if (change.type === 'added' && _pc) {
        await _pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });

  return () => { unsubAnswer(); unsubCandidates(); };
}

export async function answerCall(callId: string): Promise<() => void> {
  _pc = new RTCPeerConnection(STUN);
  const stream = await getLocalAudioStream();
  stream.getTracks().forEach(t => _pc!.addTrack(t, stream));

  _pc.onicecandidate = async e => {
    if (e.candidate) {
      await addDoc(collection(db, 'calls', callId, 'receiverCandidates'), e.candidate.toJSON());
    }
  };

  // Wait for offer to be available (caller might still be setting up mic)
  let callData = (await getDoc(doc(db, 'calls', callId))).data();
  if (!callData?.offer) {
    await new Promise<void>(resolve => {
      const unsub = onSnapshot(doc(db, 'calls', callId), snap => {
        if (snap.data()?.offer) { unsub(); resolve(); callData = snap.data(); }
      });
    });
  }
  await _pc.setRemoteDescription(new RTCSessionDescription(callData!.offer));

  const answer = await _pc.createAnswer();
  await _pc.setLocalDescription(answer);
  await updateDoc(doc(db, 'calls', callId), { answer: { type: answer.type, sdp: answer.sdp }, status: 'active' });

  const unsubCandidates = onSnapshot(collection(db, 'calls', callId, 'callerCandidates'), snap => {
    snap.docChanges().forEach(async change => {
      if (change.type === 'added' && _pc) {
        await _pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });

  return () => unsubCandidates();
}

export async function endCall(callId: string) {
  console.log('[call] endCall called, callId:', callId, new Error().stack?.split('\n')[2]);
  if (_pc) { _pc.close(); _pc = null; }
  stopLocalStream();
  await updateDoc(doc(db, 'calls', callId), { status: 'ended' }).catch(() => {});
}

export async function rejectCall(callId: string) {
  await updateDoc(doc(db, 'calls', callId), { status: 'rejected' }).catch(() => {});
}

export function toggleMute(): boolean {
  if (!_localStream) return false;
  const track = _localStream.getAudioTracks()[0];
  if (track) { track.enabled = !track.enabled; return !track.enabled; }
  return false;
}

export function listenForIncomingCalls(myUid: string, onCall: (call: CallData) => void): () => void {
  const q = query(collection(db, 'calls'), where('receiverId', '==', myUid));
  return onSnapshot(q,
    snap => {
      snap.docChanges().forEach(change => {
        const d = change.doc.data() as CallData;
        if (change.type === 'added' && d.status === 'ringing') onCall({ ...d, id: change.doc.id });
      });
    },
    err => console.error('[calls] listener error:', err.code, err.message)
  );
}
