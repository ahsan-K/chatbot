import { Link, router } from 'expo-router';
import { useState } from 'react';
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

import { login, parseAuthError, resetPassword } from '@/services/auth-service';

const isWeb = Platform.OS === 'web';

function LeftPanel() {
  return (
    <View style={styles.leftPanel}>
      {/* Decorative circles */}
      <View style={[styles.circle, styles.circleTop]} />
      <View style={[styles.circle, styles.circleBottom]} />
      <View style={[styles.circle, styles.circleSmall]} />

      <View style={styles.leftContent}>
        <Text style={styles.leftEmoji}>💬</Text>
        <Text style={styles.leftTitle}>ChatApp</Text>
        <Text style={styles.leftSub}>Connect with anyone,{'\n'}anywhere, instantly.</Text>

        {/* Fake chat bubbles */}
        <View style={styles.bubblesWrap}>
          <View style={styles.bubbleRow}>
            <View style={styles.bubbleAvatar}>
              <Text style={{ fontSize: 14 }}>👩</Text>
            </View>
            <View style={[styles.chatBubble, styles.chatBubbleLeft]}>
              <Text style={styles.chatBubbleText}>Hey! How are you? 👋</Text>
            </View>
          </View>
          <View style={[styles.bubbleRow, { justifyContent: 'flex-end' }]}>
            <View style={[styles.chatBubble, styles.chatBubbleRight]}>
              <Text style={[styles.chatBubbleText, { color: '#fff' }]}>
                I'm great! Let's chat 😊
              </Text>
            </View>
            <View style={styles.bubbleAvatar}>
              <Text style={{ fontSize: 14 }}>👨</Text>
            </View>
          </View>
          <View style={styles.bubbleRow}>
            <View style={styles.bubbleAvatar}>
              <Text style={{ fontSize: 14 }}>👩</Text>
            </View>
            <View style={[styles.chatBubble, styles.chatBubbleLeft]}>
              <Text style={styles.chatBubbleText}>Sent a photo 📸</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length >= 6;

  async function handleLogin() {
    if (!canSubmit || loading) return;
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/conversations');
    } catch (e: any) {
      setError(parseAuthError(e.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError('Enter your email above first'); return; }
    try {
      await resetPassword(email.trim());
      setResetSent(true);
      setError('');
    } catch (e: any) {
      setError(parseAuthError(e.code));
    }
  }

  const FormCard = (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Welcome Back!</Text>
      <Text style={styles.formSub}>Sign in to continue</Text>

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
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry={!showPassword}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={8}>
          <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotRow}>
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      {resetSent && <Text style={styles.successText}>✅ Reset link sent!</Text>}
      {error ? <Text style={styles.errorText}>⚠ {error}</Text> : null}

      <TouchableOpacity
        style={[styles.btn, (!canSubmit || loading) && styles.btnOff]}
        onPress={handleLogin}
        disabled={!canSubmit || loading}
        activeOpacity={0.85}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Login</Text>}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Don't have an account? </Text>
        <Link href="/signup" asChild>
          <TouchableOpacity>
            <Text style={styles.switchLink}>Sign Up</Text>
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
      behavior="padding">
      <SafeAreaView style={{ flex: 1 }}>
        {/* Mobile hero */}
        <View style={styles.mobileHero}>
          <View style={[styles.circle, styles.circleTop]} />
          <View style={[styles.circle, styles.circleBottom]} />
          <Text style={styles.leftEmoji}>💬</Text>
          <Text style={styles.leftTitle}>ChatApp</Text>
          <Text style={[styles.leftSub, { fontSize: 13 }]}>Connect with anyone, anywhere</Text>
        </View>
        <ScrollView
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
  // Web layout
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

  // Mobile layout
  mobileContainer: { flex: 1, backgroundColor: '#4361EE' },
  mobileHero: {
    height: 200,
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
    minHeight: '100%',
  },

  // Decorative circles
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circleTop: { width: 300, height: 300, top: -100, right: -80 },
  circleBottom: { width: 250, height: 250, bottom: -80, left: -60 },
  circleSmall: { width: 120, height: 120, top: '40%', left: '60%', backgroundColor: 'rgba(255,255,255,0.05)' },

  // Left panel content
  leftContent: { alignItems: 'center', gap: 12, zIndex: 1, paddingHorizontal: 32 },
  leftEmoji: { fontSize: 56 },
  leftTitle: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  leftSub: { fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 22 },

  // Chat bubbles decoration
  bubblesWrap: { width: '100%', gap: 10, marginTop: 24 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  chatBubble: {
    maxWidth: '70%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  chatBubbleLeft: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomLeftRadius: 4,
  },
  chatBubbleRight: {
    backgroundColor: '#3C096C',
    borderBottomRightRadius: 4,
  },
  chatBubbleText: { fontSize: 13, color: '#333', fontWeight: '500' },

  // Form card
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
    gap: 14,
  },
  formTitle: { fontSize: 26, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  formSub: { fontSize: 14, color: '#888', marginTop: -8 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#eee',
  },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 15, color: '#222', padding: 0, margin: 0, outlineWidth: 0 } as any,
  eyeIcon: { fontSize: 18 },

  forgotRow: { alignSelf: 'flex-end', marginTop: -6 },
  forgotText: { fontSize: 13, color: '#4361EE', fontWeight: '600' },

  successText: { fontSize: 13, color: '#2d6a4f', fontWeight: '600', textAlign: 'center' },
  errorText: { fontSize: 13, color: '#e63946', fontWeight: '600', textAlign: 'center' },

  btn: {
    backgroundColor: '#4361EE',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#4361EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnOff: { backgroundColor: '#c0c7d0', shadowOpacity: 0 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerText: { fontSize: 12, color: '#aaa' },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  switchText: { fontSize: 14, color: '#666' },
  switchLink: { fontSize: 14, color: '#4361EE', fontWeight: '700' },
});
