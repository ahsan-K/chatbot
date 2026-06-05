import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';
import { uploadProfileImage } from '@/services/storage-service';
import { getUserProfile, updateUserProfile } from '@/services/user-service';
import { setCurrentUser, useCurrentUser } from '@/store/app-store';

function getInitials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function ProfileScreen() {
  const { user: firebaseUser } = useAuth();
  const me = useCurrentUser();

  const [name, setName] = useState(me?.name ?? '');
  const [color, setColor] = useState(me?.color ?? '#4361EE');
  const [photoURL, setPhotoURL] = useState<string | undefined>(me?.photoURL);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    getUserProfile(firebaseUser.uid).then(p => {
      if (!p) return;
      setName(p.name);
      setColor(p.color);
      setPhotoURL(p.photoURL);
      setUsername(p.username);
      setEmail(p.email);
    });
  }, [firebaseUser]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery access allow karo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access allow karo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  }

  async function uploadPhoto(uri: string) {
    if (!firebaseUser) return;
    setUploading(true);
    try {
      const url = await uploadProfileImage(uri, firebaseUser.uid);
      setPhotoURL(url);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message ?? 'Photo upload nahi hui.');
    } finally {
      setUploading(false);
    }
  }

  function showPhotoOptions() {
    if (Platform.OS === 'web') {
      pickPhoto();
      return;
    }
    Alert.alert('Profile Photo', 'Kahan se lena hai?', [
      { text: 'Gallery', onPress: pickPhoto },
      { text: 'Camera', onPress: takePhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSave() {
    if (!firebaseUser || !name.trim()) return;
    setSaving(true);
    try {
      const updates: { name: string; photoURL?: string } = { name: name.trim() };
      if (photoURL) updates.photoURL = photoURL;

      await updateUserProfile(firebaseUser.uid, updates);
      setCurrentUser({
        id: firebaseUser.uid,
        name: updates.name,
        username,
        color,
        photoURL,
      });
      Alert.alert('Saved', 'Profile update ho gaya!');
      router.canGoBack() ? router.back() : router.replace('/conversations');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Save nahi hua.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || uploading}
            style={styles.saveBtn}>
            {saving
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarWrap} onPress={showPhotoOptions} activeOpacity={0.8}>
            {uploading ? (
              <View style={[styles.avatarCircle, { backgroundColor: color, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: color }]}>
                <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Photo change karne ke liye tap karo</Text>

          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#aaa"
              maxLength={30}
            />
          </View>

          {/* Readonly fields */}
          <View style={styles.section}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>@{username}</Text>
              <Text style={styles.readonlyBadge}>Cannot change</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{email}</Text>
              <Text style={styles.readonlyBadge}>Cannot change</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#4361EE',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    minWidth: 60, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  body: { padding: 24, gap: 8, paddingBottom: 48 },

  avatarWrap: { alignSelf: 'center', marginBottom: 8, position: 'relative' },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  avatarImage: {
    width: 100, height: 100, borderRadius: 50,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  avatarInitials: { fontSize: 36, fontWeight: '700', color: '#FFFFFF' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  cameraIcon: { fontSize: 16 },
  avatarHint: { textAlign: 'center', fontSize: 12, color: '#aaa', marginBottom: 8 },

  section: { gap: 8, marginTop: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#222',
    borderWidth: 1.5, borderColor: '#e8ebf0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },

  colorRow: { flexDirection: 'row', gap: 12 },
  colorDot: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 3, borderColor: 'transparent',
  },
  colorSelected: { borderColor: '#222', transform: [{ scale: 1.15 }] },

  readonlyField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#e8ebf0',
  },
  readonlyText: { fontSize: 16, color: '#888' },
  readonlyBadge: {
    fontSize: 11, color: '#aaa',
    backgroundColor: '#f3f5f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
});
