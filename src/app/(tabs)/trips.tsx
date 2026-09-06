import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
              doc => ({
                id: doc.id,

                ...(doc.data() as Omit<
                  Trip,
                  'id'
                >),
              })
            );

          // Sort trips:
          // In progress → Upcoming → Past
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
          style: 'destructive',
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
       * subcollections when the parent document is deleted,
       * so the activities are removed first.
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

      /*
       * Firestore batches support up to 500 operations.
       * This app's personal itineraries are far below that,
       * but chunking keeps the deletion safe if a trip grows.
       */
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
       * Delete the trip only after its activities
       * have been removed successfully.
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

      /*
       * onSnapshot() automatically removes the deleted trip
       * from the list, so no manual setTrips() is required.
       */
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
          <View
            style={
              styles.headerTextContainer
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
              Your private journeys,
              all in one place.
            </Text>
          </View>

        </View>

        {/* ================================================= */}
        {/* PRIVATE TRIP INFO                                 */}
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
                color="#1769E8"
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
                Only you can see your
                personal itineraries.
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
        {/* LOADING                                           */}
        {/* ================================================= */}

        {loading ? (
          <View
            style={
              styles.loadingContainer
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
              Loading your trips...
            </Text>
          </View>
        ) : trips.length ===
          0 ? (
          // =================================================
          // EMPTY STATE
          // =================================================

          <EmptyTrips />
        ) : (
          // =================================================
          // TRIPS LIST
          // =================================================

          <FlatList
            data={trips}
            keyExtractor={
              item =>
                item.id
            }
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.list
            }
            renderItem={({
              item,
            }) => (
              <TripCard
                trip={item}
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
            ListFooterComponent={
              <Pressable
                style={({ pressed }) => [
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
                  size={18}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.createTripButtonText
                  }
                >
                  CREATE NEW TRIP
                </Text>
              </Pressable>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// ==========================================================
// TRIP CARD
// ==========================================================

function TripCard({
  trip,
  deleting,
  onDelete,
}: {
  trip: Trip;
  deleting: boolean;
  onDelete: () => void;
}) {
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

  function openTrip() {
    router.push({
      pathname:
        '/trip/[id]',

      params: {
        id: trip.id,
      },
    });
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tripCard,

        pressed &&
          styles.tripCardPressed,
      ]}
      onPress={
        openTrip
      }
    >
      {/* =================================================== */}
      {/* DESTINATION IMAGE                                   */}
      {/* =================================================== */}

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
      />

      {/* =================================================== */}
      {/* TRIP INFORMATION                                    */}
      {/* =================================================== */}

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
          <CompactStatusBadge
            status={
              status
            }
          />
        </View>

        <Text
          style={
            styles.tripTitle
          }
          numberOfLines={1}
        >
          {trip.title}
        </Text>

        <View
          style={
            styles.infoRow
          }
        >
          <Ionicons
            name="location-outline"
            size={13}
            color="#6B7280"
          />

          <Text
            style={
              styles.infoText
            }
            numberOfLines={1}
          >
            {trip.destination}
          </Text>
        </View>

        <View
          style={
            styles.infoRow
          }
        >
          <Ionicons
            name="calendar-outline"
            size={13}
            color="#6B7280"
          />

          <Text
            style={
              styles.infoText
            }
            numberOfLines={1}
          >
            {formatTripDateShort(
              trip.startDate
            )}
            {' - '}
            {formatTripDateShort(
              trip.endDate
            )}
          </Text>
        </View>

        <View
          style={
            styles.durationRow
          }
        >
          <Ionicons
            name="time-outline"
            size={13}
            color="#1769E8"
          />

          <Text
            style={
              styles.durationText
            }
          >
            {duration}{' '}
            {duration === 1
              ? 'day'
              : 'days'}
          </Text>
        </View>
      </View>

      {/* =================================================== */}
      {/* ACTIONS                                             */}
      {/* =================================================== */}

      <View
        style={
          styles.cardActions
        }
      >
        <Pressable
          style={({ pressed }) => [
            styles.deleteTripButton,

            pressed &&
            !deleting &&
              styles.deleteTripButtonPressed,

            deleting &&
              styles.deleteTripButtonDisabled,
          ]}
          disabled={
            deleting
          }
          onPress={event => {
            /*
             * The entire trip card is tappable.
             * Prevent deleting from also opening Trip Details.
             */
            event.stopPropagation();

            onDelete();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${trip.title}`}
        >
          {deleting ? (
            <ActivityIndicator
              size="small"
              color="#DC2626"
            />
          ) : (
            <Ionicons
              name="trash-outline"
              size={16}
              color="#DC2626"
            />
          )}
        </Pressable>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#9CA3AF"
        />
      </View>
    </Pressable>
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
          styles.compactStatusBadge,
          styles.ongoingBadge,
        ]}
      >
        <Text
          style={[
            styles.compactStatusText,
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
          styles.compactStatusBadge,
          styles.upcomingBadge,
        ]}
      >
        <Text
          style={[
            styles.compactStatusText,
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
        styles.compactStatusBadge,
        styles.pastTripBadge,
      ]}
    >
      <Text
        style={[
          styles.compactStatusText,
          styles.pastTripText,
        ]}
      >
        Past trip
      </Text>
    </View>
  );
}


function StatusBadge({
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
        <View
          style={[
            styles.statusDot,
            styles.ongoingDot,
          ]}
        />

        <Text
          style={[
            styles.statusText,
            styles.ongoingText,
          ]}
        >
          IN PROGRESS
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
        <View
          style={[
            styles.statusDot,
            styles.upcomingDot,
          ]}
        />

        <Text
          style={[
            styles.statusText,
            styles.upcomingText,
          ]}
        >
          UPCOMING
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
      <View
        style={[
          styles.statusDot,
          styles.pastDot,
        ]}
      />

      <Text
        style={[
          styles.statusText,
          styles.pastText,
        ]}
      >
        PAST
      </Text>
    </View>
  );
}

// ==========================================================
// EMPTY STATE
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
          color="#1769E8"
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
        Start planning your next
        adventure by creating your
        first private itinerary.
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.emptyButton,

          pressed &&
            styles.buttonPressed,
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

// ==========================================================
// FORMAT DATE
// ==========================================================

function formatTripDate(
  dateString: string
) {
  const date =
    new Date(
      dateString
    );

  return date.toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}


function formatTripDateShort(
  dateString: string
) {
  const date =
    new Date(
      dateString
    );

  return date.toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
    }
  );
}

// ==========================================================
// START OF DAY
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

// ==========================================================
// GET TRIP STATUS
// ==========================================================

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

// ==========================================================
// GET TRIP DURATION
// ==========================================================

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

  const duration =
    Math.round(
      difference /
        millisecondsPerDay
    ) + 1;

  return Math.max(
    duration,
    1
  );
}

// ==========================================================
// RELATIVE TRIP TEXT
// ==========================================================

function getRelativeTripText(
  startDateString: string,
  endDateString: string
) {
  const status =
    getTripStatus(
      startDateString,
      endDateString
    );

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

  const millisecondsPerDay =
    1000 *
    60 *
    60 *
    24;

  // --------------------------------------------------------
  // CURRENT TRIP
  // --------------------------------------------------------

  if (
    status ===
    'ongoing'
  ) {
    return 'Travelling now';
  }

  // --------------------------------------------------------
  // UPCOMING TRIP
  // --------------------------------------------------------

  if (
    status ===
    'upcoming'
  ) {
    const daysUntil =
      Math.round(
        (
          startDate.getTime() -
          today.getTime()
        ) /
          millisecondsPerDay
      );

    if (
      daysUntil === 1
    ) {
      return 'Starts tomorrow';
    }

    if (
      daysUntil === 0
    ) {
      return 'Starts today';
    }

    return `Starts in ${daysUntil} days`;
  }

  // --------------------------------------------------------
  // PAST TRIP
  // --------------------------------------------------------

  const daysAgo =
    Math.round(
      (
        today.getTime() -
        endDate.getTime()
      ) /
        millisecondsPerDay
    );

  if (
    daysAgo === 1
  ) {
    return 'Ended yesterday';
  }

  return `Ended ${daysAgo} days ago`;
}

// ==========================================================
// SORT TRIPS
// ==========================================================

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

  // Different status
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

  // Upcoming:
  // soonest first
  if (
    firstStatus ===
    'upcoming'
  ) {
    return (
      firstStart -
      secondStart
    );
  }

  // Past:
  // newest first
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
    return 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900';
  }

  if (
    value.includes(
      'singapore'
    )
  ) {
    return 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=900';
  }

  if (
    value.includes(
      'paris'
    ) ||
    value.includes(
      'france'
    )
  ) {
    return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900';
  }

  if (
    value.includes(
      'bali'
    ) ||
    value.includes(
      'indonesia'
    )
  ) {
    return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900';
  }

  if (
    value.includes(
      'seoul'
    ) ||
    value.includes(
      'korea'
    )
  ) {
    return 'https://images.unsplash.com/photo-1538485399081-7c897003c6e5?w=900';
  }

  if (
    value.includes(
      'london'
    ) ||
    value.includes(
      'england'
    )
  ) {
    return 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=900';
  }

  return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900';
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
        22,
    },

    // ======================================================
    // HEADER
    // ======================================================

    header: {
      paddingTop: 22,
      paddingBottom: 18,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',
    },

    headerTextContainer: {
      flex: 1,
      paddingRight: 16,
    },

    title: {
      fontSize: 38,
      lineHeight: 44,

      fontWeight: '800',

      letterSpacing: -1,

      color: '#111827',
    },

    subtitle: {
      marginTop: 4,

      fontSize: 14,
      lineHeight: 20,

      color: '#6B7280',
    },

    buttonPressed: {
      opacity: 0.75,
    },

    // ======================================================
    // PRIVATE BANNER
    // ======================================================

    privateBanner: {
      minHeight: 70,

      paddingHorizontal: 14,
      paddingVertical: 12,

      marginBottom: 4,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius: 17,

      backgroundColor:
        '#F4F7FF',
    },

    privateIconContainer: {
      width: 40,
      height: 40,

      borderRadius: 12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#E5EEFF',
    },

    privateTextContainer: {
      flex: 1,

      marginLeft: 11,
    },

    privateTitle: {
      fontSize: 13,

      fontWeight: '800',

      color: '#111827',
    },

    privateDescription: {
      marginTop: 2,

      fontSize: 11,
      lineHeight: 16,

      color: '#6B7280',
    },

    tripCountBadge: {
      minWidth: 34,
      height: 34,

      paddingHorizontal: 8,

      borderRadius: 17,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FFFFFF',
    },

    tripCountText: {
      fontSize: 13,

      fontWeight: '800',

      color: '#1769E8',
    },

    // ======================================================
    // LIST
    // ======================================================

    list: {
      paddingTop: 14,

      paddingBottom: 120,

      gap: 12,
    },

    createTripButton: {
      minHeight: 48,

      marginTop: 8,
      marginBottom: 18,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 10,

      backgroundColor:
        '#1769E8',

      shadowColor:
        '#1769E8',

      shadowOpacity: 0.14,

      shadowRadius: 6,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 3,
    },

    createTripButtonPressed: {
      opacity: 0.82,

      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    createTripButtonText: {
      marginLeft: 6,

      fontSize: 12,

      fontWeight: '800',

      letterSpacing: 0.35,

      color: '#FFFFFF',
    },

    // ======================================================
    // TRIP CARD
    // ======================================================

    tripCard: {
      minHeight: 126,

      padding: 11,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 18,

      backgroundColor:
        '#FFFFFF',

      shadowColor:
        '#000000',

      shadowOpacity: 0.06,

      shadowRadius: 7,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 2,
    },

    tripCardPressed: {
      opacity: 0.78,

      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    tripImage: {
      width: 96,

      height: 104,

      borderRadius: 14,

      backgroundColor:
        '#E5E7EB',
    },

    tripContent: {
      flex: 1,

      minWidth: 0,

      marginLeft: 12,

      alignSelf:
        'stretch',

      justifyContent:
        'center',
    },

    statusRow: {
      minHeight: 23,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    compactStatusBadge: {
      alignSelf:
        'flex-start',

      paddingHorizontal: 8,

      paddingVertical: 4,

      borderRadius: 12,
    },

    compactStatusText: {
      fontSize: 9,

      fontWeight: '800',
    },

    pastTripBadge: {
      backgroundColor:
        '#EEF4FF',
    },

    pastTripText: {
      color: '#1769E8',
    },

    tripTitle: {
      marginTop: 2,

      marginBottom: 4,

      fontSize: 18,

      fontWeight: '800',

      letterSpacing: -0.25,

      color: '#111827',
    },

    infoRow: {
      minHeight: 20,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    infoText: {
      flex: 1,

      marginLeft: 5,

      fontSize: 11,

      color: '#6B7280',
    },

    durationRow: {
      minHeight: 20,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    durationText: {
      marginLeft: 5,

      fontSize: 11,

      fontWeight: '700',

      color: '#1769E8',
    },

    cardActions: {
      width: 38,

      alignSelf:
        'stretch',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingVertical: 4,

      marginLeft: 4,
    },

    deleteTripButton: {
      width: 32,

      height: 32,

      borderRadius: 11,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FEF2F2',
    },

    deleteTripButtonPressed: {
      opacity: 0.7,

      transform: [
        {
          scale: 0.95,
        },
      ],
    },

    deleteTripButtonDisabled: {
      opacity: 0.55,
    },

    // ======================================================
    // STATUS BADGES
    // ======================================================

    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 7,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius: 20,
    },

    statusDot: {
      width: 6,
      height: 6,

      marginRight: 6,

      borderRadius: 3,
    },

    statusText: {
      fontSize: 9,

      fontWeight: '800',

      letterSpacing: 0.6,
    },

    upcomingBadge: {
      backgroundColor:
        '#EFF6FF',
    },

    upcomingDot: {
      backgroundColor:
        '#1769E8',
    },

    upcomingText: {
      color: '#1769E8',
    },

    ongoingBadge: {
      backgroundColor:
        '#ECFDF5',
    },

    ongoingDot: {
      backgroundColor:
        '#059669',
    },

    ongoingText: {
      color: '#047857',
    },

    pastBadge: {
      backgroundColor:
        '#F3F4F6',
    },

    pastDot: {
      backgroundColor:
        '#9CA3AF',
    },

    pastText: {
      color: '#6B7280',
    },

    // ======================================================
    // LOADING
    // ======================================================

    loadingContainer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingBottom: 100,
    },

    loadingText: {
      marginTop: 12,

      fontSize: 12,

      color: '#9CA3AF',
    },

    // ======================================================
    // EMPTY STATE
    // ======================================================

    emptyContainer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 30,
      paddingBottom: 100,
    },

    emptyIconContainer: {
      width: 76,
      height: 76,

      borderRadius: 24,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#EEF4FF',
    },

    emptyTitle: {
      marginTop: 18,

      fontSize: 20,

      fontWeight: '800',

      color: '#111827',
    },

    emptyText: {
      marginTop: 7,

      maxWidth: 270,

      textAlign:
        'center',

      fontSize: 13,
      lineHeight: 19,

      color: '#6B7280',
    },

    emptyButton: {
      height: 46,

      marginTop: 20,

      paddingHorizontal: 18,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 14,

      backgroundColor:
        '#1769E8',
    },

    emptyButtonText: {
      marginLeft: 6,

      fontSize: 13,

      fontWeight: '800',

      color: '#FFFFFF',
    },
  });