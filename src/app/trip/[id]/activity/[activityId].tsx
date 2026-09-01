import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/firebase/firebaseConfig';

type Trip = {
  startDate: string;
  endDate: string;
};

type Activity = {
  name: string;
  location: string;
  date: string;
  time: string;
  notes?: string;
};

export default function EditActivityScreen() {
  const { id, activityId } =
    useLocalSearchParams<{
      id: string;
      activityId: string;
    }>();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [activityDate, setActivityDate] =
    useState<Date | null>(null);
  const [activityTime, setActivityTime] =
    useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  const [tripStartDate, setTripStartDate] =
    useState<Date | null>(null);
  const [tripEndDate, setTripEndDate] =
    useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] =
    useState(false);
  const [showTimePicker, setShowTimePicker] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id || !activityId) {
        return;
      }

      try {
        const tripRef = doc(db, 'trips', id);

        const activityRef = doc(
          db,
          'trips',
          id,
          'activities',
          activityId
        );

        const [tripSnapshot, activitySnapshot] =
          await Promise.all([
            getDoc(tripRef),
            getDoc(activityRef),
          ]);

        if (
          !tripSnapshot.exists() ||
          !activitySnapshot.exists()
        ) {
          Alert.alert(
            'Error',
            'Activity could not be found.'
          );

          router.back();
          return;
        }

        const trip = tripSnapshot.data() as Trip;

        const activity =
          activitySnapshot.data() as Activity;

        setTripStartDate(
          new Date(trip.startDate)
        );

        setTripEndDate(
          new Date(trip.endDate)
        );

        setName(activity.name);
        setLocation(activity.location);
        setNotes(activity.notes || '');

        setActivityDate(
          new Date(activity.date)
        );

        const time = new Date();

        const [hours, minutes] =
          activity.time
            .split(':')
            .map(Number);

        time.setHours(
          hours,
          minutes,
          0,
          0
        );

        setActivityTime(time);
      } catch (error) {
        console.log(
          'Load activity error:',
          error
        );

        Alert.alert(
          'Error',
          'Unable to load this activity.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, activityId]);

  function formatDate(date: Date | null) {
    if (!date) {
      return 'Select date';
    }

    return date.toLocaleDateString(
      'en-GB',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  }

  function formatTime(date: Date | null) {
    if (!date) {
      return 'Select time';
    }

    return date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  }

  async function handleSave() {
    if (!id || !activityId) {
      return;
    }

    if (!name.trim()) {
      Alert.alert(
        'Error',
        'Please enter an activity name.'
      );
      return;
    }

    if (!location.trim()) {
      Alert.alert(
        'Error',
        'Please enter a location.'
      );
      return;
    }

    if (!activityDate || !activityTime) {
      Alert.alert(
        'Error',
        'Please select a date and time.'
      );
      return;
    }

    try {
      setSaving(true);

      const activityRef = doc(
        db,
        'trips',
        id,
        'activities',
        activityId
      );

      await updateDoc(activityRef, {
        name: name.trim(),
        location: location.trim(),

        date:
          activityDate.toISOString(),

        time:
          activityTime.toLocaleTimeString(
            'en-GB',
            {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }
          ),

        notes: notes.trim(),

        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Activity Updated',
        'Your itinerary has been updated.'
      );

      router.back();
    } catch (error) {
      console.log(
        'Update activity error:',
        error
      );

      Alert.alert(
        'Error',
        'Unable to update this activity.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>
            ‹
          </Text>
        </Pressable>

        <View>
          <Text style={styles.title}>
            Edit Activity
          </Text>

          <Text style={styles.subtitle}>
            Update your itinerary.
          </Text>
        </View>
      </View>

      <Text style={styles.label}>
        Activity Name
      </Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>
        Location
      </Text>

      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>
        Date
      </Text>

      <Pressable
        style={styles.selectionInput}
        onPress={() =>
          setShowDatePicker(true)
        }
      >
        <Text style={styles.selectionText}>
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
            value={
              activityDate ||
              tripStartDate
            }
            mode="date"
            minimumDate={tripStartDate}
            maximumDate={tripEndDate}
            onChange={(
              event,
              selectedDate
            ) => {
              setShowDatePicker(false);

              if (
                event.type === 'set' &&
                selectedDate
              ) {
                setActivityDate(
                  selectedDate
                );
              }
            }}
          />
        )}

      <Text style={styles.label}>
        Time
      </Text>

      <Pressable
        style={styles.selectionInput}
        onPress={() =>
          setShowTimePicker(true)
        }
      >
        <Text style={styles.selectionText}>
          {formatTime(activityTime)}
        </Text>

        <Text style={styles.icon}>
          🕒
        </Text>
      </Pressable>

      {showTimePicker && (
        <DateTimePicker
          value={
            activityTime || new Date()
          }
          mode="time"
          is24Hour={false}
          onChange={(
            event,
            selectedTime
          ) => {
            setShowTimePicker(false);

            if (
              event.type === 'set' &&
              selectedTime
            ) {
              setActivityTime(
                selectedTime
              );
            }
          }}
        />
      )}

      <Text style={styles.label}>
        Notes
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.notes,
        ]}
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes..."
      />

      <Pressable
        style={[
          styles.button,
          saving && styles.disabledButton,
        ]}
        disabled={saving}
        onPress={handleSave}
      >
        <Text style={styles.buttonText}>
          {saving
            ? 'Saving...'
            : 'Save Changes'}
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

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
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
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
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
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});