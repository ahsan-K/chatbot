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
import { changePassword, parseAuthError } from '@/services/auth-service';
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
  const [color] = useState(me?.color ?? '#0059f7');
  const [photoURL, setPhotoURL] = useState<string | undefined>(me?.photoURL);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPassSection, setShowPassSection] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    getUserProfile(firebaseUser.uid).then(p => {
      if (!p) return;
      setName(p.name);
      setPhotoURL(p.photoURL);
      setUsername(p.username);
      setEmail(p.email);
    });
  }, [firebaseUser]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Gallery access allow karo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) await uploadPhoto(result.assets[0].uri);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access allow karo.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets[0]) await uploadPhoto(result.assets[0].uri);
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
    if (Platform.OS === 'web') { pickPhoto(); return; }
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
      setCurrentUser({ id: firebaseUser.uid, name: updates.name, username, color, photoURL });
      Alert.alert('Saved', 'Profile update ho gaya!');
      router.canGoBack() ? router.back() : router.replace('/conversations');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Save nahi hua.');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!newPass || !currentPass) { Alert.alert('Error', 'Sab fields bharein.'); return; }
    if (newPass.length < 6) { Alert.alert('Error', 'Password kam az kam 6 characters ka hona chahiye.'); return; }
    if (newPass !== confirmPass) { Alert.alert('Error', 'Passwords match nahi karte.'); return; }
    setChangingPass(true);
    try {
      await changePassword(currentPass, newPass);
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      setShowPassSection(false);
      Alert.alert('Done', 'Password change ho gaya!');
    } catch (e: any) {
      Alert.alert('Error', parseAuthError(e?.code) ?? e?.message ?? 'Password change nahi hua.');
    } finally {
      setChangingPass(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.circle, styles.circleTop]} />
          <View style={[styles.circle, styles.circleBottom]} />
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/conversations')}
            style={styles.backBtn} hitSlop={8}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={showPhotoOptions} activeOpacity={0.85} style={styles.avatarWrap}>
            {uploading ? (
              <View style={[styles.avatarCircle, { backgroundColor: color }]}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: color }]}>
                <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
              </View>
            )}
            <View style={styles.cameraBtn}><Text style={styles.cameraIcon}>📷</Text></View>
          </TouchableOpacity>
          <Text style={styles.heroName}>{name || 'Your Name'}</Text>
          <Text style={styles.heroUsername}>@{username}</Text>
        </View>

        {/* Form */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Edit Profile</Text>

            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#aaa"
                maxLength={30}
              />
            </View>

            <View style={[styles.inputWrap, styles.readonlyWrap]}>
              <Text style={styles.inputIcon}>@</Text>
              <Text style={styles.readonlyText}>{username}</Text>
              <Text style={styles.readonlyBadge}>Fixed</Text>
            </View>

            <View style={[styles.inputWrap, styles.readonlyWrap]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <Text style={styles.readonlyText}>{email}</Text>
              <Text style={styles.readonlyBadge}>Fixed</Text>
            </View>

            <TouchableOpacity
              style={[styles.btn, (saving || uploading) && styles.btnOff]}
              onPress={handleSave}
              disabled={saving || uploading}
              activeOpacity={0.85}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Save Changes</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changePassBtn}
              onPress={() => setShowPassSection(v => !v)}
              activeOpacity={0.7}>
              <Text style={styles.changePassText}>🔒 Change Password</Text>
              <Text style={styles.chevron}>{showPassSection ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showPassSection && (
              <View style={styles.passSection}>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>🔑</Text>
                  <TextInput
                    style={styles.input}
                    value={currentPass}
                    onChangeText={setCurrentPass}
                    placeholder="Current password"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                  />
                </View>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    value={newPass}
                    onChangeText={setNewPass}
                    placeholder="New password (min 6 chars)"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                  />
                </View>
                <View style={[
                  styles.inputWrap,
                  confirmPass.length > 0 && newPass !== confirmPass && styles.inputError,
                ]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPass}
                    onChangeText={setConfirmPass}
                    placeholder="Confirm new password"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                  />
                  {confirmPass.length > 0 && (
                    <Text style={{ fontSize: 15 }}>{newPass === confirmPass ? '✅' : '❌'}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.btn, changingPass && styles.btnOff]}
                  onPress={handleChangePassword}
                  disabled={changingPass}
                  activeOpacity={0.85}>
                  {changingPass
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Update Password</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0059f7' },

  hero: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 16, paddingBottom: 24,
    gap: 4, overflow: 'hidden', position: 'relative',
  },
  backBtn: { position: 'absolute', top: 12, left: 16 },
  backIcon: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  circle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  circleTop: { width: 300, height: 300, top: -100, right: -80 },
  circleBottom: { width: 250, height: 250, bottom: -80, left: -60 },

  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarImage: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarInitials: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  cameraIcon: { fontSize: 14 },
  heroName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroUsername: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  scroll: {
    backgroundColor: '#EEF2FF',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: 48,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    width: '100%', maxWidth: 480,
    shadowColor: '#0059f7', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 24, elevation: 8, gap: 12,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#111', letterSpacing: -0.5 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f6fa', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    gap: 10, borderWidth: 1.5, borderColor: '#eee',
  },
  inputError: { borderColor: '#e63946' },
  readonlyWrap: { opacity: 0.6 },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 15, color: '#222', padding: 0, margin: 0, outlineWidth: 0 } as any,
  readonlyText: { flex: 1, fontSize: 15, color: '#888' },
  readonlyBadge: {
    fontSize: 11, color: '#aaa',
    backgroundColor: '#ebebeb', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },

  btn: {
    backgroundColor: '#0059f7', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
    shadowColor: '#0059f7', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  btnOff: { backgroundColor: '#c0c7d0', shadowOpacity: 0 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  changePassBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  changePassText: { fontSize: 14, fontWeight: '600', color: '#0059f7' },
  chevron: { fontSize: 11, color: '#aaa' },
  passSection: { gap: 10 },
});
