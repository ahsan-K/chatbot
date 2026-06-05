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
  addContact,
  isContact,
  searchUsersByUsername,
  UserProfile,
} from '@/services/user-service';
import { addContactToStore } from '@/store/conversations-store';

function getInitials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function UserCard({ user, onAdd, added, adding }: {
  user: UserProfile; onAdd: () => void; added: boolean; adding: boolean;
}) {
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
        style={[styles.addBtn, added && styles.addedBtn]}
        onPress={onAdd}
        disabled={added || adding}
        activeOpacity={0.7}>
        {adding
          ? <ActivityIndicator size="small" color="#4361EE" />
          : <Text style={[styles.addBtnText, added && styles.addedBtnText]}>
              {added ? 'Added ✓' : '+ Add'}
            </Text>}
      </TouchableOpacity>
    </View>
  );
}

export default function ExploreScreen() {
  const { user: firebaseUser } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!search.trim() || !firebaseUser) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchUsersByUsername(search, firebaseUser.uid);
        const checks = await Promise.all(found.map(u => isContact(firebaseUser.uid, u.uid)));
        setResults(found);
        const added = new Set<string>();
        found.forEach((u, i) => { if (checks[i]) added.add(u.uid); });
        setAddedIds(added);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, firebaseUser]);

  async function handleAdd(user: UserProfile) {
    if (!firebaseUser) return;
    setAddingId(user.uid);
    try {
      await addContact(firebaseUser.uid, user);
      addContactToStore(user);
      setAddedIds(prev => new Set([...prev, user.uid]));
    } finally { setAddingId(null); }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4361EE' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
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
            added={addedIds.has(item.uid)}
            adding={addingId === item.uid}
            onAdd={() => handleAdd(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={results.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          search.trim() && !searching ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptyHint}>Try a different username</Text>
            </View>
          ) : !search.trim() ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyTitle}>Find people to chat with</Text>
              <Text style={styles.emptyHint}>Type a @username to search</Text>
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
  addBtn: { backgroundColor: '#eef0ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addedBtn: { backgroundColor: '#e8f5e9' },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#4361EE' },
  addedBtnText: { color: '#2d6a4f' },
  separator: { height: 8 },
});
