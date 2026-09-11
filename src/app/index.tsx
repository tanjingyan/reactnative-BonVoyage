import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  useRef,
  useState,
} from 'react';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

// ==========================================================
// ONBOARDING PAGES
// ==========================================================

const onboardingPages = [
  {
    icon: 'airplane' as const,
    title: 'BonVoyage',
    tagline: 'Explore. Plan. Travel.',
    description:
      'Your journey starts here.',
  },

  {
    icon: 'map-outline' as const,
    title: 'Discover Places',
    tagline: 'Find your next destination.',
    description:
      'Explore places, travel guides and other travellers.',
  },

  {
    icon: 'calendar-outline' as const,
    title: 'Plan Your Journey',
    tagline: 'Everything in one place.',
    description:
      'Create trips, organise activities and build your itinerary.',
  },
];

// ==========================================================
// SCREEN
// ==========================================================

export default function WelcomeScreen() {
  const {
    width,
  } =
    useWindowDimensions();

  const scrollRef =
    useRef<ScrollView>(
      null
    );

  const [
    activePage,
    setActivePage,
  ] =
    useState(0);

  // ========================================================
  // NAVIGATION
  // ========================================================

  function goToRegister() {
    router.push(
      '/register'
    );
  }

  function goToLogin() {
    router.push(
      '/login'
    );
  }

  // ========================================================
  // PAGE SWIPE
  // ========================================================

  function handleScrollEnd(
    event:
      NativeSyntheticEvent<
        NativeScrollEvent
      >
  ) {
    const offsetX =
      event.nativeEvent
        .contentOffset.x;

    const pageIndex =
      Math.round(
        offsetX /
          width
      );

    setActivePage(
      pageIndex
    );
  }

  function goToPage(
    index: number
  ) {
    setActivePage(
      index
    );

    scrollRef.current
      ?.scrollTo({
        x:
          index *
          width,

        animated:
          true,
      });
  }

  // ========================================================
  // UI
  // ========================================================

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={[
        'top',
        'bottom',
      ]}
    >
      <StatusBar
        style="dark"
      />

      <View
        style={
          styles.container
        }
      >
        {/* =============================================== */}
        {/* SWIPEABLE ONBOARDING                           */}
        {/* =============================================== */}

        <ScrollView
          ref={
            scrollRef
          }
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={
            false
          }
          bounces={
            false
          }
          onMomentumScrollEnd={
            handleScrollEnd
          }
          style={
            styles.scrollView
          }
        >
          {onboardingPages.map(
            (
              page,
              index
            ) => (
              <View
                key={
                  index
                }
                style={[
                  styles.page,

                  {
                    width,
                  },
                ]}
              >
                {/* LOGO / ICON */}

                <View
                  style={
                    styles.logoIcon
                  }
                >
                  <Ionicons
                    name={
                      page.icon
                    }
                    size={
                      29
                    }
                    color="#1769E8"
                  />
                </View>

                {/* TITLE */}

                <Text
                  style={
                    styles.logoText
                  }
                >
                  {
                    page.title
                  }
                </Text>

                {/* TAGLINE */}

                <Text
                  style={
                    styles.tagline
                  }
                >
                  {
                    page.tagline
                  }
                </Text>

                {/* DESCRIPTION */}

                <Text
                  style={
                    styles.description
                  }
                >
                  {
                    page.description
                  }
                </Text>
              </View>
            )
          )}
        </ScrollView>

        {/* =============================================== */}
        {/* DOTS                                            */}
        {/* =============================================== */}

        <View
          style={
            styles.dots
          }
        >
          {onboardingPages.map(
            (
              _,
              index
            ) => (
              <Pressable
                key={
                  index
                }
                onPress={() =>
                  goToPage(
                    index
                  )
                }
                hitSlop={
                  10
                }
              >
                <View
                  style={[
                    styles.dot,

                    activePage ===
                      index &&
                      styles.activeDot,
                  ]}
                />
              </Pressable>
            )
          )}
        </View>

        {/* =============================================== */}
        {/* GET STARTED                                     */}
        {/* =============================================== */}

        <Pressable
          style={({
            pressed,
          }) => [
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

        {/* =============================================== */}
        {/* LOGIN                                           */}
        {/* =============================================== */}

        <View
          style={
            styles.loginRow
          }
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
            hitSlop={
              12
            }
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

// ==========================================================
// STYLES
// ==========================================================

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        '#FFFFFF',
    },

    container: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FFFFFF',
    },

    // ======================================================
    // SWIPE PAGES
    // ======================================================

    scrollView: {
      flexGrow: 0,

      width:
        '100%',

      maxHeight:
        300,
    },

    page: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,
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

      textAlign:
        'center',

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

      textAlign:
        'center',

      color:
        '#1769E8',
    },

    description: {
      marginTop:
        7,

      paddingHorizontal:
        20,

      fontSize:
        14,

      lineHeight:
        21,

      textAlign:
        'center',

      color:
        '#6B7280',
    },

    // ======================================================
    // DOTS
    // ======================================================

    dots: {
      marginTop:
        30,

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
        '84%',

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

      marginBottom:
        30,

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