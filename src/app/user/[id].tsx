import { Ionicons } from '@expo/vector-icons';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  db,
} from '@/firebase/firebaseConfig';

// ==========================================================
// TYPES
// ==========================================================

type PublicProfile = {
  userId: string;
  displayName: string;
  username: string;
  bio: string;
  location: string;
  photoURL: string | null;
};

type Guide = {
  id: string;
  userId: string;
  creatorName: string;
  creatorUsername: string;
  title: string;
  destination: string;
  caption: string;
  coverImage: string | null;
  durationDays: number;
  isPublished: boolean;
  likeCount: number;
  saveCount: number;
  commentCount?: number;
  createdAt?: {
    seconds?: number;
  } | null;
};

// ==========================================================
// SCREEN
// ==========================================================

export default function TravellerProfileScreen() {
  const params =
    useLocalSearchParams<{
      id: string;
      displayName?: string;
      username?: string;
      photoURL?: string;
      bio?: string;
      location?: string;
    }>();

  const userId =
    typeof params.id === 'string'
      ? params.id
      : '';

  const [
    publicProfile,
    setPublicProfile,
  ] =
    useState<PublicProfile | null>(
      null
    );

  const [
    profileLoading,
    setProfileLoading,
  ] =
    useState(true);

  const [
    guides,
    setGuides,
  ] = useState<Guide[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  // ========================================================
  // LOAD THIS TRAVELLER'S PUBLIC PROFILE
  // ========================================================
  //
  // publicProfiles/{uid} contains only the safe social fields
  // that can be shown to other signed-in BonVoyage users.
  // Using onSnapshot keeps this screen in sync whenever the
  // account owner changes their name, bio, location or photo.
  // ========================================================

  useEffect(() => {
    if (!userId) {
      setPublicProfile(
        null
      );

      setProfileLoading(
        false
      );

      return;
    }

    setProfileLoading(
      true
    );

    const publicProfileRef =
      doc(
        db,
        'publicProfiles',
        userId
      );

    const unsubscribe =
      onSnapshot(
        publicProfileRef,

        snapshot => {
          if (
            snapshot.exists()
          ) {
            const data =
              snapshot.data();

            setPublicProfile({
              userId:
                snapshot.id,

              displayName:
                String(
                  data.displayName ??
                  'BonVoyage Traveller'
                ),

              username:
                String(
                  data.username ??
                  'traveller'
                ),

              bio:
                String(
                  data.bio ??
                  ''
                ),

              location:
                String(
                  data.location ??
                  ''
                ),

              photoURL:
                data.photoURL
                  ? String(
                      data.photoURL
                    )
                  : null,
            });
          } else {
            setPublicProfile(
              null
            );
          }

          setProfileLoading(
            false
          );
        },

        error => {
          console.error(
            'Load public profile error:',
            error
          );

          setPublicProfile(
            null
          );

          setProfileLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, [userId]);

  // ========================================================
  // LOAD THIS TRAVELLER'S PUBLISHED GUIDES
  // ========================================================

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    /*
     * Published guides are loaded separately from the traveller's
     * public social profile. Private users/{uid} data remains
     * protected by Firestore rules.
     */
    const publishedGuidesQuery =
      query(
        collection(
          db,
          'guides'
        ),
        where(
          'isPublished',
          '==',
          true
        )
      );

    const unsubscribe =
      onSnapshot(
        publishedGuidesQuery,
        snapshot => {
          const loadedGuides =
            snapshot.docs
              .map(document => ({
                id:
                  document.id,
                ...(document.data() as Omit<
                  Guide,
                  'id'
                >),
              }))
              .filter(
                guide =>
                  guide.userId ===
                  userId
              )
              .sort(
                (a, b) =>
                  (b.createdAt?.seconds ??
                    0) -
                  (a.createdAt?.seconds ??
                    0)
              );

          setGuides(
            loadedGuides
          );

          setLoading(false);
        },
        error => {
          console.error(
            'Load traveller profile error:',
            error
          );

          setLoading(false);
        }
      );

    return unsubscribe;
  }, [userId]);

  // ========================================================
  // PUBLIC PROFILE DETAILS
  // ========================================================

  const firstGuide =
    guides[0];

  const routeDisplayName =
    typeof params.displayName ===
      'string' &&
    params.displayName.trim()
      ? params.displayName.trim()
      : '';

  const routeUsername =
    typeof params.username ===
      'string' &&
    params.username.trim()
      ? params.username
          .trim()
          .replace(
            /^@/,
            ''
          )
      : '';

  const routePhotoURL =
    typeof params.photoURL ===
      'string' &&
    params.photoURL.trim()
      ? params.photoURL.trim()
      : null;

  const routeBio =
    typeof params.bio ===
      'string'
      ? params.bio.trim()
      : '';

  const routeLocation =
    typeof params.location ===
      'string'
      ? params.location.trim()
      : '';

  /*
   * publicProfiles is the main source of truth.
   * Route params and guide creator data are fallbacks so the
   * screen can still render for older accounts or while the
   * public profile document is being created.
   */

  const displayName =
    publicProfile?.displayName ||
    routeDisplayName ||
    firstGuide?.creatorName ||
    'BonVoyage Traveller';

  const username =
    publicProfile?.username ||
    routeUsername ||
    firstGuide?.creatorUsername ||
    'traveller';

  const bio =
    publicProfile?.bio ||
    routeBio ||
    'BonVoyage traveller sharing itinerary-style travel guides.';

  const location =
    publicProfile?.location ||
    routeLocation ||
    '';

  const photoURL =
    publicProfile?.photoURL ||
    routePhotoURL ||
    null;

  const initials =
    getInitials(
      displayName
    );

  const destinations =
    useMemo(() => {
      const values =
        guides
          .map(
            guide =>
              guide.destination
          )
          .filter(Boolean);

      return Array.from(
        new Set(values)
      );
    }, [guides]);

  // ========================================================
  // UI
  // ========================================================

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={['top']}
    >
      <View
        style={
          styles.header
        }
      >
        <Pressable
          style={
            styles.headerButton
          }
          onPress={() =>
            router.back()
          }
          hitSlop={10}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#111827"
          />
        </Pressable>

        <Text
          style={
            styles.headerTitle
          }
        >
          Profile
        </Text>

        <View
          style={
            styles.headerButton
          }
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* ================================================= */}
        {/* PROFILE HEADER                                    */}
        {/* ================================================= */}

        <View
          style={
            styles.profileHeader
          }
        >
          <View
            style={
              styles.avatarOuter
            }
          >
            <View
              style={
                styles.avatar
              }
            >
              {profileLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#1769E8"
                />
              ) : photoURL ? (
                <Image
                  source={{
                    uri:
                      photoURL,
                  }}
                  style={
                    styles.avatarImage
                  }
                  resizeMode="cover"
                />
              ) : (
                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {initials}
                </Text>
              )}
            </View>
          </View>

          <Text
            style={
              styles.displayName
            }
          >
            {displayName}
          </Text>

          <Text
            style={
              styles.username
            }
          >
            @{username}
          </Text>

          <Text
            style={
              styles.profileDescription
            }
          >
            {bio}
          </Text>

          {location ? (
            <View
              style={
                styles.publicLocationRow
              }
            >
              <Ionicons
                name="location-outline"
                size={15}
                color="#6B7280"
              />

              <Text
                style={
                  styles.publicLocationText
                }
                numberOfLines={1}
              >
                {location}
              </Text>
            </View>
          ) : null}

          {destinations.length >
          0 ? (
            <View
              style={
                styles.destinationSummary
              }
            >
              <Ionicons
                name="location-outline"
                size={15}
                color="#6B7280"
              />

              <Text
                style={
                  styles.destinationSummaryText
                }
                numberOfLines={2}
              >
                Guides about{' '}
                {destinations
                  .slice(0, 3)
                  .join(', ')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ================================================= */}
        {/* STATS                                             */}
        {/* ================================================= */}

        <View
          style={
            styles.statsContainer
          }
        >
          <StatItem
            value={String(
              guides.length
            )}
            label={
              guides.length === 1
                ? 'Guide'
                : 'Guides'
            }
          />

          <View
            style={
              styles.statDivider
            }
          />

          <StatItem
            value={String(
              destinations.length
            )}
            label={
              destinations.length ===
              1
                ? 'Destination'
                : 'Destinations'
            }
          />
        </View>

        {/* ================================================= */}
        {/* GUIDES                                            */}
        {/* ================================================= */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Published guides
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Travel recommendations shared by @{username}
            </Text>
          </View>

          <View
            style={
              styles.countBadge
            }
          >
            <Text
              style={
                styles.countBadgeText
              }
            >
              {guides.length}
            </Text>
          </View>
        </View>

        {loading ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <ActivityIndicator
              size="small"
              color="#1769E8"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading guides...
            </Text>
          </View>
        ) : guides.length ===
          0 ? (
          <View
            style={
              styles.emptyContainer
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="book-outline"
                size={34}
                color="#1769E8"
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No published guides
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              This traveller does not currently have any public travel guides.
            </Text>
          </View>
        ) : (
          guides.map(
            guide => (
              <PublicGuideCard
                key={
                  guide.id
                }
                guide={
                  guide
                }
                onPress={() =>
                  router.push({
                    pathname:
                      '/guide/[id]',
                    params: {
                      id:
                        guide.id,
                    },
                  } as any)
                }
              />
            )
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================================
// STAT
// ==========================================================

function StatItem({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View
      style={
        styles.statItem
      }
    >
      <Text
        style={
          styles.statValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.statLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

// ==========================================================
// GUIDE CARD
// ==========================================================

function PublicGuideCard({
  guide,
  onPress,
}: {
  guide: Guide;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.guideCard,
        pressed &&
          styles.guideCardPressed,
      ]}
      onPress={
        onPress
      }
      accessibilityRole="button"
      accessibilityLabel={`View ${guide.title} guide`}
    >
      {guide.coverImage ? (
        <Image
          source={{
            uri:
              guide.coverImage,
          }}
          style={
            styles.guideImage
          }
          resizeMode="cover"
        />
      ) : (
        <View
          style={
            styles.guideImagePlaceholder
          }
        >
          <Ionicons
            name="image-outline"
            size={34}
            color="#9CA3AF"
          />
        </View>
      )}

      <View
        style={
          styles.guideBody
        }
      >
        <View
          style={
            styles.guideTitleRow
          }
        >
          <Text
            style={
              styles.guideTitle
            }
            numberOfLines={2}
          >
            {guide.title}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={19}
            color="#1769E8"
          />
        </View>

        <View
          style={
            styles.guideDestinationRow
          }
        >
          <Ionicons
            name="location-outline"
            size={14}
            color="#6B7280"
          />

          <Text
            style={
              styles.guideDestination
            }
            numberOfLines={1}
          >
            {guide.destination}
          </Text>
        </View>

        {guide.caption ? (
          <Text
            style={
              styles.guideCaption
            }
            numberOfLines={2}
          >
            {guide.caption}
          </Text>
        ) : null}

        <View
          style={
            styles.guideMetaRow
          }
        >
          <View
            style={
              styles.guideMetaItem
            }
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color="#6B7280"
            />

            <Text
              style={
                styles.guideMetaText
              }
            >
              {guide.durationDays ||
                1}{' '}
              {(guide.durationDays ||
                1) === 1
                ? 'day'
                : 'days'}
            </Text>
          </View>

          <View
            style={
              styles.guideMetaItem
            }
          >
            <Ionicons
              name="heart-outline"
              size={15}
              color="#6B7280"
            />

            <Text
              style={
                styles.guideMetaText
              }
            >
              {guide.likeCount ??
                0}
            </Text>
          </View>

          <View
            style={
              styles.guideMetaItem
            }
          >
            <Ionicons
              name="bookmark-outline"
              size={14}
              color="#6B7280"
            />

            <Text
              style={
                styles.guideMetaText
              }
            >
              {guide.saveCount ??
                0}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ==========================================================
// HELPERS
// ==========================================================

function getInitials(
  value: string
) {
  const parts =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length ===
    0
  ) {
    return 'BV';
  }

  return parts
    .slice(0, 2)
    .map(
      part =>
        part[0]
          ?.toUpperCase() ??
        ''
    )
    .join('');
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

    header: {
      minHeight: 62,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    headerButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    headerTitle: {
      fontSize: 21,
      fontWeight: '800',
      color: '#111827',
    },

    content: {
      paddingHorizontal: 20,
      paddingBottom: 60,
    },

    profileHeader: {
      alignItems: 'center',
      paddingTop: 18,
      paddingBottom: 24,
    },

    avatarOuter: {
      width: 86,
      height: 86,
      borderRadius: 43,
      padding: 3,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#D1D5DB',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#DBEAFE',
    },

    avatarImage: {
      width: '100%',
      height: '100%',
    },

    avatarText: {
      fontSize: 23,
      fontWeight: '800',
      color: '#1769E8',
    },

    displayName: {
      marginTop: 17,
      fontSize: 21,
      fontWeight: '900',
      color: '#111827',
    },

    username: {
      marginTop: 4,
      fontSize: 13,
      color: '#6B7280',
    },

    profileDescription: {
      marginTop: 15,
      maxWidth: 300,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 20,
      color: '#374151',
    },

    publicLocationRow: {
      marginTop: 8,
      maxWidth: 300,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 5,
    },

    publicLocationText: {
      flexShrink: 1,
      textAlign: 'center',
      fontSize: 12,
      lineHeight: 17,
      color: '#6B7280',
    },

    destinationSummary: {
      marginTop: 8,
      maxWidth: 310,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'center',
      gap: 5,
    },

    destinationSummaryText: {
      flexShrink: 1,
      textAlign: 'center',
      fontSize: 12,
      lineHeight: 17,
      color: '#6B7280',
    },

    statsContainer: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor:
        '#E5E7EB',
      marginBottom: 28,
    },

    statItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    statValue: {
      fontSize: 17,
      fontWeight: '800',
      color: '#111827',
    },

    statLabel: {
      marginTop: 4,
      fontSize: 12,
      color: '#6B7280',
    },

    statDivider: {
      width: 1,
      height: 35,
      backgroundColor:
        '#E5E7EB',
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 16,
    },

    sectionTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: '#111827',
    },

    sectionSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: '#6B7280',
    },

    countBadge: {
      minWidth: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 8,
      backgroundColor:
        '#EFF6FF',
    },

    countBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#1769E8',
    },

    loadingContainer: {
      paddingVertical: 42,
      alignItems: 'center',
    },

    loadingText: {
      marginTop: 10,
      fontSize: 13,
      color: '#6B7280',
    },

    emptyContainer: {
      paddingVertical: 48,
      paddingHorizontal: 24,
      alignItems: 'center',
    },

    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#EFF6FF',
    },

    emptyTitle: {
      marginTop: 16,
      fontSize: 17,
      fontWeight: '800',
      color: '#111827',
    },

    emptyText: {
      marginTop: 8,
      maxWidth: 290,
      textAlign: 'center',
      fontSize: 13,
      lineHeight: 19,
      color: '#6B7280',
    },

    guideCard: {
      overflow: 'hidden',
      marginBottom: 18,
      borderWidth: 1,
      borderColor:
        '#E5E7EB',
      borderRadius: 18,
      backgroundColor:
        '#FFFFFF',
    },

    guideCardPressed: {
      opacity: 0.92,
    },

    guideImage: {
      width: '100%',
      height: 180,
      backgroundColor:
        '#E5E7EB',
    },

    guideImagePlaceholder: {
      height: 150,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#F3F4F6',
    },

    guideBody: {
      padding: 15,
    },

    guideTitleRow: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 10,
    },

    guideTitle: {
      flex: 1,
      fontSize: 18,
      lineHeight: 23,
      fontWeight: '900',
      color: '#111827',
    },

    guideDestinationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 7,
    },

    guideDestination: {
      flex: 1,
      fontSize: 12,
      color: '#6B7280',
    },

    guideCaption: {
      marginTop: 11,
      fontSize: 13,
      lineHeight: 19,
      color: '#4B5563',
    },

    guideMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 14,
    },

    guideMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    guideMetaText: {
      fontSize: 12,
      color: '#6B7280',
    },
  });
