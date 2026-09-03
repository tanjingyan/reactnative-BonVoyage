import { Ionicons } from '@expo/vector-icons';

import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import {
  httpsCallable,
} from 'firebase/functions';

import {
  addDoc,
  collection,
  getDocs,
  query as firestoreQuery,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  auth,
  db,
  functions,
} from '@/firebase/firebaseConfig';

// ==========================================================
// TYPES
// ==========================================================

type ExploreTab =
  | 'places'
  | 'guides'
  | 'people';

type GooglePlace = {
  id: string | null;

  displayName: string;

  formattedAddress:
    | string
    | null;

  latitude:
    | number
    | null;

  longitude:
    | number
    | null;

  rating:
    | number
    | null;

  userRatingCount:
    | number
    | null;

  primaryType:
    | string
    | null;

  googleMapsUri:
    | string
    | null;

  photoUri:
    | string
    | null;

  photoAttributions?: {
    displayName?: string;
    uri?: string;
  }[];
};

type SearchPlacesResponse = {
  places: GooglePlace[];
};

type TripOption = {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
};

// ==========================================================
// SCREEN
// ==========================================================

export default function ExploreScreen() {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ExploreTab>(
      'places'
    );

  const [
    searchText,
    setSearchText,
  ] =
    useState('');

  const [
    places,
    setPlaces,
  ] =
    useState<
      GooglePlace[]
    >([]);

  const [
    searchLoading,
    setSearchLoading,
  ] =
    useState(false);

  const [
    hasSearched,
    setHasSearched,
  ] =
    useState(false);

  // ========================================================
  // ADD PLACE TO TRIP
  // ========================================================

  const [
    addModalVisible,
    setAddModalVisible,
  ] =
    useState(false);

  const [
    selectedPlace,
    setSelectedPlace,
  ] =
    useState<GooglePlace | null>(
      null
    );

  const [
    userTrips,
    setUserTrips,
  ] =
    useState<TripOption[]>([]);

  const [
    tripsLoading,
    setTripsLoading,
  ] =
    useState(false);

  const [
    selectedTripId,
    setSelectedTripId,
  ] =
    useState('');

  const [
    activityDate,
    setActivityDate,
  ] =
    useState(
      new Date()
    );

  const [
    activityTime,
    setActivityTime,
  ] =
    useState(() => {
      const defaultTime =
        new Date();

      defaultTime.setHours(
        10,
        0,
        0,
        0
      );

      return defaultTime;
    });

  const [
    activityNotes,
    setActivityNotes,
  ] =
    useState('');

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
    addingToTrip,
    setAddingToTrip,
  ] =
    useState(false);

  // ========================================================
  // SEARCH GOOGLE PLACES
  // ========================================================

  async function searchPlaces(
    customQuery?: string
  ) {
    const query =
      (
        customQuery ??
        searchText
      ).trim();

    if (!query) {
      Alert.alert(
        'Search required',
        'Enter a place, destination or type of attraction to search.'
      );

      return;
    }

    try {
      setSearchLoading(
        true
      );

      setHasSearched(
        true
      );

      setPlaces([]);

      // ----------------------------------------------------
      // FIREBASE CALLABLE FUNCTION
      // ----------------------------------------------------

      const searchPlacesFunction =
        httpsCallable<
          {
            query: string;
          },
          SearchPlacesResponse
        >(
          functions,
          'searchPlaces'
        );

      const result =
        await searchPlacesFunction({
          query,
        });

      console.log(
        'EXPLORE SEARCH:',
        result.data
      );

      setPlaces(
        result.data.places ??
          []
      );
    } catch (error) {
      console.error(
        'Explore search error:',
        error
      );

      Alert.alert(
        'Search failed',
        'BonVoyage could not search for places. Please try again.'
      );
    } finally {
      setSearchLoading(
        false
      );
    }
  }

  // ========================================================
  // CATEGORY SEARCH
  // ========================================================

  function searchCategory(
    category: string
  ) {
    setSearchText(
      category
    );

    void searchPlaces(
      category
    );
  }

  // ========================================================
  // CLEAR SEARCH
  // ========================================================

  function clearSearch() {
    setSearchText('');

    setPlaces([]);

    setHasSearched(
      false
    );
  }

  // ========================================================
  // OPEN GOOGLE MAPS
  // ========================================================

  async function openGoogleMaps(
    place: GooglePlace
  ) {
    try {
      if (
        place.googleMapsUri
      ) {
        await Linking.openURL(
          place.googleMapsUri
        );

        return;
      }

      if (
        place.latitude !==
          null &&
        place.longitude !==
          null
      ) {
        const url =
          'https://www.google.com/maps/search/?api=1' +
          `&query=${place.latitude},${place.longitude}`;

        await Linking.openURL(
          url
        );
      }
    } catch (error) {
      console.error(
        'Open Google Maps error:',
        error
      );

      Alert.alert(
        'Unable to open Google Maps'
      );
    }
  }

  // ========================================================
  // OPEN ADD TO TRIP
  // ========================================================

  async function openAddToTrip(
    place: GooglePlace
  ) {
    const user =
      auth.currentUser;

    if (!user) {
      Alert.alert(
        'Login required',
        'Please log in before adding a place to a trip.'
      );

      return;
    }

    setSelectedPlace(
      place
    );

    setActivityNotes(
      ''
    );

    setSelectedTripId(
      ''
    );

    setShowDatePicker(
      false
    );

    setShowTimePicker(
      false
    );

    setAddModalVisible(
      true
    );

    try {
      setTripsLoading(
        true
      );

      const tripsQuery =
        firestoreQuery(
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

      const snapshot =
        await getDocs(
          tripsQuery
        );

      const tripList:
        TripOption[] =
        snapshot.docs.map(
          tripDocument => ({
            id:
              tripDocument.id,

            ...(tripDocument.data() as Omit<
              TripOption,
              'id'
            >),
          })
        );

      tripList.sort(
        (a, b) =>
          parseStoredDate(
            a.startDate
          ).getTime() -
          parseStoredDate(
            b.startDate
          ).getTime()
      );

      setUserTrips(
        tripList
      );

      if (
        tripList.length >
        0
      ) {
        const firstTrip =
          tripList[0];

        setSelectedTripId(
          firstTrip.id
        );

        setActivityDate(
          parseStoredDate(
            firstTrip.startDate
          )
        );
      }
    } catch (error) {
      console.error(
        'Load trips error:',
        error
      );

      Alert.alert(
        'Unable to load trips',
        'BonVoyage could not load your trips. Please try again.'
      );
    } finally {
      setTripsLoading(
        false
      );
    }
  }

  // ========================================================
  // CLOSE ADD TO TRIP
  // ========================================================

  function closeAddToTrip() {
    if (addingToTrip) {
      return;
    }

    setAddModalVisible(
      false
    );

    setSelectedPlace(
      null
    );

    setSelectedTripId(
      ''
    );

    setActivityNotes(
      ''
    );

    setShowDatePicker(
      false
    );

    setShowTimePicker(
      false
    );
  }

  // ========================================================
  // SELECT TRIP
  // ========================================================

  function selectTrip(
    trip: TripOption
  ) {
    setSelectedTripId(
      trip.id
    );

    /*
      Start the activity on the first day of the selected trip.
      The user can change it with the date picker.
    */

    setActivityDate(
      parseStoredDate(
        trip.startDate
      )
    );

    setShowDatePicker(
      false
    );
  }

  // ========================================================
  // DATE PICKER
  // ========================================================

  function handleDateChange(
    event:
      DateTimePickerEvent,
    selectedDate?:
      Date
  ) {
    if (
      Platform.OS ===
      'android'
    ) {
      setShowDatePicker(
        false
      );
    }

    if (
      event.type ===
        'dismissed' ||
      !selectedDate
    ) {
      return;
    }

    const selectedTrip =
      userTrips.find(
        trip =>
          trip.id ===
          selectedTripId
      );

    if (
      selectedTrip
    ) {
      const startDate =
        startOfDay(
          parseStoredDate(
            selectedTrip.startDate
          )
        );

      const endDate =
        startOfDay(
          parseStoredDate(
            selectedTrip.endDate
          )
        );

      const chosenDate =
        startOfDay(
          selectedDate
        );

      if (
        chosenDate <
          startDate ||
        chosenDate >
          endDate
      ) {
        Alert.alert(
          'Date outside trip',
          `Choose a date between ${formatDisplayDate(
            startDate
          )} and ${formatDisplayDate(
            endDate
          )}.`
        );

        return;
      }
    }

    setActivityDate(
      selectedDate
    );
  }

  // ========================================================
  // TIME PICKER
  // ========================================================

  function handleTimeChange(
    event:
      DateTimePickerEvent,
    selectedTime?:
      Date
  ) {
    if (
      Platform.OS ===
      'android'
    ) {
      setShowTimePicker(
        false
      );
    }

    if (
      event.type ===
        'dismissed' ||
      !selectedTime
    ) {
      return;
    }

    setActivityTime(
      selectedTime
    );
  }

  // ========================================================
  // SAVE PLACE AS ACTIVITY
  // ========================================================

  async function addPlaceToTrip() {
    const user =
      auth.currentUser;

    if (
      !user ||
      !selectedPlace
    ) {
      return;
    }

    if (
      !selectedTripId
    ) {
      Alert.alert(
        'Choose a trip',
        'Please select the trip you want to add this place to.'
      );

      return;
    }

    const selectedTrip =
      userTrips.find(
        trip =>
          trip.id ===
          selectedTripId
      );

    if (!selectedTrip) {
      Alert.alert(
        'Trip unavailable',
        'The selected trip could not be found.'
      );

      return;
    }

    const startDate =
      startOfDay(
        parseStoredDate(
          selectedTrip.startDate
        )
      );

    const endDate =
      startOfDay(
        parseStoredDate(
          selectedTrip.endDate
        )
      );

    const chosenDate =
      startOfDay(
        activityDate
      );

    if (
      chosenDate <
        startDate ||
      chosenDate >
        endDate
    ) {
      Alert.alert(
        'Date outside trip',
        `Choose a date between ${formatDisplayDate(
          startDate
        )} and ${formatDisplayDate(
          endDate
        )}.`
      );

      return;
    }

    try {
      setAddingToTrip(
        true
      );

      await addDoc(
        collection(
          db,
          'trips',
          selectedTrip.id,
          'activities'
        ),
        {
          userId:
            user.uid,

          name:
            selectedPlace.displayName,

          /*
            Your current itinerary and map screens already read
            the activity "location" field, so the Google address
            is saved directly into that same field.
          */
          location:
            selectedPlace.formattedAddress ||
            selectedPlace.displayName,

          date:
            formatFirestoreDate(
              activityDate
            ),

          time:
            formatFirestoreTime(
              activityTime
            ),

          notes:
            activityNotes.trim(),

          createdAt:
            serverTimestamp(),

          /*
            Extra Google Places information is useful later
            for place details without changing the existing
            itinerary structure.
          */
          source:
            'google_places',

          googlePlaceId:
            selectedPlace.id,

          latitude:
            selectedPlace.latitude,

          longitude:
            selectedPlace.longitude,

          googleMapsUri:
            selectedPlace.googleMapsUri,

          photoUri:
            selectedPlace.photoUri,
        }
      );

      setAddModalVisible(
        false
      );

      setSelectedPlace(
        null
      );

      setSelectedTripId(
        ''
      );

      setActivityNotes(
        ''
      );

      Alert.alert(
        'Added to itinerary',
        `${selectedPlace.displayName} was added to ${selectedTrip.title}.`
      );
    } catch (error) {
      console.error(
        'Add place to trip error:',
        error
      );

      Alert.alert(
        'Unable to add place',
        'BonVoyage could not add this place to your itinerary. Please try again.'
      );
    } finally {
      setAddingToTrip(
        false
      );
    }
  }

  // ========================================================
  // UI
  // ========================================================

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={['top']}
    >
      <View
        style={
          styles.container
        }
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
            Explore
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Discover places, guides and travellers
          </Text>
        </View>

        {/* ================================================= */}
        {/* SEARCH BAR                                        */}
        {/* ================================================= */}

        <View
          style={
            styles.searchContainer
          }
        >
          <Ionicons
            name="search-outline"
            size={22}
            color="#6B7280"
          />

          <TextInput
            style={
              styles.searchInput
            }
            value={
              searchText
            }
            onChangeText={
              setSearchText
            }
            placeholder={
              activeTab ===
              'places'
                ? 'Search places or destinations...'
                : activeTab ===
                    'guides'
                  ? 'Search travel guides...'
                  : 'Search travellers...'
            }
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={() => {
              if (
                activeTab ===
                'places'
              ) {
                void searchPlaces();
              }
            }}
          />

          {searchText.length >
          0 ? (
            <Pressable
              onPress={
                clearSearch
              }
            >
              <Ionicons
                name="close-circle"
                size={21}
                color="#9CA3AF"
              />
            </Pressable>
          ) : null}

          {activeTab ===
            'places' && (
            <Pressable
              style={
                styles.searchButton
              }
              onPress={() =>
                void searchPlaces()
              }
            >
              {searchLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color="#FFFFFF"
                />
              )}
            </Pressable>
          )}
        </View>

        {/* ================================================= */}
        {/* TABS                                              */}
        {/* ================================================= */}

        <View
          style={
            styles.tabContainer
          }
        >
          <TabButton
            title="Places"
            icon="location-outline"
            active={
              activeTab ===
              'places'
            }
            onPress={() => {
              setActiveTab(
                'places'
              );

              clearSearch();
            }}
          />

          <TabButton
            title="Guides"
            icon="book-outline"
            active={
              activeTab ===
              'guides'
            }
            onPress={() => {
              setActiveTab(
                'guides'
              );

              clearSearch();
            }}
          />

          <TabButton
            title="People"
            icon="people-outline"
            active={
              activeTab ===
              'people'
            }
            onPress={() => {
              setActiveTab(
                'people'
              );

              clearSearch();
            }}
          />
        </View>

        {/* ================================================= */}
        {/* CONTENT                                           */}
        {/* ================================================= */}

        <ScrollView
          style={
            styles.content
          }
          contentContainerStyle={
            styles.contentContainer
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* =============================================== */}
          {/* PLACES                                          */}
          {/* =============================================== */}

          {activeTab ===
            'places' && (
            <>
              {searchLoading ? (
                <SearchLoading />
              ) : hasSearched ? (
                <SearchResults
                  places={
                    places
                  }
                  onOpenGoogleMaps={
                    openGoogleMaps
                  }
                  onAddToTrip={
                    openAddToTrip
                  }
                />
              ) : (
                <PlacesSection
                  onCategoryPress={
                    searchCategory
                  }
                />
              )}
            </>
          )}

          {/* =============================================== */}
          {/* GUIDES                                          */}
          {/* =============================================== */}

          {activeTab ===
            'guides' && (
            <GuidesSection />
          )}

          {/* =============================================== */}
          {/* PEOPLE                                          */}
          {/* =============================================== */}

          {activeTab ===
            'people' && (
            <PeopleSection />
          )}
        </ScrollView>

        {/* ================================================= */}
        {/* ADD TO TRIP MODAL                                 */}
        {/* ================================================= */}

        <Modal
          visible={
            addModalVisible
          }
          transparent
          animationType="slide"
          onRequestClose={
            closeAddToTrip
          }
        >
          <KeyboardAvoidingView
            style={
              styles.modalKeyboardView
            }
            behavior={
              Platform.OS ===
              'ios'
                ? 'padding'
                : undefined
            }
          >
            <Pressable
              style={
                styles.modalBackdrop
              }
              onPress={
                closeAddToTrip
              }
            />

            <View
              style={
                styles.modalSheet
              }
            >
              <View
                style={
                  styles.modalDragBar
                }
              />

              <View
                style={
                  styles.modalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Add to trip
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Add this place to your itinerary
                  </Text>
                </View>

                <Pressable
                  style={
                    styles.modalCloseButton
                  }
                  onPress={
                    closeAddToTrip
                  }
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color="#374151"
                  />
                </Pressable>
              </View>

              <ScrollView
                style={
                  styles.modalScroll
                }
                contentContainerStyle={
                  styles.modalScrollContent
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
              >
                {/* SELECTED PLACE */}

                {selectedPlace ? (
                  <View
                    style={
                      styles.selectedPlaceCard
                    }
                  >
                    {selectedPlace.photoUri ? (
                      <Image
                        source={{
                          uri:
                            selectedPlace.photoUri,
                        }}
                        style={
                          styles.selectedPlaceImage
                        }
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={
                          styles.selectedPlacePlaceholder
                        }
                      >
                        <Ionicons
                          name="location"
                          size={24}
                          color="#1769E8"
                        />
                      </View>
                    )}

                    <View
                      style={
                        styles.selectedPlaceInfo
                      }
                    >
                      <Text
                        style={
                          styles.selectedPlaceName
                        }
                        numberOfLines={2}
                      >
                        {
                          selectedPlace.displayName
                        }
                      </Text>

                      <Text
                        style={
                          styles.selectedPlaceAddress
                        }
                        numberOfLines={2}
                      >
                        {selectedPlace.formattedAddress ||
                          'Google Places location'}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* CHOOSE TRIP */}

                <Text
                  style={
                    styles.modalFieldLabel
                  }
                >
                  Choose trip
                </Text>

                {tripsLoading ? (
                  <View
                    style={
                      styles.tripLoadingBox
                    }
                  >
                    <ActivityIndicator
                      color="#1769E8"
                    />

                    <Text
                      style={
                        styles.tripLoadingText
                      }
                    >
                      Loading your trips...
                    </Text>
                  </View>
                ) : userTrips.length ===
                  0 ? (
                  <View
                    style={
                      styles.noTripsCard
                    }
                  >
                    <Ionicons
                      name="airplane-outline"
                      size={28}
                      color="#1769E8"
                    />

                    <Text
                      style={
                        styles.noTripsTitle
                      }
                    >
                      No trips yet
                    </Text>

                    <Text
                      style={
                        styles.noTripsText
                      }
                    >
                      Create a trip first, then come back to Explore to add places.
                    </Text>
                  </View>
                ) : (
                  <View
                    style={
                      styles.tripOptions
                    }
                  >
                    {userTrips.map(
                      trip => {
                        const selected =
                          selectedTripId ===
                          trip.id;

                        return (
                          <Pressable
                            key={
                              trip.id
                            }
                            style={[
                              styles.tripOption,
                              selected &&
                                styles.tripOptionSelected,
                            ]}
                            onPress={() =>
                              selectTrip(
                                trip
                              )
                            }
                          >
                            <View
                              style={[
                                styles.tripRadio,
                                selected &&
                                  styles.tripRadioSelected,
                              ]}
                            >
                              {selected ? (
                                <View
                                  style={
                                    styles.tripRadioDot
                                  }
                                />
                              ) : null}
                            </View>

                            <View
                              style={
                                styles.tripOptionInfo
                              }
                            >
                              <Text
                                style={
                                  styles.tripOptionTitle
                                }
                              >
                                {
                                  trip.title
                                }
                              </Text>

                              <Text
                                style={
                                  styles.tripOptionDestination
                                }
                              >
                                {
                                  trip.destination
                                }
                              </Text>

                              <Text
                                style={
                                  styles.tripOptionDates
                                }
                              >
                                {formatDisplayDate(
                                  parseStoredDate(
                                    trip.startDate
                                  )
                                )}
                                {'  →  '}
                                {formatDisplayDate(
                                  parseStoredDate(
                                    trip.endDate
                                  )
                                )}
                              </Text>
                            </View>

                            {selected ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color="#1769E8"
                              />
                            ) : null}
                          </Pressable>
                        );
                      }
                    )}
                  </View>
                )}

                {/* DATE / TIME */}

                {userTrips.length >
                0 ? (
                  <>
                    <View
                      style={
                        styles.dateTimeRow
                      }
                    >
                      <View
                        style={
                          styles.dateTimeColumn
                        }
                      >
                        <Text
                          style={
                            styles.modalFieldLabel
                          }
                        >
                          Date
                        </Text>

                        <Pressable
                          style={
                            styles.dateTimeButton
                          }
                          onPress={() => {
                            setShowTimePicker(
                              false
                            );

                            setShowDatePicker(
                              true
                            );
                          }}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={19}
                            color="#1769E8"
                          />

                          <Text
                            style={
                              styles.dateTimeText
                            }
                          >
                            {formatDisplayDate(
                              activityDate
                            )}
                          </Text>
                        </Pressable>
                      </View>

                      <View
                        style={
                          styles.dateTimeColumn
                        }
                      >
                        <Text
                          style={
                            styles.modalFieldLabel
                          }
                        >
                          Time
                        </Text>

                        <Pressable
                          style={
                            styles.dateTimeButton
                          }
                          onPress={() => {
                            setShowDatePicker(
                              false
                            );

                            setShowTimePicker(
                              true
                            );
                          }}
                        >
                          <Ionicons
                            name="time-outline"
                            size={19}
                            color="#1769E8"
                          />

                          <Text
                            style={
                              styles.dateTimeText
                            }
                          >
                            {formatDisplayTime(
                              activityTime
                            )}
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    {showDatePicker ? (
                      <DateTimePicker
                        value={
                          activityDate
                        }
                        mode="date"
                        display={
                          Platform.OS ===
                          'ios'
                            ? 'spinner'
                            : 'default'
                        }
                        minimumDate={
                          getSelectedTripDateRange(
                            userTrips,
                            selectedTripId
                          ).minimumDate
                        }
                        maximumDate={
                          getSelectedTripDateRange(
                            userTrips,
                            selectedTripId
                          ).maximumDate
                        }
                        onChange={
                          handleDateChange
                        }
                      />
                    ) : null}

                    {showTimePicker ? (
                      <DateTimePicker
                        value={
                          activityTime
                        }
                        mode="time"
                        display={
                          Platform.OS ===
                          'ios'
                            ? 'spinner'
                            : 'default'
                        }
                        onChange={
                          handleTimeChange
                        }
                      />
                    ) : null}

                    {/* NOTES */}

                    <Text
                      style={[
                        styles.modalFieldLabel,
                        styles.notesLabel,
                      ]}
                    >
                      Notes
                      <Text
                        style={
                          styles.optionalText
                        }
                      >
                        {' '}
                        (optional)
                      </Text>
                    </Text>

                    <TextInput
                      style={
                        styles.notesInput
                      }
                      value={
                        activityNotes
                      }
                      onChangeText={
                        setActivityNotes
                      }
                      placeholder="Add a reminder or plan for this place..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                    />
                  </>
                ) : null}
              </ScrollView>

              {/* ACTIONS */}

              <View
                style={
                  styles.modalActions
                }
              >
                <Pressable
                  style={
                    styles.cancelModalButton
                  }
                  onPress={
                    closeAddToTrip
                  }
                  disabled={
                    addingToTrip
                  }
                >
                  <Text
                    style={
                      styles.cancelModalText
                    }
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.confirmAddButton,
                    (
                      !selectedTripId ||
                      addingToTrip
                    ) &&
                      styles.confirmAddButtonDisabled,
                  ]}
                  onPress={() =>
                    void addPlaceToTrip()
                  }
                  disabled={
                    !selectedTripId ||
                    addingToTrip
                  }
                >
                  {addingToTrip ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="add"
                        size={19}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.confirmAddText
                        }
                      >
                        Add to itinerary
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ==========================================================
// TAB BUTTON
// ==========================================================

