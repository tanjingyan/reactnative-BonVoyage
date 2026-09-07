import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import {
  auth,
  db,
} from '@/firebase/firebaseConfig';

type Trip = {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;

  createdAt?: {
    seconds?: number;
  };
};

type Destination = {
  id: string;
  name: string;
  country: string;
  description: string;
  image: string;
};

const destinations: Destination[] = [
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    description: 'Food • Culture • Shopping',
    image:
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80',
  },

  {
    id: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    description: 'Temples • Nature • Culture',
    image:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80',
  },

  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    description: 'Food • Art • Landmarks',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80',
  },
];

export default function HomeScreen() {
  const [trips, setTrips] =
    useState<Trip[]>([]);

  const [tripLoading, setTripLoading] =
    useState(true);

  const [
    activityCount,
    setActivityCount,
  ] = useState(0);

  const [
    activitiesLoading,
    setActivitiesLoading,
  ] = useState(false);

  const [
    createMenuVisible,
    setCreateMenuVisible,
  ] = useState(false);

  const user = auth.currentUser;

  /*
   * Listen to the logged-in user's trips.
   *
   * This keeps Home synchronised with Firestore
   * when trips are created or changed.
   */
  useEffect(() => {
    if (!user) {
      setTripLoading(false);
      return;
    }

    const tripsQuery = query(
      collection(db, 'trips'),

      where(
        'userId',
        '==',
        user.uid
      )
    );

    const unsubscribe =
      onSnapshot(
        tripsQuery,

        snapshot => {
          const tripList:
            Trip[] =
            snapshot.docs.map(
              tripDocument => ({
                id:
                  tripDocument.id,

                ...(tripDocument.data() as Omit<
                  Trip,
                  'id'
                >),
              })
            );

          setTrips(tripList);

          setTripLoading(false);
        },

        error => {
          console.log(
            'Home trips error:',
            error
          );

          setTripLoading(false);
        }
      );

    return unsubscribe;
  }, [user?.uid]);

  /*
   * Pick the most relevant trip.
   *
   * Upcoming trips are prioritised.
   * If all trips are in the past,
   * the most recently created trip
   * will be shown.
   */
  const primaryTrip =
    useMemo(() => {
      if (
        trips.length === 0
      ) {
        return null;
      }

      const now =
        new Date().getTime();

      const upcoming =
        [...trips]
          .filter(
            trip =>
              new Date(
                trip.endDate
              ).getTime() >= now
          )
          .sort(
            (a, b) =>
              new Date(
                a.startDate
              ).getTime() -
              new Date(
                b.startDate
              ).getTime()
          );

      if (
        upcoming.length > 0
      ) {
        return upcoming[0];
      }

      return [...trips].sort(
        (a, b) =>
          (b.createdAt?.seconds ??
            0) -
          (a.createdAt?.seconds ??
            0)
      )[0];
    }, [trips]);

  /*
   * Listen to the itinerary activities
   * belonging to the displayed trip.
   */
  useEffect(() => {
    if (!primaryTrip) {
      setActivityCount(0);
      return;
    }

    setActivitiesLoading(true);

    const activitiesRef =
      collection(
        db,
        'trips',
        primaryTrip.id,
        'activities'
      );

    const unsubscribe =
      onSnapshot(
        activitiesRef,

        snapshot => {
          setActivityCount(
            snapshot.size
          );

          setActivitiesLoading(
            false
          );
        },

        error => {
          console.log(
            'Home activities error:',
            error
          );

          setActivitiesLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, [primaryTrip?.id]);

  function formatDate(
    dateString: string
  ) {
    const date =
      new Date(dateString);

    return date.toLocaleDateString(
      'en-GB',
      {
        day: '2-digit',
        month: 'short',
      }
    );
  }

  function getDaysUntilTrip(
    dateString: string
  ) {
    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const startDate =
      new Date(dateString);

    startDate.setHours(
      0,
      0,
      0,
      0
    );

    return Math.ceil(
      (
        startDate.getTime() -
        today.getTime()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        )
    );
  }

  function getTripStatus(
    trip: Trip
  ) {
    const now =
      new Date().getTime();

    const start =
      new Date(
        trip.startDate
      ).getTime();

    const end =
      new Date(
        trip.endDate
      ).getTime();

    if (
      now >= start &&
      now <= end
    ) {
      return 'Trip in progress';
    }

    if (start > now) {
      const days =
        getDaysUntilTrip(
          trip.startDate
        );

      if (days === 0) {
        return 'Starts today';
      }

      if (days === 1) {
        return 'Starts tomorrow';
      }

      return `${days} days to go`;
    }

    return 'Past trip';
  }

  function getTripImage(
    destination: string
  ) {
    const value =
      destination.toLowerCase();

    if (
      value.includes(
        'tokyo'
      ) ||
      value.includes(
        'japan'
      )
    ) {
      return 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80';
    }

    if (
      value.includes(
        'kyoto'
      )
    ) {
      return 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80';
    }

    if (
      value.includes(
        'paris'
      ) ||
      value.includes(
        'france'
      )
    ) {
      return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80';
    }

    if (
      value.includes(
        'singapore'
      )
    ) {
      return 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80';
    }

    if (
      value.includes(
        'bali'
      ) ||
      value.includes(
        'indonesia'
      )
    ) {
      return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80';
    }

    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80';
  }

  function openTrip() {
    if (!primaryTrip) {
      return;
    }

    router.push({
      pathname:
        '/trip/[id]',

      params: {
        id:
          primaryTrip.id,
      },
    });
  }

  const displayName =
    user?.displayName
      ?.trim()
      ?.split(' ')[0];

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* HEADER */}

        <View
          style={styles.header}
        >
          <View
            style={
              styles.brandContainer
            }
          >
            <View
              style={
                styles.logoIcon
              }
            >
              <Ionicons
                name="airplane"
                size={21}
                color="#FFFFFF"
              />
            </View>

            <View>
              <Text
                style={styles.logo}
              >
                BonVoyage
              </Text>

              <Text
                style={
                  styles.welcomeText
                }
              >
                {displayName
                  ? `Welcome back, ${displayName}`
                  : 'Plan smarter. Travel better.'}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.headerActions
            }
          >
            <Pressable
              style={
                styles.headerButton
              }
              onPress={() =>
                router.push(
                  '/explore'
                )
              }
            >
              <Ionicons
                name="search-outline"
                size={25}
                color="#111827"
              />
            </Pressable>

            <Pressable
              style={
                styles.profileButton
              }
              onPress={() =>
                router.push(
                  '/profile'
                )
              }
            >
              <Ionicons
                name="person-outline"
                size={23}
                color="#1769E8"
              />
            </Pressable>
          </View>
        </View>

        {/* CONTINUE PLANNING */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Continue planning
          </Text>

          <Pressable
            onPress={() =>
              router.push(
                '/trips'
              )
            }
          >
            <Text
              style={styles.seeAll}
            >
              See all
            </Text>
          </Pressable>
        </View>

        {tripLoading ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <ActivityIndicator />
          </View>
        ) : primaryTrip ? (
          <Pressable
            style={
              styles.tripCard
            }
            onPress={openTrip}
          >
            <Image
              source={{
                uri:
                  getTripImage(
                    primaryTrip.destination
                  ),
              }}
              style={
                styles.tripImage
              }
            />

            <View
              style={
                styles.tripContent
              }
            >
              <View
                style={
                  styles.statusRow
                }
              >
                <View
                  style={
                    styles.statusBadge
                  }
                >
                  <Text
                    style={
                      styles.statusText
                    }
                  >
                    {getTripStatus(
                      primaryTrip
                    )}
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.tripTitle
                }
                numberOfLines={1}
              >
                {primaryTrip.title}
              </Text>

              <View
                style={
                  styles.infoRow
                }
              >
                <Ionicons
                  name="location-outline"
                  size={15}
                  color="#6B7280"
                />

                <Text
                  style={
                    styles.infoText
                  }
                  numberOfLines={1}
                >
                  {
                    primaryTrip.destination
                  }
                </Text>
              </View>

              <View
                style={
                  styles.tripMetaRow
                }
              >
                <View
                  style={
                    styles.infoRow
                  }
                >
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color="#6B7280"
                  />

                  <Text
                    style={
                      styles.infoText
                    }
                  >
                    {formatDate(
                      primaryTrip.startDate
                    )}
                    {' - '}
                    {formatDate(
                      primaryTrip.endDate
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.activityCount
                  }
                >
                  <Ionicons
                    name="list-outline"
                    size={15}
                    color="#1769E8"
                  />

                  <Text
                    style={
                      styles.activityCountText
                    }
                  >
                    {activitiesLoading
                      ? '...'
                      : `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`}
                  </Text>
                </View>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color="#9CA3AF"
            />
          </Pressable>
        ) : (
          <Pressable
            style={
              styles.emptyTripCard
            }
            onPress={() =>
              router.push(
                '/create-trip'
              )
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="airplane-outline"
                size={28}
                color="#1769E8"
              />
            </View>

            <View
              style={
                styles.emptyTextContainer
              }
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                Start your first trip
              </Text>

              <Text
                style={
                  styles.emptySubtitle
                }
              >
                Create an itinerary and
                start organising your
                adventure.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color="#9CA3AF"
            />
          </Pressable>
        )}

        {/* QUICK ACTIONS */}

        <View
          style={
            styles.largeSectionHeader
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Plan your journey
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Quick access to your travel plans
          </Text>
        </View>

        <View style={styles.quickActionsGrid}>
          {/* MY TRIPS */}

          <Pressable
            style={styles.quickAction}
            onPress={() =>
              router.push('/trips')
            }
          >
            <View
              style={[
                styles.quickIcon,
                styles.blueIcon,
              ]}
            >
              <Ionicons
                name="airplane-outline"
                size={25}
                color="#1769E8"
              />
            </View>

            <Text style={styles.quickTitle}>
              My Trips
            </Text>

            <Text style={styles.quickDescription}>
              Manage trips
            </Text>
          </Pressable>

          {/* ADD ACTIVITY */}

          <Pressable
            style={styles.quickAction}
            onPress={() => {
              if (!primaryTrip) {
                Alert.alert(
                  'No Trip Yet',
                  'Create a trip before adding an activity.'
                );

                return;
              }

              router.push({
                pathname:
                  '/trip/[id]/add-activity',

                params: {
                  id: primaryTrip.id,
                },
              });
            }}
          >
            <View
              style={[
                styles.quickIcon,
                styles.purpleIcon,
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={24}
                color="#7C3AED"
              />
            </View>

            <Text style={styles.quickTitle}>
              Add Activity
            </Text>

            <Text style={styles.quickDescription}>
              Plan itinerary
            </Text>
          </Pressable>

          {/* TRIP MAP */}

          <Pressable
            style={styles.quickAction}
            onPress={() => {
              if (!primaryTrip) {
                Alert.alert(
                  'No Trip Yet',
                  'Create a trip before opening the trip map.'
                );

                return;
              }

              router.push({
                pathname:
                  '/trip/[id]/map',

                params: {
                  id: primaryTrip.id,
                },
              });
            }}
          >
            <View
              style={[
                styles.quickIcon,
                styles.greenIcon,
              ]}
            >
              <Ionicons
                name="map-outline"
                size={24}
                color="#059669"
              />
            </View>

            <Text style={styles.quickTitle}>
              Trip Map
            </Text>

            <Text style={styles.quickDescription}>
              View locations
            </Text>
          </Pressable>

          {/* SAVED */}

          <Pressable
            style={styles.quickAction}
            onPress={() =>
              router.push('/profile')
            }
          >
            <View
              style={[
                styles.quickIcon,
                styles.orangeIcon,
              ]}
            >
              <Ionicons
                name="bookmark-outline"
                size={24}
                color="#EA580C"
              />
            </View>

            <Text style={styles.quickTitle}>
              Saved
            </Text>

            <Text style={styles.quickDescription}>
              Places & guides
            </Text>
          </Pressable>
        </View>

        {/* TRAVEL INSPIRATION */}

        <View
          style={
            styles.inspirationHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Travel inspiration
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Discover your next
              destination
            </Text>
          </View>

          <Pressable
            onPress={() =>
              router.push(
                '/explore'
              )
            }
          >
            <Text
              style={styles.seeAll}
            >
              Explore
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.destinationList
          }
        >
          {destinations.map(
            destination => (
              <Pressable
                key={
                  destination.id
                }
                style={
                  styles.destinationCard
                }
                onPress={() =>
                  router.push(
                    '/explore'
                  )
                }
              >
                <Image
                  source={{
                    uri:
                      destination.image,
                  }}
                  style={
                    styles.destinationImage
                  }
                />

                <View
                  style={
                    styles.destinationContent
                  }
                >
                  <Text
                    style={
                      styles.destinationName
                    }
                  >
                    {
                      destination.name
                    }
                  </Text>

                  <View
                    style={
                      styles.destinationCountryRow
                    }
                  >
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color="#6B7280"
                    />

                    <Text
                      style={
                        styles.destinationCountry
                      }
                    >
                      {
                        destination.country
                      }
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.destinationDescription
                    }
                    numberOfLines={1}
                  >
                    {
                      destination.description
                    }
                  </Text>
                </View>
              </Pressable>
            )
          )}
        </ScrollView>

        {/* FUTURE SMART PLANNING */}

        <View
          style={
            styles.smartBanner
          }
        >
          <View
            style={
              styles.smartIcon
            }
          >
            <Text
              style={
                styles.smartEmoji
              }
            >
              ✨
            </Text>
          </View>

          <View
            style={
              styles.smartContent
            }
          >
            <Text
              style={
                styles.smartLabel
              }
            >
              BONVOYAGE SMART PLANNING
            </Text>

            <Text
              style={
                styles.smartTitle
              }
            >
              Smarter trips are coming
            </Text>

            <Text
              style={
                styles.smartDescription
              }
            >
              Personalised travel
              recommendations and
              itinerary assistance will
              help you plan faster.
            </Text>
          </View>
        </View>

        <View
          style={
            styles.bottomSpacing
          }
        />
      </ScrollView>

      {/* =====================================================
          FLOATING CREATE BUTTON
          Opens the BonVoyage creation menu.
      ====================================================== */}

      <Pressable
        style={
          styles.floatingCreateButton
        }
        onPress={() =>
          setCreateMenuVisible(
            true
          )
        }
        accessibilityRole="button"
        accessibilityLabel="Create"
      >
        <Ionicons
          name="add"
          size={31}
          color="#FFFFFF"
        />
      </Pressable>

      {/* =====================================================
          CREATE MENU
      ====================================================== */}

      <Modal
        visible={
          createMenuVisible
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setCreateMenuVisible(
            false
          )
        }
      >
        <View
          style={
            styles.createMenuBackdrop
          }
        >
          {/* Decorative soft background shapes */}

          <View
            style={
              styles.createMenuGlowTop
            }
          />

          <View
            style={
              styles.createMenuGlowBottom
            }
          />

          <SafeAreaView
            style={
              styles.createMenuSafeArea
            }
          >
            {/* CLOSE BUTTON */}

            <Pressable
              style={({ pressed }) => [
                styles.createMenuCloseButton,

                pressed &&
                  styles.createMenuPressed,
              ]}
              onPress={() =>
                setCreateMenuVisible(
                  false
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Close create menu"
            >
              <Ionicons
                name="close"
                size={27}
                color="#111827"
              />
            </Pressable>

            {/* CREATE OPTIONS */}

            <View
              style={
                styles.createMenuContent
              }
            >
              <Text
                style={
                  styles.createMenuHeading
                }
              >
                What would you like to create?
              </Text>

              <Text
                style={
                  styles.createMenuSubheading
                }
              >
                Plan, share and remember your travels.
              </Text>

              {/* PLAN TRIP */}

              <Pressable
                style={({ pressed }) => [
                  styles.createMenuCard,

                  pressed &&
                    styles.createMenuPressed,
                ]}
                onPress={() => {
                  setCreateMenuVisible(
                    false
                  );

                  setTimeout(
                    () => {
                      router.push(
                        '/create-trip'
                      );
                    },
                    120
                  );
                }}
              >
                <View
                  style={
                    styles.createMenuEmojiWrap
                  }
                >
                  <Text
                    style={
                      styles.createMenuEmoji
                    }
                  >
                    🧳
                  </Text>
                </View>

                <View
                  style={
                    styles.createMenuCardContent
                  }
                >
                  <Text
                    style={
                      styles.createMenuCardTitle
                    }
                  >
                    Plan your trip
                  </Text>

                  <Text
                    style={
                      styles.createMenuCardDescription
                    }
                  >
                    Choose places and build itineraries
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={21}
                  color="#9CA3AF"
                />
              </Pressable>

              {/* WRITE GUIDE */}

              <Pressable
                style={({ pressed }) => [
                  styles.createMenuCard,

                  pressed &&
                    styles.createMenuPressed,
                ]}
                onPress={() => {
                  setCreateMenuVisible(
                    false
                  );

                  setTimeout(
                    () => {
                      router.push(
                        '/create-guide'
                      );
                    },
                    120
                  );
                }}
              >
                <View
                  style={
                    styles.createMenuEmojiWrap
                  }
                >
                  <Text
                    style={
                      styles.createMenuEmoji
                    }
                  >
                    🧭
                  </Text>
                </View>

                <View
                  style={
                    styles.createMenuCardContent
                  }
                >
                  <Text
                    style={
                      styles.createMenuCardTitle
                    }
                  >
                    Write a travel guide
                  </Text>

                  <Text
                    style={
                      styles.createMenuCardDescription
                    }
                  >
                    Share tips and inspire others
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={21}
                  color="#9CA3AF"
                />
              </Pressable>
            </View>

            <Text
              style={
                styles.createMenuFooter
              }
            >
              BonVoyage
            </Text>
          </SafeAreaView>
        </View>
      </Modal>
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

      backgroundColor:
        '#FFFFFF',
    },

    content: {
      paddingTop: 8,

      paddingBottom: 120,
    },

    header: {
      paddingHorizontal: 22,

      paddingTop: 8,

      paddingBottom: 24,

      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems: 'center',
    },

    brandContainer: {
      flexDirection: 'row',

      alignItems: 'center',

      flex: 1,
    },

    logoIcon: {
      width: 42,

      height: 42,

      borderRadius: 13,

      backgroundColor:
        '#1769E8',

      alignItems: 'center',

      justifyContent:
        'center',

      marginRight: 10,

      transform: [
        {
          rotate: '-20deg',
        },
      ],
    },

    logo: {
      fontSize: 26,

      fontWeight: '800',

      color: '#1769E8',

      letterSpacing: -0.8,
    },

    welcomeText: {
      fontSize: 12,

      color: '#6B7280',

      marginTop: 2,
    },

    headerActions: {
      flexDirection: 'row',

      gap: 9,
    },

    headerButton: {
      width: 44,

      height: 44,

      borderRadius: 22,

      backgroundColor:
        '#F3F4F6',

      alignItems: 'center',

      justifyContent:
        'center',
    },

    profileButton: {
      width: 44,

      height: 44,

      borderRadius: 22,

      backgroundColor:
        '#EEF4FF',

      alignItems: 'center',

      justifyContent:
        'center',
    },

    sectionHeader: {
      paddingHorizontal: 22,

      marginBottom: 13,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },

    sectionTitle: {
      fontSize: 22,

      fontWeight: '800',

      color: '#111827',

      letterSpacing: -0.4,
    },

    sectionSubtitle: {
      fontSize: 13,

      color: '#6B7280',

      marginTop: 4,
    },

    seeAll: {
      color: '#1769E8',

      fontSize: 14,

      fontWeight: '700',
    },

    loadingContainer: {
      height: 125,

      justifyContent:
        'center',

      alignItems: 'center',
    },

    tripCard: {
      marginHorizontal: 22,

      marginBottom: 25,

      padding: 12,

      borderRadius: 18,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      backgroundColor:
        '#FFFFFF',

      flexDirection: 'row',

      alignItems: 'center',

      shadowColor: '#000',

      shadowOpacity: 0.05,

      shadowRadius: 8,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 2,
    },

    tripImage: {
      width: 91,

      height: 106,

      borderRadius: 14,
    },

    tripContent: {
      flex: 1,

      marginLeft: 13,
    },

    statusRow: {
      flexDirection: 'row',

      marginBottom: 6,
    },

    statusBadge: {
      backgroundColor:
        '#EEF4FF',

      borderRadius: 20,

      paddingVertical: 4,

      paddingHorizontal: 8,
    },

    statusText: {
      color: '#1769E8',

      fontWeight: '700',

      fontSize: 11,
    },

    tripTitle: {
      color: '#111827',

      fontSize: 18,

      fontWeight: '700',

      marginBottom: 6,
    },

    infoRow: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 4,
    },

    infoText: {
      color: '#6B7280',

      fontSize: 12,
    },

    tripMetaRow: {
      marginTop: 7,

      gap: 6,
    },

    activityCount: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 4,
    },

    activityCountText: {
      color: '#1769E8',

      fontSize: 12,

      fontWeight: '600',
    },

    emptyTripCard: {
      marginHorizontal: 22,

      marginBottom: 25,

      padding: 17,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 18,

      flexDirection: 'row',

      alignItems: 'center',
    },

    emptyIcon: {
      width: 53,

      height: 53,

      borderRadius: 15,

      backgroundColor:
        '#EEF4FF',

      alignItems: 'center',

      justifyContent:
        'center',

      marginRight: 13,
    },

    emptyTextContainer: {
      flex: 1,
    },

    emptyTitle: {
      color: '#111827',

      fontSize: 16,

      fontWeight: '700',
    },

    emptySubtitle: {
      color: '#6B7280',

      fontSize: 12,

      lineHeight: 17,

      marginTop: 3,
    },

    largeSectionHeader: {
      paddingHorizontal: 22,

      marginTop: 32,

      marginBottom: 15,
    },

    quickActionsGrid: {
      paddingHorizontal: 22,

      flexDirection: 'row',

      flexWrap: 'wrap',

      justifyContent:
        'space-between',

      rowGap: 10,
    },

    quickAction: {
      width: '48.5%',

      height: 126,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 16,

      padding: 12,

      backgroundColor:
        '#FFFFFF',
    },

    quickIcon: {
      width: 42,

      height: 42,

      borderRadius: 12,

      alignItems: 'center',

      justifyContent:
        'center',

      marginBottom: 11,
    },

    blueIcon: {
      backgroundColor:
        '#EEF4FF',
    },

    purpleIcon: {
      backgroundColor:
        '#F5F3FF',
    },

    greenIcon: {
      backgroundColor:
        '#ECFDF5',
    },

    orangeIcon: {
      backgroundColor:
        '#FFF7ED',
    },

    quickTitle: {
      color: '#111827',

      fontSize: 14,

      fontWeight: '700',
    },

    quickDescription: {
      color: '#6B7280',

      fontSize: 11,

      marginTop: 3,
    },

    inspirationHeader: {
      marginTop: 34,

      marginBottom: 15,

      paddingHorizontal: 22,

      flexDirection: 'row',

      alignItems: 'flex-end',

      justifyContent:
        'space-between',
    },

    destinationList: {
      paddingLeft: 22,

      paddingRight: 10,

      gap: 13,
    },

    destinationCard: {
      width: 225,

      borderRadius: 17,

      overflow: 'hidden',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      backgroundColor:
        '#FFFFFF',
    },

    destinationImage: {
      width: '100%',

      height: 140,
    },

    destinationContent: {
      padding: 13,
    },

    destinationName: {
      color: '#111827',

      fontSize: 18,

      fontWeight: '700',
    },

    destinationCountryRow: {
      marginTop: 4,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 3,
    },

    destinationCountry: {
      color: '#6B7280',

      fontSize: 12,
    },

    destinationDescription: {
      color: '#6B7280',

      fontSize: 12,

      marginTop: 7,
    },

    smartBanner: {
      marginHorizontal: 22,

      marginTop: 30,

      padding: 18,

      borderRadius: 18,

      backgroundColor:
        '#F5F8FF',

      flexDirection: 'row',

      alignItems: 'center',
    },

    smartIcon: {
      width: 52,

      height: 52,

      borderRadius: 16,

      backgroundColor:
        '#FFFFFF',

      alignItems: 'center',

      justifyContent:
        'center',

      marginRight: 13,
    },

    smartEmoji: {
      fontSize: 24,
    },

    smartContent: {
      flex: 1,
    },

    smartLabel: {
      color: '#1769E8',

      fontSize: 9,

      fontWeight: '800',

      letterSpacing: 0.8,
    },

    smartTitle: {
      color: '#111827',

      fontSize: 16,

      fontWeight: '700',

      marginTop: 3,
    },

    smartDescription: {
      color: '#6B7280',

      fontSize: 12,

      lineHeight: 17,

      marginTop: 4,
    },

    bottomSpacing: {
      height: 30,
    },

    // =======================================================
    // FLOATING CREATE TRIP BUTTON
    // =======================================================

    floatingCreateButton: {
      position: 'absolute',

      right: 22,

      /*
       * Keeps the button above the bottom tab bar.
       */
      bottom: 20,

      width: 58,

      height: 58,

      borderRadius: 29,

      backgroundColor:
        '#1769E8',

      alignItems: 'center',

      justifyContent:
        'center',

      elevation: 9,

      shadowColor: '#000',

      shadowOpacity: 0.22,

      shadowRadius: 9,

      shadowOffset: {
        width: 0,
        height: 4,
      },
    },

    // =======================================================
    // CREATE MENU
    // =======================================================

    createMenuBackdrop: {
      flex: 1,

      overflow: 'hidden',

      backgroundColor:
        '#FFF4EF',
    },

    /*
     * These two soft shapes imitate the peach / pink
     * background from the reference without requiring
     * another gradient package.
     */
    createMenuGlowTop: {
      position: 'absolute',

      top: 110,

      right: -120,

      width: 360,

      height: 360,

      borderRadius: 180,

      backgroundColor:
        '#FFE1D8',

      opacity: 0.8,
    },

    createMenuGlowBottom: {
      position: 'absolute',

      bottom: 40,

      left: -130,

      width: 390,

      height: 390,

      borderRadius: 195,

      backgroundColor:
        '#FFD7CB',

      opacity: 0.55,
    },

    createMenuSafeArea: {
      flex: 1,

      paddingHorizontal: 22,
    },

    createMenuCloseButton: {
      width: 50,

      height: 50,

      marginTop: 12,

      borderRadius: 25,

      alignItems: 'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(255,255,255,0.88)',

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.95)',

      shadowColor: '#000',

      shadowOpacity: 0.05,

      shadowRadius: 8,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 2,
    },

    createMenuContent: {
      flex: 1,

      justifyContent:
        'center',

      paddingBottom: 45,
    },

    createMenuHeading: {
      color: '#111827',

      fontSize: 27,

      fontWeight: '800',

      letterSpacing: -0.6,

      textAlign: 'center',
    },

    createMenuSubheading: {
      marginTop: 6,

      marginBottom: 25,

      color: '#6B7280',

      fontSize: 13,

      lineHeight: 19,

      textAlign: 'center',
    },

    createMenuCard: {
      minHeight: 112,

      marginBottom: 15,

      paddingHorizontal: 18,

      paddingVertical: 18,

      borderRadius: 25,

      borderWidth: 1.5,

      borderColor:
        'rgba(255,255,255,0.95)',

      backgroundColor:
        'rgba(255,255,255,0.82)',

      flexDirection: 'row',

      alignItems: 'center',

      shadowColor: '#000',

      shadowOpacity: 0.035,

      shadowRadius: 10,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      elevation: 2,
    },

    createMenuPressed: {
      opacity: 0.72,

      transform: [
        {
          scale: 0.985,
        },
      ],
    },

    createMenuEmojiWrap: {
      width: 60,

      height: 60,

      marginRight: 14,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    createMenuEmoji: {
      fontSize: 39,
    },

    createMenuCardContent: {
      flex: 1,

      paddingRight: 8,
    },

    createMenuCardTitle: {
      color: '#111827',

      fontSize: 20,

      fontWeight: '800',

      letterSpacing: -0.3,
    },

    createMenuCardDescription: {
      marginTop: 5,

      color: '#6B7280',

      fontSize: 13,

      lineHeight: 19,
    },

    createMenuFooter: {
      position: 'absolute',

      left: 0,

      right: 0,

      bottom: 16,

      color: '#9CA3AF',

      fontSize: 11,

      fontWeight: '700',

      letterSpacing: 0.8,

      textAlign: 'center',
    },
  });