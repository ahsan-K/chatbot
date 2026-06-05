import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';
import {
  FriendRequestStatus,
  cancelFriendRequest,
  acceptFriendRequest,
  getAllUsers,
  getFriendRequestStatus,
  getUserProfile,
  rejectFriendRequest,
  sendFriendRequest,
  searchUsersByUsername,
  UserProfile,
} from '@/services/user-service';
import { useCurrentUser } from '@/store/app-store';

function getInitials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function UserCard({ user, status, onAction, loading }: {
  user: UserProfile;
  status: FriendRequestStatus;
  onAction: () => void;
  loading: boolean;
}) {
  const btnStyle = status === 'friends'
    ? styles.btnFriends
    : status === 'sent'
    ? styles.btnPending
    : status === 'received'
    ? styles.btnAccept
    : styles.btnAdd;

  const btnLabel = status === 'friends'
    ? 'Friends ✓'
    : status === 'sent'
    ? 'Pending'
    : status === 'received'
    ? 'Accept'
    : '+ Add';

  const btnTextStyle = status === 'friends'
    ? styles.btnTextFriends
    : status === 'received'
    ? styles.btnTextAccept
    : styles.btnTextDefault;

  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: user.color }]}>
        <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{user.name}</Text>
        <Text style={styles.cardUsername}>@{user.username}</Text>
      </View>
      <TouchableOpacity
        style={[styles.btn, btnStyle]}
        onPress={onAction}
        disabled={status === 'friends' || loading}
        activeOpacity={0.7}>
        {loading
          ? <ActivityIndicator size="small" color="#0059f7" />
          : <Text style={[styles.btnText, btnTextStyle]}>{btnLabel}</Text>}
      </TouchableOpacity>
    </View>
  );
}

export default function ExploreScreen() {
  const { user: firebaseUser } = useAuth();
  const me = useCurrentUser();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, FriendRequestStatus>>({});
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Load all users ONCE on mount — then filter client-side (instant, no index needed)
  useEffect(() => {
    if (!firebaseUser) return;
    setSearching(true);
    getAllUsers(firebaseUser.uid)
      .then(async users => {
        setAllUsers(users);
        const statusList = await Promise.all(
          users.map(u => getFriendRequestStatus(firebaseUser.uid, u.uid))
        );
        const map: Record<string, FriendRequestStatus> = {};
        users.forEach((u, i) => { map[u.uid] = statusList[i]; });
        setStatuses(map);
        setResults(users);
      })
      .catch(e => console.error('[explore] load error:', e))
      .finally(() => setSearching(false));
  }, [firebaseUser]);

  // Client-side instant filter as user types
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setResults(allUsers);
      return;
    }
    setResults(allUsers.filter(u =>
      u.username.includes(q) || u.name.toLowerCase().includes(q)
    ));
  }, [search, allUsers]);

  async function handleAction(user: UserProfile) {
    if (!firebaseUser || !me) return;
    const status = statuses[user.uid] ?? 'none';
    setLoadingId(user.uid);
    try {
      if (status === 'none') {
        const myProfile = await getUserProfile(firebaseUser.uid);
        if (myProfile) await sendFriendRequest(firebaseUser.uid, myProfile, user);
        setStatuses(prev => ({ ...prev, [user.uid]: 'sent' }));
      } else if (status === 'sent') {
        await cancelFriendRequest(firebaseUser.uid, user.uid);
        setStatuses(prev => ({ ...prev, [user.uid]: 'none' }));
      } else if (status === 'received') {
        const reqId = `${user.uid}_${firebaseUser.uid}`;
        const myProfile = await getUserProfile(firebaseUser.uid);
        if (myProfile) {
          await acceptFriendRequest(reqId, user.uid, firebaseUser.uid, user, myProfile);
        }
        setStatuses(prev => ({ ...prev, [user.uid]: 'friends' }));
      }
    } finally { setLoadingId(null); }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#0059f7' }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/conversations')}
            hitSlop={8}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find People</Text>
        </View>
        <View style={styles.searchBar}>
          <Text style={styles.searchAtSign}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by @username..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={Platform.OS !== 'web'}
          />
          {searching && <ActivityIndicator color="rgba(255,255,255,0.8)" size="small" />}
        </View>
      </SafeAreaView>

      <FlatList
        data={results}
        keyExtractor={item => item.uid}
        renderItem={({ item }) => (
          <UserCard
            user={item}
            status={statuses[item.uid] ?? 'none'}
            loading={loadingId === item.uid}
            onAction={() => handleAction(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={results.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          !searching ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{search.trim() ? '🔍' : '👥'}</Text>
              <Text style={styles.emptyTitle}>
                {search.trim() ? 'No users found' : 'No users yet'}
              </Text>
              <Text style={styles.emptyHint}>
                {search.trim() ? 'Try a different username' : 'Be the first to sign up!'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  backIcon: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14, marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  searchAtSign: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, color: '#FFFFFF', padding: 0, margin: 0, outlineWidth: 0 } as any,
  list: { padding: 16, gap: 0 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 80 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  emptyHint: { fontSize: 14, color: '#aaa' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#111' },
  cardUsername: { fontSize: 13, color: '#888', marginTop: 2 },
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 80, alignItems: 'center' },
  btnAdd: { backgroundColor: '#EEF2FF' },
  btnPending: { backgroundColor: '#f3f4f6' },
  btnAccept: { backgroundColor: '#e8f5e9' },
  btnFriends: { backgroundColor: '#e8f5e9' },
  btnText: { fontSize: 14, fontWeight: '700' },
  btnTextDefault: { color: '#0059f7' },
  btnTextAccept: { color: '#2d6a4f' },
  btnTextFriends: { color: '#2d6a4f' },
  separator: { height: 8 },
});
