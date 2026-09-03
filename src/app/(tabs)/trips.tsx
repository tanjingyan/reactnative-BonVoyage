import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

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

          <Pressable
            style={({ pressed }) => [
              styles.addButton,

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
              size={27}
              color="#FFFFFF"
            />
          </Pressable>
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
              />
            )}
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
}: {
  trip: Trip;
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

  const relativeText =
    getRelativeTripText(
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
      {/* TOP ROW                                             */}
      {/* =================================================== */}

      <View
        style={
          styles.cardTop
        }
      >
        <View
          style={
            styles.tripIconContainer
          }
        >
          <Ionicons
            name="airplane-outline"
            size={24}
            color="#1769E8"
          />
        </View>

        <StatusBadge
          status={
            status
          }
        />
      </View>

      {/* =================================================== */}
      {/* TITLE                                               */}
      {/* =================================================== */}

      <Text
        style={
          styles.tripTitle
        }
        numberOfLines={2}
      >
        {trip.title}
      </Text>

      {/* =================================================== */}
      {/* DESTINATION                                         */}
      {/* =================================================== */}

      <View
        style={
          styles.infoRow
        }
      >
        <Ionicons
          name="location-outline"
          size={17}
          color="#6B7280"
        />

        <Text
          style={
            styles.destination
          }
          numberOfLines={1}
        >
          {trip.destination}
        </Text>
      </View>

      {/* =================================================== */}
      {/* DATES                                               */}
      {/* =================================================== */}

      <View
        style={
          styles.infoRow
        }
      >
        <Ionicons
          name="calendar-outline"
          size={17}
          color="#6B7280"
        />

        <Text
          style={
            styles.date
          }
        >
          {formatTripDate(
            trip.startDate
          )}
          {'  –  '}
          {formatTripDate(
            trip.endDate
          )}
        </Text>
      </View>

      {/* =================================================== */}
      {/* DURATION + RELATIVE DATE                            */}
      {/* =================================================== */}

      <View
        style={
          styles.tripMetaRow
        }
      >
        <View
          style={
            styles.durationPill
          }
        >
          <Ionicons
            name="time-outline"
            size={14}
            color="#4B5563"
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

        <Text
          style={[
            styles.relativeText,

            status ===
              'ongoing' &&
              styles.relativeTextOngoing,
          ]}
        >
          {relativeText}
        </Text>
      </View>

      {/* =================================================== */}
      {/* NOTES                                               */}
      {/* =================================================== */}

      {trip.notes?.trim() ? (
        <View
          style={
            styles.notesContainer
          }
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color="#6B7280"
          />

          <Text
            style={
              styles.notes
            }
            numberOfLines={2}
          >
            {trip.notes}
          </Text>
        </View>
      ) : null}

      {/* =================================================== */}
      {/* FOOTER                                              */}
      {/* =================================================== */}

      <View
        style={
          styles.cardFooter
        }
      >
        <View
          style={
            styles.privateTripLabel
          }
        >
          <Ionicons
            name="lock-closed"
            size={12}
            color="#9CA3AF"
          />

          <Text
            style={
              styles.privateTripText
            }
          >
            Personal itinerary
          </Text>
        </View>

        <View
          style={
            styles.viewTripContainer
          }
        >
          <Text
            style={
              styles.viewTripText
            }
          >
            View trip
          </Text>

          <Ionicons
            name="arrow-forward"
            size={16}
            color="#1769E8"
          />
        </View>
      </View>
    </Pressable>
  );
}

// ==========================================================
// STATUS BADGE
// ==========================================================

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

    addButton: {
      width: 46,
      height: 46,

      marginTop: 3,

      borderRadius: 23,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#1769E8',

      shadowColor:
        '#1769E8',

      shadowOpacity: 0.18,

      shadowRadius: 7,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      elevation: 4,
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

      gap: 15,
    },

    // ======================================================
    // TRIP CARD
    // ======================================================

    tripCard: {
      padding: 17,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 20,

      backgroundColor:
        '#FFFFFF',

      shadowColor:
        '#000000',

      shadowOpacity: 0.04,

      shadowRadius: 8,

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

    cardTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom: 14,
    },

    tripIconContainer: {
      width: 44,
      height: 44,

      borderRadius: 14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#EEF4FF',
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
    // TRIP DETAILS
    // ======================================================

    tripTitle: {
      marginBottom: 10,

      fontSize: 23,

      fontWeight: '800',

      letterSpacing: -0.3,

      color: '#111827',
    },

    infoRow: {
      minHeight: 29,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    destination: {
      flex: 1,

      marginLeft: 7,

      fontSize: 13,

      fontWeight: '600',

      color: '#374151',
    },

    date: {
      marginLeft: 7,

      fontSize: 12,

      color: '#6B7280',
    },

    // ======================================================
    // META
    // ======================================================

    tripMetaRow: {
      marginTop: 10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    durationPill: {
      paddingHorizontal: 9,
      paddingVertical: 6,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius: 9,

      backgroundColor:
        '#F3F4F6',
    },

    durationText: {
      marginLeft: 5,

      fontSize: 11,

      fontWeight: '700',

      color: '#4B5563',
    },

    relativeText: {
      fontSize: 11,

      fontWeight: '600',

      color: '#6B7280',
    },

    relativeTextOngoing: {
      color: '#059669',
    },

    // ======================================================
    // NOTES
    // ======================================================

    notesContainer: {
      marginTop: 14,

      padding: 12,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      borderRadius: 12,

      backgroundColor:
        '#F9FAFB',
    },

    notes: {
      flex: 1,

      marginLeft: 7,

      fontSize: 12,
      lineHeight: 18,

      color: '#6B7280',
    },

    // ======================================================
    // CARD FOOTER
    // ======================================================

    cardFooter: {
      marginTop: 16,
      paddingTop: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderTopWidth: 1,

      borderTopColor:
        '#F0F1F3',
    },

    privateTripLabel: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    privateTripText: {
      marginLeft: 5,

      fontSize: 10,

      color: '#9CA3AF',
    },

    viewTripContainer: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    viewTripText: {
      marginRight: 5,

      fontSize: 12,

      fontWeight: '800',

      color: '#1769E8',
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