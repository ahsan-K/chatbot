import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { parseAuthError, signUp } from '@/services/auth-service';
import { createUserProfile, isUsernameAvailable } from '@/services/user-service';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function getUsernameHint(status: UsernameStatus, username: string): { text: string; color: string } | null {
  if (!username) return null;
  switch (status) {
    case 'checking': return { text: '⏳ Checking...', color: '#888' };
    case 'available': return { text: '✅ Available!', color: '#2d6a4f' };
    case 'taken': return { text: '❌ Already taken', color: '#e63946' };
    case 'invalid': return { text: '⚠ 3–20 chars, letters/numbers/underscore only', color: '#f4a261' };
    default: return null;
  }
}

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounced username availability check
  useEffect(() => {
    if (!username) { setUsernameStatus('idle'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase())) {
      setUsernameStatus('invalid'); return;
    }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const available = await isUsernameAvailable(username.toLowerCase());
      setUsernameStatus(available ? 'available' : 'taken');
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const canSubmit =
    name.trim().length >= 2 &&
    usernameStatus === 'available' &&
    email.includes('@') &&
    password.length >= 6 &&
    password === confirmPassword;

  async function handleSignUp() {
    if (!canSubmit || loading) return;
    setError('');
    setLoading(true);
    try {
      const user = await signUp(name.trim(), email.trim(), password);
      await createUserProfile(user.uid, {
        name: name.trim(),
        username: username.toLowerCase(),
        email: email.trim(),
      });
      router.replace('/conversations');
    } catch (e: any) {
      const code = e.message === 'auth/username-taken' ? 'auth/username-taken' : e.code;
      const msgMap: Record<string, string> = {
        'auth/username-taken': 'Username was just taken. Try another.',
      };
      setError(msgMap[code] ?? parseAuthError(code));
    } finally {
      setLoading(false);
    }
  }

  const hint = getUsernameHint(usernameStatus, username);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🚀</Text>
          <Text style={styles.heroTitle}>Create Account</Text>
          <Text style={styles.heroSub}>Join the conversation</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.card}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Full name */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={t => { setName(t); setError(''); }}
              placeholder="Full name"
              placeholderTextColor="#aaa"
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Username */}
          <View>
            <View style={[
              styles.inputWrap,
              usernameStatus === 'taken' && styles.inputError,
              usernameStatus === 'available' && styles.inputSuccess,
            ]}>
              <Text style={styles.inputIcon}>@</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={t => { setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, '')); setError(''); }}
                placeholder="username (e.g. ahsan_ali)"
                placeholderTextColor="#aaa"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              {usernameStatus === 'checking' && <ActivityIndicator size="small" color="#888" />}
            </View>
            {hint && <Text style={[styles.hintText, { color: hint.color }]}>{hint.text}</Text>}
          </View>

          {/* Email */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              placeholder="Email address"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              placeholder="Password (min. 6 chars)"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPassword}
              returnKeyType="next"
            />
            <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={8}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Confirm password */}
          <View style={[
            styles.inputWrap,
            confirmPassword.length > 0 && password !== confirmPassword && styles.inputError,
          ]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); setError(''); }}
              placeholder="Confirm password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
            {confirmPassword.length > 0 && (
              <Text style={{ fontSize: 16 }}>
                {password === confirmPassword ? '✅' : '❌'}
              </Text>
            )}
          </View>

          {error ? <Text style={styles.errorText}>⚠ {error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, (!canSubmit || loading) && styles.btnOff]}
            onPress={handleSignUp}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.switchLink}>Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#4361EE' },
  safe: { flex: 1 },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  heroEmoji: { fontSize: 44 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  scroll: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  card: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f5f6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: { borderColor: '#e63946' },
  inputSuccess: { borderColor: '#2d6a4f' },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 16, color: '#222', padding: 0, margin: 0 },
  eyeIcon: { fontSize: 18 },
  hintText: { fontSize: 12, marginTop: -4, marginLeft: 4, fontWeight: '500' },
  errorText: { fontSize: 13, color: '#e63946', fontWeight: '600', textAlign: 'center' },
  btn: {
    backgroundColor: '#4361EE',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#4361EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnOff: { backgroundColor: '#c0c7d0', shadowOpacity: 0 },
  btnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  switchText: { fontSize: 14, color: '#666' },
  switchLink: { fontSize: 14, color: '#4361EE', fontWeight: '700' },
});