type TabButtonProps = {
  title: string;

  icon:
    keyof typeof Ionicons.glyphMap;

  active: boolean;

  onPress: () => void;
};

function TabButton({
  title,
  icon,
  active,
  onPress,
}: TabButtonProps) {
  return (
    <Pressable
      style={[
        styles.tabButton,

        active &&
          styles.activeTabButton,
      ]}
      onPress={
        onPress
      }
    >
      <Ionicons
        name={icon}
        size={19}
        color={
          active
            ? '#1769E8'
            : '#6B7280'
        }
      />

      <Text
        style={[
          styles.tabText,

          active &&
            styles.activeTabText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

// ==========================================================
// DEFAULT PLACES SECTION
// ==========================================================

type PlacesSectionProps = {
  onCategoryPress:
    (
      category: string
    ) => void;
};

function PlacesSection({
  onCategoryPress,
}: PlacesSectionProps) {
  return (
    <>
      <View
        style={
          styles.sectionHeader
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          Explore places
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          Find attractions, restaurants and places for your trip
        </Text>
      </View>

      <View
        style={
          styles.categoryGrid
        }
      >
        <CategoryCard
          title="Attractions"
          icon="camera-outline"
          onPress={() =>
            onCategoryPress(
              'tourist attractions'
            )
          }
        />

        <CategoryCard
          title="Restaurants"
          icon="restaurant-outline"
          onPress={() =>
            onCategoryPress(
              'restaurants'
            )
          }
        />

        <CategoryCard
          title="Cafes"
          icon="cafe-outline"
          onPress={() =>
            onCategoryPress(
              'cafes'
            )
          }
        />

        <CategoryCard
          title="Shopping"
          icon="bag-outline"
          onPress={() =>
            onCategoryPress(
              'shopping'
            )
          }
        />
      </View>

      <View
        style={
          styles.infoCard
        }
      >
        <View
          style={
            styles.infoIcon
          }
        >
          <Ionicons
            name="search"
            size={25}
            color="#1769E8"
          />
        </View>

        <View
          style={
            styles.infoContent
          }
        >
          <Text
            style={
              styles.infoTitle
            }
          >
            Search anywhere
          </Text>

          <Text
            style={
              styles.infoDescription
            }
          >
            Try searches such as
            Shibuya Crossing, cafes
            in Tokyo or attractions
            in Paris.
          </Text>
        </View>
      </View>
    </>
  );
}

// ==========================================================
// SEARCH LOADING
// ==========================================================

function SearchLoading() {
  return (
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
          styles.loadingTitle
        }
      >
        Finding places...
      </Text>

      <Text
        style={
          styles.loadingDescription
        }
      >
        Searching Google Places
      </Text>
    </View>
  );
}

// ==========================================================
// SEARCH RESULTS
// ==========================================================

type SearchResultsProps = {
  places:
    GooglePlace[];

  onOpenGoogleMaps:
    (
      place:
        GooglePlace
    ) => void;

  onAddToTrip:
    (
      place:
        GooglePlace
    ) => void;
};

function SearchResults({
  places,
  onOpenGoogleMaps,
  onAddToTrip,
}: SearchResultsProps) {
  if (
    places.length ===
    0
  ) {
    return (
      <View
        style={
          styles.emptyContainer
        }
      >
        <View
          style={
            styles.largeIcon
          }
        >
          <Ionicons
            name="search-outline"
            size={34}
            color="#1769E8"
          />
        </View>

        <Text
          style={
            styles.emptyTitle
          }
        >
          No places found
        </Text>

        <Text
          style={
            styles.emptyDescription
          }
        >
          Try another place,
          destination or search
          term.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={
          styles.resultHeader
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          Search results
        </Text>

        <Text
          style={
            styles.resultCount
          }
        >
          {places.length}{' '}
          {places.length ===
          1
            ? 'place'
            : 'places'}
        </Text>
      </View>

      {places.map(
        (
          place,
          index
        ) => (
          <PlaceCard
            key={
              place.id ??
              `${place.displayName}-${index}`
            }
            place={
              place
            }
            onOpenGoogleMaps={() =>
              onOpenGoogleMaps(
                place
              )
            }
            onAddToTrip={() =>
              onAddToTrip(
                place
              )
            }
          />
        )
      )}
    </>
  );
}

// ==========================================================
// PLACE RESULT CARD
// ==========================================================

type PlaceCardProps = {
  place:
    GooglePlace;

  onOpenGoogleMaps:
    () => void;

  onAddToTrip:
    () => void;
};

function PlaceCard({
  place,
  onOpenGoogleMaps,
  onAddToTrip,
}: PlaceCardProps) {
  return (
    <View
      style={
        styles.placeCard
      }
    >
      {/* PHOTO */}

      {place.photoUri ? (
        <Image
          source={{
            uri:
              place.photoUri,
          }}
          style={
            styles.placeImage
          }
          resizeMode="cover"
        />
      ) : (
        <View
          style={
            styles.placeImagePlaceholder
          }
        >
          <Ionicons
            name="image-outline"
            size={34}
            color="#9CA3AF"
          />
        </View>
      )}

      {/* DETAILS */}

      <View
        style={
          styles.placeContent
        }
      >
        <Text
          style={
            styles.placeName
          }
          numberOfLines={2}
        >
          {
            place.displayName
          }
        </Text>

        {/* RATING */}

        {place.rating !==
          null && (
          <View
            style={
              styles.ratingRow
            }
          >
            <Ionicons
              name="star"
              size={15}
              color="#F59E0B"
            />

            <Text
              style={
                styles.ratingText
              }
            >
              {place.rating.toFixed(
                1
              )}
            </Text>

            {place.userRatingCount !==
              null && (
              <Text
                style={
                  styles.ratingCount
                }
              >
                (
                {place.userRatingCount.toLocaleString()}
                )
              </Text>
            )}
          </View>
        )}

        {/* CATEGORY */}

        {place.primaryType ? (
          <Text
            style={
              styles.placeCategory
            }
          >
            {formatPlaceType(
              place.primaryType
            )}
          </Text>
        ) : null}

        {/* ADDRESS */}

        {place.formattedAddress ? (
          <View
            style={
              styles.placeAddressRow
            }
          >
            <Ionicons
              name="location-outline"
              size={14}
              color="#6B7280"
            />

            <Text
              style={
                styles.placeAddress
              }
              numberOfLines={2}
            >
              {
                place.formattedAddress
              }
            </Text>
          </View>
        ) : null}

        {/* ACTION */}

        <View
          style={
            styles.placeActionRow
          }
        >
          <Pressable
            style={
              styles.googleButton
            }
            onPress={
              onOpenGoogleMaps
            }
          >
            <Ionicons
              name="map-outline"
              size={16}
              color="#1769E8"
            />

            <Text
              style={
                styles.googleButtonText
              }
            >
              View on map
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.addToTripButton
            }
            onPress={
              onAddToTrip
            }
          >
            <Ionicons
              name="add"
              size={17}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.addToTripText
              }
            >
              Add to trip
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ==========================================================
// GUIDES
// ==========================================================

function GuidesSection() {
  return (
    <View
      style={
        styles.emptyContainer
      }
    >
      <View
        style={
          styles.largeIcon
        }
      >
        <Ionicons
          name="book-outline"
          size={34}
          color="#1769E8"
        />
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        Travel guides
      </Text>

      <Text
        style={
          styles.emptyDescription
        }
      >
        Discover itineraries
        and recommendations
        shared by other
        BonVoyage travellers.
      </Text>

      <View
        style={
          styles.comingSoonBadge
        }
      >
        <Text
          style={
            styles.comingSoonText
          }
        >
          Coming next
        </Text>
      </View>
    </View>
  );
}

// ==========================================================
// PEOPLE
// ==========================================================

function PeopleSection() {
  return (
    <View
      style={
        styles.emptyContainer
      }
    >
      <View
        style={
          styles.largeIcon
        }
      >
        <Ionicons
          name="people-outline"
          size={34}
          color="#1769E8"
        />
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        Find travellers
      </Text>

      <Text
        style={
          styles.emptyDescription
        }
      >
        Find BonVoyage users
        and discover the travel
        guides they have shared.
      </Text>

      <View
        style={
          styles.comingSoonBadge
        }
      >
        <Text
          style={
            styles.comingSoonText
          }
        >
          Coming next
        </Text>
      </View>
    </View>
  );
}

// ==========================================================
// CATEGORY CARD
// ==========================================================

type CategoryCardProps = {
  title: string;

  icon:
    keyof typeof Ionicons.glyphMap;

  onPress:
    () => void;
};

function CategoryCard({
  title,
  icon,
  onPress,
}: CategoryCardProps) {
  return (
    <Pressable
      style={
        styles.categoryCard
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.categoryIcon
        }
      >
        <Ionicons
          name={icon}
          size={25}
          color="#1769E8"
        />
      </View>

      <Text
        style={
          styles.categoryTitle
        }
      >
        {title}
      </Text>
    </Pressable>
  );
}

// ==========================================================
// FORMAT GOOGLE PLACE TYPE
// ==========================================================

function formatPlaceType(
  type: string
) {
  return type
    .replace(
      /_/g,
      ' '
    )
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}

// ==========================================================
// DATE HELPERS
// ==========================================================

function parseStoredDate(
  value: string
) {
  /*
    Trips are currently stored as ISO strings.
    This also supports a future YYYY-MM-DD value.
  */

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    const [
      year,
      month,
      day,
    ] =
      value
        .split('-')
        .map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return new Date();
  }

  return parsed;
}

function startOfDay(
  date: Date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function formatFirestoreDate(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}

function formatFirestoreTime(
  date: Date
) {
  const hours =
    String(
      date.getHours()
    ).padStart(
      2,
      '0'
    );

  const minutes =
    String(
      date.getMinutes()
    ).padStart(
      2,
      '0'
    );

  return `${hours}:${minutes}`;
}

function formatDisplayDate(
  date: Date
) {
  return date.toLocaleDateString(
    'en-GB',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );
}

function formatDisplayTime(
  date: Date
) {
  return date.toLocaleTimeString(
    'en-US',
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  );
}

function getSelectedTripDateRange(
  trips: TripOption[],
  selectedTripId: string
) {
  const selectedTrip =
    trips.find(
      trip =>
        trip.id ===
        selectedTripId
    );

  if (!selectedTrip) {
    return {
      minimumDate:
        undefined,
      maximumDate:
        undefined,
    };
  }

  return {
    minimumDate:
      parseStoredDate(
        selectedTrip.startDate
      ),

    maximumDate:
      parseStoredDate(
        selectedTrip.endDate
      ),
  };
}

// ==========================================================
// STYLES
// ==========================================================

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        '#FFFFFF',
    },

    container: {
      flex: 1,

      backgroundColor:
        '#FFFFFF',
    },

    // ------------------------------------------------------
    // HEADER
    // ------------------------------------------------------

    header: {
      paddingHorizontal:
        22,

      paddingTop: 12,

      paddingBottom: 19,
    },

    title: {
      fontSize: 34,

      fontWeight: '800',

      color: '#111827',

      letterSpacing: -0.7,
    },

    subtitle: {
      marginTop: 4,

      fontSize: 14,

      color: '#6B7280',
    },

    // ------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------

    searchContainer: {
      marginHorizontal:
        22,

      minHeight: 54,

      paddingLeft: 15,

      paddingRight: 6,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 17,

      backgroundColor:
        '#F9FAFB',
    },

    searchInput: {
      flex: 1,

      marginLeft: 10,

      paddingVertical: 12,

      fontSize: 14,

      color: '#111827',
    },

    searchButton: {
      width: 42,

      height: 42,

      marginLeft: 7,

      borderRadius: 13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#1769E8',
    },

    // ------------------------------------------------------
    // TABS
    // ------------------------------------------------------

    tabContainer: {
      marginHorizontal:
        22,

      marginTop: 20,

      padding: 4,

      flexDirection:
        'row',

      borderRadius: 16,

      backgroundColor:
        '#F3F4F6',
    },

    tabButton: {
      flex: 1,

      minHeight: 45,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 6,

      borderRadius: 13,
    },

    activeTabButton: {
      backgroundColor:
        '#FFFFFF',

      elevation: 2,

      shadowColor:
        '#000',

      shadowOpacity:
        0.06,

      shadowRadius: 4,

      shadowOffset: {
        width: 0,
        height: 2,
      },
    },

    tabText: {
      fontSize: 13,

      fontWeight: '600',

      color: '#6B7280',
    },

    activeTabText: {
      color: '#1769E8',

      fontWeight: '700',
    },

    // ------------------------------------------------------
    // CONTENT
    // ------------------------------------------------------

    content: {
      flex: 1,
    },

    contentContainer: {
      paddingHorizontal:
        22,

      paddingTop: 28,

      paddingBottom: 120,
    },

    sectionHeader: {
      marginBottom: 18,
    },

    sectionTitle: {
      fontSize: 21,

      fontWeight: '800',

      color: '#111827',
    },

    sectionSubtitle: {
      marginTop: 5,

      fontSize: 13,

      lineHeight: 19,

      color: '#6B7280',
    },

    // ------------------------------------------------------
    // CATEGORIES
    // ------------------------------------------------------

    categoryGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',

      gap: 11,
    },

    categoryCard: {
      width: '48%',

      minHeight: 110,

      padding: 15,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 17,

      backgroundColor:
        '#FFFFFF',
    },

    categoryIcon: {
      width: 43,

      height: 43,

      borderRadius: 13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#EEF4FF',
    },

    categoryTitle: {
      marginTop: 12,

      fontSize: 14,

      fontWeight: '700',

      color: '#111827',
    },

    // ------------------------------------------------------
    // INFO
    // ------------------------------------------------------

    infoCard: {
      marginTop: 24,

      padding: 17,

      flexDirection:
        'row',

      borderRadius: 18,

      backgroundColor:
        '#F5F8FF',
    },

    infoIcon: {
      width: 49,

      height: 49,

      borderRadius: 15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FFFFFF',
    },

    infoContent: {
      flex: 1,

      marginLeft: 13,
    },

    infoTitle: {
      fontSize: 15,

      fontWeight: '700',

      color: '#111827',
    },

    infoDescription: {
      marginTop: 4,

      fontSize: 12,

      lineHeight: 18,

      color: '#6B7280',
    },

    // ------------------------------------------------------
    // LOADING
    // ------------------------------------------------------

    loadingContainer: {
      alignItems:
        'center',

      paddingTop: 80,
    },

    loadingTitle: {
      marginTop: 15,

      fontSize: 16,

      fontWeight: '700',

      color: '#111827',
    },

    loadingDescription: {
      marginTop: 5,

      fontSize: 12,

      color: '#6B7280',
    },

    // ------------------------------------------------------
    // RESULT HEADER
    // ------------------------------------------------------

    resultHeader: {
      marginBottom: 15,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    resultCount: {
      fontSize: 12,

      color: '#6B7280',
    },

    // ------------------------------------------------------
    // PLACE RESULT
    // ------------------------------------------------------

    placeCard: {
      marginBottom: 17,

      overflow:
        'hidden',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 19,

      backgroundColor:
        '#FFFFFF',

      shadowColor:
        '#000',

      shadowOpacity:
        0.04,

      shadowRadius: 7,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 2,
    },

    placeImage: {
      width: '100%',

      height: 175,

      backgroundColor:
        '#F3F4F6',
    },

    placeImagePlaceholder: {
      width: '100%',

      height: 150,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F3F4F6',
    },

    placeContent: {
      padding: 16,
    },

    placeName: {
      fontSize: 18,

      fontWeight: '800',

      color: '#111827',
    },

    ratingRow: {
      marginTop: 8,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    ratingText: {
      marginLeft: 4,

      fontSize: 13,

      fontWeight: '700',

      color: '#111827',
    },

    ratingCount: {
      marginLeft: 4,

      fontSize: 12,

      color: '#6B7280',
    },

    placeCategory: {
      marginTop: 6,

      fontSize: 12,

      color: '#6B7280',
    },

    placeAddressRow: {
      marginTop: 9,

      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    placeAddress: {
      flex: 1,

      marginLeft: 5,

      fontSize: 12,

      lineHeight: 17,

      color: '#6B7280',
    },

    // ------------------------------------------------------
    // RESULT ACTIONS
    // ------------------------------------------------------

    placeActionRow: {
      marginTop: 15,

      flexDirection:
        'row',

      gap: 9,
    },

    googleButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 5,

      paddingHorizontal:
        12,

      paddingVertical: 9,

      borderRadius: 12,

      backgroundColor:
        '#EEF4FF',
    },

    googleButtonText: {
      fontSize: 12,

      fontWeight: '700',

      color: '#1769E8',
    },

    addToTripButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 4,

      paddingHorizontal:
        12,

      paddingVertical: 9,

      borderRadius: 12,

      backgroundColor:
        '#1769E8',
    },

    addToTripText: {
      fontSize: 12,

      fontWeight: '700',

      color: '#FFFFFF',
    },

    // ------------------------------------------------------
    // ADD TO TRIP MODAL
    // ------------------------------------------------------

    modalKeyboardView: {
      flex: 1,

      justifyContent:
        'flex-end',
    },

    modalBackdrop: {
      position: 'absolute',

      top: 0,

      left: 0,

      right: 0,

      bottom: 0,

      backgroundColor:
        'rgba(17, 24, 39, 0.42)',
    },

    modalSheet: {
      maxHeight:
        '88%',

      borderTopLeftRadius:
        28,

      borderTopRightRadius:
        28,

      backgroundColor:
        '#FFFFFF',

      overflow:
        'hidden',
    },

    modalDragBar: {
      width: 42,

      height: 4,

      marginTop: 10,

      marginBottom: 8,

      alignSelf:
        'center',

      borderRadius: 4,

      backgroundColor:
        '#D1D5DB',
    },

    modalHeader: {
      paddingHorizontal:
        20,

      paddingTop: 5,

      paddingBottom: 15,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth: 1,

      borderBottomColor:
        '#F0F1F3',
    },

    modalTitle: {
      fontSize: 22,

      fontWeight: '800',

      color: '#111827',
    },

    modalSubtitle: {
      marginTop: 3,

      fontSize: 12,

      color: '#6B7280',
    },

    modalCloseButton: {
      width: 38,

      height: 38,

      borderRadius: 19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F3F4F6',
    },

    modalScroll: {
      flexGrow: 0,
    },

    modalScrollContent: {
      paddingHorizontal:
        20,

      paddingTop: 17,

      paddingBottom: 25,
    },

    selectedPlaceCard: {
      padding: 11,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 17,

      backgroundColor:
        '#F9FAFB',
    },

    selectedPlaceImage: {
      width: 66,

      height: 66,

      borderRadius: 13,

      backgroundColor:
        '#E5E7EB',
    },

    selectedPlacePlaceholder: {
      width: 66,

      height: 66,

      borderRadius: 13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#EEF4FF',
    },

    selectedPlaceInfo: {
      flex: 1,

      marginLeft: 12,
    },

    selectedPlaceName: {
      fontSize: 16,

      fontWeight: '800',

      color: '#111827',
    },

    selectedPlaceAddress: {
      marginTop: 4,

      fontSize: 11,

      lineHeight: 16,

      color: '#6B7280',
    },

    modalFieldLabel: {
      marginTop: 20,

      marginBottom: 8,

      fontSize: 13,

      fontWeight: '700',

      color: '#374151',
    },

    tripLoadingBox: {
      minHeight: 80,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 15,

      backgroundColor:
        '#F9FAFB',
    },

    tripLoadingText: {
      marginLeft: 9,

      fontSize: 12,

      color: '#6B7280',
    },

    noTripsCard: {
      paddingVertical:
        22,

      paddingHorizontal:
        20,

      alignItems:
        'center',

      borderRadius: 17,

      backgroundColor:
        '#F5F8FF',
    },

    noTripsTitle: {
      marginTop: 8,

      fontSize: 15,

      fontWeight: '800',

      color: '#111827',
    },

    noTripsText: {
      marginTop: 5,

      textAlign:
        'center',

      fontSize: 12,

      lineHeight: 18,

      color: '#6B7280',
    },

    tripOptions: {
      gap: 9,
    },

    tripOption: {
      padding: 13,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 15,

      backgroundColor:
        '#FFFFFF',
    },

    tripOptionSelected: {
      borderColor:
        '#1769E8',

      backgroundColor:
        '#F5F8FF',
    },

    tripRadio: {
      width: 20,

      height: 20,

      marginRight: 11,

      borderWidth: 2,

      borderColor:
        '#CBD5E1',

      borderRadius: 10,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    tripRadioSelected: {
      borderColor:
        '#1769E8',
    },

    tripRadioDot: {
      width: 10,

      height: 10,

      borderRadius: 5,

      backgroundColor:
        '#1769E8',
    },

    tripOptionInfo: {
      flex: 1,
    },

    tripOptionTitle: {
      fontSize: 14,

      fontWeight: '800',

      color: '#111827',
    },

    tripOptionDestination: {
      marginTop: 2,

      fontSize: 12,

      color: '#4B5563',
    },

    tripOptionDates: {
      marginTop: 4,

      fontSize: 11,

      color: '#6B7280',
    },

    dateTimeRow: {
      flexDirection:
        'row',

      gap: 10,
    },

    dateTimeColumn: {
      flex: 1,
    },

    dateTimeButton: {
      minHeight: 50,

      paddingHorizontal:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 14,

      backgroundColor:
        '#F9FAFB',
    },

    dateTimeText: {
      marginLeft: 7,

      fontSize: 12,

      fontWeight: '600',

      color: '#374151',
    },

    notesLabel: {
      marginTop: 18,
    },

    optionalText: {
      fontWeight: '400',

      color: '#9CA3AF',
    },

    notesInput: {
      minHeight: 88,

      paddingHorizontal:
        13,

      paddingVertical: 12,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 14,

      fontSize: 13,

      lineHeight: 19,

      color: '#111827',

      backgroundColor:
        '#F9FAFB',
    },

    modalActions: {
      paddingHorizontal:
        20,

      paddingTop: 12,

      paddingBottom:
        Platform.OS ===
        'ios'
          ? 28
          : 18,

      flexDirection:
        'row',

      gap: 10,

      borderTopWidth: 1,

      borderTopColor:
        '#F0F1F3',

      backgroundColor:
        '#FFFFFF',
    },

    cancelModalButton: {
      minHeight: 50,

      paddingHorizontal:
        20,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        '#D1D5DB',

      borderRadius: 14,

      backgroundColor:
        '#FFFFFF',
    },

    cancelModalText: {
      fontSize: 13,

      fontWeight: '700',

      color: '#374151',
    },

    confirmAddButton: {
      flex: 1,

      minHeight: 50,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 6,

      borderRadius: 14,

      backgroundColor:
        '#1769E8',
    },

    confirmAddButtonDisabled: {
      opacity: 0.45,
    },

    confirmAddText: {
      fontSize: 13,

      fontWeight: '800',

      color: '#FFFFFF',
    },

    // ------------------------------------------------------
    // EMPTY
    // ------------------------------------------------------

    emptyContainer: {
      alignItems:
        'center',

      paddingTop: 60,

      paddingHorizontal:
        25,
    },

    largeIcon: {
      width: 70,

      height: 70,

      borderRadius: 23,

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

    emptyDescription: {
      marginTop: 7,

      maxWidth: 280,

      textAlign:
        'center',

      fontSize: 13,

      lineHeight: 19,

      color: '#6B7280',
    },

    comingSoonBadge: {
      marginTop: 16,

      paddingHorizontal:
        12,

      paddingVertical: 6,

      borderRadius: 20,

      backgroundColor:
        '#EEF4FF',
    },

    comingSoonText: {
      fontSize: 11,

      fontWeight: '700',

      color: '#1769E8',
    },
  });