import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { setCurrentUser } from '@/store/app-store';

const COLORS = ['#4361EE', '#7B2CBF', '#e63946', '#2d6a4f', '#f4a261', '#3a86ff'];

function initials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function SetupScreen() {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const ready = name.trim().length > 0;

  function start() {
    if (!ready) return;
    setCurrentUser({ id: 'me', name: name.trim(), color });
    router.replace('/conversations');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>💬</Text>
        <Text style={styles.heroTitle}>ChatApp</Text>
        <Text style={styles.heroSub}>Fast · Simple · Free</Text>
      </View>

      {/* Form card */}
      <View style={styles.card}>
        {/* Avatar preview */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarCircle, { backgroundColor: color }]}>
            <Text style={styles.avatarInitials}>{initials(name)}</Text>
          </View>
          <Text style={styles.avatarHint}>Your avatar preview</Text>
        </View>

        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name..."
          placeholderTextColor="#aaa"
          maxLength={30}
          returnKeyType="done"
          onSubmitEditing={start}
          autoFocus={Platform.OS !== 'web'}
        />

        <Text style={styles.label}>Pick a color</Text>
        <View style={styles.colorRow}>
          {COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              activeOpacity={0.8}
              style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorSelected]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, !ready && styles.btnOff]}
          onPress={start}
          disabled={!ready}
          activeOpacity={0.85}>
          <Text style={styles.btnText}>Let's Chat  →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#4361EE',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 32,
  },
  heroEmoji: { fontSize: 64 },
  heroTitle: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },

  avatarWrap: { alignItems: 'center', gap: 8, marginBottom: 8 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  avatarHint: { fontSize: 12, color: '#aaa' },

  label: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },

  input: {
    backgroundColor: '#f3f5f6',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 17,
    color: '#222',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },

  colorRow: { flexDirection: 'row', gap: 12, marginVertical: 4 },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#222',
    transform: [{ scale: 1.15 }],
  },

  btn: {
    backgroundColor: '#4361EE',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4361EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnOff: { backgroundColor: '#c0c7d0', shadowOpacity: 0 },
  btnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
