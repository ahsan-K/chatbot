import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBubble } from '@/components/chat/chat-bubble';
import { ChatFooter } from '@/components/chat/chat-footer';
import { MediaPreview } from '@/components/chat/media-preview';
import { ChatMedia, ChatMessage } from '@/components/chat/types';
import { useAuth } from '@/hooks/use-auth';
import { getConvId, listenToMessages, sendMediaMessage, sendMessage } from '@/services/message-service';
import { uploadMedia } from '@/services/storage-service';
import { getUserProfile } from '@/services/user-service';
import { useCurrentUser } from '@/store/app-store';
import { getConversation, markRead } from '@/store/conversations-store';

function getInitials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function HumanChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useCurrentUser();
  const { user: firebaseUser } = useAuth();
  const conv = getConversation(id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [previewMedia, setPreviewMedia] = useState<ChatMedia | null>(null);
  const listRef = useRef<FlatList>(null);

  // Real-time messages listener
  useEffect(() => {
    if (!firebaseUser) return;
    markRead(id);
    const unsub = listenToMessages(firebaseUser.uid, id, msgs => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return unsub;
  }, [firebaseUser, id]);

  if (!conv || !me || !firebaseUser) return null;

  const other = conv.user;

  async function handleSend(text: string) {
    if (!firebaseUser || !me) return;
    try {
      await sendMessage(
        firebaseUser.uid,
        { name: me.name, username: me.username ?? '', color: me.color },
        other.uid,
        { name: other.name, username: other.username, color: other.color },
        text
      );
    } catch (e) {
      console.error('Send failed:', e);
    }
  }

  async function handleSendMedia(media: ChatMedia) {
    if (!firebaseUser || !me) return;
    try {
      const convId = getConvId(firebaseUser.uid, other.uid);
      const url = await uploadMedia(convId, media);
      await sendMediaMessage(
        firebaseUser.uid,
        { name: me.name, username: me.username ?? '', color: me.color },
        other.uid,
        { name: other.name, username: other.username, color: other.color },
        media,
        url
      );
    } catch (e) {
      console.error('Media send failed:', e);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={[styles.headerAvatar, { backgroundColor: other.color }]}>
            <Text style={styles.headerAvatarText}>{getInitials(other.name)}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{other.name}</Text>
            <Text style={styles.headerUsername}>@{other.username}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <Text style={styles.iconBtnText}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <Text style={styles.iconBtnText}>📹</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              isMine={item.sender === 'me'}
              senderColor={other.color}
              senderInitials={getInitials(other.name)}
              myColor={me.color}
              myInitials={getInitials(me.name)}
              showActions={false}
              onMediaPress={setPreviewMedia}
            />
          )}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={[styles.emptyChatAvatar, { backgroundColor: other.color }]}>
                <Text style={styles.emptyChatAvatarText}>{getInitials(other.name)}</Text>
              </View>
              <Text style={styles.emptyChatName}>{other.name}</Text>
              <Text style={styles.emptyChatHint}>@{other.username} · Say hi! 👋</Text>
            </View>
          }
        />

        <ChatFooter
          onSend={handleSend}
          onSendMedia={handleSendMedia}
          onQuickReply={() => {}}
          showQuickReplies={false}
        />

        <MediaPreview media={previewMedia} onClose={() => setPreviewMedia(null)} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#4361EE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerUsername: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontSize: 18 },
  list: { paddingTop: 16, paddingBottom: 8, flexGrow: 1 },
  emptyChat: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 100, gap: 12,
  },
  emptyChatAvatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyChatAvatarText: { fontSize: 30, fontWeight: '700', color: '#FFFFFF' },
  emptyChatName: { fontSize: 20, fontWeight: '800', color: '#222' },
  emptyChatHint: { fontSize: 14, color: '#aaa' },
});
