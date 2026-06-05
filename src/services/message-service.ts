import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { ChatMedia, ChatMessage } from '@/components/chat/types';
import { sendPushNotification } from '@/services/notification-service';

export function getConvId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

function tsToDisplay(ts: any): string {
  const date: Date = ts?.toDate?.() ?? new Date();
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Send a text message
export async function sendMessage(
  myUid: string,
  myProfile: { name: string; username: string; color: string },
  otherUid: string,
  otherProfile: { name: string; username: string; color: string },
  text: string
) {
  const convId = getConvId(myUid, otherUid);

  await addDoc(collection(db, 'messages', convId, 'msgs'), {
    text,
    senderId: myUid,
    timestamp: serverTimestamp(),
  });

  await _updateContacts(myUid, myProfile, otherUid, otherProfile, text);
  sendPushNotification(otherUid, myProfile.name, text);
}

// Send a media message (URL already uploaded to Storage)
export async function sendMediaMessage(
  myUid: string,
  myProfile: { name: string; username: string; color: string },
  otherUid: string,
  otherProfile: { name: string; username: string; color: string },
  media: ChatMedia,
  mediaUrl: string
) {
  const convId = getConvId(myUid, otherUid);

  await addDoc(collection(db, 'messages', convId, 'msgs'), {
    senderId: myUid,
    timestamp: serverTimestamp(),
    mediaType: media.type,
    mediaUrl,
    mediaName: media.name ?? media.type,
    mediaMime: media.mimeType,
  });

  const preview = `📎 ${media.type}`;
  await _updateContacts(myUid, myProfile, otherUid, otherProfile, preview);
  sendPushNotification(otherUid, myProfile.name, preview);
}

async function _updateContacts(
  myUid: string,
  myProfile: { name: string; username: string; color: string },
  otherUid: string,
  otherProfile: { name: string; username: string; color: string },
  lastMessage: string
) {
  // Update sender's own contact entry
  await setDoc(
    doc(db, 'contacts', myUid, 'list', otherUid),
    {
      uid: otherUid,
      name: otherProfile.name,
      username: otherProfile.username,
      color: otherProfile.color,
      lastMessage,
      lastMessageAt: serverTimestamp(),
      lastSenderId: myUid,
      unreadCount: 0,
    },
    { merge: true }
  );

  // Try to update receiver's contact entry (permission may be denied if not added)
  try {
    await setDoc(
      doc(db, 'contacts', otherUid, 'list', myUid),
      {
        uid: myUid,
        name: myProfile.name,
        username: myProfile.username,
        color: myProfile.color,
        lastMessage,
        lastMessageAt: serverTimestamp(),
        lastSenderId: myUid,
        unreadCount: increment(1),
      },
      { merge: true }
    );
  } catch {
    // Receiver will see message when they open chat directly
  }
}

// Real-time message listener
export function listenToMessages(
  myUid: string,
  otherUid: string,
  onUpdate: (msgs: ChatMessage[]) => void
): () => void {
  const convId = getConvId(myUid, otherUid);
  const q = query(
    collection(db, 'messages', convId, 'msgs'),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, snap => {
    const msgs: ChatMessage[] = snap.docs.map(d => {
      const data = d.data();
      const timestamp = tsToDisplay(data.timestamp);
      const isMine = data.senderId === myUid;

      // Media message
      if (data.mediaUrl) {
        return {
          id: d.id,
          media: {
            type: data.mediaType ?? 'image',
            uri: data.mediaUrl,
            name: data.mediaName,
            mimeType: data.mediaMime,
          } as ChatMedia,
          sender: isMine ? 'me' : data.senderId,
          timestamp,
          status: isMine ? (data.readAt ? ('read' as const) : ('sent' as const)) : undefined,
        };
      }

      // Text message
      return {
        id: d.id,
        text: data.text ?? '',
        sender: isMine ? 'me' : data.senderId,
        timestamp,
        status: isMine ? (data.readAt ? ('read' as const) : ('sent' as const)) : undefined,
      };
    });

    onUpdate(msgs);
  });
}

// Typing indicator
export function setTyping(convId: string, myUid: string, isTyping: boolean): void {
  const ref = doc(db, 'typing', convId, 'users', myUid);
  if (isTyping) {
    setDoc(ref, { isTyping: true, updatedAt: serverTimestamp() });
  } else {
    deleteDoc(ref).catch(() => {});
  }
}

export function listenToTyping(
  convId: string,
  otherUid: string,
  cb: (isTyping: boolean) => void
): () => void {
  return onSnapshot(doc(db, 'typing', convId, 'users', otherUid), snap => {
    cb(snap.exists() && snap.data()?.isTyping === true);
  });
}

// Read receipts — mark messages from otherUid as read + reset unreadCount in Firestore
export async function markMessagesAsRead(convId: string, myUid: string, otherUid: string): Promise<void> {
  try {
    // Reset unreadCount in contacts so refresh doesn't show old unread count
    await setDoc(
      doc(db, 'contacts', myUid, 'list', otherUid),
      { unreadCount: 0 },
      { merge: true }
    );

    const q = query(
      collection(db, 'messages', convId, 'msgs'),
      where('senderId', '==', otherUid)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      if (!d.data().readAt) batch.update(d.ref, { readAt: serverTimestamp() });
    });
    await batch.commit();
  } catch {
    // Don't block UI if read receipt fails
  }
}
