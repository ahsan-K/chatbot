import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { auth } from '@/config/firebase';

export function useAuth() {
  // undefined = still loading, null = not logged in, User = logged in
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  return {
    user,
    loading: user === undefined,
    isLoggedIn: !!user,
  };
}
