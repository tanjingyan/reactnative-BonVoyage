import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';

import {
  auth,
  db,
} from '@/firebase/firebaseConfig';

// ==========================================================
// TYPES
// ==========================================================

type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
};

type TripStatus =
  | 'upcoming'
  | 'ongoing'
  | 'past';

type FilterTab =
  | 'upcoming'
  | 'ongoing'
  | 'past';

// ==========================================================
// MAIN SCREEN
// ==========================================================

export default function TripsScreen() {
  const [trips, setTrips] =
    useState<Trip[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    deletingTripId,
    setDeletingTripId,
  ] =
    useState<string | null>(
      null
    );

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<FilterTab>(
      'upcoming'
    );

  // ========================================================
  // FIRESTORE
  // ========================================================

  useEffect(() => {
    const user =
      auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const tripsQuery =
      query(
        collection(
          db,
          'trips'
        ),
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

          tripList.sort(
            compareTrips
          );

          setTrips(
            tripList
          );

          setLoading(
            false
          );
        },

        error => {
          console.log(
            'Trips read error:',
            error
          );

          setLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, []);

  // ========================================================
  // COUNTS / FILTERING
  // ========================================================

  const counts =
    useMemo(() => {
      return {
        upcoming:
          trips.filter(
            trip =>
              getTripStatus(
                trip.startDate,
                trip.endDate
              ) ===
              'upcoming'
          ).length,

        ongoing:
          trips.filter(
            trip =>
              getTripStatus(
                trip.startDate,
                trip.endDate
              ) ===
              'ongoing'
          ).length,

        past:
          trips.filter(
            trip =>
              getTripStatus(
                trip.startDate,
                trip.endDate
              ) ===
              'past'
          ).length,
      };
    }, [trips]);

  const filteredTrips =
    useMemo(() => {
      return trips.filter(
        trip =>
          getTripStatus(
            trip.startDate,
            trip.endDate
          ) ===
          activeTab
      );
    }, [
      activeTab,
      trips,
    ]);

  // ========================================================
  // DELETE TRIP
  // ========================================================

  function confirmDeleteTrip(
    trip: Trip
  ) {
    if (
      deletingTripId
    ) {
      return;
    }

    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${trip.title}"?\n\nThis will also delete all activities in this itinerary.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style:
            'destructive',

          onPress: () =>
            void deleteTrip(
              trip.id
            ),
        },
      ]
    );
  }

  async function deleteTrip(
    tripId: string
  ) {
    const user =
      auth.currentUser;

    if (!user) {
      Alert.alert(
        'Login required',
        'Please log in again before deleting a trip.'
      );

      return;
    }

    try {
      setDeletingTripId(
        tripId
      );

      /*
       * Firestore does not automatically remove
       * subcollections when the parent trip is deleted,
       * so remove activities first.
       */

      const activitiesSnapshot =
        await getDocs(
          collection(
            db,
            'trips',
            tripId,
            'activities'
          )
        );

      const activityDocs =
        activitiesSnapshot.docs;

      const batchSize =
        450;

      for (
        let index = 0;
        index <
        activityDocs.length;
        index += batchSize
      ) {
        const batch =
          writeBatch(db);

        activityDocs
          .slice(
            index,
            index +
              batchSize
          )
          .forEach(
            activityDocument => {
              batch.delete(
                activityDocument.ref
              );
            }
          );

        await batch.commit();
      }

      /*
       * Delete the trip only after all activities
       * have been removed.
       */

      const tripBatch =
        writeBatch(db);

      tripBatch.delete(
        doc(
          db,
          'trips',
          tripId
        )
      );

      await tripBatch.commit();

      Alert.alert(
        'Trip deleted',
        'The trip has been removed successfully.'
      );
    } catch (error) {
      console.error(
        'Delete trip error:',
        error
      );

      Alert.alert(
        'Unable to delete trip',
        'BonVoyage could not delete this trip. Please try again.'
      );
    } finally {
      setDeletingTripId(
        null
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
      <SafeAreaView
        style={
          styles.safeArea
        }
        edges={['top']}
      >
        {/* ================================================= */}
        {/* HEADER                                            */}
        {/* ================================================= */}

        <View
          style={
            styles.header
          }
        >
          <Text
            style={
              styles.title
            }
          >
            My Trips
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Your private journeys, all in one place
          </Text>
        </View>

        {/* ================================================= */}
        {/* PRIVATE TRIPS BANNER                              */}
        {/* ================================================= */}

        {!loading &&
        trips.length > 0 ? (
          <View
            style={
              styles.privateBanner
            }
          >
            <View
              style={
                styles.privateIconContainer
              }
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#4F46E5"
              />
            </View>

            <View
              style={
                styles.privateTextContainer
              }
            >
              <Text
                style={
                  styles.privateTitle
                }
              >
                Private trips
              </Text>

              <Text
                style={
                  styles.privateDescription
                }
              >
                Only you can see your personal itineraries
              </Text>
            </View>

            <View
              style={
                styles.tripCountBadge
              }
            >
              <Text
                style={
                  styles.tripCountText
                }
              >
                {trips.length}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ================================================= */}
        {/* STATUS FILTER TABS                                */}
        {/* ================================================= */}

        {!loading &&
        trips.length > 0 ? (
          <View
            style={
              styles.tabsRow
            }
          >
            <FilterButton
              title="Upcoming"
              active={
                activeTab ===
                'upcoming'
              }
              onPress={() =>
                setActiveTab(
                  'upcoming'
                )
              }
            />

            <FilterButton
              title="In Progress"
              active={
                activeTab ===
                'ongoing'
              }
              onPress={() =>
                setActiveTab(
                  'ongoing'
                )
              }
            />

            <FilterButton
              title={
                counts.past >
                0
                  ? `Past ${counts.past}`
                  : 'Past'
              }
              active={
                activeTab ===
                'past'
              }
              onPress={() =>
                setActiveTab(
                  'past'
                )
              }
            />
          </View>
        ) : null}

        {/* ================================================= */}
        {/* CONTENT                                           */}
        {/* ================================================= */}

        {loading ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <ActivityIndicator
              size="large"
              color="#4F46E5"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading your trips...
            </Text>
          </View>
        ) : trips.length ===
          0 ? (
          <EmptyTrips />
        ) : (
          <>
            <FlatList
              style={
                styles.listContainer
              }
              data={
                filteredTrips
              }
              keyExtractor={
                item =>
                  item.id
              }
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                filteredTrips.length >
                0
                  ? styles.list
                  : styles.emptyFilteredList
              }
              renderItem={({
                item,
              }) => (
                <SwipeTripCard
                  trip={
                    item
                  }
                  deleting={
                    deletingTripId ===
                    item.id
                  }
                  onDelete={() =>
                    confirmDeleteTrip(
                      item
                    )
                  }
                />
              )}
              ListEmptyComponent={
                <FilteredEmptyState
                  status={
                    activeTab
                  }
                />
              }
            />

            {/* ============================================= */}
            {/* SWIPE HINT                                    */}
            {/* ============================================= */}

            <View
              style={
                styles.swipeHint
              }
            >
              <Ionicons
                name="search-outline"
                size={16}
                color="#6B7280"
              />

              <Text
                style={
                  styles.swipeHintText
                }
              >
                Swipe left on a trip to delete it
              </Text>
            </View>

            {/* ============================================= */}
            {/* CREATE NEW TRIP                               */}
            {/* ============================================= */}

            <Pressable
              style={({
                pressed,
              }) => [
                styles.createTripButton,

                pressed &&
                  styles.createTripButtonPressed,
              ]}
              onPress={() =>
                router.push(
                  '/create-trip'
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Create new trip"
            >
              <Ionicons
                name="add"
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.createTripButtonText
                }
              >
                Create new trip
              </Text>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

// ==========================================================
// FILTER BUTTON
// ==========================================================

function FilterButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={
        styles.filterButton
      }
      onPress={
        onPress
      }
    >
      <Text
        style={[
          styles.filterText,

          active &&
            styles.filterTextActive,
        ]}
      >
        {title}
      </Text>

      {active ? (
        <View
          style={
            styles.filterUnderline
          }
        />
      ) : null}
    </Pressable>
  );
}

// ==========================================================
// SWIPEABLE TRIP CARD
// ==========================================================

function SwipeTripCard({
  trip,
  deleting,
  onDelete,
}: {
  trip: Trip;
  deleting: boolean;
  onDelete: () => void;
}) {
  const translateX =
    useRef(
      new Animated.Value(
        0
      )
    ).current;

  const swipeOpen =
    useRef(false);

  const [
    imageFailed,
    setImageFailed,
  ] =
    useState(false);

  const status =
    getTripStatus(
      trip.startDate,
      trip.endDate
    );

  const duration =
    getTripDuration(
      trip.startDate,
      trip.endDate
    );

  function closeSwipe() {
    swipeOpen.current =
      false;

    Animated.spring(
      translateX,
      {
        toValue: 0,
        useNativeDriver:
          true,
        bounciness: 0,
      }
    ).start();
  }

  function openSwipe() {
    swipeOpen.current =
      true;

    Animated.spring(
      translateX,
      {
        toValue: -82,
        useNativeDriver:
          true,
        bounciness: 0,
      }
    ).start();
  }

  const panResponder =
    useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponder:
            (
              _event,
              gesture
            ) => {
              return (
                Math.abs(
                  gesture.dx
                ) > 8 &&
                Math.abs(
                  gesture.dx
                ) >
                  Math.abs(
                    gesture.dy
                  )
              );
            },

          onPanResponderMove:
            (
              _event,
              gesture
            ) => {
              let nextX =
                gesture.dx;

              if (
                swipeOpen.current
              ) {
                nextX =
                  -82 +
                  gesture.dx;
              }

              const clamped =
                Math.max(
                  -92,
                  Math.min(
                    0,
                    nextX
                  )
                );

              translateX.setValue(
                clamped
              );
            },

          onPanResponderRelease:
            (
              _event,
              gesture
            ) => {
              if (
                gesture.dx <
                  -35 ||
                (
                  swipeOpen.current &&
                  gesture.dx <
                    25
                )
              ) {
                openSwipe();
              } else {
                closeSwipe();
              }
            },

          onPanResponderTerminate:
            () => {
              closeSwipe();
            },
        }),
      [translateX]
    );

  function openTrip() {
    if (
      swipeOpen.current
    ) {
      closeSwipe();
      return;
    }

    router.push({
      pathname:
        '/trip/[id]',

      params: {
        id: trip.id,
      },
    });
  }

  return (
    <View
      style={
        styles.swipeContainer
      }
    >
      {/* =================================================== */}
      {/* DELETE ACTION BEHIND CARD                           */}
      {/* =================================================== */}

      <Pressable
        style={({
          pressed,
        }) => [
          styles.deleteAction,

          pressed &&
          !deleting &&
            styles.deleteActionPressed,
        ]}
        disabled={
          deleting
        }
        onPress={
          onDelete
        }
        accessibilityRole="button"
        accessibilityLabel={`Delete ${trip.title}`}
      >
        {deleting ? (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />
        ) : (
          <>
            <Ionicons
              name="trash-outline"
              size={22}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.deleteActionText
              }
            >
              Delete
            </Text>
          </>
        )}
      </Pressable>

      {/* =================================================== */}
      {/* MOVING CARD                                         */}
      {/* =================================================== */}

      <Animated.View
        style={{
          transform: [
            {
              translateX,
            },
          ],
        }}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={({
            pressed,
          }) => [
            styles.tripCard,

            pressed &&
              styles.tripCardPressed,
          ]}
          onPress={
            openTrip
          }
        >
          {/* IMAGE */}

          {!imageFailed ? (
            <Image
              source={{
                uri:
                  getTripImage(
                    trip.destination
                  ),
              }}
              style={
                styles.tripImage
              }
              resizeMode="cover"
              onError={() =>
                setImageFailed(
                  true
                )
              }
            />
          ) : (
            <View
              style={
                styles.tripImagePlaceholder
              }
            >
              <Ionicons
                name="image-outline"
                size={24}
                color="#9CA3AF"
              />
            </View>
          )}

          {/* INFO */}

          <View
            style={
              styles.tripContent
            }
          >
            <CompactStatusBadge
              status={
                status
              }
            />

            <Text
              style={
                styles.tripTitle
              }
              numberOfLines={
                1
              }
            >
              {trip.title}
            </Text>

            <Text
              style={
                styles.tripMetaText
              }
              numberOfLines={
                1
              }
            >
              {formatTripDateRange(
                trip.startDate,
                trip.endDate
              )}
              {'  ·  '}
              {duration}{' '}
              {duration === 1
                ? 'day'
                : 'days'}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#B7BCC8"
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ==========================================================
// STATUS BADGE
// ==========================================================

function CompactStatusBadge({
  status,
}: {
  status: TripStatus;
}) {
  if (
    status ===
    'ongoing'
  ) {
    return (
      <View
        style={[
          styles.statusBadge,
          styles.ongoingBadge,
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            styles.ongoingText,
          ]}
        >
          In progress
        </Text>
      </View>
    );
  }

  if (
    status ===
    'upcoming'
  ) {
    return (
      <View
        style={[
          styles.statusBadge,
          styles.upcomingBadge,
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            styles.upcomingText,
          ]}
        >
          Upcoming
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.statusBadge,
        styles.pastBadge,
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          styles.pastText,
        ]}
      >
        Past
      </Text>
    </View>
  );
}

