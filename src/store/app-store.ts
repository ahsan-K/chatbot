import type { User } from 'firebase/auth';
import { useEffect, useState } from 'react';

export interface AppUser {
  id: string;
  name: string;
  username?: string;
  color: string;
  photoURL?: string;
}

const AVATAR_COLORS = ['#4F46E5', '#7B2CBF', '#e63946', '#2d6a4f', '#f4a261', '#3a86ff'];

function colorFromUid(uid: string): string {
  const hash = uid.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

let _user: AppUser | null = null;
const _subs = new Set<() => void>();

function notify() {
  _subs.forEach(fn => fn());
}

export function syncFromFirebaseUser(firebaseUser: User | null) {
  if (!firebaseUser) {
    _user = null;
  } else {
    _user = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
      color: colorFromUid(firebaseUser.uid),
    };
  }
  notify();
}

export function setCurrentUser(user: AppUser) {
  _user = user;
  notify();
}

export function getCurrentUser() {
  return _user;
}

export function useCurrentUser() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick(n => n + 1);
    _subs.add(fn);
    return () => void _subs.delete(fn);
  }, []);
  return _user;
}
