import { useState } from 'react';

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  signInWithEmailAndPassword,
} from 'firebase/auth';

import {
  auth,
} from '@/firebase/firebaseConfig';

export default function LoginScreen() {
  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  // ========================================================
  // LOGIN
  // ========================================================

  async function handleLogin() {
    const cleanedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanedEmail ||
      !password
    ) {
      Alert.alert(
        'Error',
        'Please enter your email and password.'
      );

      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(
        auth,
        cleanedEmail,
        password
      );

      /*
       * DO NOT router.replace('/') here.
       *
       * Firebase Auth updates the user in AuthProvider.
       * src/app/_layout.tsx then:
       *
       * 1. disables the logged-out routes
       * 2. enables the logged-in routes
       * 3. takes the user into /(tabs)
       */
    } catch (error: any) {
      console.log(
        'Login error:',
        error
      );

      if (
        error.code ===
          'auth/invalid-credential' ||
        error.code ===
          'auth/wrong-password' ||
        error.code ===
          'auth/user-not-found'
      ) {
        Alert.alert(
          'Login Failed',
          'Incorrect email or password.'
        );
      } else if (
        error.code ===
        'auth/invalid-email'
      ) {
        Alert.alert(
          'Login Failed',
          'Please enter a valid email address.'
        );
      } else if (
        error.code ===
        'auth/too-many-requests'
      ) {
        Alert.alert(
          'Login Failed',
          'Too many login attempts. Please try again later.'
        );
      } else {
        Alert.alert(
          'Login Failed',
          'Unable to login. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // ========================================================
  // UI
  // ========================================================

  return (
    <View
      style={
        styles.container
      }
    >
      <Text
        style={
          styles.title
        }
      >
        Welcome Back!
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Login to continue your journey
      </Text>

      {/* EMAIL */}

      <TextInput
        style={
          styles.input
        }
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={
          email
        }
        onChangeText={
          setEmail
        }
      />

      {/* PASSWORD */}

      <TextInput
        style={
          styles.input
        }
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={
          password
        }
        onChangeText={
          setPassword
        }
        onSubmitEditing={() =>
          void handleLogin()
        }
      />

      {/* LOGIN BUTTON */}

      <Pressable
        style={[
          styles.button,

          loading &&
            styles.buttonDisabled,
        ]}
        onPress={() =>
          void handleLogin()
        }
        disabled={
          loading
        }
      >
        <Text
          style={
            styles.buttonText
          }
        >
          {loading
            ? 'Logging in...'
            : 'Login'}
        </Text>
      </Pressable>

      {/* REGISTER */}

      <Pressable
        disabled={
          loading
        }
        onPress={() =>
          router.push(
            '/register'
          )
        }
      >
        <Text
          style={
            styles.registerText
          }
        >
          Don't have an account? Sign Up
        </Text>
      </Pressable>
    </View>
  );
}

// ==========================================================
// STYLES
// ==========================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      justifyContent:
        'center',

      paddingHorizontal:
        28,

      backgroundColor:
        '#FFFFFF',
    },

    title: {
      fontSize: 30,

      fontWeight:
        '700',

      textAlign:
        'center',

      color:
        '#111827',
    },

    subtitle: {
      textAlign:
        'center',

      marginTop:
        8,

      marginBottom:
        30,

      color:
        '#6B7280',
    },

    input: {
      minHeight:
        52,

      borderWidth:
        1,

      borderColor:
        '#D1D5DB',

      borderRadius:
        12,

      paddingHorizontal:
        16,

      paddingVertical:
        14,

      marginBottom:
        14,

      fontSize:
        16,

      color:
        '#111827',

      backgroundColor:
        '#FFFFFF',
    },

    button: {
      backgroundColor:
        '#1769E8',

      paddingVertical:
        15,

      borderRadius:
        12,

      marginTop:
        8,
    },

    buttonDisabled: {
      opacity:
        0.6,
    },

    buttonText: {
      color:
        '#FFFFFF',

      textAlign:
        'center',

      fontSize:
        16,

      fontWeight:
        '600',
    },

    registerText: {
      textAlign:
        'center',

      marginTop:
        20,

      color:
        '#1769E8',
    },
  });