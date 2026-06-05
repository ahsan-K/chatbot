import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ChatMedia, ChatMessage } from './types';

type BubbleProps = {
  message: ChatMessage;
  // Human mode props
  isMine?: boolean;
  senderColor?: string;
  senderInitials?: string;
  myColor?: string;
  myInitials?: string;
  showActions?: boolean;
  onMediaPress?: (media: ChatMedia) => void;
};

const BOT_BG = '#3C096C';
const USER_BG = '#DEE2E6';
const BRAND_PURPLE = '#7B2CBF';

const ACTION_ICONS = [
  { icon: '📋', key: 'copy' },
  { icon: '👍', key: 'like' },
  { icon: '👎', key: 'dislike' },
];

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function AudioPlayer({ uri, isBot }: { uri: string; isBot: boolean }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;
  const duration = status.duration ?? 0;
  const position = status.currentTime ?? 0;
  const progress = duration > 0 ? position / duration : 0;
  const accentColor = isBot ? BRAND_PURPLE : '#0059f7';
  const trackBg = isBot ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';

  function togglePlay() {
    if (isPlaying) {
      player.pause();
    } else {
      if (status.currentTime >= status.duration - 0.1) player.seekTo(0);
      player.play();
    }
  }

  return (
    <View style={audioStyles.container}>
      <TouchableOpacity onPress={togglePlay} style={[audioStyles.playBtn, { backgroundColor: accentColor }]} activeOpacity={0.8}>
        <Text style={audioStyles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <View style={audioStyles.trackWrap}>
        <View style={[audioStyles.track, { backgroundColor: trackBg }]}>
          <View style={[audioStyles.trackFill, { backgroundColor: accentColor, width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={[audioStyles.time, { color: isBot ? 'rgba(255,255,255,0.7)' : '#888' }]}>
          {isPlaying ? formatDuration(position) : formatDuration(duration)}
        </Text>
      </View>
    </View>
  );
}

const audioStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 180 },
  playBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  playIcon: { fontSize: 15, color: '#FFFFFF' },
  trackWrap: { flex: 1, gap: 4 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  trackFill: { height: 3, borderRadius: 2 },
  time: { fontSize: 10, fontWeight: '600' },
});

function AvatarCircle({ color, initials, size = 40 }: { color: string; initials: string; size?: number }) {
  return (
    <View style={[styles.avatarCircle, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

function MediaContent({ media, isBot, onPress }: { media: ChatMedia; isBot: boolean; onPress?: () => void }) {
  const textColor = isBot ? '#FFFFFF' : '#444444';

  if (media.type === 'image') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <Image source={{ uri: media.uri }} style={styles.mediaImage} resizeMode="cover" />
        <View style={styles.imageOverlay}>
          <Text style={styles.imageOverlayIcon}>🔍</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (media.type === 'video') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}
        style={[styles.mediaCard, isBot ? styles.mediaCardBot : styles.mediaCardUser]}>
        <View style={styles.playCircle}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
        <View style={styles.mediaInfo}>
          <Text style={[styles.mediaName, { color: textColor }]} numberOfLines={1}>
            {media.name ?? 'video.mp4'}
          </Text>
          <Text style={[styles.mediaSize, { color: isBot ? 'rgba(255,255,255,0.6)' : '#888' }]}>
            Tap to play · {formatSize(media.size)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (media.type === 'audio') {
    return <AudioPlayer uri={media.uri} isBot={isBot} />;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[styles.mediaCard, isBot ? styles.mediaCardBot : styles.mediaCardUser]}>
      <View style={[styles.docCircle, { backgroundColor: isBot ? BRAND_PURPLE : '#0059f7' }]}>
        <Text style={styles.playIcon}>📄</Text>
      </View>
      <View style={styles.mediaInfo}>
        <Text style={[styles.mediaName, { color: textColor }]} numberOfLines={1}>
          {media.name ?? 'document'}
        </Text>
        <Text style={[styles.mediaSize, { color: isBot ? 'rgba(255,255,255,0.6)' : '#888' }]}>
          Tap to open · {formatSize(media.size)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Left-side bubble (received: bot or other user)
function LeftBubble({ message, avatarColor, avatarInitials, showActions, onMediaPress }: {
  message: ChatMessage;
  avatarColor: string;
  avatarInitials: string;
  showActions: boolean;
  onMediaPress?: (media: ChatMedia) => void;
}) {
  const hasMedia = !!message.media;
  const hasText = !!message.text;

  return (
    <View style={styles.leftRow}>
      <View style={[styles.leftAvatarWrap]}>
        <AvatarCircle color={avatarColor} initials={avatarInitials} size={40} />
      </View>

      <View style={styles.leftCol}>
        <View style={styles.leftBubbleWrap}>
          <View style={[styles.leftBubble, hasMedia && !hasText && styles.bubbleMedia]}>
            {hasMedia && (
              <MediaContent media={message.media!} isBot onPress={() => onMediaPress?.(message.media!)} />
            )}
            {hasText && (
              <Text style={[styles.leftText, hasMedia && { marginTop: 8 }]}>{message.text}</Text>
            )}
          </View>
          <View style={styles.leftTail} />
        </View>

        <View style={styles.leftMeta}>
          <Text style={styles.timestamp}>{message.timestamp}</Text>
          {showActions && (
            <View style={styles.actionBar}>
              {ACTION_ICONS.map(({ icon, key }) => (
                <TouchableOpacity key={key} hitSlop={4}>
                  <Text style={styles.actionIcon}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// Right-side bubble (sent: me / user)
function RightBubble({ message, avatarColor, avatarInitials, onMediaPress }: {
  message: ChatMessage;
  avatarColor: string;
  avatarInitials: string;
  onMediaPress?: (media: ChatMedia) => void;
}) {
  const isRead = message.status === 'read';
  const hasMedia = !!message.media;
  const hasText = !!message.text;

  return (
    <View style={styles.rightRow}>
      <View style={styles.rightCol}>
        <View style={styles.rightBubbleWrap}>
          <View style={[styles.rightBubble, hasMedia && !hasText && styles.bubbleMedia]}>
            {hasMedia && (
              <MediaContent media={message.media!} isBot={false} onPress={() => onMediaPress?.(message.media!)} />
            )}
            {hasText && (
              <Text style={[styles.rightText, hasMedia && { marginTop: 8 }]}>{message.text}</Text>
            )}
          </View>
          <View style={styles.rightTail} />
        </View>

        <View style={styles.rightMeta}>
          <Text style={styles.timestamp}>{message.timestamp}</Text>
          <Text style={[styles.receipt, isRead && styles.receiptRead]}>
            ✓✓
          </Text>
        </View>
      </View>

      <View style={styles.rightAvatarWrap}>
        <AvatarCircle color={avatarColor} initials={avatarInitials} size={40} />
      </View>
    </View>
  );
}

export function ChatBubble({
  message,
  isMine,
  senderColor,
  senderInitials,
  myColor,
  myInitials,
  showActions,
  onMediaPress,
}: BubbleProps) {
  // Determine layout: isMine prop (human mode) OR legacy sender field (bot mode)
  const mine = isMine !== undefined ? isMine : message.sender === 'user';
  const actions = showActions !== undefined ? showActions : message.sender === 'bot';

  const leftColor = senderColor ?? BOT_BG;
  const leftInitials = senderInitials ?? '🤖';
  const rightColor = myColor ?? '#c0c7d0';
  const rightInitials = myInitials ?? '👤';

  return mine ? (
    <RightBubble
      message={message}
      avatarColor={rightColor}
      avatarInitials={rightInitials}
      onMediaPress={onMediaPress}
    />
  ) : (
    <LeftBubble
      message={message}
      avatarColor={leftColor}
      avatarInitials={leftInitials}
      showActions={actions}
      onMediaPress={onMediaPress}
    />
  );
}

const styles = StyleSheet.create({
  avatarCircle: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontWeight: '700', color: '#FFFFFF' },

  // Left (received)
  leftRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    marginBottom: 20, paddingHorizontal: 16,
  },
  leftAvatarWrap: { marginBottom: 20 },
  leftCol: { flex: 1, gap: 5 },
  leftBubbleWrap: { position: 'relative', alignSelf: 'flex-start', maxWidth: '90%' },
  leftBubble: {
    backgroundColor: BOT_BG,
    borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomRightRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 2,
    elevation: 2,
  },
  leftTail: {
    position: 'absolute', bottom: -7, left: -6,
    width: 0, height: 0,
    borderTopWidth: 10, borderRightWidth: 10, borderBottomWidth: 0, borderLeftWidth: 0,
    borderTopColor: BOT_BG, borderRightColor: 'transparent',
    borderBottomColor: 'transparent', borderLeftColor: 'transparent',
  },
  leftText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
  leftMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 2 },

  actionBar: {
    flexDirection: 'row', gap: 8,
    backgroundColor: BRAND_PURPLE, padding: 5, borderRadius: 8,
  },
  actionIcon: { fontSize: 13 },

  // Right (sent)
  rightRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 8,
    marginBottom: 20, paddingHorizontal: 12,
  },
  rightCol: { maxWidth: '75%', gap: 5, alignItems: 'flex-end' },
  rightBubbleWrap: { position: 'relative', alignSelf: 'flex-end' },
  rightBubble: {
    backgroundColor: USER_BG,
    borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 1,
    elevation: 2,
  },
  rightTail: {
    position: 'absolute', bottom: -7, right: -6,
    width: 0, height: 0,
    borderTopWidth: 10, borderLeftWidth: 10, borderBottomWidth: 0, borderRightWidth: 0,
    borderTopColor: USER_BG, borderLeftColor: 'transparent',
    borderBottomColor: 'transparent', borderRightColor: 'transparent',
  },
  rightText: { color: '#444444', fontSize: 15, lineHeight: 22 },
  rightMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 4 },
  rightAvatarWrap: { marginBottom: 20 },

  // Shared
  timestamp: { fontSize: 10, color: '#888888' },
  receipt: { fontSize: 10, color: '#888888', fontWeight: '600' },
  receiptRead: { color: '#0059f7' },

  // Media
  imageOverlay: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  imageOverlayIcon: { fontSize: 13 },
  bubbleMedia: { padding: 6 },
  mediaImage: { width: 220, height: 180, borderRadius: 10 },
  mediaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, width: 240,
  },
  mediaCardBot: { backgroundColor: 'rgba(255,255,255,0.12)' },
  mediaCardUser: { backgroundColor: 'rgba(0,0,0,0.06)' },
  playCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0059f7', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  audioCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  docCircle: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  playIcon: { fontSize: 18 },
  mediaInfo: { flex: 1, gap: 4 },
  mediaName: { fontSize: 13, fontWeight: '600' },
  mediaSize: { fontSize: 11 },
  audioBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  audioProgress: { height: 3, width: '35%', borderRadius: 2 },
});
