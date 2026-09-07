import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
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
  auth,
  db,
} from '@/firebase/firebaseConfig';

// ==========================================================
// TYPES
// ==========================================================

type FirestoreTimestampLike = {
  seconds?: number;
  toMillis?: () => number;
} | null;

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
  commentCount: number;
  tips: string[];
  createdAt?: FirestoreTimestampLike;
};

type GuidePlace = {
  id: string;
  name: string;
  location: string;
  day: number;
  notes: string;
  photoUri: string | null;
};

// ==========================================================
// SCREEN
// ==========================================================

export default function GuideDetailsScreen() {
  const {
    id,
  } =
    useLocalSearchParams<{
      id: string;
    }>();

  const [
    guide,
    setGuide,
  ] =
    useState<Guide | null>(
      null
    );

  const [
    creatorProfile,
    setCreatorProfile,
  ] =
    useState<PublicProfile | null>(
      null
    );

  const [
    creatorProfileLoading,
    setCreatorProfileLoading,
  ] =
    useState(false);

  const [
    places,
    setPlaces,
  ] =
    useState<GuidePlace[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    notFound,
    setNotFound,
  ] =
    useState(false);

  const [
    isSaved,
    setIsSaved,
  ] =
    useState(false);

  const [
    saveLoading,
    setSaveLoading,
  ] =
    useState(false);

  const user =
    auth.currentUser;

  // The guide document currently stores the base save count.
  // Since this user's saved state is stored separately under
  // users/{uid}/savedGuides/{guideId}, include the current user's
  // save in the number shown on this screen.
  const displayedSaveCount =
    Math.max(
      0,
      (guide?.saveCount ?? 0) +
        (isSaved ? 1 : 0)
    );

  // ========================================================
  // LOAD GUIDE
  // ========================================================

  useEffect(() => {
    if (!id) {
      return;
    }

    void loadGuide();
  }, [id]);

  async function loadGuide() {
    try {
      setLoading(true);
      setNotFound(false);

      const guideRef =
        doc(
          db,
          'guides',
          id
        );

      const guideSnapshot =
        await getDoc(
          guideRef
        );

      if (
        !guideSnapshot.exists()
      ) {
        setNotFound(true);
        return;
      }

      const data =
        guideSnapshot.data();

      const loadedGuide: Guide = {
        id:
          guideSnapshot.id,

        userId:
          String(
            data.userId ??
              ''
          ),

        creatorName:
          String(
            data.creatorName ??
              'BonVoyage Traveller'
          ),

        creatorUsername:
          String(
            data.creatorUsername ??
              'traveller'
          ),

        title:
          String(
            data.title ??
              'Untitled guide'
          ),

        destination:
          String(
            data.destination ??
              ''
          ),

        caption:
          String(
            data.caption ??
              ''
          ),

        coverImage:
          data.coverImage
            ? String(
                data.coverImage
              )
            : null,

        durationDays:
          Number(
            data.durationDays ??
              1
          ),

        isPublished:
          data.isPublished ===
          true,

        likeCount:
          Number(
            data.likeCount ??
              0
          ),

        saveCount:
          Number(
            data.saveCount ??
              0
          ),

        commentCount:
          Number(
            data.commentCount ??
              0
          ),

        tips:
          Array.isArray(
            data.tips
          )
            ? data.tips.map(
                (
                  tip:
                    unknown
                ) =>
                  String(
                    tip
                  )
              )
            : [],

        createdAt:
          data.createdAt ??
          null,
      };

      setGuide(
        loadedGuide
      );

      // ----------------------------------------------------
      // GUIDE PLACES
      // ----------------------------------------------------

      const placesSnapshot =
        await getDocs(
          collection(
            db,
            'guides',
            id,
            'places'
          )
        );

      const loadedPlaces:
        GuidePlace[] =
        placesSnapshot.docs.map(
          placeDocument => {
            const placeData =
              placeDocument.data();

            return {
              id:
                placeDocument.id,

              name:
                String(
                  placeData.name ??
                    placeData.placeName ??
                    placeData.title ??
                    'Place'
                ),

              location:
                String(
                  placeData.location ??
                    placeData.address ??
                    placeData.formattedAddress ??
                    ''
                ),

              day:
                Number(
                  placeData.day ??
                    placeData.dayNumber ??
                    1
                ),

              notes:
                placeData.notes
                  ? String(
                      placeData.notes
                    )
                  : '',

              photoUri:
                placeData.photoUri ??
                placeData.photoURL ??
                placeData.imageUrl ??
                null,
            };
          }
        );

      loadedPlaces.sort(
        (a, b) =>
          a.day - b.day
      );

      setPlaces(
        loadedPlaces
      );
    } catch (error) {
      console.error(
        'Load guide error:',
        error
      );

      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  // ========================================================
  // WATCH GUIDE CREATOR PUBLIC PROFILE
  // ========================================================
  //
  // The guide keeps creatorName/creatorUsername as fallback
  // values, while publicProfiles/{uid} is the current source
  // for the creator's public name, username and profile photo.
  // ========================================================

  useEffect(() => {
    const creatorId =
      guide?.userId;

    if (!creatorId) {
      setCreatorProfile(
        null
      );

      setCreatorProfileLoading(
        false
      );

      return;
    }

    setCreatorProfileLoading(
      true
    );

    const creatorProfileRef =
      doc(
        db,
        'publicProfiles',
        creatorId
      );

    const unsubscribe =
      onSnapshot(
        creatorProfileRef,

        snapshot => {
          if (
            snapshot.exists()
          ) {
            const data =
              snapshot.data();

            setCreatorProfile({
              userId:
                snapshot.id,

              displayName:
                String(
                  data.displayName ??
                  guide?.creatorName ??
                  'BonVoyage Traveller'
                ),

              username:
                String(
                  data.username ??
                  guide?.creatorUsername ??
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
            setCreatorProfile(
              null
            );
          }

          setCreatorProfileLoading(
            false
          );
        },

        error => {
          console.error(
            'Load guide creator profile error:',
            error
          );

          setCreatorProfile(
            null
          );

          setCreatorProfileLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, [
    guide?.userId,
    guide?.creatorName,
    guide?.creatorUsername,
  ]);

  // ========================================================
  // WATCH SAVED STATE
  // ========================================================

  useEffect(() => {
    if (
      !user ||
      !id
    ) {
      setIsSaved(false);
      return;
    }

    const savedRef =
      doc(
        db,
        'users',
        user.uid,
        'savedGuides',
        id
      );

    const unsubscribe =
      onSnapshot(
        savedRef,
        snapshot => {
          setIsSaved(
            snapshot.exists()
          );
        },
        error => {
          console.log(
            'Watch saved guide error:',
            error
          );

          setIsSaved(false);
        }
      );

    return unsubscribe;
  }, [
    user?.uid,
    id,
  ]);

  const creatorName =
    creatorProfile
      ?.displayName ||
    guide?.creatorName ||
    'BonVoyage Traveller';

  const creatorUsername =
    creatorProfile
      ?.username ||
    guide?.creatorUsername ||
    'traveller';

  const creatorPhotoURL =
    creatorProfile
      ?.photoURL ??
    null;

  // ========================================================
  // SAVE / UNSAVE GUIDE
  // ========================================================

  async function toggleSavedGuide() {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please log in before saving a travel guide.'
      );

      return;
    }

    if (
      !guide ||
      !id ||
      saveLoading
    ) {
      return;
    }

    const savedRef =
      doc(
        db,
        'users',
        user.uid,
        'savedGuides',
        id
      );

    try {
      setSaveLoading(true);

      if (isSaved) {
        await deleteDoc(
          savedRef
        );

        return;
      }

      /*
       * A small snapshot of the public guide is stored with the
       * saved record. This lets the Profile > Saved tab render
       * immediately without exposing private user information.
       * The document ID is the original guide ID, so tapping a
       * saved card can still open /guide/[id].
       */
      await setDoc(
        savedRef,
        {
          guideId:
            guide.id,

          userId:
            guide.userId,

          creatorName:
            creatorName,

          creatorUsername:
            creatorUsername,

          title:
            guide.title,

          destination:
            guide.destination,

          caption:
            guide.caption,

          coverImage:
            guide.coverImage,

          durationDays:
            guide.durationDays,

          isPublished:
            guide.isPublished,

          likeCount:
            guide.likeCount,

          saveCount:
            guide.saveCount + 1,

          commentCount:
            guide.commentCount,

          tips:
            guide.tips,

          createdAt:
            guide.createdAt ??
            null,

          savedAt:
            serverTimestamp(),
        }
      );
    } catch (error) {
      console.error(
        'Save guide error:',
        error
      );

      Alert.alert(
        'Unable to save guide',
        'BonVoyage could not update your saved guides. Please try again.'
      );
    } finally {
      setSaveLoading(false);
    }
  }

  // ========================================================
  // LOADING
  // ========================================================

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.centerContainer
          }
        >
          <ActivityIndicator
            size="large"
            color="#1769E8"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading guide...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ========================================================
  // NOT FOUND
  // ========================================================

  if (
    notFound ||
    !guide
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.header
          }
        >
          <Pressable
            style={
              styles.headerIconButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="arrow-back"
              size={25}
              color="#111827"
            />
          </Pressable>
        </View>

        <View
          style={
            styles.centerContainer
          }
        >
          <Ionicons
            name="book-outline"
            size={48}
            color="#9CA3AF"
          />

          <Text
            style={
              styles.notFoundTitle
            }
          >
            Guide not found
          </Text>

          <Text
            style={
              styles.notFoundText
            }
          >
            This travel guide may no longer be available.
          </Text>
        </View>
      </SafeAreaView>
    );
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
      ]}
    >
      {/* HEADER */}

      <View
        style={
          styles.header
        }
      >
        <Pressable
          style={
            styles.headerIconButton
          }
          onPress={() =>
            router.back()
          }
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={25}
            color="#111827"
          />
        </Pressable>

        <Text
          style={
            styles.headerTitle
          }
        >
          Travel Guide
        </Text>

        <Pressable
          style={[
            styles.headerSaveButton,
            isSaved &&
              styles.headerSaveButtonActive,
          ]}
          onPress={() =>
            void toggleSavedGuide()
          }
          disabled={
            saveLoading
          }
          accessibilityRole="button"
          accessibilityLabel={
            isSaved
              ? 'Remove guide from saved'
              : 'Save travel guide'
          }
        >
          {saveLoading ? (
            <ActivityIndicator
              size="small"
              color={
                isSaved
                  ? '#FFFFFF'
                  : '#1769E8'
              }
            />
          ) : (
            <Ionicons
              name={
                isSaved
                  ? 'bookmark'
                  : 'bookmark-outline'
              }
              size={20}
              color={
                isSaved
                  ? '#FFFFFF'
                  : '#1769E8'
              }
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* CREATOR */}

        <View
          style={
            styles.creatorRow
          }
        >
          <View
            style={
              styles.avatar
            }
          >
            {creatorProfileLoading ? (
              <ActivityIndicator
                size="small"
                color="#1769E8"
              />
            ) : creatorPhotoURL ? (
              <Image
                source={{
                  uri:
                    creatorPhotoURL,
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
                {getInitials(
                  creatorName
                )}
              </Text>
            )}
          </View>

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                styles.creatorName
              }
            >
              {
                creatorName
              }
            </Text>

            <Text
              style={
                styles.username
              }
            >
              @
              {
                creatorUsername
              }
            </Text>
          </View>

          <View
            style={
              styles.guideBadge
            }
          >
            <Text
              style={
                styles.guideBadgeText
              }
            >
              GUIDE
            </Text>
          </View>
        </View>

        {/* COVER */}

        {guide.coverImage ? (
          <Image
            source={{
              uri:
                guide.coverImage,
            }}
            style={
              styles.coverImage
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.coverPlaceholder
            }
          >
            <Ionicons
              name="image-outline"
              size={42}
              color="#9CA3AF"
            />
          </View>
        )}

        {/* MAIN */}

        <View
          style={
            styles.main
          }
        >
          <Text
            style={
              styles.title
            }
          >
            {guide.title}
          </Text>

          <View
            style={
              styles.locationRow
            }
          >
            <Ionicons
              name="location-outline"
              size={16}
              color="#6B7280"
            />

            <Text
              style={
                styles.locationText
              }
            >
              {
                guide.destination
              }
            </Text>
          </View>

          {guide.caption ? (
            <Text
              style={
                styles.caption
              }
            >
              {
                guide.caption
              }
            </Text>
          ) : null}

          {/* STATS */}

          <View
            style={
              styles.statsRow
            }
          >
            <Stat
              icon="calendar-outline"
              text={`${guide.durationDays} ${
                guide.durationDays ===
                1
                  ? 'day'
                  : 'days'
              }`}
            />

            <Stat
              icon="heart-outline"
              text={String(
                guide.likeCount
              )}
            />

            <Stat
              icon={
                isSaved
                  ? 'bookmark'
                  : 'bookmark-outline'
              }
              text={String(
                displayedSaveCount
              )}
              active={
                isSaved
              }
            />

            <Stat
              icon="chatbubble-outline"
              text={String(
                guide.commentCount
              )}
            />
          </View>

          {/* SAVE ACTION */}

          <Pressable
            style={({
              pressed,
            }) => [
              styles.saveGuideButton,
              isSaved &&
                styles.saveGuideButtonSaved,
              pressed &&
                styles.saveGuideButtonPressed,
            ]}
            onPress={() =>
              void toggleSavedGuide()
            }
            disabled={
              saveLoading
            }
          >
            {saveLoading ? (
              <ActivityIndicator
                size="small"
                color={
                  isSaved
                    ? '#FFFFFF'
                    : '#1769E8'
                }
              />
            ) : (
              <>
                <Ionicons
                  name={
                    isSaved
                      ? 'bookmark'
                      : 'bookmark-outline'
                  }
                  size={19}
                  color={
                    isSaved
                      ? '#FFFFFF'
                      : '#1769E8'
                  }
                />

                <Text
                  style={[
                    styles.saveGuideButtonText,
                    isSaved &&
                      styles.saveGuideButtonTextSaved,
                  ]}
                >
                  {isSaved
                    ? 'Saved to profile'
                    : 'Save guide'}
                </Text>
              </>
            )}
          </Pressable>

          {/* ITINERARY */}

          <View
            style={
              styles.divider
            }
          />

          <Text
            style={
              styles.sectionTitle
            }
          >
            Itinerary
          </Text>

          {places.length ===
          0 ? (
            <View
              style={
                styles.emptyPlaces
              }
            >
              <Ionicons
                name="map-outline"
                size={28}
                color="#9CA3AF"
              />

              <Text
                style={
                  styles.emptyPlacesText
                }
              >
                No places have been added to this guide yet.
              </Text>
            </View>
          ) : (
            groupPlacesByDay(
              places
            ).map(
              group => (
                <View
                  key={
                    group.day
                  }
                  style={
                    styles.daySection
                  }
                >
                  <View
                    style={
                      styles.dayHeader
                    }
                  >
                    <View
                      style={
                        styles.dayNumber
                      }
                    >
                      <Text
                        style={
                          styles.dayNumberText
                        }
                      >
                        {
                          group.day
                        }
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.dayTitle
                      }
                    >
                      Day{' '}
                      {
                        group.day
                      }
                    </Text>
                  </View>

                  {group.places.map(
                    (
                      place,
                      index
                    ) => (
                      <View
                        key={
                          place.id
                        }
                        style={
                          styles.placeRow
                        }
                      >
                        <View
                          style={
                            styles.timelineColumn
                          }
                        >
                          <View
                            style={
                              styles.timelineDot
                            }
                          />

                          {index <
                          group
                            .places
                            .length -
                            1 ? (
                            <View
                              style={
                                styles.timelineLine
                              }
                            />
                          ) : null}
                        </View>

                        <View
                          style={
                            styles.placeCard
                          }
                        >
                          {place.photoUri ? (
                            <Image
                              source={{
                                uri:
                                  place.photoUri,
                              }}
                              style={
                                styles.placeImage
                              }
                            />
                          ) : null}

                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <Text
                              style={
                                styles.placeName
                              }
                            >
                              {
                                place.name
                              }
                            </Text>

                            {place.location ? (
                              <View
                                style={
                                  styles.placeLocationRow
                                }
                              >
                                <Ionicons
                                  name="location-outline"
                                  size={13}
                                  color="#6B7280"
                                />

                                <Text
                                  style={
                                    styles.placeLocation
                                  }
                                  numberOfLines={
                                    2
                                  }
                                >
                                  {
                                    place.location
                                  }
                                </Text>
                              </View>
                            ) : null}

                            {place.notes ? (
                              <Text
                                style={
                                  styles.placeNotes
                                }
                              >
                                {
                                  place.notes
                                }
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    )
                  )}
                </View>
              )
            )
          )}

          {/* TIPS */}

          {guide.tips.length >
          0 ? (
            <>
              <View
                style={
                  styles.divider
                }
              />

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Travel Tips
              </Text>

              {guide.tips.map(
                (
                  tip,
                  index
                ) => (
                  <View
                    key={`${tip}-${index}`}
                    style={
                      styles.tipRow
                    }
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={19}
                      color="#1769E8"
                    />

                    <Text
                      style={
                        styles.tipText
                      }
                    >
                      {tip}
                    </Text>
                  </View>
                )
              )}
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================================
// SMALL COMPONENTS
// ==========================================================

function Stat({
  icon,
  text,
  active = false,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  text: string;
  active?: boolean;
}) {
  return (
    <View
      style={
        styles.statItem
      }
    >
      <Ionicons
        name={icon}
        size={16}
        color={
          active
            ? '#1769E8'
            : '#6B7280'
        }
      />

      <Text
        style={[
          styles.statText,
          active &&
            styles.statTextActive,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function getInitials(
  value: string
) {
  const pieces =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    pieces.length ===
    0
  ) {
    return 'BV';
  }

  return pieces
    .slice(0, 2)
    .map(
      item =>
        item[0]
          ?.toUpperCase() ??
        ''
    )
    .join('');
}

function groupPlacesByDay(
  places: GuidePlace[]
) {
  const groups =
    new Map<
      number,
      GuidePlace[]
    >();

  places.forEach(
    place => {
      const existing =
        groups.get(
          place.day
        ) ?? [];

      existing.push(
        place
      );

      groups.set(
        place.day,
        existing
      );
    }
  );

  return Array.from(
    groups.entries()
  )
    .sort(
      ([a], [b]) =>
        a - b
    )
    .map(
      ([
        day,
        dayPlaces,
      ]) => ({
        day,
        places:
          dayPlaces,
      })
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

    header: {
      minHeight: 58,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        '#E5E7EB',
    },

    headerIconButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent:
        'center',
      borderRadius: 20,
    },

    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: '#111827',
    },

    headerSaveButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent:
        'center',
      borderRadius: 20,
      backgroundColor:
        '#EFF6FF',
    },

    headerSaveButtonActive: {
      backgroundColor:
        '#1769E8',
    },

    content: {
      paddingBottom: 60,
    },

    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      padding: 30,
    },

    loadingText: {
      marginTop: 12,
      color: '#6B7280',
    },

    notFoundTitle: {
      marginTop: 15,
      fontSize: 20,
      fontWeight: '800',
      color: '#111827',
    },

    notFoundText: {
      marginTop: 8,
      textAlign: 'center',
      color: '#6B7280',
    },

    creatorRow: {
      paddingHorizontal: 20,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },

    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#DBEAFE',
      marginRight: 11,
    },

    avatarImage: {
      width: '100%',
      height: '100%',
    },

    avatarText: {
      fontWeight: '800',
      color: '#1769E8',
    },

    creatorName: {
      fontSize: 15,
      fontWeight: '800',
      color: '#111827',
    },

    username: {
      marginTop: 2,
      fontSize: 12,
      color: '#6B7280',
    },

    guideBadge: {
      backgroundColor:
        '#EFF6FF',
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    guideBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#1769E8',
    },

    coverImage: {
      width: '100%',
      height: 260,
      backgroundColor:
        '#E5E7EB',
    },

    coverPlaceholder: {
      height: 230,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#F3F4F6',
    },

    main: {
      padding: 20,
    },

    title: {
      fontSize: 27,
      lineHeight: 33,
      fontWeight: '900',
      color: '#111827',
    },

    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 7,
      gap: 5,
    },

    locationText: {
      fontSize: 14,
      color: '#6B7280',
    },

    caption: {
      marginTop: 16,
      fontSize: 15,
      lineHeight: 23,
      color: '#4B5563',
    },

    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 18,
      marginTop: 18,
    },

    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    statText: {
      fontSize: 13,
      color: '#6B7280',
    },

    statTextActive: {
      color: '#1769E8',
      fontWeight: '700',
    },

    saveGuideButton: {
      height: 48,
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 8,
      borderWidth: 1,
      borderColor:
        '#BFDBFE',
      borderRadius: 14,
      backgroundColor:
        '#EFF6FF',
    },

    saveGuideButtonSaved: {
      borderColor:
        '#1769E8',
      backgroundColor:
        '#1769E8',
    },

    saveGuideButtonPressed: {
      opacity: 0.88,
    },

    saveGuideButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1769E8',
    },

    saveGuideButtonTextSaved: {
      color: '#FFFFFF',
    },

    divider: {
      height: 1,
      backgroundColor:
        '#E5E7EB',
      marginVertical: 25,
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: '#111827',
      marginBottom: 17,
    },

    emptyPlaces: {
      padding: 25,
      borderRadius: 16,
      alignItems: 'center',
      backgroundColor:
        '#F9FAFB',
    },

    emptyPlacesText: {
      marginTop: 8,
      textAlign: 'center',
      color: '#6B7280',
    },

    daySection: {
      marginBottom: 26,
    },

    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 13,
    },

    dayNumber: {
      width: 29,
      height: 29,
      borderRadius: 15,
      backgroundColor:
        '#1769E8',
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    dayNumberText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    dayTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#111827',
    },

    placeRow: {
      flexDirection: 'row',
      minHeight: 80,
    },

    timelineColumn: {
      width: 30,
      alignItems: 'center',
    },

    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 20,
      backgroundColor:
        '#1769E8',
    },

    timelineLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
      backgroundColor:
        '#DBEAFE',
    },

    placeCard: {
      flex: 1,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor:
        '#E5E7EB',
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      backgroundColor:
        '#FFFFFF',
    },

    placeImage: {
      width: 65,
      height: 65,
      borderRadius: 10,
      marginRight: 12,
      backgroundColor:
        '#E5E7EB',
    },

    placeName: {
      fontSize: 15,
      fontWeight: '800',
      color: '#111827',
    },

    placeLocationRow: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 4,
    },

    placeLocation: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
      color: '#6B7280',
    },

    placeNotes: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 17,
      color: '#4B5563',
    },

    tipRow: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 9,
      marginBottom: 11,
    },

    tipText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: '#4B5563',
    },
  });
