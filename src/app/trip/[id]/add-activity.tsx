import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import DateTimePicker from '@react-native-community/datetimepicker';

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/firebase/firebaseConfig';

type Trip = {
  startDate: string;
  endDate: string;
};

export default function AddActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [activityDate, setActivityDate] = useState<Date | null>(null);
  const [activityTime, setActivityTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  const [tripStartDate, setTripStartDate] = useState<Date | null>(null);
  const [tripEndDate, setTripEndDate] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadTripDates() {
      if (!id) {
        return;
      }

      try {
        const tripRef = doc(db, 'trips', id);
        const tripSnapshot = await getDoc(tripRef);

        if (!tripSnapshot.exists()) {
          Alert.alert('Error', 'Trip not found.');
          router.back();
          return;
        }

        const trip = tripSnapshot.data() as Trip;

        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);

        setTripStartDate(start);
        setTripEndDate(end);

        setActivityDate(start);
      } catch (error) {
        console.log('Load trip dates error:', error);

        Alert.alert(
          'Error',
          'Unable to load the trip information.'
        );
      }
    }

    loadTripDates();
  }, [id]);

  function formatDate(date: Date | null) {
    if (!date) {
      return 'Select date';
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatTime(date: Date | null) {
    if (!date) {
      return 'Select time';
    }

    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function handleAddActivity() {
    if (!id) {
      Alert.alert('Error', 'Trip ID is missing.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an activity name.');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location.');
      return;
    }

    if (!activityDate) {
      Alert.alert('Error', 'Please select a date.');
      return;
    }

    if (!activityTime) {
      Alert.alert('Error', 'Please select a time.');
      return;
    }

    try {
      setLoading(true);

      await addDoc(
        collection(db, 'trips', id, 'activities'),
        {
          name: name.trim(),
          location: location.trim(),

          date: activityDate.toISOString(),

          time: activityTime.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),

          notes: notes.trim(),

          createdAt: serverTimestamp(),
        }
      );

      Alert.alert(
        'Activity Added',
        'Your activity has been added to the itinerary.'
      );

      router.back();
    } catch (error) {
      console.log('Add activity error:', error);

      Alert.alert(
        'Error',
        'Unable to add the activity. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>

        <View>
          <Text style={styles.title}>Add Activity</Text>

          <Text style={styles.subtitle}>
            Add something to your itinerary.
          </Text>
        </View>
      </View>

      <Text style={styles.label}>
        Activity Name
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Shibuya Crossing"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>
        Location
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Shibuya, Tokyo"
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>
        Date
      </Text>

      <Pressable
        style={styles.selectionInput}
        onPress={() => setShowDatePicker(true)}
      >
        <Text
          style={[
            styles.selectionText,
            !activityDate && styles.placeholder,
          ]}
        >
          {formatDate(activityDate)}
        </Text>

        <Text style={styles.icon}>
          📅
        </Text>
      </Pressable>

      {showDatePicker &&
        tripStartDate &&
        tripEndDate && (
          <DateTimePicker
            value={activityDate || tripStartDate}
            mode="date"
            minimumDate={tripStartDate}
            maximumDate={tripEndDate}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);

              if (
                event.type === 'set' &&
                selectedDate
              ) {
                setActivityDate(selectedDate);
              }
            }}
          />
        )}

      <Text style={styles.label}>
        Time
      </Text>

      <Pressable
        style={styles.selectionInput}
        onPress={() => setShowTimePicker(true)}
      >
        <Text
          style={[
            styles.selectionText,
            !activityTime && styles.placeholder,
          ]}
        >
          {formatTime(activityTime)}
        </Text>

        <Text style={styles.icon}>
          🕒
        </Text>
      </Pressable>

      {showTimePicker && (
        <DateTimePicker
          value={activityTime || new Date()}
          mode="time"
          is24Hour={false}
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);

            if (
              event.type === 'set' &&
              selectedTime
            ) {
              setActivityTime(selectedTime);
            }
          }}
        />
      )}

      <Text style={styles.label}>
        Notes
      </Text>

      <TextInput
        style={[styles.input, styles.notes]}
        placeholder="Optional notes..."
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      <Pressable
        style={[
          styles.button,
          loading && styles.buttonDisabled,
        ]}
        disabled={loading}
        onPress={handleAddActivity}
      >
        <Text style={styles.buttonText}>
          {loading
            ? 'Adding Activity...'
            : 'Add Activity'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 60,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  backArrow: {
    fontSize: 38,
    lineHeight: 38,
    color: '#111827',
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
  },

  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 5,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 7,
  },

  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 18,
  },

  selectionInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 15,
    marginBottom: 18,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectionText: {
    fontSize: 16,
    color: '#111827',
  },

  placeholder: {
    color: '#6B7280',
  },

  icon: {
    fontSize: 19,
  },

  notes: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  button: {
    backgroundColor: '#1769E8',
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 4,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});