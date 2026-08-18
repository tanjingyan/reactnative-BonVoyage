import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import {
  collection,
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

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [trip, setTrip] = useState<Trip | null>(null);

  const [activities, setActivities] = useState<Activity[]>([]);

  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    async function loadTrip() {
      if (!id) {
        return;
      }

      try {
        const tripRef = doc(db, 'trips', id);

        const tripSnapshot = await getDoc(tripRef);

        if (!tripSnapshot.exists()) {
          Alert.alert(
            'Error',
            'Trip not found.'
          );

          router.back();
          return;
        }

        setTrip({
          id: tripSnapshot.id,
          ...(tripSnapshot.data() as Omit<Trip, 'id'>),
        });
      } catch (error) {
        console.log('Trip details error:', error);

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

  useEffect(() => {
    if (!id) {
      return;
    }

    const activitiesRef = collection(
      db,
      'trips',
      id,
      'activities'
    );

    const unsubscribe = onSnapshot(
      activitiesRef,
      snapshot => {
        const activityList: Activity[] =
          snapshot.docs.map(activityDoc => ({
            id: activityDoc.id,
            ...(activityDoc.data() as Omit<Activity, 'id'>),
          }));

        activityList.sort((a, b) => {
          const dateCompare =
            new Date(a.date).getTime() -
            new Date(b.date).getTime();

          if (dateCompare !== 0) {
            return dateCompare;
          }

          return a.time.localeCompare(b.time);
        });

        setActivities(activityList);
        setActivitiesLoading(false);
      },
      error => {
        console.log(
          'Activities read error:',
          error
        );

        setActivitiesLoading(false);
      }
    );

    return unsubscribe;
  }, [id]);

  function formatDate(dateString: string) {
    const date = new Date(dateString);

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatActivityDate(dateString: string) {
    const date = new Date(dateString);

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!trip) {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>
            ‹
          </Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            {trip.title}
          </Text>

          <Text style={styles.destination}>
            {trip.destination}
          </Text>
        </View>
      </View>

      <View style={styles.dateCard}>
        <Text style={styles.sectionLabel}>
          Travel Dates
        </Text>

        <Text style={styles.dateText}>
          {formatDate(trip.startDate)}
          {'  →  '}
          {formatDate(trip.endDate)}
        </Text>
      </View>

      {trip.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Notes
          </Text>

          <Text style={styles.notes}>
            {trip.notes}
          </Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Itinerary
        </Text>

        {activitiesLoading ? (
          <ActivityIndicator />
        ) : activities.length === 0 ? (
          <Text style={styles.emptyText}>
            No activities added yet.
          </Text>
        ) : (
          <View style={styles.activitiesContainer}>
            {activities.map(activity => (
              <View
                key={activity.id}
                style={styles.activityCard}
              >
                <View style={styles.activityTopRow}>
                  <View>
                    <Text style={styles.activityDate}>
                      {formatActivityDate(activity.date)}
                    </Text>

                    <Text style={styles.activityTime}>
                      {activity.time}
                    </Text>
                  </View>

                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>
                      {activity.name}
                    </Text>

                    <Text style={styles.activityLocation}>
                      {activity.location}
                    </Text>

                    {activity.notes ? (
                      <Text style={styles.activityNotes}>
                        {activity.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: '/trip/[id]/add-activity',
              params: {
                id: trip.id,
              },
            })
          }
        >
          <Text style={styles.primaryButtonText}>
            + Add Activity
          </Text>
        </Pressable>
      </View>

      <View style={styles.quickActions}>
        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>
            🗺️
          </Text>

          <Text style={styles.actionText}>
            View Map
          </Text>
        </Pressable>

        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>
            ☀️
          </Text>

          <Text style={styles.actionText}>
            Weather
          </Text>
        </Pressable>

        <Pressable style={styles.actionCard}>
          <Text style={styles.actionEmoji}>
            ✨
          </Text>

          <Text style={styles.actionText}>
            AI Suggestions
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  backArrow: {
    fontSize: 38,
    lineHeight: 38,
    color: '#111827',
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
  },

  destination: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },

  dateCard: {
    backgroundColor: '#F5F8FF',
    borderRadius: 16,
    padding: 18,
  },

  sectionLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },

  dateText: {
    fontSize: 17,
    fontWeight: '600',
  },

  section: {
    marginTop: 28,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 10,
  },

  notes: {
    fontSize: 16,
    lineHeight: 23,
    color: '#374151',
  },

  emptyText: {
    color: '#6B7280',
    marginBottom: 16,
  },

  activitiesContainer: {
    gap: 12,
    marginBottom: 16,
  },

  activityCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 15,
    backgroundColor: '#FFFFFF',
  },

  activityTopRow: {
    flexDirection: 'row',
  },

  activityDate: {
    fontSize: 13,
    color: '#1769E8',
    fontWeight: '700',
  },

  activityTime: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 5,
  },

  activityInfo: {
    flex: 1,
    marginLeft: 18,
  },

  activityName: {
    fontSize: 17,
    fontWeight: '700',
  },

  activityLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 3,
  },

  activityNotes: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 7,
  },

  primaryButton: {
    backgroundColor: '#1769E8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 30,
  },

  actionCard: {
    flex: 1,
    minHeight: 95,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },

  actionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },

  actionText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
});