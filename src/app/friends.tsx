import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';
import {
  acceptFriendRequest,
  FriendRequest,
  getUserProfile,
  listenToPendingRequests,
  rejectFriendRequest,
} from '@/services/user-service';
import { useConversations } from '@/store/conversations-store';

function getInitials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function RequestCard({ req, onAccept, onReject, loading }: {
  req: FriendRequest;
  onAccept: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: req.fromColor }]}>
        <Text style={styles.avatarText}>{getInitials(req.fromName)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{req.fromName}</Text>
        <Text style={styles.cardUsername}>@{req.fromUsername}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color="#0059f7" size="small" />
      ) : (
        <View style={styles.reqActions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.7}>
            <Text style={styles.acceptBtnText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.7}>
            <Text style={styles.rejectBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function FriendCard({ name, username, color, uid }: {
  name: string; username: string; color: string; uid: string;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{getInitials(name)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{name}</Text>
        <Text style={styles.cardUsername}>@{username}</Text>
      </View>
      <TouchableOpacity
        style={styles.msgBtn}
        onPress={() => router.push(`/chat/${uid}` as any)}
        activeOpacity={0.7}>
        <Text style={styles.msgBtnText}>Message</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FriendsScreen() {
  const { user: firebaseUser } = useAuth();
  const conversations = useConversations();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    return listenToPendingRequests(firebaseUser.uid, setRequests);
  }, [firebaseUser]);

  async function handleAccept(req: FriendRequest) {
    if (!firebaseUser) return;
    setLoadingId(req.id);
    try {
      const myProfile = await getUserProfile(firebaseUser.uid);
      const fromProfile = { uid: req.from, name: req.fromName, username: req.fromUsername, color: req.fromColor, email: '' };
      if (myProfile) await acceptFriendRequest(req.id, req.from, firebaseUser.uid, fromProfile, myProfile);
    } finally { setLoadingId(null); }
  }

  async function handleReject(req: FriendRequest) {
    setLoadingId(req.id);
    try {
      await rejectFriendRequest(req.id);
    } finally { setLoadingId(null); }
  }

  const sections = [
    ...(requests.length > 0 ? [{ title: `Requests (${requests.length})`, data: requests, type: 'requests' as const }] : []),
    ...(conversations.length > 0 ? [{ title: `Friends (${conversations.length})`, data: conversations, type: 'friends' as const }] : []),
  ];

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#0059f7' }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/conversations')}
            hitSlop={8}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Friends</Text>
          <TouchableOpacity
            onPress={() => router.push('/explore')}
            style={styles.addBtn}
            hitSlop={8}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptyHint}>Search for people to add</Text>
          <TouchableOpacity style={styles.findBtn} onPress={() => router.push('/explore')} activeOpacity={0.8}>
            <Text style={styles.findBtnText}>Find People</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections as any}
          keyExtractor={(item: any, i) => (item.id ?? item.user?.uid ?? String(i))}
          renderSectionHeader={({ section }: any) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, section }: any) => {
            if (section.type === 'requests') {
              const req = item as FriendRequest;
              return (
                <RequestCard
                  req={req}
                  loading={loadingId === req.id}
                  onAccept={() => handleAccept(req)}
                  onReject={() => handleReject(req)}
                />
              );
            }
            const conv = item as ReturnType<typeof useConversations>[0];
            return (
              <FriendCard
                name={conv.user.name}
                username={conv.user.username}
                color={conv.user.color}
                uid={conv.user.uid}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      )}
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
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  sectionHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },

  list: { paddingBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111' },
  cardUsername: { fontSize: 13, color: '#888', marginTop: 2 },

  reqActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center',
  },
  acceptBtnText: { fontSize: 16, color: '#2d6a4f', fontWeight: '700' },
  rejectBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff3f3', alignItems: 'center', justifyContent: 'center',
  },
  rejectBtnText: { fontSize: 14, color: '#e63946', fontWeight: '700' },

  msgBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  msgBtnText: { fontSize: 13, fontWeight: '700', color: '#0059f7' },

  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#f0f0f0', marginLeft: 76 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#222' },
  emptyHint: { fontSize: 14, color: '#aaa' },
  findBtn: {
    backgroundColor: '#0059f7', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  findBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