// ==========================================================
// EMPTY STATES
// ==========================================================

function EmptyTrips() {
  return (
    <View
      style={
        styles.emptyContainer
      }
    >
      <View
        style={
          styles.emptyIconContainer
        }
      >
        <Ionicons
          name="airplane-outline"
          size={36}
          color="#4F46E5"
        />
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        No trips yet
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        Start planning your next adventure by creating your first private itinerary.
      </Text>

      <Pressable
        style={({
          pressed,
        }) => [
          styles.emptyButton,

          pressed &&
            styles.createTripButtonPressed,
        ]}
        onPress={() =>
          router.push(
            '/create-trip'
          )
        }
      >
        <Ionicons
          name="add"
          size={20}
          color="#FFFFFF"
        />

        <Text
          style={
            styles.emptyButtonText
          }
        >
          Create a trip
        </Text>
      </Pressable>
    </View>
  );
}

function FilteredEmptyState({
  status,
}: {
  status: FilterTab;
}) {
  const message =
    status ===
    'upcoming'
      ? 'No upcoming trips'
      : status ===
          'ongoing'
        ? 'No trips in progress'
        : 'No past trips';

  return (
    <View
      style={
        styles.filteredEmpty
      }
    >
      <Ionicons
        name="airplane-outline"
        size={28}
        color="#B7BCC8"
      />

      <Text
        style={
          styles.filteredEmptyText
        }
      >
        {message}
      </Text>
    </View>
  );
}

