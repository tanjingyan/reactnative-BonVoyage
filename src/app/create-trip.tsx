import { useState } from 'react';

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

import { router } from 'expo-router';

import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';

import DateTimePicker from '@react-native-community/datetimepicker';

import {
  auth,
  db,
} from '@/firebase/firebaseConfig';

export default function CreateTripScreen() {
  const [
    title,
    setTitle,
  ] = useState('');

  const [
    destination,
    setDestination,
  ] = useState('');

  const [
    startDate,
    setStartDate,
  ] =
    useState<Date | null>(
      null
    );

  const [
    endDate,
    setEndDate,
  ] =
    useState<Date | null>(
      null
    );

  const [
    showStartPicker,
    setShowStartPicker,
  ] =
    useState(false);

  const [
    showEndPicker,
    setShowEndPicker,
  ] =
    useState(false);

  const [
    notes,
    setNotes,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  // ========================================================
  // DATE FORMATTER
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

  // ========================================================
  // CREATE TRIP
  // ========================================================

  async function handleCreateTrip() {
    const user =
      auth.currentUser;

    if (!user) {
      Alert.alert(
        'Error',
        'You must be logged in.'
      );

      return;
    }

    if (!title.trim()) {
      Alert.alert(
        'Error',
        'Please enter a trip name.'
      );

      return;
    }

    if (
      !destination.trim()
    ) {
      Alert.alert(
        'Error',
        'Please enter a destination.'
      );

      return;
    }

    if (
      !startDate ||
      !endDate
    ) {
      Alert.alert(
        'Error',
        'Please select your travel dates.'
      );

      return;
    }

    if (
      endDate <
      startDate
    ) {
      Alert.alert(
        'Error',
        'End date cannot be before the start date.'
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
          'trips'
        ),
        {
          userId:
            user.uid,

          title:
            title.trim(),

          destination:
            destination.trim(),

          startDate:
            startDate.toISOString(),

          endDate:
            endDate.toISOString(),

          notes:
            notes.trim(),

          createdAt:
            serverTimestamp(),
        }
      );

      Alert.alert(
        'Trip Created',
        'Your trip has been saved successfully.'
      );

      router.back();
    } catch (error) {
      console.log(
        'Create trip error:',
        error
      );

      Alert.alert(
        'Error',
        'Unable to create your trip. Please try again.'
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

            <View
              style={
                styles.headerText
              }
            >
              <Text
                style={
                  styles.title
                }
              >
                Plan a New Trip
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Start planning your next adventure.
              </Text>
            </View>
          </View>

          {/* ============================================= */}
          {/* TRIP NAME                                     */}
          {/* ============================================= */}

          <Text
            style={
              styles.label
            }
          >
            Trip Name
          </Text>

          <TextInput
            style={
              styles.input
            }
            placeholder="e.g. Japan Trip"
            placeholderTextColor="#9CA3AF"
            selectionColor="#1769E8"
            cursorColor="#1769E8"
            value={
              title
            }
            onChangeText={
              setTitle
            }
          />

          {/* ============================================= */}
          {/* DESTINATION                                   */}
          {/* ============================================= */}

          <Text
            style={
              styles.label
            }
          >
            Destination
          </Text>

          <TextInput
            style={
              styles.input
            }
            placeholder="e.g. Tokyo, Japan"
            placeholderTextColor="#9CA3AF"
            selectionColor="#1769E8"
            cursorColor="#1769E8"
            value={
              destination
            }
            onChangeText={
              setDestination
            }
          />

          {/* ============================================= */}
          {/* START DATE                                    */}
          {/* ============================================= */}

          <Text
            style={
              styles.label
            }
          >
            Start Date
          </Text>

          <Pressable
            style={
              styles.dateInput
            }
            onPress={() =>
              setShowStartPicker(
                true
              )
            }
          >
            <Text
              style={[
                styles.dateText,

                !startDate &&
                  styles.placeholderText,
              ]}
            >
              {formatDate(
                startDate
              )}
            </Text>

            <Text
              style={
                styles.calendarIcon
              }
            >
              📅
            </Text>
          </Pressable>

          {showStartPicker && (
            <DateTimePicker
              value={
                startDate ||
                new Date()
              }
              mode="date"
              minimumDate={
                new Date()
              }
              onChange={(
                event,
                selectedDate
              ) => {
                setShowStartPicker(
                  false
                );

                if (
                  event.type ===
                    'set' &&
                  selectedDate
                ) {
                  setStartDate(
                    selectedDate
                  );

                  // Reset end date if it is
                  // before the new start date.
                  if (
                    endDate &&
                    selectedDate >
                      endDate
                  ) {
                    setEndDate(
                      null
                    );
                  }
                }
              }}
            />
          )}

          {/* ============================================= */}
          {/* END DATE                                      */}
          {/* ============================================= */}

          <Text
            style={
              styles.label
            }
          >
            End Date
          </Text>

          <Pressable
            style={
              styles.dateInput
            }
            onPress={() =>
              setShowEndPicker(
                true
              )
            }
          >
            <Text
              style={[
                styles.dateText,

                !endDate &&
                  styles.placeholderText,
              ]}
            >
              {formatDate(
                endDate
              )}
            </Text>

            <Text
              style={
                styles.calendarIcon
              }
            >
              📅
            </Text>
          </Pressable>

          {showEndPicker && (
            <DateTimePicker
              value={
                endDate ||
                startDate ||
                new Date()
              }
              mode="date"
              minimumDate={
                startDate ||
                new Date()
              }
              onChange={(
                event,
                selectedDate
              ) => {
                setShowEndPicker(
                  false
                );

                if (
                  event.type ===
                    'set' &&
                  selectedDate
                ) {
                  setEndDate(
                    selectedDate
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
            placeholder="Anything you'd like to remember?"
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
          {/* CREATE TRIP                                   */}
          {/* ============================================= */}

          <Pressable
            style={[
              styles.button,

              loading &&
                styles.buttonDisabled,
            ]}
            onPress={
              handleCreateTrip
            }
            disabled={
              loading
            }
          >
            <Text
              style={
                styles.buttonText
              }
            >
              {loading
                ? 'Creating Trip...'
                : 'Create Trip'}
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

      // Gives Notes and the Create Trip
      // button enough room to scroll
      // above the Android keyboard.
      paddingBottom:
        160,
    },

    // ======================================================
    // HEADER
    // ======================================================

    header: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginBottom:
        28,
    },

    backButton: {
      width:
        40,

      height:
        40,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        8,
    },

    backArrow: {
      fontSize:
        38,

      lineHeight:
        38,

      fontWeight:
        '400',

      color:
        '#111827',
    },

    headerText: {
      flex: 1,
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
        6,

      fontSize:
        16,

      color:
        '#6B7280',
    },

    // ======================================================
    // FORM
    // ======================================================

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

      // Important for physical Android
      // devices using Dark Mode.
      color:
        '#111827',

      backgroundColor:
        '#FFFFFF',
    },

    // ======================================================
    // DATE INPUT
    // ======================================================

    dateInput: {
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

    dateText: {
      fontSize:
        16,

      color:
        '#111827',
    },

    placeholderText: {
      color:
        '#6B7280',
    },

    calendarIcon: {
      fontSize:
        20,
    },

    // ======================================================
    // NOTES
    // ======================================================

    notes: {
      minHeight:
        110,

      paddingTop:
        14,

      textAlignVertical:
        'top',
    },

    // ======================================================
    // BUTTON
    // ======================================================

    button: {
      marginTop:
        6,

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