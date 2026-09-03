import { useState } from 'react';

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';

import {
  createUserWithEmailAndPassword,
  deleteUser,
  updateProfile,
} from 'firebase/auth';

import {
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import {
  auth,
  db,
} from '@/firebase/firebaseConfig';

export default function RegisterScreen() {
  const [
    name,
    setName,
  ] = useState('');

  const [
    username,
    setUsername,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  // ========================================================
  // REGISTER
  // ========================================================

  async function handleRegister() {
    const cleanedName =
      name.trim();

    const cleanedUsername =
      username
        .trim()
        .toLowerCase();

    const cleanedEmail =
      email
        .trim()
        .toLowerCase();

    // ------------------------------------------------------
    // FULL NAME
    // ------------------------------------------------------

    if (!cleanedName) {
      Alert.alert(
        'Name Required',
        'Please enter your full name.'
      );

      return;
    }

    // ------------------------------------------------------
    // USERNAME
    // ------------------------------------------------------

    if (!cleanedUsername) {
      Alert.alert(
        'Username Required',
        'Please choose a username.'
      );

      return;
    }

    if (
      cleanedUsername.length <
      3
    ) {
      Alert.alert(
        'Invalid Username',
        'Username must be at least 3 characters.'
      );

      return;
    }

    if (
      cleanedUsername.length >
      20
    ) {
      Alert.alert(
        'Invalid Username',
        'Username cannot be longer than 20 characters.'
      );

      return;
    }

    /*
     * Allowed:
     *
     * jingyan
     * jing_yan
     * traveller123
     *
     * Not allowed:
     *
     * jing yan
     * jing.yan
     * jing-yan
     */

    const usernamePattern =
      /^[a-z0-9_]+$/;

    if (
      !usernamePattern.test(
        cleanedUsername
      )
    ) {
      Alert.alert(
        'Invalid Username',
        'Username can only contain letters, numbers and underscores.'
      );

      return;
    }

    // ------------------------------------------------------
    // EMAIL
    // ------------------------------------------------------

    if (!cleanedEmail) {
      Alert.alert(
        'Email Required',
        'Please enter your email.'
      );

      return;
    }

    // ------------------------------------------------------
    // PASSWORD
    // ------------------------------------------------------

    if (
      password.length <
      6
    ) {
      Alert.alert(
        'Invalid Password',
        'Password must be at least 6 characters.'
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      Alert.alert(
        'Passwords Do Not Match',
        'Please make sure both passwords are the same.'
      );

      return;
    }

    // ------------------------------------------------------
    // CREATE ACCOUNT
    // ------------------------------------------------------

    let createdUser:
      typeof auth.currentUser =
      null;

    try {
      setLoading(
        true
      );

      // ----------------------------------------------------
      // FIREBASE AUTHENTICATION
      // ----------------------------------------------------

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          cleanedEmail,
          password
        );

      createdUser =
        userCredential.user;

      // ----------------------------------------------------
      // RESERVE USERNAME
      // ----------------------------------------------------
      //
      // usernames/jingyan
      //
      // The username itself becomes the document ID.
      //
      // Firestore transaction makes this atomic.
      //
      // ----------------------------------------------------

      const usernameRef =
        doc(
          db,
          'usernames',
          cleanedUsername
        );

      const userRef =
        doc(
          db,
          'users',
          createdUser.uid
        );

      await runTransaction(
        db,
        async transaction => {
          const usernameDocument =
            await transaction.get(
              usernameRef
            );

          // Username already belongs to someone.
          if (
            usernameDocument.exists()
          ) {
            throw new Error(
              'USERNAME_TAKEN'
            );
          }

          // ----------------------------------------------
          // RESERVE USERNAME
          // ----------------------------------------------

          transaction.set(
            usernameRef,
            {
              userId:
                createdUser!.uid,

              username:
                cleanedUsername,

              createdAt:
                serverTimestamp(),
            }
          );

          // ----------------------------------------------
          // CREATE PRIVATE USER PROFILE
          // ----------------------------------------------

          transaction.set(
            userRef,
            {
              displayName:
                cleanedName,

              username:
                cleanedUsername,

              usernameLowercase:
                cleanedUsername,

              email:
                cleanedEmail,

              createdAt:
                serverTimestamp(),
            }
          );
        }
      );

      // ----------------------------------------------------
      // FIREBASE AUTH DISPLAY NAME
      // ----------------------------------------------------

      await updateProfile(
        createdUser,
        {
          displayName:
            cleanedName,
        }
      );

      // ----------------------------------------------------
      // SUCCESS
      // ----------------------------------------------------

      Alert.alert(
        'Account Created',
        `Welcome to BonVoyage, ${cleanedName}!`,
        [
          {
            text: 'Continue',

            onPress: () =>
              router.replace(
                '/'
              ),
          },
        ]
      );
    } catch (error: any) {
      console.log(
        'Register error:',
        error
      );

      // ----------------------------------------------------
      // USERNAME ALREADY TAKEN
      // ----------------------------------------------------

      if (
        error?.message ===
        'USERNAME_TAKEN'
      ) {
        /*
         * Firebase Auth account was created before we could
         * reserve the username.
         *
         * Delete that temporary account so the user can
         * choose another username and register normally.
         */

        if (
          createdUser
        ) {
          try {
            await deleteUser(
              createdUser
            );
          } catch (
            deleteError
          ) {
            console.log(
              'Temporary auth cleanup error:',
              deleteError
            );
          }
        }

        Alert.alert(
          'Username Taken',
          `@${cleanedUsername} is already being used. Please choose another username.`
        );

        return;
      }

      // ----------------------------------------------------
      // AUTH ERRORS
      // ----------------------------------------------------

      if (
        error.code ===
        'auth/email-already-in-use'
      ) {
        Alert.alert(
          'Email Already Registered',
          'An account already exists with this email address.'
        );
      } else if (
        error.code ===
        'auth/invalid-email'
      ) {
        Alert.alert(
          'Invalid Email',
          'Please enter a valid email address.'
        );
      } else if (
        error.code ===
        'auth/weak-password'
      ) {
        Alert.alert(
          'Weak Password',
          'Please choose a stronger password.'
        );
      } else {
        /*
         * If registration failed after Firebase Auth was
         * created, clean up the temporary account.
         */

        if (
          createdUser
        ) {
          try {
            await deleteUser(
              createdUser
            );
          } catch (
            deleteError
          ) {
            console.log(
              'Temporary auth cleanup error:',
              deleteError
            );
          }
        }

        Alert.alert(
          'Registration Failed',
          'Unable to create your BonVoyage account. Please try again.'
        );
      }
    } finally {
      setLoading(
        false
      );
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
        Create Account
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Let's get you started
      </Text>

      {/* =================================================== */}
      {/* FULL NAME                                           */}
      {/* =================================================== */}

      <Text
        style={
          styles.label
        }
      >
        Full Name
      </Text>

      <TextInput
        style={
          styles.input
        }
        placeholder="Jing Yan"
        placeholderTextColor="#9CA3AF"
        value={
          name
        }
        onChangeText={
          setName
        }
        autoCapitalize="words"
      />

      {/* =================================================== */}
      {/* USERNAME                                            */}
      {/* =================================================== */}

      <Text
        style={
          styles.label
        }
      >
        Username
      </Text>

      <View
        style={
          styles.usernameContainer
        }
      >
        <Text
          style={
            styles.usernamePrefix
          }
        >
          @
        </Text>

        <TextInput
          style={
            styles.usernameInput
          }
          placeholder="jingyan"
          placeholderTextColor="#9CA3AF"
          value={
            username
          }
          onChangeText={
            value =>
              setUsername(
                value
                  .toLowerCase()
                  .replace(
                    /\s/g,
                    ''
                  )
              )
          }
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
      </View>

      <Text
        style={
          styles.usernameHint
        }
      >
        Letters, numbers and underscores only
      </Text>

      {/* =================================================== */}
      {/* EMAIL                                               */}
      {/* =================================================== */}

      <Text
        style={
          styles.label
        }
      >
        Email
      </Text>

      <TextInput
        style={
          styles.input
        }
        placeholder="you@example.com"
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

      {/* =================================================== */}
      {/* PASSWORD                                            */}
      {/* =================================================== */}

      <Text
        style={
          styles.label
        }
      >
        Password
      </Text>

      <TextInput
        style={
          styles.input
        }
        placeholder="At least 6 characters"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        value={
          password
        }
        onChangeText={
          setPassword
        }
      />

      {/* =================================================== */}
      {/* CONFIRM PASSWORD                                    */}
      {/* =================================================== */}

      <Text
        style={
          styles.label
        }
      >
        Confirm Password
      </Text>

      <TextInput
        style={
          styles.input
        }
        placeholder="Enter your password again"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        value={
          confirmPassword
        }
        onChangeText={
          setConfirmPassword
        }
      />

      {/* =================================================== */}
      {/* SIGN UP                                             */}
      {/* =================================================== */}

      <Pressable
        style={[
          styles.button,

          loading &&
            styles.buttonDisabled,
        ]}
        onPress={
          handleRegister
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
            ? 'Creating Account...'
            : 'Sign Up'}
        </Text>
      </Pressable>

      {/* =================================================== */}
      {/* LOGIN                                               */}
      {/* =================================================== */}

      <Pressable
        onPress={() =>
          router.push(
            '/login'
          )
        }
      >
        <Text
          style={
            styles.loginText
          }
        >
          Already have an account? Login
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

      paddingHorizontal:
        28,

      justifyContent:
        'center',

      backgroundColor:
        '#FFFFFF',
    },

    title: {
      fontSize: 30,

      fontWeight: '700',

      textAlign:
        'center',

      color: '#111827',
    },

    subtitle: {
      marginTop: 8,

      marginBottom: 26,

      textAlign:
        'center',

      color: '#6B7280',
    },

    label: {
      marginBottom: 7,

      fontSize: 13,

      fontWeight: '600',

      color: '#374151',
    },

    input: {
      minHeight: 52,

      paddingHorizontal:
        16,

      marginBottom: 14,

      borderWidth: 1,

      borderColor:
        '#D1D5DB',

      borderRadius: 12,

      fontSize: 15,

      color: '#111827',

      backgroundColor:
        '#FFFFFF',
    },

    usernameContainer: {
      minHeight: 52,

      paddingHorizontal:
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#D1D5DB',

      borderRadius: 12,

      backgroundColor:
        '#FFFFFF',
    },

    usernamePrefix: {
      marginRight: 3,

      fontSize: 16,

      fontWeight: '600',

      color: '#6B7280',
    },

    usernameInput: {
      flex: 1,

      fontSize: 15,

      color: '#111827',
    },

    usernameHint: {
      marginTop: 5,

      marginBottom: 14,

      fontSize: 11,

      color: '#9CA3AF',
    },

    button: {
      marginTop: 8,

      paddingVertical: 15,

      borderRadius: 12,

      backgroundColor:
        '#1769E8',
    },

    buttonDisabled: {
      opacity: 0.6,
    },

    buttonText: {
      textAlign:
        'center',

      fontSize: 16,

      fontWeight: '600',

      color: '#FFFFFF',
    },

    loginText: {
      marginTop: 20,

      textAlign:
        'center',

      color: '#1769E8',
    },
  });