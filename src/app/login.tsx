import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { login, parseAuthError, resetPassword } from '@/services/auth-service';

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
    if (!email.trim()) {
      setError('Enter your email above first');
      return;
    }
    try {
      await resetPassword(email.trim());
      setResetSent(true);
      setError('');
    } catch (e: any) {
      setError(parseAuthError(e.code));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>💬</Text>
          <Text style={styles.heroTitle}>Welcome Back!</Text>
          <Text style={styles.heroSub}>Sign in to continue</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
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

          {/* Forgot password */}
          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {resetSent && (
            <Text style={styles.successText}>✅ Reset link sent! Check your email.</Text>
          )}

          {/* Error */}
          {error ? <Text style={styles.errorText}>⚠ {error}</Text> : null}

          {/* Login button */}
          <TouchableOpacity
            style={[styles.btn, (!canSubmit || loading) && styles.btnOff]}
            onPress={handleLogin}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Signup link */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.switchLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#4361EE' },
  safe: { flex: 1 },

  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 24,
  },
  heroEmoji: { fontSize: 56 },
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
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
  inputIcon: { fontSize: 16 },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    padding: 0,
    margin: 0,
  },
  eyeIcon: { fontSize: 18 },

  forgotRow: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 13, color: '#4361EE', fontWeight: '600' },

  successText: { fontSize: 13, color: '#2d6a4f', fontWeight: '600', textAlign: 'center' },
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

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e8ebf0' },
  dividerText: { fontSize: 13, color: '#aaa' },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  switchText: { fontSize: 14, color: '#666' },
  switchLink: { fontSize: 14, color: '#4361EE', fontWeight: '700' },
});
