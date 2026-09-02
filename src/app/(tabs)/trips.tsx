import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/firebase/firebaseConfig';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
};

export default function TripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  function formatTripDate(dateString: string) {
    const date = new Date(dateString);

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const tripsQuery = query(
      collection(db, 'trips'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      tripsQuery,
      snapshot => {
        const tripList: Trip[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Trip, 'id'>),
        }));

        setTrips(tripList);
        setLoading(false);
      },
      error => {
        console.log('Trips read error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <ThemedText type="title">My Trips</ThemedText>

            <ThemedText style={styles.subtitle}>
              Plan and manage your upcoming journeys.
            </ThemedText>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/create-trip')}
          >
            <ThemedText style={styles.addButtonText}>+</ThemedText>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="large" style={styles.loading} />
        ) : trips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText type="subtitle">
              No trips yet
            </ThemedText>

            <ThemedText style={styles.emptyText}>
              Create your first trip to get started.
            </ThemedText>

          </View>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
            <Pressable
              style={styles.tripCard}
              onPress={() =>
                router.push({
                  pathname: '/trip/[id]',
                  params: { id: item.id },
                })
              }
            >
              <ThemedText type="subtitle">
                {item.title}
              </ThemedText>

              <ThemedText style={styles.destination}>
                {item.destination}
              </ThemedText>

              <ThemedText style={styles.date}>
                {formatTripDate(item.startDate)} → {formatTripDate(item.endDate)}
              </ThemedText>

              {item.notes ? (
                <ThemedText style={styles.notes}>
                  {item.notes}
                </ThemedText>
              ) : null}

              <ThemedText style={styles.viewText}>
                View Trip ›
              </ThemedText>
            </Pressable>
          )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 6,
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1769E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 30,
  },

  loading: {
    marginTop: 50,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },

  emptyText: {
    marginTop: 8,
    opacity: 0.6,
  },

  list: {
    paddingTop: 24,
    paddingBottom: 40,
    gap: 14,
  },

  tripCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    gap: 6,
  },

  destination: {
    fontSize: 15,
  },

  date: {
    fontSize: 14,
    opacity: 0.65,
  },

  notes: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.75,
  },

  viewText: {
    marginTop: 8,
    color: '#1769E8',
    fontWeight: '600',
  },
});