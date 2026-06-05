import {
  collection,
  getDocs,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/config/firebase';
import { UserProfile } from '@/services/user-service';

export interface Conversation {
  id: string;
  user: UserProfile;
  lastMessage?: string;
  lastMessageAt?: Date;
  lastSenderId?: string;
  unreadCount: number;
}

let _conversations: Conversation[] = [];
let _unsubscribe: (() => void) | null = null;
const _subs = new Set<() => void>();

function notify() {
  _subs.forEach(fn => fn());
}

function mapDoc(d: any): Conversation {
  const data = d.data();
  return {
    id: `conv_${data.uid ?? d.id}`,
    user: {
      uid: data.uid ?? d.id,
      name: data.name ?? 'Unknown',
      username: data.username ?? '',
      color: data.color ?? '#4361EE',
      email: data.email ?? '',
    },
    lastMessage: data.lastMessage,
    lastMessageAt:
      data.lastMessageAt?.toDate?.() ??
      data.addedAt?.toDate?.() ??
      new Date(0),
    lastSenderId: data.lastSenderId,
    unreadCount: data.unreadCount ?? 0,
  };
}

function sortConvs(list: Conversation[]) {
  return [...list].sort(
    (a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0)
  );
}

// Load contacts once immediately, then keep real-time listener
export function startContactsListener(myUid: string): () => void {
  if (_unsubscribe) _unsubscribe();

  const colRef = collection(db, 'contacts', myUid, 'list');
  const q = query(colRef);

  // One-time fetch first — shows data immediately
  getDocs(q)
    .then(snap => {
      console.log('[contacts] getDocs:', snap.docs.length);
      _conversations = sortConvs(snap.docs.map(mapDoc));
      notify();
    })
    .catch(e => console.error('[contacts] getDocs error:', e));

  // Real-time listener for future changes
  _unsubscribe = onSnapshot(
    q,
    snap => {
      console.log('[contacts] onSnapshot:', snap.docs.length);
      _conversations = sortConvs(snap.docs.map(mapDoc));
      notify();
    },
    error => console.error('[contacts] onSnapshot error:', error.code, error.message)
  );

  return _unsubscribe;
}

export function stopContactsListener() {
  if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
  _conversations = [];
}

// Add contact manually (from Explore, before any message)
export function addContactToStore(user: UserProfile) {
  const exists = _conversations.some(c => c.user.uid === user.uid);
  if (!exists) {
    _conversations = [
      { id: `conv_${user.uid}`, user, unreadCount: 0 },
      ..._conversations,
    ];
    notify();
  }
}

export function markRead(userId: string) {
  // Reset unread locally immediately
  _conversations = _conversations.map(c =>
    c.user.uid === userId ? { ...c, unreadCount: 0 } : c
  );
  notify();
}

export function getConversation(userId: string): Conversation | null {
  return _conversations.find(c => c.user.uid === userId) ?? null;
}

export function useConversations() {
  const [data, setData] = useState(() => [..._conversations]);
  useEffect(() => {
    const fn = () => setData([..._conversations]);
    _subs.add(fn);
    return () => void _subs.delete(fn);
  }, []);
  return data;
}
