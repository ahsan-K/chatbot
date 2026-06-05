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

const isWeb = Platform.OS === 'web';
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function getUsernameHint(status: UsernameStatus, username: string) {
  if (!username) return null;
  switch (status) {
    case 'checking': return { text: '⏳ Checking...', color: '#888' };
    case 'available': return { text: '✅ Available!', color: '#2d6a4f' };
    case 'taken': return { text: '❌ Already taken', color: '#e63946' };
    case 'invalid': return { text: '⚠ 3–20 chars, letters/numbers/underscore only', color: '#f4a261' };
    default: return null;
  }
}

function LeftPanel() {
  return (
    <View style={styles.leftPanel}>
      <View style={[styles.circle, styles.circleTop]} />
      <View style={[styles.circle, styles.circleBottom]} />
      <View style={[styles.circle, styles.circleSmall]} />
      <View style={styles.leftContent}>
        <Text style={styles.leftEmoji}>🚀</Text>
        <Text style={styles.leftTitle}>Join ChatApp</Text>
        <Text style={styles.leftSub}>Create your account and{'\n'}start chatting today.</Text>
        <View style={styles.featureList}>
          {['✅  Real-time messaging', '📎  Share media files', '🔒  Secure & private', '👥  Find & connect with anyone'].map(f => (
            <Text key={f} style={styles.featureItem}>{f}</Text>
          ))}
        </View>
      </View>
    </View>
  );
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

  useEffect(() => {
    if (!username) { setUsernameStatus('idle'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase())) { setUsernameStatus('invalid'); return; }
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
      const extra: Record<string, string> = { 'auth/username-taken': 'Username was just taken. Try another.' };
      setError(extra[code] ?? parseAuthError(code));
    } finally {
      setLoading(false);
    }
  }

  const hint = getUsernameHint(usernameStatus, username);

  const FormCard = (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Create Account</Text>
      <Text style={styles.formSub}>Join the conversation</Text>

      {/* Name */}
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
            placeholder="username"
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
          <Text style={{ fontSize: 15 }}>{password === confirmPassword ? '✅' : '❌'}</Text>
        )}
      </View>

      {error ? <Text style={styles.errorText}>⚠ {error}</Text> : null}

      <TouchableOpacity
        style={[styles.btn, (!canSubmit || loading) && styles.btnOff]}
        onPress={handleSignUp}
        disabled={!canSubmit || loading}
        activeOpacity={0.85}>
        {loading
          ? <ActivityIndicator color="#fff" />
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
    </View>
  );

  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        <LeftPanel />
        <View style={styles.rightPanel}>
          <ScrollView
            contentContainerStyle={styles.rightScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {FormCard}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.mobileContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.mobileHero}>
          <View style={[styles.circle, styles.circleTop]} />
          <View style={[styles.circle, styles.circleBottom]} />
          <Text style={styles.leftEmoji}>🚀</Text>
          <Text style={styles.leftTitle}>Join ChatApp</Text>
          <Text style={[styles.leftSub, { fontSize: 13 }]}>Create your account today</Text>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.mobileScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {FormCard}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  webContainer: { flex: 1, flexDirection: 'row' },
  leftPanel: {
    width: '50%',
    backgroundColor: '#4361EE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  rightPanel: { width: '50%', backgroundColor: '#f0f2ff' },
  rightScroll: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  mobileContainer: { flex: 1, backgroundColor: '#4361EE' },
  mobileHero: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  mobileScroll: {
    backgroundColor: '#f0f2ff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 48,
  },

  circle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  circleTop: { width: 300, height: 300, top: -100, right: -80 },
  circleBottom: { width: 250, height: 250, bottom: -80, left: -60 },
  circleSmall: { width: 120, height: 120, top: '40%', left: '60%', backgroundColor: 'rgba(255,255,255,0.05)' },

  leftContent: { alignItems: 'center', gap: 10, zIndex: 1, paddingHorizontal: 40 },
  leftEmoji: { fontSize: 56 },
  leftTitle: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  leftSub: { fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 22 },
  featureList: { marginTop: 16, gap: 10, alignSelf: 'stretch' },
  featureItem: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#4361EE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    gap: 12,
  },
  formTitle: { fontSize: 24, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  formSub: { fontSize: 14, color: '#888', marginTop: -6 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#eee',
  },
  inputError: { borderColor: '#e63946' },
  inputSuccess: { borderColor: '#2d6a4f' },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 15, color: '#222', padding: 0, margin: 0, outlineWidth: 0 } as any,
  eyeIcon: { fontSize: 18 },
  hintText: { fontSize: 11, marginTop: 2, marginLeft: 4, fontWeight: '500' },

  errorText: { fontSize: 13, color: '#e63946', fontWeight: '600', textAlign: 'center' },

  btn: {
    backgroundColor: '#4361EE',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#4361EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnOff: { backgroundColor: '#c0c7d0', shadowOpacity: 0 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  switchText: { fontSize: 14, color: '#666' },
  switchLink: { fontSize: 14, color: '#4361EE', fontWeight: '700' },
});
