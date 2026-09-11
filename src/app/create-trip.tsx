import { useEffect, useState } from 'react';

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const [
    name,
    setName,
  ] = useState('');

  const [
    location,
    setLocation,
  ] = useState('');

  const [
    activityDate,
    setActivityDate,
  ] =
    useState<Date | null>(
      null
    );

  const [
    activityTime,
    setActivityTime,
  ] =
    useState<Date | null>(
      null
    );

  const [
    notes,
    setNotes,
  ] = useState('');

  const [
    tripStartDate,
    setTripStartDate,
  ] =
    useState<Date | null>(
      null
    );

  const [
    tripEndDate,
    setTripEndDate,
  ] =
    useState<Date | null>(
      null
    );

  const [
    showDatePicker,
    setShowDatePicker,
  ] =
    useState(false);

  const [
    showTimePicker,
    setShowTimePicker,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  // ========================================================
  // LOAD TRIP DATES
  // ========================================================

  useEffect(() => {
    async function loadTripDates() {
      if (!id) {
        return;
      }

      try {
        const tripRef =
          doc(
            db,
            'trips',
            id
          );

        const tripSnapshot =
          await getDoc(
            tripRef
          );

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

        const trip =
          tripSnapshot.data() as Trip;

        const start =
          new Date(
            trip.startDate
          );

        const end =
          new Date(
            trip.endDate
          );

        setTripStartDate(
          start
        );

        setTripEndDate(
          end
        );

        setActivityDate(
          start
        );
      } catch (error) {
        console.log(
          'Load trip dates error:',
          error
        );

        Alert.alert(
          'Error',
          'Unable to load the trip information.'
        );
      }
    }

    loadTripDates();
  }, [id]);

  // ========================================================
  // FORMATTERS
  // ========================================================

  function formatDate(
    date: Date | null
  ) {
    if (!date) {
      return 'Select date';
    }

    return date.toLocaleDateString(
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
  }

  function formatTime(
    date: Date | null
  ) {
    if (!date) {
      return 'Select time';
    }

    return date.toLocaleTimeString(
      'en-GB',
      {
        hour:
          '2-digit',

        minute:
          '2-digit',
      }
    );
  }

  // ========================================================
  // ADD ACTIVITY
  // ========================================================

  async function handleAddActivity() {
    if (!id) {
      Alert.alert(
        'Error',
        'Trip ID is missing.'
      );

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

    if (!activityDate) {
      Alert.alert(
        'Error',
        'Please select a date.'
      );

      return;
    }

    if (!activityTime) {
      Alert.alert(
        'Error',
        'Please select a time.'
      );

      return;
    }

    try {
      setLoading(
        true
      );

      await addDoc(
        collection(
          db,
          'trips',
          id,
          'activities'
        ),
        {
          name:
            name.trim(),

          location:
            location.trim(),

          date:
            activityDate.toISOString(),

          time:
            activityTime.toLocaleTimeString(
              'en-GB',
              {
                hour:
                  '2-digit',

                minute:
                  '2-digit',

                hour12:
                  false,
              }
            ),

          notes:
            notes.trim(),

          createdAt:
            serverTimestamp(),
        }
      );

      Alert.alert(
        'Activity Added',
        'Your activity has been added to the itinerary.'
      );

      router.back();
    } catch (error) {
      console.log(
        'Add activity error:',
        error
      );

      Alert.alert(
        'Error',
        'Unable to add the activity. Please try again.'
      );
    } finally {
      setLoading(
        false
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
      <KeyboardAvoidingView
        style={
          styles.keyboardView
        }
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : 'height'
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={
            styles.scrollContent
          }
        >
          {/* ============================================= */}
          {/* HEADER                                        */}
          {/* ============================================= */}

          <View
            style={
              styles.header
            }
          >
            <Pressable
              style={
                styles.backButton
              }
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={
                  styles.backArrow
                }
              >
                ‹
              </Text>
            </Pressable>

            <View>
              <Text
                style={
                  styles.title
                }
              >
                Add Activity
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Add something to your itinerary.
              </Text>
            </View>
          </View>

          {/* ============================================= */}
          {/* ACTIVITY NAME                                 */}
          {/* ============================================= */}

          <Text
            style={
              styles.label
            }
          >
            Activity Name
          </Text>

          <TextInput
            style={
              styles.input
            }
            placeholder="e.g. Shibuya Crossing"
            placeholderTextColor="#9CA3AF"
            selectionColor="#1769E8"
            cursorColor="#1769E8"
            value={
              name
            }
            onChangeText={
              setName
            }
          />

          {/* ============================================= */}
          {/* LOCATION                                      */}
          {/* ============================================= */}

          <Text
            style={
              styles.label
            }
          >
            Location
          </Text>

          <TextInput
            style={
              styles.input
            }
            placeholder="e.g. Shibuya, Tokyo"
            placeholderTextColor="#9CA3AF"
            selectionColor="#1769E8"
            cursorColor="#1769E8"
            value={
              location
            }
            onChangeText={
              setLocation
            }
          />

          {/* ============================================= */}
          {/* DATE                                          */}
          {/* ============================================= */}

          <Text
            style={
              styles.label
            }
          >
            Date
          </Text>

          <Pressable
            style={
              styles.selectionInput
            }
            onPress={() =>
              setShowDatePicker(
                true
              )
            }
          >
            <Text
              style={[
                styles.selectionText,

                !activityDate &&
                  styles.placeholder,
              ]}
            >
              {formatDate(
                activityDate
              )}
            </Text>

            <Text
              style={
                styles.icon
              }
            >
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
                minimumDate={
                  tripStartDate
                }
                maximumDate={
                  tripEndDate
                }
                onChange={(
                  event,
                  selectedDate
                ) => {
                  setShowDatePicker(
                    false
                  );

                  if (
                    event.type ===
                      'set' &&
                    selectedDate
                  ) {
                    setActivityDate(
                      selectedDate
                    );
                  }
                }}
              />
            )}

          {/* ============================================= */}
          {/* TIME                                          */}
          {/* ============================================= */}

          <Text
            style={
              styles.label
            }
          >
            Time
          </Text>

          <Pressable
            style={
              styles.selectionInput
            }
            onPress={() =>
              setShowTimePicker(
                true
              )
            }
          >
            <Text
              style={[
                styles.selectionText,

                !activityTime &&
                  styles.placeholder,
              ]}
            >
              {formatTime(
                activityTime
              )}
            </Text>

            <Text
              style={
                styles.icon
              }
            >
              🕒
            </Text>
          </Pressable>

          {showTimePicker && (
            <DateTimePicker
              value={
                activityTime ||
                new Date()
              }
              mode="time"
              is24Hour={
                false
              }
              onChange={(
                event,
                selectedTime
              ) => {
                setShowTimePicker(
                  false
                );

                if (
                  event.type ===
                    'set' &&
                  selectedTime
                ) {
                  setActivityTime(
                    selectedTime
                  );
                }
              }}
            />
          )}

          {/* ============================================= */}
          {/* NOTES                                         */}
          {/* ============================================= */}

          <Text
            style={
              styles.label
            }
          >
            Notes
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.notes,
            ]}
            placeholder="Optional notes..."
            placeholderTextColor="#9CA3AF"
            selectionColor="#1769E8"
            cursorColor="#1769E8"
            multiline
            textAlignVertical="top"
            value={
              notes
            }
            onChangeText={
              setNotes
            }
          />

          {/* ============================================= */}
          {/* ADD BUTTON                                    */}
          {/* ============================================= */}

          <Pressable
            style={[
              styles.button,

              loading &&
                styles.buttonDisabled,
            ]}
            disabled={
              loading
            }
            onPress={
              handleAddActivity
            }
          >
            <Text
              style={
                styles.buttonText
              }
            >
              {loading
                ? 'Adding Activity...'
                : 'Add Activity'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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

    keyboardView: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,

      paddingHorizontal:
        24,

      paddingTop:
        60,

      paddingBottom:
        160,
    },

    header: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginBottom:
        28,
    },

    backButton: {
      width: 40,

      height: 40,

      justifyContent:
        'center',

      alignItems:
        'center',

      marginRight:
        8,
    },

    backArrow: {
      fontSize:
        38,

      lineHeight:
        38,

      color:
        '#111827',
    },

    title: {
      fontSize:
        30,

      fontWeight:
        '700',

      color:
        '#111827',
    },

    subtitle: {
      marginTop:
        5,

      fontSize:
        16,

      color:
        '#6B7280',
    },

    label: {
      marginBottom:
        7,

      fontSize:
        15,

      fontWeight:
        '600',

      color:
        '#111827',
    },

    input: {
      marginBottom:
        18,

      paddingHorizontal:
        15,

      paddingVertical:
        13,

      borderWidth:
        1,

      borderColor:
        '#D1D5DB',

      borderRadius:
        12,

      fontSize:
        16,

      color:
        '#111827',

      backgroundColor:
        '#FFFFFF',
    },

    selectionInput: {
      height:
        48,

      marginBottom:
        18,

      paddingHorizontal:
        15,

      borderWidth:
        1,

      borderColor:
        '#D1D5DB',

      borderRadius:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        '#FFFFFF',
    },

    selectionText: {
      fontSize:
        16,

      color:
        '#111827',
    },

    placeholder: {
      color:
        '#6B7280',
    },

    icon: {
      fontSize:
        19,
    },

    notes: {
      minHeight:
        110,

      paddingTop:
        14,

      textAlignVertical:
        'top',
    },

    button: {
      marginTop:
        4,

      paddingVertical:
        15,

      borderRadius:
        12,

      backgroundColor:
        '#1769E8',
    },

    buttonDisabled: {
      opacity:
        0.6,
    },

    buttonText: {
      fontSize:
        16,

      fontWeight:
        '600',

      textAlign:
        'center',

      color:
        '#FFFFFF',
    },
  });