// ==========================================================
// DATE / STATUS HELPERS
// ==========================================================

function startOfDay(
  value: Date
) {
  const date =
    new Date(value);

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function getTripStatus(
  startDateString: string,
  endDateString: string
): TripStatus {
  const today =
    startOfDay(
      new Date()
    );

  const startDate =
    startOfDay(
      new Date(
        startDateString
      )
    );

  const endDate =
    startOfDay(
      new Date(
        endDateString
      )
    );

  if (
    today <
    startDate
  ) {
    return 'upcoming';
  }

  if (
    today >
    endDate
  ) {
    return 'past';
  }

  return 'ongoing';
}

function getTripDuration(
  startDateString: string,
  endDateString: string
) {
  const startDate =
    startOfDay(
      new Date(
        startDateString
      )
    );

  const endDate =
    startOfDay(
      new Date(
        endDateString
      )
    );

  const millisecondsPerDay =
    1000 *
    60 *
    60 *
    24;

  const difference =
    endDate.getTime() -
    startDate.getTime();

  return Math.max(
    Math.round(
      difference /
        millisecondsPerDay
    ) + 1,
    1
  );
}

function formatTripDateRange(
  startDateString: string,
  endDateString: string
) {
  const start =
    new Date(
      startDateString
    );

  const end =
    new Date(
      endDateString
    );

  const startText =
    start.toLocaleDateString(
      'en-GB',
      {
        day:
          '2-digit',
        month:
          'short',
      }
    );

  const endText =
    end.toLocaleDateString(
      'en-GB',
      {
        day:
          '2-digit',
        month:
          'short',
        year:
          'numeric',
      }
    );

  return `${startText} – ${endText}`;
}

function compareTrips(
  first: Trip,
  second: Trip
) {
  const firstStatus =
    getTripStatus(
      first.startDate,
      first.endDate
    );

  const secondStatus =
    getTripStatus(
      second.startDate,
      second.endDate
    );

  const priority: Record<
    TripStatus,
    number
  > = {
    ongoing: 0,
    upcoming: 1,
    past: 2,
  };

  if (
    priority[firstStatus] !==
    priority[secondStatus]
  ) {
    return (
      priority[firstStatus] -
      priority[secondStatus]
    );
  }

  const firstStart =
    new Date(
      first.startDate
    ).getTime();

  const secondStart =
    new Date(
      second.startDate
    ).getTime();

  if (
    firstStatus ===
    'upcoming'
  ) {
    return (
      firstStart -
      secondStart
    );
  }

  if (
    firstStatus ===
    'past'
  ) {
    return (
      secondStart -
      firstStart
    );
  }

  return (
    firstStart -
    secondStart
  );
}

// ==========================================================
// TRIP IMAGE
// ==========================================================

function getTripImage(
  destination: string
) {
  const value =
    destination
      .toLowerCase()
      .trim();

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
      'singapore'
    )
  ) {
    return 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80';
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
      'bali'
    ) ||
    value.includes(
      'indonesia'
    )
  ) {
    return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80';
  }

  if (
    value.includes(
      'seoul'
    ) ||
    value.includes(
      'korea'
    )
  ) {
    return 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=900&q=80';
  }

  if (
    value.includes(
      'london'
    ) ||
    value.includes(
      'england'
    )
  ) {
    return 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80';
  }

  return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80';
}

