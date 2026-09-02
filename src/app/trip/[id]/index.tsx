import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '@/firebase/firebaseConfig';

type Trip = {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
};

type Activity = {
  id: string;
  name: string;
  location: string;
  date: string;
  time: string;
  notes?: string;
};

type TabName =
  | 'overview'
  | 'itinerary';

export default function TripDetailsScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const [trip, setTrip] =
    useState<Trip | null>(null);

  const [
    activities,
    setActivities,
  ] = useState<Activity[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    activitiesLoading,
    setActivitiesLoading,
  ] = useState(true);

  const [
    activeTab,
    setActiveTab,
  ] = useState<TabName>(
    'overview'
  );

  // =========================================================
  // LOAD TRIP
  // =========================================================

  useEffect(() => {
    async function loadTrip() {
      if (!id) {
        return;
      }

      try {
        const tripRef = doc(
          db,
          'trips',
          id
        );

        const tripSnapshot =
          await getDoc(tripRef);

        if (
          !tripSnapshot.exists()
        ) {
          Alert.alert(
            'Error',
            'Trip not found.'
          );

          router.back();

          return;
        }

        setTrip({
          id: tripSnapshot.id,

          ...(tripSnapshot.data() as Omit<
            Trip,
            'id'
          >),
        });
      } catch (error) {
        console.log(
          'Trip details error:',
          error
        );

        Alert.alert(
          'Error',
          'Unable to load this trip.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadTrip();
  }, [id]);

  // =========================================================
  // REAL-TIME ACTIVITIES
  // =========================================================

  useEffect(() => {
    if (!id) {
      return;
    }

    const activitiesRef =
      collection(
        db,
        'trips',
        id,
        'activities'
      );

    const unsubscribe =
      onSnapshot(
        activitiesRef,

        snapshot => {
          const activityList:
            Activity[] =
            snapshot.docs.map(
              activityDoc => ({
                id:
                  activityDoc.id,

                ...(activityDoc.data() as Omit<
                  Activity,
                  'id'
                >),
              })
            );

          // Sort by date and then time
          activityList.sort(
            (a, b) => {
              const dateCompare =
                new Date(
                  a.date
                ).getTime() -
                new Date(
                  b.date
                ).getTime();

              if (
                dateCompare !== 0
              ) {
                return dateCompare;
              }

              return a.time.localeCompare(
                b.time
              );
            }
          );

          setActivities(
            activityList
          );

          setActivitiesLoading(
            false
          );
        },

        error => {
          console.log(
            'Activities error:',
            error
          );

          setActivitiesLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, [id]);

  // =========================================================
  // DATE HELPERS
  // =========================================================

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
        year: 'numeric',
      }
    );
  }

  function formatShortDate(
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

  // =========================================================
  // TRIP HERO IMAGE
  // =========================================================

  function getTripImage(
    destination: string
  ) {
    const value =
      destination.toLowerCase();

    if (
      value.includes('tokyo') ||
      value.includes('japan')
    ) {
      return 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=85';
    }

    if (
      value.includes('kyoto')
    ) {
      return 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85';
    }

    if (
      value.includes('paris') ||
      value.includes('france')
    ) {
      return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85';
    }

    if (
      value.includes('singapore')
    ) {
      return 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=85';
    }

    if (
      value.includes('bali') ||
      value.includes('indonesia')
    ) {
      return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=85';
    }

    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85';
  }

  // =========================================================
  // DELETE ACTIVITY
  // =========================================================

  function handleDeleteActivity(
    activityId: string,
    activityName: string
  ) {
    if (!id) {
      return;
    }

    Alert.alert(
      'Delete Activity',

      `Delete "${activityName}" from your itinerary?`,

      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress:
            async () => {
              try {
                await deleteDoc(
                  doc(
                    db,
                    'trips',
                    id,
                    'activities',
                    activityId
                  )
                );
              } catch (error) {
                console.log(
                  'Delete activity error:',
                  error
                );

                Alert.alert(
                  'Error',
                  'Unable to delete activity.'
                );
              }
            },
        },
      ]
    );
  }

  // =========================================================
  // NAVIGATION HELPERS
  // =========================================================

  function openAddActivity() {
    if (!trip) {
      return;
    }

    router.push({
      pathname:
        '/trip/[id]/add-activity',

      params: {
        id: trip.id,
      },
    });
  }

  function openTripMap() {
    if (!trip) {
      return;
    }

    router.push({
      pathname:
        '/trip/[id]/map',

      params: {
        id: trip.id,
      },
    });
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <View
        style={styles.center}
      >
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }

  if (!trip) {
    return null;
  }

  // =========================================================
  // SCREEN
  // =========================================================

  return (
    <View
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* ===================================================
            HERO IMAGE
        ==================================================== */}

        <ImageBackground
          source={{
            uri:
              getTripImage(
                trip.destination
              ),
          }}
          style={styles.hero}
        >
          <View
            style={
              styles.heroOverlay
            }
          />

          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color="#111827"
            />
          </Pressable>
        </ImageBackground>

        {/* ===================================================
            TRIP SUMMARY CARD
        ==================================================== */}

        <View
          style={
            styles.tripSummaryCard
          }
        >
          <Text
            style={
              styles.tripTitle
            }
          >
            {trip.title}
          </Text>

          <View
            style={
              styles.locationRow
            }
          >
            <Ionicons
              name="location-outline"
              size={18}
              color="#6B7280"
            />

            <Text
              style={
                styles.destination
              }
            >
              {trip.destination}
            </Text>
          </View>

          <View
            style={
              styles.summaryDivider
            }
          />

          <View
            style={
              styles.tripSummaryBottom
            }
          >
            <View
              style={
                styles.dateRow
              }
            >
              <Ionicons
                name="calendar-outline"
                size={21}
                color="#6B7280"
              />

              <View>
                <Text
                  style={
                    styles.dateLabel
                  }
                >
                  Trip dates
                </Text>

                <Text
                  style={
                    styles.dateText
                  }
                >
                  {formatDate(
                    trip.startDate
                  )}

                  {'  →  '}

                  {formatDate(
                    trip.endDate
                  )}
                </Text>
              </View>
            </View>

            <Pressable
              style={
                styles.moreButton
              }
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color="#6B7280"
              />
            </Pressable>
          </View>
        </View>

        {/* ===================================================
            TAB BAR
        ==================================================== */}

        <View
          style={styles.tabBar}
        >
          <Pressable
            style={[
              styles.tab,

              activeTab ===
                'overview' &&
                styles.activeTab,
            ]}
            onPress={() =>
              setActiveTab(
                'overview'
              )
            }
          >
            <Text
              style={[
                styles.tabText,

                activeTab ===
                  'overview' &&
                  styles.activeTabText,
              ]}
            >
              Overview
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,

              activeTab ===
                'itinerary' &&
                styles.activeTab,
            ]}
            onPress={() =>
              setActiveTab(
                'itinerary'
              )
            }
          >
            <Text
              style={[
                styles.tabText,

                activeTab ===
                  'itinerary' &&
                  styles.activeTabText,
              ]}
            >
              Itinerary
            </Text>
          </Pressable>

          <Pressable
            style={styles.tab}
            onPress={() =>
              router.push(
                '/explore'
              )
            }
          >
            <Text
              style={
                styles.tabText
              }
            >
              Explore
            </Text>
          </Pressable>
        </View>

        {/* ===================================================
            OVERVIEW TAB
        ==================================================== */}

        {activeTab ===
          'overview' && (
          <>
            {/* -----------------------------------------------
                TRIP OVERVIEW
            ------------------------------------------------ */}

            <View
              style={
                styles.section
              }
            >
              <View
                style={
                  styles.sectionTitleRow
                }
              >
                <View>
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Trip overview
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Your travel plan at
                    a glance
                  </Text>
                </View>

                <View
                  style={
                    styles.activityBadge
                  }
                >
                  <Text
                    style={
                      styles.activityBadgeText
                    }
                  >
                    {activities.length}{' '}

                    {activities.length ===
                    1
                      ? 'activity'
                      : 'activities'}
                  </Text>
                </View>
              </View>

              {/* ITINERARY SUMMARY */}

              <View
                style={
                  styles.planningCard
                }
              >
                <View
                  style={
                    styles.planningIcon
                  }
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={25}
                    color="#1769E8"
                  />
                </View>

                <View
                  style={
                    styles.planningContent
                  }
                >
                  <Text
                    style={
                      styles.planningTitle
                    }
                  >
                    Your itinerary
                  </Text>

                  <Text
                    style={
                      styles.planningDescription
                    }
                  >
                    {activities.length >
                    0
                      ? `${activities.length} ${
                          activities.length ===
                          1
                            ? 'activity'
                            : 'activities'
                        } planned for this trip.`
                      : 'Start adding places and activities to your itinerary.'}
                  </Text>

                  <Pressable
                    onPress={() =>
                      setActiveTab(
                        'itinerary'
                      )
                    }
                  >
                    <Text
                      style={
                        styles.planningLink
                      }
                    >
                      View itinerary →
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* -----------------------------------------------
                TRIP MAP FEATURE
            ------------------------------------------------ */}

            <View
              style={
                styles.featuresSection
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Trip features
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Useful tools for your
                journey
              </Text>

              <Pressable
                style={
                  styles.mapFeatureCard
                }
                onPress={
                  openTripMap
                }
              >
                <View
                  style={
                    styles.mapFeatureIcon
                  }
                >
                  <Ionicons
                    name="map-outline"
                    size={28}
                    color="#1769E8"
                  />
                </View>

                <View
                  style={
                    styles.mapFeatureContent
                  }
                >
                  <Text
                    style={
                      styles.mapFeatureTitle
                    }
                  >
                    Trip Map
                  </Text>

                  <Text
                    style={
                      styles.mapFeatureDescription
                    }
                  >
                    View your destination
                    and itinerary locations
                    together on the map.
                  </Text>

                  {activities.length >
                  0 ? (
                    <View
                      style={
                        styles.mapFeatureStatus
                      }
                    >
                      <Ionicons
                        name="location"
                        size={13}
                        color="#1769E8"
                      />

                      <Text
                        style={
                          styles.mapFeatureStatusText
                        }
                      >
                        {
                          activities.length
                        }{' '}
                        {activities.length ===
                        1
                          ? 'activity location'
                          : 'activity locations'}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color="#9CA3AF"
                />
              </Pressable>
            </View>

            {/* -----------------------------------------------
                NOTES
            ------------------------------------------------ */}

            <View
              style={
                styles.notesSection
              }
            >
              <View
                style={
                  styles.notesHeader
                }
              >
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color="#111827"
                />

                <Text
                  style={
                    styles.notesTitle
                  }
                >
                  Notes
                </Text>
              </View>

              {trip.notes ? (
                <Text
                  style={
                    styles.notesText
                  }
                >
                  {trip.notes}
                </Text>
              ) : (
                <Text
                  style={
                    styles.emptyNotes
                  }
                >
                  No notes have been
                  added for this trip.
                </Text>
              )}
            </View>
          </>
        )}

        {/* ===================================================
            ITINERARY TAB
        ==================================================== */}

        {activeTab ===
          'itinerary' && (
          <View
            style={
              styles.itinerarySection
            }
          >
            <View
              style={
                styles.itineraryHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Itinerary
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Your planned
                  activities
                </Text>
              </View>

              <Pressable
                style={
                  styles.smallAddButton
                }
                onPress={
                  openAddActivity
                }
              >
                <Ionicons
                  name="add"
                  size={19}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.smallAddText
                  }
                >
                  Add
                </Text>
              </Pressable>
            </View>

            {activitiesLoading ? (
              <ActivityIndicator />
            ) : activities.length ===
              0 ? (
              <View
                style={
                  styles.emptyItinerary
                }
              >
                <View
                  style={
                    styles.emptyItineraryIcon
                  }
                >
                  <Ionicons
                    name="calendar-outline"
                    size={30}
                    color="#1769E8"
                  />
                </View>

                <Text
                  style={
                    styles.emptyItineraryTitle
                  }
                >
                  No activities yet
                </Text>

                <Text
                  style={
                    styles.emptyItineraryText
                  }
                >
                  Start building your
                  itinerary by adding
                  your first activity.
                </Text>

                <Pressable
                  style={
                    styles.emptyAddButton
                  }
                  onPress={
                    openAddActivity
                  }
                >
                  <Text
                    style={
                      styles.emptyAddText
                    }
                  >
                    + Add Activity
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View
                style={
                  styles.activitiesContainer
                }
              >
                {activities.map(
                  (
                    activity,
                    index
                  ) => (
                    <View
                      key={
                        activity.id
                      }
                      style={
                        styles.timelineRow
                      }
                    >
                      {/* TIMELINE */}

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

                        {index !==
                          activities.length -
                            1 && (
                          <View
                            style={
                              styles.timelineLine
                            }
                          />
                        )}
                      </View>

                      {/* ACTIVITY CARD */}

                      <View
                        style={
                          styles.activityCard
                        }
                      >
                        <View
                          style={
                            styles.activityHeader
                          }
                        >
                          <View>
                            <Text
                              style={
                                styles.activityDate
                              }
                            >
                              {formatShortDate(
                                activity.date
                              )}
                            </Text>

                            <Text
                              style={
                                styles.activityTime
                              }
                            >
                              {
                                activity.time
                              }
                            </Text>
                          </View>

                          <Pressable
                            style={
                              styles.activityDeleteButton
                            }
                            onPress={() =>
                              handleDeleteActivity(
                                activity.id,
                                activity.name
                              )
                            }
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#DC2626"
                            />
                          </Pressable>
                        </View>

                        <Text
                          style={
                            styles.activityName
                          }
                        >
                          {
                            activity.name
                          }
                        </Text>

                        <View
                          style={
                            styles.activityLocationRow
                          }
                        >
                          <Ionicons
                            name="location-outline"
                            size={15}
                            color="#6B7280"
                          />

                          <Text
                            style={
                              styles.activityLocation
                            }
                          >
                            {
                              activity.location
                            }
                          </Text>
                        </View>

                        {activity.notes ? (
                          <Text
                            style={
                              styles.activityNotes
                            }
                          >
                            {
                              activity.notes
                            }
                          </Text>
                        ) : null}

                        <Pressable
                          style={
                            styles.editActivityButton
                          }
                          onPress={() =>
                            router.push({
                              pathname:
                                '/trip/[id]/activity/[activityId]',

                              params: {
                                id:
                                  trip.id,

                                activityId:
                                  activity.id,
                              },
                            })
                          }
                        >
                          <Ionicons
                            name="create-outline"
                            size={16}
                            color="#1769E8"
                          />

                          <Text
                            style={
                              styles.editActivityText
                            }
                          >
                            Edit
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )
                )}
              </View>
            )}
          </View>
        )}

        <View
          style={
            styles.bottomSpace
          }
        />
      </ScrollView>

      {/* =====================================================
          FLOATING ADD ACTIVITY BUTTON
      ====================================================== */}

      <Pressable
        style={
          styles.floatingButton
        }
        onPress={
          openAddActivity
        }
      >
        <Ionicons
          name="add"
          size={31}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
  );
}

