import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';
import { logout } from '@/services/auth-service';
import { listenToPendingRequests } from '@/services/user-service';
import { useCurrentUser } from '@/store/app-store';
import {
  Conversation,
  markRead,
  useConversations,
} from '@/store/conversations-store';

function getInitials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(date?: Date): string {
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (diffDays === 1) return 'Yesterday';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (diffDays < 7) return days[date.getDay()];
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function lastMsgPreview(conv: Conversation): { text: string; isMine: boolean } {
  if (!conv.lastMessage) return { text: 'Tap to start a conversation', isMine: false };
  return { text: conv.lastMessage, isMine: conv.lastSenderId === 'me' };
}

function ConvItem({ conv, user, onPress }: { conv: Conversation; user: Conversation['user']; onPress: () => void }) {
  const { text, isMine } = lastMsgPreview(conv);
  const time = formatTime(conv.lastMessageAt);
  const unread = conv.unreadCount;

  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: user.color }]}>
          <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
        </View>
        {user.online && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <Text style={styles.itemName} numberOfLines={1}>{user.name}</Text>
          {time ? (
            <Text style={[styles.itemTime, unread > 0 && styles.itemTimeUnread]}>{time}</Text>
          ) : null}
        </View>
        <View style={styles.itemBottom}>
          <Text
            style={[styles.itemPreview, unread > 0 && styles.itemPreviewUnread]}
            numberOfLines={1}>
            {isMine ? `You: ${text}` : text}
          </Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ConversationsScreen() {
  const user = useCurrentUser();
  const { user: firebaseUser } = useAuth();
  const conversations = useConversations();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!firebaseUser) return;
    return listenToPendingRequests(firebaseUser.uid, reqs => setPendingCount(reqs.length));
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser === null) { router.replace('/login'); return; }
    if (firebaseUser) setLoading(false);
  }, [firebaseUser]);

  const filtered = conversations.filter(c =>
    c.user.name.toLowerCase().includes(search.toLowerCase()) ||
    c.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const myIni = user ? getInitials(user.name) : '?';

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFFFFF' }}>
        <View style={styles.header}>
          <View style={[styles.myAvatar, { backgroundColor: user?.color ?? '#4361EE' }]}>
            <Text style={styles.myAvatarText}>{myIni}</Text>
          </View>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity
            onPress={() => router.push('/friends')}
            style={styles.exploreBtn}
            hitSlop={8}>
            <Text style={styles.exploreBtnText}>🤝</Text>
            {pendingCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/explore')}
            style={styles.exploreBtn}
            hitSlop={8}>
            <Text style={styles.exploreBtnText}>👥</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => { await logout(); router.replace('/login'); }}
            style={styles.logoutBtn}
            hitSlop={8}>
            <Text style={styles.logoutText}>↩</Text>
          </TouchableOpacity>
        </View>

        {conversations.length > 0 && (
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
              placeholderTextColor="#aaa"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </SafeAreaView>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#4361EE" size="large" />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Link href={`/chat/${item.user.uid}` as any} asChild>
            <ConvItem
              conv={item}
              user={item.user}
              onPress={() => markRead(item.user.uid)}
            />
          </Link>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>No conversations yet</Text>
              <TouchableOpacity
                style={styles.findBtn}
                onPress={() => router.push('/explore')}
                activeOpacity={0.8}>
                <Text style={styles.findBtnText}>Find People to Chat</Text>
              </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  myAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  myAvatarText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#111' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f5f6',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, color: '#222', padding: 0, margin: 0, outlineWidth: 0 } as any,
  clearIcon: { fontSize: 13, color: '#888' },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#43ee7d',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  itemBody: { flex: 1, gap: 3 },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemName: { fontSize: 16, fontWeight: '700', color: '#111', flex: 1 },
  itemTime: { fontSize: 12, color: '#aaa', flexShrink: 0 },
  itemTimeUnread: { color: '#4361EE', fontWeight: '600' },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemPreview: { flex: 1, fontSize: 14, color: '#888' },
  itemPreviewUnread: { color: '#333', fontWeight: '600' },
  badge: {
    backgroundColor: '#4361EE', borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#f0f0f0', marginLeft: 80 },
  notifBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#e63946', borderRadius: 8,
    minWidth: 16, height: 16, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  logoutBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#fff3f3',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: 18, color: '#e63946' },
  loadingWrap: { position: 'absolute', top: '50%', alignSelf: 'center', zIndex: 10 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#aaa' },
  findBtn: {
    backgroundColor: '#4361EE', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  findBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  exploreBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#eef0ff',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  exploreBtnText: { fontSize: 18 },
});
