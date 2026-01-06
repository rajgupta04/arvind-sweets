import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

// Required by expo-auth-session on iOS/Android to finish auth redirects.
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, googleLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Note: Google OAuth on mobile needs client IDs.
  // If you don't want client IDs yet, you can remove the Google button and keep email/password.
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ENV.GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: ENV.GOOGLE_IOS_CLIENT_ID,
    webClientId: ENV.GOOGLE_WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    (async () => {
      if (response?.type !== 'success') return;

      // Depending on provider + platform, token can appear in different places.
      const accessToken = response?.authentication?.accessToken;
      const idToken = response?.params?.id_token;

      try {
        setBusy(true);
        await googleLogin({ idToken, accessToken });
      } catch (e) {
        Alert.alert('Google sign-in failed', e?.message || 'Please try again');
      } finally {
        setBusy(false);
      }
    })();
  }, [response, googleLogin]);

  async function onEmailLogin() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Enter email and password');
      return;
    }

    try {
      setBusy(true);
      await login(email.trim(), password);
    } catch (e) {
      Alert.alert('Login failed', e?.message || 'Please try again');
    } finally {
      setBusy(false);
    }
  }

  async function onGooglePress() {
    if (!request) return;

    // If client IDs are not set, fail fast with a clear message.
    if (!ENV.GOOGLE_ANDROID_CLIENT_ID && !ENV.GOOGLE_IOS_CLIENT_ID && !ENV.GOOGLE_WEB_CLIENT_ID) {
      Alert.alert(
        'Google Sign-In not configured',
        'Set EXPO_PUBLIC_GOOGLE_*_CLIENT_ID in mobile/.env'
      );
      return;
    }

    try {
      await promptAsync();
    } catch (e) {
      Alert.alert('Google sign-in cancelled', e?.message || '');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Arvind Sweets</Text>

      <View style={{ gap: 8 }}>
        <Text>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        />

        <Text>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        />
      </View>

      {busy ? (
        <ActivityIndicator />
      ) : (
        <View style={{ gap: 10 }}>
          <Button title="Login" onPress={onEmailLogin} />
          <Button
            title="Continue with Google"
            onPress={onGooglePress}
            disabled={!request}
          />
        </View>
      )}

      <Text style={{ marginTop: 12, opacity: 0.7 }}>
        Backend: {process.env.EXPO_PUBLIC_API_BASE_URL}
      </Text>
    </SafeAreaView>
  );
}
