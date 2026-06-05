import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

import { db } from '@/config/firebase';

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  color: string;
  photoURL?: string;
  online?: boolean;
}

const AVATAR_COLORS = ['#4F46E5', '#7B2CBF', '#e63946', '#2d6a4f', '#f4a261', '#3a86ff'];

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

// Get all users — reads usernames collection (public) then fetches each profile
export async function getAllUsers(currentUid: string): Promise<UserProfile[]> {
  console.log('[getAllUsers] step 1 — reading usernames...');
  let snap: any;
  try {
    snap = await getDocs(collection(db, 'usernames'));
    console.log('[getAllUsers] step 1 OK — docs:', snap.size);
  } catch (e: any) {
    console.error('[getAllUsers] step 1 FAILED (usernames):', e.code, e.message);
    throw e;
  }

  const uids = snap.docs
    .map((d: any) => d.data().uid as string)
    .filter((uid: string) => uid && uid !== currentUid);

  console.log('[getAllUsers] step 2 — fetching profiles for:', uids);
  if (uids.length === 0) return [];

  const profiles = await Promise.all(
    uids.map(async (uid: string) => {
      try {
        const d = await getDoc(doc(db, 'users', uid));
        console.log('[getAllUsers] profile', uid, d.exists() ? 'OK' : 'missing');
        return d;
      } catch (e: any) {
        console.error('[getAllUsers] step 2 FAILED (user', uid, '):', e.code, e.message);
        throw e;
      }
    })
  );

  return profiles
    .filter((d: any) => d.exists())
    .map((d: any) => d.data() as UserProfile);
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

  // Prefix search: increment last char for upper bound
  // e.g. 'ahsan' -> '>= ahsan' AND '< ahsao'
  const upperBound = lower.slice(0, lower.length - 1) + String.fromCharCode(lower.charCodeAt(lower.length - 1) + 1);

  const q = query(
    collection(db, 'users'),
    where('username', '>=', lower),
    where('username', '<', upperBound)
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

// Update user profile fields (name, color, photoURL)
export async function updateUserProfile(
  uid: string,
  updates: { name?: string; color?: string; photoURL?: string }
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates);
}

// ── Friend Requests ──────────────────────────────────────────────────────────

export type FriendRequestStatus = 'none' | 'sent' | 'received' | 'friends';

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  fromName: string;
  fromUsername: string;
  fromColor: string;
  createdAt: any;
}

export async function sendFriendRequest(myUid: string, myProfile: UserProfile, other: UserProfile) {
  await setDoc(doc(db, 'friendRequests', `${myUid}_${other.uid}`), {
    from: myUid,
    to: other.uid,
    fromName: myProfile.name,
    fromUsername: myProfile.username,
    fromColor: myProfile.color,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function cancelFriendRequest(myUid: string, otherUid: string) {
  await deleteDoc(doc(db, 'friendRequests', `${myUid}_${otherUid}`));
}

export async function acceptFriendRequest(
  requestId: string,
  fromUid: string,
  toUid: string,
  fromProfile: UserProfile,
  toProfile: UserProfile
) {
  await runTransaction(db, async (tx) => {
    tx.update(doc(db, 'friendRequests', requestId), { status: 'accepted' });
    tx.set(doc(db, 'contacts', toUid, 'list', fromUid), {
      uid: fromUid, name: fromProfile.name, username: fromProfile.username,
      color: fromProfile.color, addedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(), unreadCount: 0,
    });
    tx.set(doc(db, 'contacts', fromUid, 'list', toUid), {
      uid: toUid, name: toProfile.name, username: toProfile.username,
      color: toProfile.color, addedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(), unreadCount: 0,
    });
  });
}

export async function rejectFriendRequest(requestId: string) {
  await deleteDoc(doc(db, 'friendRequests', requestId));
}

export async function getFriendRequestStatus(
  myUid: string,
  otherUid: string
): Promise<FriendRequestStatus> {
  const [sentSnap, receivedSnap, contactSnap] = await Promise.all([
    getDoc(doc(db, 'friendRequests', `${myUid}_${otherUid}`)),
    getDoc(doc(db, 'friendRequests', `${otherUid}_${myUid}`)),
    getDoc(doc(db, 'contacts', myUid, 'list', otherUid)),
  ]);
  if (contactSnap.exists()) return 'friends';
  if (sentSnap.exists() && sentSnap.data()?.status === 'pending') return 'sent';
  if (receivedSnap.exists() && receivedSnap.data()?.status === 'pending') return 'received';
  return 'none';
}

export function listenToPendingRequests(
  myUid: string,
  cb: (requests: FriendRequest[]) => void
): () => void {
  // Single where clause — no composite index needed
  // Filter 'pending' client-side to avoid index requirement
  const q = query(
    collection(db, 'friendRequests'),
    where('to', '==', myUid)
  );
  return onSnapshot(
    q,
    snap => {
      const pending = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as FriendRequest))
        .filter(r => (r as any).status === 'pending');
      cb(pending);
    },
    err => console.error('[friendRequests] listener error:', err.code, err.message)
  );
}

// Online status
export async function setOnlineStatus(uid: string, online: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      online,
      lastSeen: serverTimestamp(),
    });
  } catch {}
}

export function listenToOnlineStatus(
  uid: string,
  cb: (online: boolean, lastSeen?: Date) => void
): () => void {
  return onSnapshot(doc(db, 'users', uid), snap => {
    if (snap.exists()) {
      const data = snap.data();
      cb(data.online ?? false, data.lastSeen?.toDate?.());
    }
  });
}
