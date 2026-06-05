import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

// Native HTML5 elements via React.createElement (works in RN Web context)
const HtmlVideo = ({ uri }: { uri: string }) =>
  React.createElement('video', {
    src: uri,
    controls: true,
    autoPlay: true,
    playsInline: true,
    style: {
      width: '100%',
      maxHeight: '65vh',
      borderRadius: 12,
      backgroundColor: '#000',
      outline: 'none',
    },
  });

const HtmlAudio = ({ uri }: { uri: string }) =>
  React.createElement('audio', {
    src: uri,
    controls: true,
    autoPlay: true,
    style: { width: '100%', marginTop: 16 },
  });

const HtmlAnchor = ({ href, name }: { href: string; name?: string }) =>
  React.createElement(
    'a',
    { href, download: name ?? true, target: '_blank', style: { textDecoration: 'none' } },
    React.createElement(
      'div',
      {
        style: {
          backgroundColor: '#0059f7',
          color: '#fff',
          fontWeight: '700',
          fontSize: 15,
          padding: '14px 28px',
          borderRadius: 14,
          marginTop: 20,
          cursor: 'pointer',
          display: 'inline-block',
        },
      },
      '⬇  Download'
    )
  );

export function MediaPreview({ media, onClose }: Props) {
  return (
    <Modal visible={!!media} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          {media?.type === 'image' && (
            <Image source={{ uri: media.uri }} style={styles.fullImage} resizeMode="contain" />
          )}

          {media?.type === 'video' && <HtmlVideo uri={media.uri} />}

          {media?.type === 'audio' && (
            <View style={styles.audioCard}>
              <Text style={styles.bigEmoji}>🎵</Text>
              <Text style={styles.fileName} numberOfLines={2}>{media.name}</Text>
              <Text style={styles.fileSize}>{formatSize(media.size)}</Text>
              <HtmlAudio uri={media.uri} />
            </View>
          )}

          {media?.type === 'document' && (
            <View style={styles.audioCard}>
              <Text style={styles.bigEmoji}>📄</Text>
              <Text style={styles.fileName} numberOfLines={2}>{media.name}</Text>
              <Text style={styles.fileSize}>{formatSize(media.size)}</Text>
              <HtmlAnchor href={media.uri} name={media.name} />
            </View>
          )}
        </View>
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
  closeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    maxWidth: 680,
    borderRadius: 12,
  },
  audioCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    gap: 8,
  },
  bigEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  fileSize: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
});