// ===========================================================
// STYLES
// ===========================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor:
        '#F7F8FA',
    },

    scrollContent: {
      paddingBottom: 110,
    },

    center: {
      flex: 1,

      justifyContent:
        'center',

      alignItems: 'center',

      backgroundColor:
        '#FFFFFF',
    },

    // =======================================================
    // HERO
    // =======================================================

    hero: {
      height: 250,

      position: 'relative',
    },

    heroOverlay: {
      position: 'absolute',

      top: 0,
      left: 0,
      right: 0,
      bottom: 0,

      backgroundColor:
        'rgba(0,0,0,0.18)',
    },

    backButton: {
      position: 'absolute',

      top: 55,
      left: 20,

      width: 44,
      height: 44,

      borderRadius: 22,

      backgroundColor:
        '#FFFFFF',

      justifyContent:
        'center',

      alignItems: 'center',

      elevation: 4,

      shadowColor: '#000',

      shadowOpacity: 0.12,

      shadowRadius: 7,

      shadowOffset: {
        width: 0,
        height: 3,
      },
    },

    // =======================================================
    // TRIP SUMMARY
    // =======================================================

    tripSummaryCard: {
      marginHorizontal: 20,

      marginTop: -65,

      borderRadius: 22,

      padding: 22,

      backgroundColor:
        '#FFFFFF',

      elevation: 6,

      shadowColor: '#000',

      shadowOpacity: 0.12,

      shadowRadius: 12,

      shadowOffset: {
        width: 0,
        height: 5,
      },
    },

    tripTitle: {
      fontSize: 30,

      fontWeight: '800',

      color: '#111827',

      letterSpacing: -0.7,
    },

    locationRow: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 5,

      marginTop: 8,
    },

    destination: {
      color: '#6B7280',

      fontSize: 15,
    },

    summaryDivider: {
      height: 1,

      backgroundColor:
        '#F1F2F4',

      marginVertical: 18,
    },

    tripSummaryBottom: {
      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems: 'center',
    },

    dateRow: {
      flexDirection: 'row',

      gap: 10,

      alignItems: 'center',
    },

    dateLabel: {
      fontSize: 13,

      color: '#6B7280',

      fontWeight: '600',
    },

    dateText: {
      color: '#111827',

      fontSize: 14,

      fontWeight: '700',

      marginTop: 3,
    },

    moreButton: {
      width: 40,

      height: 40,

      justifyContent:
        'center',

      alignItems: 'center',
    },

    // =======================================================
    // TAB BAR
    // =======================================================

    tabBar: {
      marginTop: 20,

      flexDirection: 'row',

      backgroundColor:
        '#FFFFFF',

      borderBottomWidth: 1,

      borderBottomColor:
        '#E5E7EB',

      paddingHorizontal: 20,
    },

    tab: {
      flex: 1,

      paddingVertical: 17,

      alignItems: 'center',

      borderBottomWidth: 3,

      borderBottomColor:
        'transparent',
    },

    activeTab: {
      borderBottomColor:
        '#1769E8',
    },

    tabText: {
      fontSize: 15,

      fontWeight: '700',

      color: '#6B7280',
    },

    activeTabText: {
      color: '#1769E8',
    },

    // =======================================================
    // GENERAL SECTIONS
    // =======================================================

    section: {
      backgroundColor:
        '#FFFFFF',

      paddingHorizontal: 20,

      paddingTop: 26,

      paddingBottom: 25,

      marginTop: 10,
    },

    sectionTitleRow: {
      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems:
        'flex-start',
    },

    sectionTitle: {
      fontSize: 21,

      fontWeight: '800',

      color: '#111827',
    },

    sectionSubtitle: {
      color: '#6B7280',

      fontSize: 13,

      marginTop: 4,
    },

    activityBadge: {
      backgroundColor:
        '#EEF4FF',

      paddingHorizontal: 10,

      paddingVertical: 6,

      borderRadius: 20,
    },

    activityBadgeText: {
      color: '#1769E8',

      fontSize: 11,

      fontWeight: '700',
    },

    // =======================================================
    // ITINERARY SUMMARY CARD
    // =======================================================

    planningCard: {
      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 17,

      padding: 17,

      marginTop: 18,

      flexDirection: 'row',

      backgroundColor:
        '#FFFFFF',
    },

    planningIcon: {
      width: 47,

      height: 47,

      borderRadius: 14,

      backgroundColor:
        '#EEF4FF',

      justifyContent:
        'center',

      alignItems: 'center',

      marginRight: 13,
    },

    planningContent: {
      flex: 1,
    },

    planningTitle: {
      color: '#111827',

      fontSize: 16,

      fontWeight: '700',
    },

    planningDescription: {
      color: '#6B7280',

      fontSize: 13,

      lineHeight: 19,

      marginTop: 4,
    },

    planningLink: {
      color: '#1769E8',

      fontWeight: '700',

      fontSize: 13,

      marginTop: 9,
    },

    // =======================================================
    // TRIP FEATURES
    // =======================================================

    featuresSection: {
      backgroundColor:
        '#FFFFFF',

      paddingHorizontal: 20,

      paddingVertical: 24,

      marginTop: 10,
    },

    mapFeatureCard: {
      marginTop: 18,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 18,

      padding: 16,

      backgroundColor:
        '#FFFFFF',

      flexDirection: 'row',

      alignItems: 'center',

      shadowColor: '#000',

      shadowOpacity: 0.03,

      shadowRadius: 5,

      shadowOffset: {
        width: 0,
        height: 2,
      },

      elevation: 1,
    },

    mapFeatureIcon: {
      width: 56,

      height: 56,

      borderRadius: 17,

      backgroundColor:
        '#EEF4FF',

      alignItems: 'center',

      justifyContent:
        'center',

      marginRight: 14,
    },

    mapFeatureContent: {
      flex: 1,

      marginRight: 8,
    },

    mapFeatureTitle: {
      color: '#111827',

      fontSize: 17,

      fontWeight: '700',
    },

    mapFeatureDescription: {
      color: '#6B7280',

      fontSize: 12,

      lineHeight: 18,

      marginTop: 4,
    },

    mapFeatureStatus: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 4,

      marginTop: 8,
    },

    mapFeatureStatusText: {
      color: '#1769E8',

      fontSize: 11,

      fontWeight: '600',
    },

    // =======================================================
    // NOTES
    // =======================================================

    notesSection: {
      backgroundColor:
        '#FFFFFF',

      padding: 20,

      marginTop: 10,

      minHeight: 155,
    },

    notesHeader: {
      flexDirection: 'row',

      gap: 9,

      alignItems: 'center',
    },

    notesTitle: {
      fontSize: 22,

      fontWeight: '800',

      color: '#111827',
    },

    notesText: {
      color: '#4B5563',

      fontSize: 15,

      lineHeight: 23,

      marginTop: 16,
    },

    emptyNotes: {
      color: '#9CA3AF',

      fontSize: 14,

      fontStyle: 'italic',

      marginTop: 16,
    },

    // =======================================================
    // ITINERARY TAB
    // =======================================================

    itinerarySection: {
      backgroundColor:
        '#FFFFFF',

      padding: 20,

      marginTop: 10,

      minHeight: 400,
    },

    itineraryHeader: {
      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems: 'center',

      marginBottom: 22,
    },

    smallAddButton: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 3,

      backgroundColor:
        '#1769E8',

      paddingHorizontal: 14,

      paddingVertical: 9,

      borderRadius: 20,
    },

    smallAddText: {
      color: '#FFFFFF',

      fontSize: 13,

      fontWeight: '700',
    },

    // =======================================================
    // EMPTY ITINERARY
    // =======================================================

    emptyItinerary: {
      alignItems: 'center',

      paddingVertical: 45,
    },

    emptyItineraryIcon: {
      width: 62,

      height: 62,

      borderRadius: 19,

      backgroundColor:
        '#EEF4FF',

      justifyContent:
        'center',

      alignItems: 'center',
    },

    emptyItineraryTitle: {
      color: '#111827',

      fontSize: 18,

      fontWeight: '700',

      marginTop: 15,
    },

    emptyItineraryText: {
      color: '#6B7280',

      fontSize: 13,

      textAlign: 'center',

      lineHeight: 19,

      marginTop: 6,

      maxWidth: 250,
    },

    emptyAddButton: {
      backgroundColor:
        '#1769E8',

      borderRadius: 12,

      paddingHorizontal: 19,

      paddingVertical: 11,

      marginTop: 17,
    },

    emptyAddText: {
      color: '#FFFFFF',

      fontWeight: '700',
    },

    // =======================================================
    // ITINERARY TIMELINE
    // =======================================================

    activitiesContainer: {
      gap: 0,
    },

    timelineRow: {
      flexDirection: 'row',
    },

    timelineColumn: {
      width: 25,

      alignItems: 'center',
    },

    timelineDot: {
      width: 12,

      height: 12,

      borderRadius: 6,

      backgroundColor:
        '#1769E8',

      marginTop: 20,
    },

    timelineLine: {
      width: 2,

      flex: 1,

      minHeight: 110,

      backgroundColor:
        '#DBEAFE',
    },

    // =======================================================
    // ACTIVITY CARD
    // =======================================================

    activityCard: {
      flex: 1,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 16,

      padding: 16,

      marginLeft: 7,

      marginBottom: 15,

      backgroundColor:
        '#FFFFFF',
    },

    activityHeader: {
      flexDirection: 'row',

      justifyContent:
        'space-between',
    },

    activityDate: {
      color: '#1769E8',

      fontSize: 12,

      fontWeight: '700',
    },

    activityTime: {
      color: '#111827',

      fontSize: 13,

      fontWeight: '600',

      marginTop: 3,
    },

    activityDeleteButton: {
      width: 33,

      height: 33,

      borderRadius: 9,

      backgroundColor:
        '#FEF2F2',

      justifyContent:
        'center',

      alignItems: 'center',
    },

    activityName: {
      color: '#111827',

      fontSize: 17,

      fontWeight: '700',

      marginTop: 12,
    },

    activityLocationRow: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 4,

      marginTop: 5,
    },

    activityLocation: {
      color: '#6B7280',

      fontSize: 13,
    },

    activityNotes: {
      color: '#4B5563',

      fontSize: 13,

      lineHeight: 19,

      marginTop: 10,
    },

    editActivityButton: {
      flexDirection: 'row',

      alignItems: 'center',

      alignSelf:
        'flex-start',

      gap: 4,

      marginTop: 13,

      paddingHorizontal: 10,

      paddingVertical: 7,

      borderRadius: 8,

      backgroundColor:
        '#EEF4FF',
    },

    editActivityText: {
      color: '#1769E8',

      fontSize: 12,

      fontWeight: '700',
    },

    // =======================================================
    // FLOATING ADD BUTTON
    // =======================================================

    floatingButton: {
      position: 'absolute',

      right: 22,

      bottom: 28,

      width: 58,

      height: 58,

      borderRadius: 29,

      backgroundColor:
        '#1769E8',

      justifyContent:
        'center',

      alignItems: 'center',

      elevation: 8,

      shadowColor: '#000',

      shadowOpacity: 0.22,

      shadowRadius: 8,

      shadowOffset: {
        width: 0,
        height: 4,
      },
    },

    bottomSpace: {
      height: 20,
    },
  });