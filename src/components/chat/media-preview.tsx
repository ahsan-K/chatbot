import { useAudioPlayer } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ChatMedia } from './types';

type Props = {
  media: ChatMedia | null;
  onClose: () => void;
};

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={styles.videoView}
      contentFit="contain"
    />
  );
}

function AudioPreview({ uri, name, size }: { uri: string; name?: string; size?: number }) {
  const player = useAudioPlayer(uri);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const dur = player.duration ?? 1;
      const cur = player.currentTime ?? 0;
      setPos(dur > 0 ? cur / dur : 0);
    }, 500);
    return () => clearInterval(interval);
  }, [playing, player]);

  function toggle() {
    if (playing) {
      player.pause();
    } else {
      player.play();
    }
    setPlaying((p) => !p);
  }

  return (
    <View style={styles.audioCard}>
      <Text style={styles.bigEmoji}>🎵</Text>
      <Text style={styles.fileName} numberOfLines={2}>{name}</Text>
      <Text style={styles.fileSize}>{formatSize(size)}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(pos * 100)}%` as any }]} />
      </View>

      <TouchableOpacity style={styles.playBtn} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.playBtnText}>{playing ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function DocumentPreview({ name, uri, size }: { name?: string; uri: string; size?: number }) {
  return (
    <View style={styles.audioCard}>
      <Text style={styles.bigEmoji}>📄</Text>
      <Text style={styles.fileName} numberOfLines={2}>{name}</Text>
      <Text style={styles.fileSize}>{formatSize(size)}</Text>
      <TouchableOpacity style={styles.openBtn} onPress={() => Linking.openURL(uri)}>
        <Text style={styles.openBtnText}>Open File</Text>
      </TouchableOpacity>
    </View>
  );
}

export function MediaPreview({ media, onClose }: Props) {
  return (
    <Modal visible={!!media} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {media?.type === 'image' && (
          <ScrollView
            style={styles.imageScroll}
            contentContainerStyle={styles.imageScrollContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            centerContent>
            <Image source={{ uri: media.uri }} style={styles.fullImage} resizeMode="contain" />
          </ScrollView>
        )}

        {media?.type === 'video' && (
          <View style={styles.videoContainer}>
            <VideoPreview uri={media.uri} />
          </View>
        )}

        {media?.type === 'audio' && (
          <AudioPreview uri={media.uri} name={media.name} size={media.size} />
        )}

        {media?.type === 'document' && (
          <DocumentPreview uri={media.uri} name={media.name} size={media.size} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  imageScroll: { flex: 1, width: '100%' },
  imageScrollContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  videoContainer: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  videoView: { width: '100%', height: 300, borderRadius: 12 },
  audioCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  bigEmoji: { fontSize: 56, marginBottom: 8 },
  fileName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  fileSize: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#4361EE',
    borderRadius: 2,
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4361EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  playBtnText: { fontSize: 24, color: '#FFFFFF' },
  openBtn: {
    backgroundColor: '#4361EE',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  openBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
