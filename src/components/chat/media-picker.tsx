import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ChatMedia } from './types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onMediaSelected: (media: ChatMedia) => void;
};

const OPTIONS: Array<{ type: 'image' | 'video' | 'audio' | 'document' | 'selfie' | 'record'; emoji: string; label: string; color: string }> = [
  { type: 'image', emoji: '🖼️', label: 'Image', color: '#4F46E5' },
  { type: 'video', emoji: '🎬', label: 'Video', color: '#7B2CBF' },
  { type: 'audio', emoji: '🎵', label: 'Audio', color: '#3C096C' },
  { type: 'document', emoji: '📄', label: 'Document', color: '#2d6a4f' },
  { type: 'selfie', emoji: '🤳', label: 'Selfie', color: '#e63946' },
  { type: 'record', emoji: '🎥', label: 'Record', color: '#f4a261' },
];

export function MediaPicker({ visible, onClose, onMediaSelected }: Props) {
  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onMediaSelected({
        type: 'image',
        uri: asset.uri,
        name: asset.fileName ?? 'image.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    }
    onClose();
  }

  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos',
      videoMaxDuration: 300,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onMediaSelected({
        type: 'video',
        uri: asset.uri,
        name: asset.fileName ?? 'video.mp4',
        mimeType: asset.mimeType ?? 'video/mp4',
      });
    }
    onClose();
  }

  async function pickAudio() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onMediaSelected({
        type: 'audio',
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'audio/mpeg',
        size: asset.size,
      });
    }
    onClose();
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onMediaSelected({
        type: 'document',
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size,
      });
    }
    onClose();
  }

  async function takeSelfie() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      cameraType: ImagePicker.CameraType.front,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onMediaSelected({ type: 'image', uri: asset.uri, name: asset.fileName ?? 'selfie.jpg', mimeType: asset.mimeType ?? 'image/jpeg' });
    }
    onClose();
  }

  async function recordVideo() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'videos',
      videoMaxDuration: 120,
      cameraType: ImagePicker.CameraType.back,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onMediaSelected({ type: 'video', uri: asset.uri, name: asset.fileName ?? 'video.mp4', mimeType: asset.mimeType ?? 'video/mp4' });
    }
    onClose();
  }

  function handleOption(type: 'image' | 'video' | 'audio' | 'document' | 'selfie' | 'record') {
    switch (type) {
      case 'image': return pickImage();
      case 'video': return pickVideo();
      case 'audio': return pickAudio();
      case 'document': return pickDocument();
      case 'selfie': return takeSelfie();
      case 'record': return recordVideo();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Send Media</Text>
          <View style={styles.grid}>
            {OPTIONS.map(({ type, emoji, label, color }) => (
              <TouchableOpacity
                key={type}
                style={styles.option}
                onPress={() => handleOption(type)}
                activeOpacity={0.7}>
                <View style={[styles.iconBg, { backgroundColor: color }]}>
                  <Text style={styles.emoji}>{emoji}</Text>
                </View>
                <Text style={styles.label}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#dee2e6',
    alignSelf: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  option: {
    width: '30%',
    alignItems: 'center',
    gap: 8,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  cancelBtn: {
    backgroundColor: '#f3f5f6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
  },
});