// ==========================================================
// STYLES
// ==========================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor:
        '#FFFFFF',
    },

    safeArea: {
      flex: 1,

      paddingHorizontal:
        20,
    },

    // ------------------------------------------------------
    // HEADER
    // ------------------------------------------------------

    header: {
      paddingTop: 20,

      paddingBottom:
        18,
    },

    title: {
      fontSize: 34,

      lineHeight: 40,

      fontWeight:
        '800',

      letterSpacing:
        -0.8,

      color:
        '#0F172A',
    },

    subtitle: {
      marginTop: 3,

      fontSize: 13,

      color:
        '#6B7280',
    },

    // ------------------------------------------------------
    // PRIVATE BANNER
    // ------------------------------------------------------

    privateBanner: {
      minHeight: 76,

      paddingHorizontal:
        14,

      paddingVertical:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius:
        18,

      backgroundColor:
        '#F0F0FF',
    },

    privateIconContainer: {
      width: 42,

      height: 42,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        13,

      backgroundColor:
        '#FFFFFF',
    },

    privateTextContainer: {
      flex: 1,

      marginLeft: 12,

      paddingRight: 8,
    },

    privateTitle: {
      fontSize: 13,

      fontWeight:
        '800',

      color:
        '#111827',
    },

    privateDescription: {
      marginTop: 2,

      fontSize: 11,

      lineHeight: 15,

      color:
        '#6B7280',
    },

    tripCountBadge: {
      minWidth: 34,

      height: 34,

      paddingHorizontal:
        8,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        17,

      backgroundColor:
        '#FFFFFF',
    },

    tripCountText: {
      fontSize: 13,

      fontWeight:
        '800',

      color:
        '#4F46E5',
    },

    // ------------------------------------------------------
    // FILTER TABS
    // ------------------------------------------------------

    tabsRow: {
      height: 52,

      marginTop: 8,

      flexDirection:
        'row',

      alignItems:
        'flex-end',

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        '#D1D5DB',
    },

    filterButton: {
      flex: 1,

      height: 52,

      alignItems:
        'center',

      justifyContent:
        'flex-end',
    },

    filterText: {
      paddingBottom:
        12,

      fontSize: 14,

      fontWeight:
        '500',

      color:
        '#4B5563',
    },

    filterTextActive: {
      fontWeight:
        '700',

      color:
        '#111827',
    },

    filterUnderline: {
      position:
        'absolute',

      bottom: -1,

      width: '78%',

      height: 2,

      backgroundColor:
        '#4F46E5',
    },

    // ------------------------------------------------------
    // LIST
    // ------------------------------------------------------

    listContainer: {
      flex: 1,
    },

    list: {
      paddingTop: 16,

      paddingBottom:
        14,

      gap: 10,
    },

    emptyFilteredList: {
      flexGrow: 1,
    },

    // ------------------------------------------------------
    // SWIPE CARD
    // ------------------------------------------------------

    swipeContainer: {
      position:
        'relative',

      overflow:
        'hidden',

      borderRadius:
        15,

      backgroundColor:
        '#EF5350',
    },

    deleteAction: {
      position:
        'absolute',

      top: 0,

      right: 0,

      bottom: 0,

      width: 82,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#EF5350',
    },

    deleteActionPressed: {
      opacity: 0.8,
    },

    deleteActionText: {
      marginTop: 3,

      fontSize: 10,

      fontWeight:
        '700',

      color:
        '#FFFFFF',
    },

    tripCard: {
      minHeight: 84,

      paddingHorizontal:
        12,

      paddingVertical:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#E3E6ED',

      borderRadius:
        15,

      backgroundColor:
        '#FFFFFF',

      shadowColor:
        '#000000',

      shadowOpacity:
        0.035,

      shadowRadius: 4,

      shadowOffset: {
        width: 0,

        height: 2,
      },

      elevation: 1,
    },

    tripCardPressed: {
      opacity: 0.82,
    },

    tripImage: {
      width: 62,

      height: 62,

      borderRadius:
        12,

      backgroundColor:
        '#E5E7EB',
    },

    tripImagePlaceholder: {
      width: 62,

      height: 62,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        12,

      backgroundColor:
        '#E5E7EB',
    },

    tripContent: {
      flex: 1,

      minWidth: 0,

      marginLeft: 12,

      marginRight: 8,
    },

    statusBadge: {
      alignSelf:
        'flex-start',

      paddingHorizontal:
        8,

      paddingVertical:
        3,

      borderRadius:
        10,
    },

    statusBadgeText: {
      fontSize: 9,

      fontWeight:
        '700',
    },

    upcomingBadge: {
      backgroundColor:
        '#ECEBFF',
    },

    upcomingText: {
      color:
        '#4F46E5',
    },

    ongoingBadge: {
      backgroundColor:
        '#ECFDF5',
    },

    ongoingText: {
      color:
        '#047857',
    },

    pastBadge: {
      backgroundColor:
        '#F3F4F6',
    },

    pastText: {
      color:
        '#6B7280',
    },

    tripTitle: {
      marginTop: 3,

      fontSize: 16,

      fontWeight:
        '800',

      color:
        '#111827',
    },

    tripMetaText: {
      marginTop: 3,

      fontSize: 11,

      color:
        '#4B5563',
    },

    // ------------------------------------------------------
    // SWIPE HINT
    // ------------------------------------------------------

    swipeHint: {
      minHeight: 42,

      marginTop: 4,

      marginBottom:
        14,

      paddingHorizontal:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderStyle:
        'dashed',

      borderColor:
        '#D7DAE2',

      borderRadius:
        13,
    },

    swipeHintText: {
      marginLeft: 8,

      fontSize: 11,

      color:
        '#6B7280',
    },

    // ------------------------------------------------------
    // CREATE TRIP
    // ------------------------------------------------------

    createTripButton: {
      minHeight: 52,

      marginBottom:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        13,

      backgroundColor:
        '#4F46E5',

      shadowColor:
        '#4F46E5',

      shadowOpacity:
        0.22,

      shadowRadius:
        10,

      shadowOffset: {
        width: 0,

        height: 5,
      },

      elevation: 5,
    },

    createTripButtonPressed: {
      opacity: 0.78,

      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    createTripButtonText: {
      marginLeft: 7,

      fontSize: 14,

      fontWeight:
        '800',

      color:
        '#FFFFFF',
    },

    // ------------------------------------------------------
    // LOADING
    // ------------------------------------------------------

    loadingContainer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingBottom:
        100,
    },

    loadingText: {
      marginTop: 12,

      fontSize: 12,

      color:
        '#9CA3AF',
    },

    // ------------------------------------------------------
    // EMPTY STATES
    // ------------------------------------------------------

    emptyContainer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,

      paddingBottom:
        100,
    },

    emptyIconContainer: {
      width: 76,

      height: 76,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        24,

      backgroundColor:
        '#EEEEFF',
    },

    emptyTitle: {
      marginTop: 18,

      fontSize: 20,

      fontWeight:
        '800',

      color:
        '#111827',
    },

    emptyText: {
      marginTop: 7,

      maxWidth: 270,

      textAlign:
        'center',

      fontSize: 13,

      lineHeight: 19,

      color:
        '#6B7280',
    },

    emptyButton: {
      minHeight: 48,

      marginTop: 20,

      paddingHorizontal:
        20,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        13,

      backgroundColor:
        '#4F46E5',
    },

    emptyButtonText: {
      marginLeft: 6,

      fontSize: 13,

      fontWeight:
        '800',

      color:
        '#FFFFFF',
    },

    filteredEmpty: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        40,
    },

    filteredEmptyText: {
      marginTop: 8,

      fontSize: 13,

      fontWeight:
        '600',

      color:
        '#9CA3AF',
    },
  });
