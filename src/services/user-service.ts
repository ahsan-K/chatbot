import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAt,
  endAt,
  where,
} from 'firebase/firestore';

import { db } from '@/config/firebase';

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  color: string;
}

const AVATAR_COLORS = ['#4361EE', '#7B2CBF', '#e63946', '#2d6a4f', '#f4a261', '#3a86ff'];

export function colorFromUid(uid: string): string {
  const hash = uid.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Check if username is available (not taken)
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()));
  return !snap.exists();
}

// Create user profile + reserve username atomically
export async function createUserProfile(
  uid: string,
  data: { name: string; username: string; email: string }
) {
  const username = data.username.toLowerCase();
  const color = colorFromUid(uid);

  await runTransaction(db, async (tx) => {
    const usernameRef = doc(db, 'usernames', username);
    const snap = await tx.get(usernameRef);
    if (snap.exists()) throw new Error('auth/username-taken');

    tx.set(usernameRef, { uid });
    tx.set(doc(db, 'users', uid), {
      uid,
      name: data.name,
      username,
      email: data.email,
      color,
      createdAt: serverTimestamp(),
    });
  });
}

// Get full user profile from Firestore
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// Search users by username prefix
export async function searchUsersByUsername(
  term: string,
  currentUid: string
): Promise<UserProfile[]> {
  if (!term.trim()) return [];
  const lower = term.toLowerCase();
  const end = lower.slice(0, -1) + String.fromCharCode(lower.charCodeAt(lower.length - 1) + 1);

  const q = query(
    collection(db, 'users'),
    orderBy('username'),
    startAt(lower),
    endAt(end)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data() as UserProfile)
    .filter(u => u.uid !== currentUid);
}

// Add a user to contacts
export async function addContact(myUid: string, user: UserProfile) {
  await setDoc(doc(db, 'contacts', myUid, 'list', user.uid), {
    uid: user.uid,
    name: user.name,
    username: user.username,
    color: user.color,
    addedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(), // Required for orderBy query to pick it up
    unreadCount: 0,
  });
}

// Get all contacts for a user
export async function getContacts(myUid: string): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'contacts', myUid, 'list'));
  return snap.docs.map(d => d.data() as UserProfile);
}

// Check if a user is already a contact
export async function isContact(myUid: string, otherUid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'contacts', myUid, 'list', otherUid));
  return snap.exists();
}
