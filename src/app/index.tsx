import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  function goToRegister() {
    router.push('/register');
  }

  function goToLogin() {
    router.push('/login');
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        'top',
        'bottom',
      ]}
    >
      <StatusBar
        style="dark"
      />

      <View
        style={styles.container}
      >
        {/* LOGO */}

        <View
          style={styles.logoIcon}
        >
          <Ionicons
            name="airplane"
            size={29}
            color="#1769E8"
          />
        </View>

        <Text
          style={styles.logoText}
        >
          BonVoyage
        </Text>

        <Text
          style={styles.tagline}
        >
          Explore. Plan. Travel.
        </Text>

        <Text
          style={styles.description}
        >
          Your journey starts here.
        </Text>

        {/* DOTS */}

        <View
          style={styles.dots}
        >
          <View
            style={[
              styles.dot,
              styles.activeDot,
            ]}
          />

          <View
            style={styles.dot}
          />

          <View
            style={styles.dot}
          />
        </View>

        {/* GET STARTED */}

        <Pressable
          style={({ pressed }) => [
            styles.getStartedButton,

            pressed &&
              styles.buttonPressed,
          ]}
          onPress={
            goToRegister
          }
        >
          <Text
            style={
              styles.getStartedText
            }
          >
            GET STARTED
          </Text>
        </Pressable>

        {/* LOGIN */}

        <View
          style={styles.loginRow}
        >
          <Text
            style={
              styles.accountText
            }
          >
            ALREADY HAVE AN ACCOUNT?
          </Text>

          <Pressable
            onPress={
              goToLogin
            }
            hitSlop={12}
          >
            <Text
              style={
                styles.loginText
              }
            >
              LOG IN
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        '#FFFFFF',
    },

    container: {
      flex: 1,

      paddingHorizontal:
        30,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FFFFFF',
    },

    // ======================================================
    // LOGO
    // ======================================================

    logoIcon: {
      width: 58,

      height: 58,

      marginBottom:
        15,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#EEF4FF',
    },

    logoText: {
      fontSize: 39,

      lineHeight: 46,

      fontWeight:
        '900',

      letterSpacing:
        -1.2,

      color:
        '#111827',
    },

    tagline: {
      marginTop:
        14,

      fontSize:
        17,

      fontWeight:
        '700',

      color:
        '#1769E8',
    },

    description: {
      marginTop:
        7,

      fontSize:
        14,

      color:
        '#6B7280',
    },

    // ======================================================
    // DOTS
    // ======================================================

    dots: {
      marginTop:
        42,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        12,
    },

    dot: {
      width:
        7,

      height:
        7,

      borderRadius:
        4,

      borderWidth:
        1,

      borderColor:
        '#9CA3AF',

      backgroundColor:
        '#FFFFFF',
    },

    activeDot: {
      width:
        8,

      height:
        8,

      borderColor:
        '#111827',

      backgroundColor:
        '#111827',
    },

    // ======================================================
    // GET STARTED
    // ======================================================

    getStartedButton: {
      width:
        '100%',

      height:
        52,

      marginTop:
        50,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#1769E8',

      elevation:
        3,
    },

    buttonPressed: {
      opacity:
        0.82,

      transform: [
        {
          scale:
            0.99,
        },
      ],
    },

    getStartedText: {
      fontSize:
        13,

      fontWeight:
        '800',

      letterSpacing:
        0.5,

      color:
        '#FFFFFF',
    },

    // ======================================================
    // LOGIN
    // ======================================================

    loginRow: {
      marginTop:
        19,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,
    },

    accountText: {
      fontSize:
        10,

      fontWeight:
        '600',

      color:
        '#9CA3AF',
    },

    loginText: {
      fontSize:
        10,

      fontWeight:
        '800',

      color:
        '#1769E8',
    },
  });