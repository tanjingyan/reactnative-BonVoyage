import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

import { httpsCallable } from 'firebase/functions';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import MapView, {
  MapPressEvent,
  PoiClickEvent,
  Marker,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  auth,
  db,
  functions,
} from '../../../firebase/firebaseConfig';

// ==========================================================
// TYPES
// ==========================================================

type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
};

type Activity = {
  id: string;
  name: string;
  location: string;
  date?: string;
  time?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  source?: string | null;
  googlePlaceId?: string | null;
  googleMapsUri?: string | null;
  photoUri?: string | null;
};

type MapLocation = {
  id: string;

  name: string;
  subtitle: string;

  latitude: number;
  longitude: number;

  type:
    | 'destination'
    | 'activity'
    | 'map';

  date?: string;
  time?: string;
  notes?: string;
};

type PhotoAttribution = {
  displayName?: string;
  uri?: string;
  photoUri?: string;
};

type GooglePlace = {
  id: string | null;

  displayName: string;

  formattedAddress: string | null;

  latitude: number | null;
  longitude: number | null;

  rating: number | null;

  userRatingCount: number | null;

  primaryType: string | null;

  openNow: boolean | null;

  googleMapsUri: string | null;

  photoUri: string | null;

  photoAttributions: PhotoAttribution[];

  photoFlagContentUri: string | null;
};

type SearchPlaceResponse = {
  found: boolean;
  place?: GooglePlace;
};

type SearchPlacesResponse = {
  places: GooglePlace[];
};

// ==========================================================
// SCREEN
// ==========================================================

export default function TripMapScreen() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const insets =
    useSafeAreaInsets();

  const mapRef =
    useRef<MapView>(null);

  /*
    Every Places request gets a number.

    If the user taps somewhere else before the previous
    request finishes, the old result is ignored.
  */
  const placeRequestId =
    useRef(0);

  /*
    On Android, tapping a Marker can sometimes also
    fire MapView.onPress.

    This prevents that.
  */
  const ignoreMapPressUntil =
    useRef(0);

  // ========================================================
  // STATE
  // ========================================================

  const [trip, setTrip] =
    useState<Trip | null>(null);

  const [
    mapLocations,
    setMapLocations,
  ] =
    useState<MapLocation[]>([]);

  const [
    selectedLocation,
    setSelectedLocation,
  ] =
    useState<MapLocation | null>(
      null
    );

  const [
    googlePlace,
    setGooglePlace,
  ] =
    useState<GooglePlace | null>(
      null
    );

  const [
    placeLoading,
    setPlaceLoading,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    mapReady,
    setMapReady,
  ] =
    useState(false);

  const [
    destinationRegion,
    setDestinationRegion,
  ] =
    useState<Region | null>(
      null
    );

  const [
    addModalVisible,
    setAddModalVisible,
  ] = useState(false);

  const [
    addingToItinerary,
    setAddingToItinerary,
  ] = useState(false);

  const [
    activityDate,
    setActivityDate,
  ] = useState(new Date());

  const [
    activityTime,
    setActivityTime,
  ] = useState(() => {
    const defaultTime = new Date();
    defaultTime.setHours(10, 0, 0, 0);
    return defaultTime;
  });

  const [
    activityNotes,
    setActivityNotes,
  ] = useState('');

  const [
    showDatePicker,
    setShowDatePicker,
  ] = useState(false);

  const [
    showTimePicker,
    setShowTimePicker,
  ] = useState(false);

  // ========================================================
  // LOAD TRIP
  // ========================================================

  useEffect(() => {
    if (!id) {
      return;
    }

    loadTripMap();
  }, [id]);

  // ========================================================
  // CENTER MAP WHEN READY
  // ========================================================

  useEffect(() => {
    if (
      !mapReady ||
      !destinationRegion
    ) {
      return;
    }

    mapRef.current?.animateToRegion(
      destinationRegion,
      800
    );
  }, [
    mapReady,
    destinationRegion,
  ]);

  // ========================================================
  // LOAD TRIP MAP
  // ========================================================

  async function findDestinationPlace(
    destination: string
  ) {
    const searchPlaces =
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
      await searchPlaces({
        query: destination,
      });

    return (
      result.data.places ?? []
    ).find(
      place =>
        typeof place.latitude ===
          'number' &&
        typeof place.longitude ===
          'number'
    ) ?? null;
  }

  async function findActivityPlace(
    activity: Activity,
    tripData: Trip,
    destinationCoordinates: {
      latitude: number;
      longitude: number;
    }
  ) {
    const searchPlace =
      httpsCallable<
        {
          query: string;
          latitude: number;
          longitude: number;
        },
        SearchPlaceResponse
      >(
        functions,
        'searchPlace'
      );

    const query = [
      activity.name,
      activity.location,
      tripData.destination,
    ]
      .filter(Boolean)
      .join(', ');

    try {
      const result =
        await searchPlace({
          query,
          latitude:
            destinationCoordinates.latitude,
          longitude:
            destinationCoordinates.longitude,
        });

      if (
        result.data.found &&
        result.data.place &&
        typeof result.data.place
          .latitude === 'number' &&
        typeof result.data.place
          .longitude === 'number'
      ) {
        return result.data.place;
      }
    } catch (error) {
      console.log(
        'Activity Google Places lookup failed:',
        activity.name,
        error
      );
    }

    return null;
  }

  async function loadTripMap() {
    try {
      setLoading(true);

      // ----------------------------------------------------
      // GET TRIP
      // ----------------------------------------------------

      const tripRef = doc(
        db,
        'trips',
        id
      );

      const tripSnapshot =
        await getDoc(tripRef);

      if (!tripSnapshot.exists()) {
        Alert.alert(
          'Trip not found',
          'This trip could not be found.'
        );

        router.back();
        return;
      }

      const tripData: Trip = {
        id: tripSnapshot.id,
        ...(tripSnapshot.data() as Omit<
          Trip,
          'id'
        >),
      };

      setTrip(tripData);

      // ----------------------------------------------------
      // DESTINATION COORDINATES
      // ----------------------------------------------------
      // Use the existing Google Places Firebase Function
      // instead of Android's native geocoder. This avoids
      // ExpoLocation.geocodeAsync DEADLINE_EXCEEDED errors.
      // ----------------------------------------------------

      const destinationPlace =
        await findDestinationPlace(
          tripData.destination
        );

      if (
        !destinationPlace ||
        typeof destinationPlace.latitude !==
          'number' ||
        typeof destinationPlace.longitude !==
          'number'
      ) {
        Alert.alert(
          'Location not found',
          `BonVoyage could not find ${tripData.destination}.`
        );

        return;
      }

      const destinationCoordinates = {
        latitude:
          destinationPlace.latitude,
        longitude:
          destinationPlace.longitude,
      };

      const destinationMarker:
        MapLocation = {
        id: 'trip-destination',
        name:
          tripData.destination,
        subtitle:
          destinationPlace.formattedAddress ||
          'Trip destination',
        latitude:
          destinationCoordinates.latitude,
        longitude:
          destinationCoordinates.longitude,
        type: 'destination',
      };

      const region: Region = {
        latitude:
          destinationCoordinates.latitude,
        longitude:
          destinationCoordinates.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      };

      setDestinationRegion(
        region
      );

      // ----------------------------------------------------
      // LOAD ACTIVITIES
      // ----------------------------------------------------

      const activitiesRef =
        collection(
          db,
          'trips',
          id,
          'activities'
        );

      const activitiesSnapshot =
        await getDocs(
          activitiesRef
        );

      const activities:
        Activity[] =
        activitiesSnapshot.docs.map(
          activityDoc => ({
            id: activityDoc.id,
            ...(activityDoc.data() as Omit<
              Activity,
              'id'
            >),
          })
        );

      // ----------------------------------------------------
      // BUILD ACTIVITY MARKERS
      // ----------------------------------------------------
      // Activities added through Google Places already save
      // latitude/longitude. Use those coordinates directly.
      // Older/manual activities are resolved through Google
      // Places as a fallback.
      // ----------------------------------------------------

      const activityMarkers:
        MapLocation[] = [];

      for (
        const activity of activities
      ) {
        if (!activity.location) {
          continue;
        }

        let latitude:
          number | null =
          typeof activity.latitude ===
            'number'
            ? activity.latitude
            : null;

        let longitude:
          number | null =
          typeof activity.longitude ===
            'number'
            ? activity.longitude
            : null;

        if (
          latitude === null ||
          longitude === null
        ) {
          const resolvedPlace =
            await findActivityPlace(
              activity,
              tripData,
              destinationCoordinates
            );

          latitude =
            resolvedPlace?.latitude ??
            null;

          longitude =
            resolvedPlace?.longitude ??
            null;
        }

        if (
          latitude === null ||
          longitude === null
        ) {
          console.log(
            'Could not locate activity:',
            activity.name
          );

          continue;
        }

        activityMarkers.push({
          id: activity.id,
          name: activity.name,
          subtitle:
            activity.location,
          latitude,
          longitude,
          type: 'activity',
          date: activity.date,
          time: activity.time,
          notes: activity.notes,
        });
      }

      const allLocations = [
        destinationMarker,
        ...activityMarkers,
      ];

      setMapLocations(
        allLocations
      );

      setSelectedLocation(
        destinationMarker
      );

      setGooglePlace(
        destinationPlace
      );
    } catch (error) {
      console.error(
        'Trip map error:',
        error
      );

      Alert.alert(
        'Map Error',
        'BonVoyage could not load your trip map.'
      );
    } finally {
      setLoading(false);
    }
  }

  // ========================================================
  // GOOGLE PLACES - DESTINATION / ACTIVITY
  // ========================================================

  async function loadGooglePlace(
    location: MapLocation,
    tripData: Trip | null = trip
  ) {
    const currentRequest =
      ++placeRequestId.current;

    setPlaceLoading(true);
    setGooglePlace(null);

    try {
      let query =
        location.name;

      // ----------------------------------------------------
      // MORE SPECIFIC QUERY FOR ACTIVITY
      // ----------------------------------------------------

      if (
        location.type ===
        'activity'
      ) {
        query = [
          location.name,
          location.subtitle,
          tripData?.destination,
        ]
          .filter(Boolean)
          .join(', ');
      } else {
        query =
          tripData?.destination ||
          location.name;
      }

      // ----------------------------------------------------
      // FIREBASE FUNCTION
      // ----------------------------------------------------

      const searchPlace =
        httpsCallable<
          {
            query: string;
            latitude: number;
            longitude: number;
          },
          SearchPlaceResponse
        >(
          functions,
          'searchPlace'
        );

      const result =
        await searchPlace({
          query,

          latitude:
            location.latitude,

          longitude:
            location.longitude,
        });

      // ----------------------------------------------------
      // IGNORE OLD REQUEST
      // ----------------------------------------------------

      if (
        currentRequest !==
        placeRequestId.current
      ) {
        return;
      }

      // ----------------------------------------------------
      // FOUND
      // ----------------------------------------------------

      if (
        result.data.found &&
        result.data.place
      ) {
        console.log(
          'GOOGLE PLACE:',
          result.data.place
            .displayName
        );

        setGooglePlace(
          result.data.place
        );
      } else {
        console.log(
          'No Google Place found:',
          query
        );
      }
    } catch (error) {
      console.error(
        'Google Places error:',
        error
      );

      if (
        currentRequest ===
        placeRequestId.current
      ) {
        setGooglePlace(null);
      }
    } finally {
      if (
        currentRequest ===
        placeRequestId.current
      ) {
        setPlaceLoading(false);
      }
    }
  }

  // ========================================================
  // GOOGLE PLACES - USER TAPS MAP
  // ========================================================

  async function loadNearbyGooglePlace(
    location: MapLocation
  ) {
    const currentRequest =
      ++placeRequestId.current;

    setPlaceLoading(true);
    setGooglePlace(null);

    try {
      // ----------------------------------------------------
      // FIREBASE NEARBY SEARCH FUNCTION
      // ----------------------------------------------------

      const searchNearbyPlace =
        httpsCallable<
          {
            latitude: number;
            longitude: number;
          },
          SearchPlaceResponse
        >(
          functions,
          'searchNearbyPlace'
        );

      const result =
        await searchNearbyPlace({
          latitude:
            location.latitude,

          longitude:
            location.longitude,
        });

      // ----------------------------------------------------
      // OLD REQUEST?
      // ----------------------------------------------------

      if (
        currentRequest !==
        placeRequestId.current
      ) {
        return;
      }

      // ----------------------------------------------------
      // GOOGLE PLACE FOUND
      // ----------------------------------------------------

      if (
        result.data.found &&
        result.data.place
      ) {
        const place =
          result.data.place;

        setGooglePlace(place);

        /*
          Snap the purple marker to Google's actual
          place coordinates.

          Example:

          user taps near Meiji Shrine
                ↓
          Google finds Meiji Shrine
                ↓
          marker moves exactly onto Meiji Shrine
        */

        setSelectedLocation({
          ...location,

          name:
            place.displayName,

          subtitle:
            place.formattedAddress ||
            location.subtitle,

          latitude:
            place.latitude ??
            location.latitude,

          longitude:
            place.longitude ??
            location.longitude,
        });

        return;
      }

      // ----------------------------------------------------
      // NO GOOGLE PLACE
      // ----------------------------------------------------
      // Use reverse geocoding so even a random street
      // still displays useful information.
      // ----------------------------------------------------

      await fallbackToAddress(
        location,
        currentRequest
      );
    } catch (error) {
      console.error(
        'Nearby Places error:',
        error
      );

      /*
        If Places itself fails, still attempt
        reverse geocoding.
      */

      await fallbackToAddress(
        location,
        currentRequest
      );
    } finally {
      if (
        currentRequest ===
        placeRequestId.current
      ) {
        setPlaceLoading(false);
      }
    }
  }

  // ========================================================
  // FALLBACK ADDRESS
  // ========================================================

  async function fallbackToAddress(
    location: MapLocation,
    requestNumber: number
  ) {
    try {
      const addresses =
        await Location.reverseGeocodeAsync({
          latitude:
            location.latitude,

          longitude:
            location.longitude,
        });

      // Another tap happened.
      if (
        requestNumber !==
        placeRequestId.current
      ) {
        return;
      }

      // ----------------------------------------------------
      // ADDRESS FOUND
      // ----------------------------------------------------

      if (
        addresses.length >
        0
      ) {
        const address =
          addresses[0];

        const locationName =
          address.name ||
          address.street ||
          address.district ||
          address.city ||
          'Selected location';

        /*
          Prevent duplicated strings.

          Example:

          Shibuya, Shibuya, Tokyo

          becomes:

          Shibuya, Tokyo
        */

        const addressParts = [
          address.street,
          address.district,
          address.city,
          address.region,
          address.country,
        ]
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          );

        const uniqueParts =
          addressParts.filter(
            (
              value,
              index,
              array
            ) =>
              array.indexOf(
                value
              ) === index
          );

        const subtitle =
          uniqueParts.join(
            ', '
          );

        setSelectedLocation({
          ...location,

          name:
            locationName,

          subtitle:
            subtitle ||
            `${location.latitude.toFixed(
              5
            )}, ${location.longitude.toFixed(
              5
            )}`,
        });

        return;
      }

      // ----------------------------------------------------
      // NOTHING FOUND
      // ----------------------------------------------------

      setSelectedLocation({
        ...location,

        name:
          'Selected location',

        subtitle:
          `${location.latitude.toFixed(
            5
          )}, ${location.longitude.toFixed(
            5
          )}`,
      });
    } catch (error) {
      console.error(
        'Reverse geocode error:',
        error
      );

      if (
        requestNumber ===
        placeRequestId.current
      ) {
        setSelectedLocation({
          ...location,

          name:
            'Selected location',

          subtitle:
            `${location.latitude.toFixed(
              5
            )}, ${location.longitude.toFixed(
              5
            )}`,
        });
      }
    }
  }

  // ========================================================
  // EXISTING MARKER TAP
  // ========================================================

  function selectMarker(
    location: MapLocation
  ) {
    /*
      Prevent Android from treating this as
      a normal map tap.
    */

    ignoreMapPressUntil.current =
      Date.now() + 500;

    setSelectedLocation(
      location
    );

    setGooglePlace(null);

    // ------------------------------------------------------
    // ZOOM TO MARKER
    // ------------------------------------------------------

    mapRef.current?.animateToRegion(
      {
        latitude:
          location.latitude,

        longitude:
          location.longitude,

        latitudeDelta:
          0.035,

        longitudeDelta:
          0.035,
      },

      500
    );

    // ------------------------------------------------------
    // GOOGLE PLACE INFO
    // ------------------------------------------------------

    void loadGooglePlace(
      location
    );
  }

  // ========================================================
  // USER TAPS ANYWHERE ON MAP
  // ========================================================

  async function handleMapPress(
    event: MapPressEvent
  ) {
    // ------------------------------------------------------
    // IGNORE MARKER BUBBLING
    // ------------------------------------------------------

    if (
      Date.now() <
      ignoreMapPressUntil.current
    ) {
      return;
    }

    const {
      latitude,
      longitude,
    } =
      event.nativeEvent.coordinate;

    // ------------------------------------------------------
    // CREATE TEMPORARY LOCATION
    // ------------------------------------------------------

    const tappedLocation:
      MapLocation = {
      id:
        `map-${Date.now()}`,

      name:
        'Selected location',

      subtitle:
        'Finding nearby place...',

      latitude,
      longitude,

      type:
        'map',
    };

    // ------------------------------------------------------
    // SHOW CARD IMMEDIATELY
    // ------------------------------------------------------

    setSelectedLocation(
      tappedLocation
    );

    setGooglePlace(null);
    setPlaceLoading(true);

    // ------------------------------------------------------
    // MOVE MAP
    // ------------------------------------------------------

    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,

        latitudeDelta:
          0.02,

        longitudeDelta:
          0.02,
      },

      350
    );

    // ------------------------------------------------------
    // SEARCH NEAREST GOOGLE PLACE
    // ------------------------------------------------------

    await loadNearbyGooglePlace(
      tappedLocation
    );
  }


  // ========================================================
  // USER TAPS A GOOGLE MAPS POI
  // Restaurant, hotel, shop, station, building, etc.
  // ========================================================

  async function handlePoiClick(
    event: PoiClickEvent
  ) {
    const {
      placeId,
      name,
      coordinate,
    } = event.nativeEvent;

    const {
      latitude,
      longitude,
    } = coordinate;

    console.log(
      'POI CLICKED:',
      {
        name,
        placeId,
        latitude,
        longitude,
      }
    );

    /*
      A Google Maps POI tap is different from a normal
      map-surface tap. Prevent Android from also treating
      this POI selection as handleMapPress().
    */
    ignoreMapPressUntil.current =
      Date.now() + 700;

    const poiLocation: MapLocation = {
      id:
        placeId ||
        `poi-${Date.now()}`,

      name:
        name ||
        'Selected place',

      subtitle:
        'Finding place details...',

      latitude,
      longitude,

      type:
        'map',
    };

    // Show the purple selected-place marker and card.
    setSelectedLocation(
      poiLocation
    );

    setGooglePlace(null);
    setPlaceLoading(true);

    // Zoom towards the tapped Google POI.
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,

        latitudeDelta:
          0.015,

        longitudeDelta:
          0.015,
      },

      350
    );

    /*
      Reuse the already deployed Nearby Search function.
      Because these coordinates come directly from Google's
      POI, the nearest returned place should normally be the
      POI the user tapped.
    */
    await loadNearbyGooglePlace(
      poiLocation
    );
  }

  // ========================================================
  // CLOSE CARD
  // ========================================================

  function closePlaceCard() {
    /*
      Cancel/ignore anything currently loading.
    */

    placeRequestId.current +=
      1;

    setSelectedLocation(
      null
    );

    setGooglePlace(
      null
    );

    setPlaceLoading(
      false
    );
  }

  // ========================================================
  // MOVE BACK TO TRIP DESTINATION
  // ========================================================

  function moveToTripDestination() {
    if (!destinationRegion) {
      return;
    }

    mapRef.current?.animateToRegion(
      destinationRegion,
      700
    );
  }

  // ========================================================
  // DETAILS
  // ========================================================

  function showLocationDetails() {
    if (!selectedLocation) {
      return;
    }

    const information:
      string[] = [];

    // ------------------------------------------------------
    // ADDRESS
    // ------------------------------------------------------

    if (
      googlePlace
        ?.formattedAddress
    ) {
      information.push(
        googlePlace
          .formattedAddress
      );
    } else {
      information.push(
        selectedLocation
          .subtitle
      );
    }

    // ------------------------------------------------------
    // CATEGORY
    // ------------------------------------------------------

    if (
      googlePlace
        ?.primaryType
    ) {
      information.push(
        `Category: ${googlePlace.primaryType}`
      );
    }

    // ------------------------------------------------------
    // RATING
    // ------------------------------------------------------

    if (
      googlePlace?.rating !==
        null &&
      googlePlace?.rating !==
        undefined
    ) {
      information.push(
        `Rating: ${googlePlace.rating} / 5`
      );
    }

    // ------------------------------------------------------
    // NUMBER OF RATINGS
    // ------------------------------------------------------

    if (
      googlePlace
        ?.userRatingCount !==
        null &&
      googlePlace
        ?.userRatingCount !==
        undefined
    ) {
      information.push(
        `${googlePlace.userRatingCount.toLocaleString()} Google ratings`
      );
    }

    // ------------------------------------------------------
    // OPEN / CLOSED
    // ------------------------------------------------------

    if (
      googlePlace?.openNow ===
      true
    ) {
      information.push(
        'Open now'
      );
    }

    if (
      googlePlace?.openNow ===
      false
    ) {
      information.push(
        'Closed now'
      );
    }

    // ------------------------------------------------------
    // ACTIVITY DATA
    // ------------------------------------------------------

    if (
      selectedLocation.type ===
      'activity'
    ) {
      if (
        selectedLocation.date
      ) {
        information.push(
          `Date: ${formatDate(
            selectedLocation.date
          )}`
        );
      }

      if (
        selectedLocation.time
      ) {
        information.push(
          `Time: ${formatTime(
            selectedLocation.time
          )}`
        );
      }

      if (
        selectedLocation.notes
      ) {
        information.push(
          `Notes: ${selectedLocation.notes}`
        );
      }
    }

    Alert.alert(
      googlePlace
        ?.displayName ||
        selectedLocation
          .name,

      information.join(
        '\n\n'
      )
    );
  }

  // ========================================================
  // DIRECTIONS
  // ========================================================

  async function openDirections() {
    if (!selectedLocation) {
      return;
    }

    const latitude =
      googlePlace?.latitude ??
      selectedLocation.latitude;

    const longitude =
      googlePlace?.longitude ??
      selectedLocation.longitude;

    const url =
      'https://www.google.com/maps/dir/?api=1' +
      `&destination=${latitude},${longitude}`;

    try {
      await Linking.openURL(
        url
      );
    } catch (error) {
      console.error(
        'Directions error:',
        error
      );

      Alert.alert(
        'Unable to open directions',
        'Directions could not be opened.'
      );
    }
  }

  // ========================================================
  // GOOGLE MAPS PLACE
  // ========================================================

  async function openGooglePlace() {
    /*
      If this is a Google place, open its
      exact Google Maps place page.
    */

    if (
      googlePlace
        ?.googleMapsUri
    ) {
      try {
        await Linking.openURL(
          googlePlace
            .googleMapsUri
        );

        return;
      } catch (error) {
        console.error(
          'Google Maps error:',
          error
        );
      }
    }

    /*
      Fallback for random street/location:
      open its coordinates instead.
    */

    if (
      selectedLocation
    ) {
      const url =
        'https://www.google.com/maps/search/?api=1' +
        `&query=${selectedLocation.latitude},${selectedLocation.longitude}`;

      try {
        await Linking.openURL(
          url
        );
      } catch {
        Alert.alert(
          'Unable to open Google Maps'
        );
      }
    }
  }

  // ========================================================
  // ADD MAP PLACE TO ITINERARY
  // ========================================================

  function openAddToItinerary() {
    if (
      !selectedLocation ||
      selectedLocation.type !==
        'map'
    ) {
      return;
    }

    if (trip?.startDate) {
      setActivityDate(
        parseStoredDate(
          trip.startDate
        )
      );
    } else {
      setActivityDate(
        new Date()
      );
    }

    const defaultTime =
      new Date();

    defaultTime.setHours(
      10,
      0,
      0,
      0
    );

    setActivityTime(
      defaultTime
    );

    setActivityNotes('');
    setShowDatePicker(false);
    setShowTimePicker(false);
    setAddModalVisible(true);
  }

  function handleActivityDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    setShowDatePicker(false);

    if (
      event.type ===
        'dismissed' ||
      !selectedDate
    ) {
      return;
    }

    setActivityDate(
      selectedDate
    );
  }

  function handleActivityTimeChange(
    event: DateTimePickerEvent,
    selectedTime?: Date
  ) {
    setShowTimePicker(false);

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

  async function addSelectedPlaceToItinerary() {
    if (
      !trip ||
      !selectedLocation ||
      selectedLocation.type !==
        'map'
    ) {
      return;
    }

    const user =
      auth.currentUser;

    if (!user) {
      Alert.alert(
        'Login required',
        'Please log in again before adding an activity.'
      );

      return;
    }

    if (
      trip.startDate &&
      trip.endDate
    ) {
      const tripStart =
        startOfDay(
          parseStoredDate(
            trip.startDate
          )
        );

      const tripEnd =
        startOfDay(
          parseStoredDate(
            trip.endDate
          )
        );

      const chosenDate =
        startOfDay(
          activityDate
        );

      if (
        chosenDate <
          tripStart ||
        chosenDate >
          tripEnd
      ) {
        Alert.alert(
          'Date outside trip',
          `Choose a date between ${formatDate(
            trip.startDate
          )} and ${formatDate(
            trip.endDate
          )}.`
        );

        return;
      }
    }

    const latitude =
      googlePlace?.latitude ??
      selectedLocation.latitude;

    const longitude =
      googlePlace?.longitude ??
      selectedLocation.longitude;

    const name =
      googlePlace?.displayName ||
      selectedLocation.name;

    const location =
      googlePlace?.formattedAddress ||
      selectedLocation.subtitle ||
      name;

    try {
      setAddingToItinerary(
        true
      );

      const activityRef =
        await addDoc(
          collection(
            db,
            'trips',
            trip.id,
            'activities'
          ),
          {
            userId:
              user.uid,
            name,
            location,
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
            source:
              'google_places',
            googlePlaceId:
              googlePlace?.id ??
              null,
            latitude,
            longitude,
            googleMapsUri:
              googlePlace
                ?.googleMapsUri ??
              null,
            photoUri:
              googlePlace
                ?.photoUri ??
              null,
          }
        );

      const newMarker:
        MapLocation = {
        id: activityRef.id,
        name,
        subtitle: location,
        latitude,
        longitude,
        type: 'activity',
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
      };

      setMapLocations(
        current => [
          ...current,
          newMarker,
        ]
      );

      setSelectedLocation(
        newMarker
      );

      setAddModalVisible(
        false
      );

      setActivityNotes('');

      Alert.alert(
        'Added to itinerary',
        `${name} was added to ${trip.title}.`
      );
    } catch (error) {
      console.error(
        'Add map place to itinerary error:',
        error
      );

      Alert.alert(
        'Unable to add place',
        'BonVoyage could not add this place to your itinerary. Please try again.'
      );
    } finally {
      setAddingToItinerary(
        false
      );
    }
  }

  // ========================================================
  // PHOTO ATTRIBUTION
  // ========================================================

  async function openPhotoAttribution(
    attribution:
      PhotoAttribution
  ) {
    if (!attribution.uri) {
      return;
    }

    try {
      await Linking.openURL(
        attribution.uri
      );
    } catch (error) {
      console.log(
        'Could not open photo attribution:',
        error
      );
    }
  }

  // ========================================================
  // LOADING
  // ========================================================

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading your trip map...
        </Text>
      </View>
    );
  }

  // ========================================================
  // MAP UNAVAILABLE
  // ========================================================

  if (
    !trip ||
    !destinationRegion
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <Ionicons
          name="map-outline"
          size={48}
          color="#777"
        />

        <Text
          style={
            styles.errorTitle
          }
        >
          Map unavailable
        </Text>

        <Text
          style={
            styles.errorText
          }
        >
          BonVoyage could not load this trip location.
        </Text>
      </View>
    );
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
      {/* ================================================= */}
      {/* FULL SCREEN MAP                                   */}
      {/* ================================================= */}

      <MapView
        ref={mapRef}

        provider={
          Platform.OS ===
          'android'
            ? PROVIDER_GOOGLE
            : undefined
        }

        style={
          StyleSheet.absoluteFill
        }

        initialRegion={
          destinationRegion
        }

        onMapReady={() => {
          setMapReady(
            true
          );
        }}

        /*
          Every normal tap on the map is now
          handled here.
        */
        onPress={
          handleMapPress
        }

        /*
          Google-rendered POIs (restaurants, shops,
          hotels, stations, attractions, etc.) do not
          always fire the normal map onPress event.
          onPoiClick handles those separately.
        */
        onPoiClick={
          handlePoiClick
        }

        /*
          Explicitly keep Google POI click handling enabled
          on Android.
        */
        poiClickEnabled={
          true
        }

        showsCompass={
          false
        }

        showsMyLocationButton={
          false
        }

        toolbarEnabled={
          false
        }
      >
        {/* =============================================== */}
        {/* DESTINATION + ACTIVITY MARKERS                  */}
        {/* =============================================== */}

        {mapLocations.map(
          (location) => (
            <Marker
              key={`${location.type}-${location.id}`}

              coordinate={{
                latitude:
                  location.latitude,

                longitude:
                  location.longitude,
              }}

              /*
                No title/description.

                We use our own bottom card rather
                than the native Google popup.
              */

              pinColor={
                location.type ===
                'destination'
                  ? '#367CFF'
                  : '#FF4D4D'
              }

              onPress={() => {
                selectMarker(
                  location
                );
              }}
            />
          )
        )}

        {/* =============================================== */}
        {/* USER-TAPPED MAP MARKER                          */}
        {/* =============================================== */}

        {selectedLocation?.type ===
          'map' && (
          <Marker
            key={
              selectedLocation.id
            }

            coordinate={{
              latitude:
                selectedLocation.latitude,

              longitude:
                selectedLocation.longitude,
            }}

            /*
              Purple = user-selected place.
            */
            pinColor="#7C4DFF"
          />
        )}
      </MapView>

      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <View
        style={[
          styles.headerContainer,

          {
            top:
              insets.top +
              8,
          },
        ]}
      >
        <Pressable
          style={
            styles.circleButton
          }

          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color="#111"
          />
        </Pressable>

        <View
          style={
            styles
              .headerTitleContainer
          }
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            Trip Map
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }

            numberOfLines={
              1
            }
          >
            {trip.destination}
          </Text>
        </View>
      </View>

      {/* ================================================= */}
      {/* RECENTER BUTTON                                   */}
      {/* ================================================= */}

      <Pressable
        style={[
          styles.recenterButton,

          {
            top:
              insets.top +
              100,
          },
        ]}

        onPress={
          moveToTripDestination
        }
      >
        <Ionicons
          name="locate"
          size={25}
          color="#222"
        />
      </Pressable>

      {/* ================================================= */}
      {/* LEGEND                                            */}
      {/* ================================================= */}

      {!selectedLocation && (
        <View
          style={[
            styles.legendCard,

            {
              bottom:
                insets.bottom +
                25,
            },
          ]}
        >
          <View
            style={
              styles.legendRow
            }
          >
            <View
              style={[
                styles.legendDot,
                styles.destinationDot,
              ]}
            />

            <Text
              style={
                styles.legendText
              }
            >
              Destination
            </Text>
          </View>

          <View
            style={
              styles.legendRow
            }
          >
            <View
              style={[
                styles.legendDot,
                styles.activityDot,
              ]}
            />

            <Text
              style={
                styles.legendText
              }
            >
              Activities
            </Text>
          </View>
        </View>
      )}

      {/* ================================================= */}
      {/* PLACE CARD                                        */}
      {/* ================================================= */}

      {selectedLocation && (
        <View
          style={[
            styles.placeCard,

            {
              bottom:
                insets.bottom +
                12,
            },
          ]}
        >
          {/* DRAG BAR */}

          <View
            style={
              styles.dragBar
            }
          />

          {/* CLOSE */}

          <Pressable
            style={
              styles.closeButton
            }

            onPress={
              closePlaceCard
            }
          >
            <Ionicons
              name="close"
              size={23}
              color="#444"
            />
          </Pressable>

          {/* ============================================= */}
          {/* PLACE + PHOTO                                 */}
          {/* ============================================= */}

          <View
            style={
              styles.placeTopRow
            }
          >
            {/* LEFT SIDE */}

            <View
              style={
                styles.placeInfo
              }
            >
              <View
                style={
                  styles.nameRow
                }
              >
                {/* ======================================= */}
                {/* LOCATION TYPE ICON                      */}
                {/* ======================================= */}

                <View
                  style={[
                    styles
                      .smallLocationIcon,

                    selectedLocation
                      .type ===
                    'destination'
                      ? styles
                          .destinationIcon
                      : selectedLocation
                            .type ===
                          'activity'
                        ? styles
                            .activityIcon
                        : styles
                            .mapTapIcon,
                  ]}
                >
                  <Ionicons
                    name={
                      selectedLocation
                        .type ===
                      'map'
                        ? 'navigate'
                        : 'location'
                    }

                    size={19}

                    color="#FFF"
                  />
                </View>

                {/* PLACE NAME */}

                <Text
                  style={
                    styles.placeName
                  }

                  numberOfLines={
                    2
                  }
                >
                  {googlePlace
                    ?.displayName ||
                    selectedLocation
                      .name}
                </Text>
              </View>

              {/* ======================================= */}
              {/* LOADING                                 */}
              {/* ======================================= */}

              {placeLoading ? (
                <View
                  style={
                    styles
                      .placeLoadingRow
                  }
                >
                  <ActivityIndicator
                    size="small"
                  />

                  <Text
                    style={
                      styles
                        .placeLoadingText
                    }
                  >
                    Finding place details...
                  </Text>
                </View>
              ) : (
                <>
                  {/* =================================== */}
                  {/* ADDRESS                             */}
                  {/* =================================== */}

                  <Text
                    style={
                      styles.placeAddress
                    }

                    numberOfLines={
                      3
                    }
                  >
                    {googlePlace
                      ?.formattedAddress ||
                      (selectedLocation
                        .type ===
                      'destination'
                        ? `Main destination • ${trip.title}`
                        : selectedLocation
                            .subtitle)}
                  </Text>

                  {/* =================================== */}
                  {/* RATING                              */}
                  {/* =================================== */}

                  {googlePlace
                    ?.rating !==
                    null &&
                    googlePlace
                      ?.rating !==
                      undefined && (
                      <View
                        style={
                          styles.ratingRow
                        }
                      >
                        <Ionicons
                          name="star"
                          size={18}
                          color="#F5A623"
                        />

                        <Text
                          style={
                            styles.ratingText
                          }
                        >
                          {googlePlace.rating.toFixed(
                            1
                          )}
                        </Text>

                        {googlePlace
                          .userRatingCount !==
                          null &&
                          googlePlace
                            .userRatingCount !==
                            undefined && (
                            <Text
                              style={
                                styles.ratingCount
                              }
                            >
                              (
                              {googlePlace.userRatingCount.toLocaleString()}
                              )
                            </Text>
                          )}
                      </View>
                    )}

                  {/* =================================== */}
                  {/* CATEGORY                            */}
                  {/* =================================== */}

                  {googlePlace
                    ?.primaryType && (
                    <Text
                      style={
                        styles.categoryText
                      }
                    >
                      {
                        googlePlace.primaryType
                      }
                    </Text>
                  )}

                  {/* =================================== */}
                  {/* OPEN / CLOSED                       */}
                  {/* =================================== */}

                  {googlePlace
                    ?.openNow ===
                    true && (
                    <Text
                      style={
                        styles.openText
                      }
                    >
                      Open now
                    </Text>
                  )}

                  {googlePlace
                    ?.openNow ===
                    false && (
                    <Text
                      style={
                        styles.closedText
                      }
                    >
                      Closed now
                    </Text>
                  )}
                </>
              )}
            </View>

            {/* =========================================== */}
            {/* PHOTO                                       */}
            {/* =========================================== */}

            {googlePlace
              ?.photoUri ? (
              <Image
                source={{
                  uri:
                    googlePlace
                      .photoUri,
                }}

                style={
                  styles.placePhoto
                }

                resizeMode="cover"
              />
            ) : (
              <View
                style={
                  styles
                    .photoPlaceholder
                }
              >
                {placeLoading ? (
                  <ActivityIndicator />
                ) : (
                  <Ionicons
                    name="image-outline"
                    size={31}
                    color="#AAA"
                  />
                )}
              </View>
            )}
          </View>

          {/* ============================================= */}
          {/* ACTIVITY DATE/TIME                            */}
          {/* ============================================= */}

          {selectedLocation
            .type ===
            'activity' &&
            (selectedLocation
              .date ||
              selectedLocation
                .time) && (
              <View
                style={
                  styles
                    .activityInformation
                }
              >
                <View
                  style={
                    styles.infoRow
                  }
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color="#555"
                  />

                  <Text
                    style={
                      styles.infoText
                    }
                  >
                    {selectedLocation
                      .date
                      ? formatDate(
                          selectedLocation.date
                        )
                      : ''}

                    {selectedLocation
                      .date &&
                    selectedLocation
                      .time
                      ? ' • '
                      : ''}

                    {selectedLocation
                      .time
                      ? formatTime(
                          selectedLocation.time
                        )
                      : ''}
                  </Text>
                </View>

                {selectedLocation
                  .notes ? (
                  <View
                    style={
                      styles.infoRow
                    }
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="#555"
                    />

                    <Text
                      style={
                        styles.infoText
                      }

                      numberOfLines={
                        2
                      }
                    >
                      {
                        selectedLocation.notes
                      }
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

          {/* ============================================= */}
          {/* ACTIONS                                       */}
          {/* ============================================= */}

          <View
            style={
              styles.actionRow
            }
          >
            {/* DETAILS */}

            <Pressable
              style={
                styles.actionButton
              }

              onPress={
                showLocationDetails
              }
            >
              <View
                style={
                  styles.actionIcon
                }
              >
                <Ionicons
                  name="information-circle-outline"
                  size={23}
                  color="#111"
                />
              </View>

              <Text
                style={
                  styles.actionText
                }
              >
                Details
              </Text>
            </Pressable>

            {/* DIRECTIONS */}

            <Pressable
              style={
                styles.actionButton
              }

              onPress={
                openDirections
              }
            >
              <View
                style={
                  styles.actionIcon
                }
              >
                <Ionicons
                  name="navigate-outline"
                  size={23}
                  color="#111"
                />
              </View>

              <Text
                style={
                  styles.actionText
                }
              >
                Directions
              </Text>
            </Pressable>

            {/* GOOGLE */}

            <Pressable
              style={
                styles.actionButton
              }

              onPress={
                openGooglePlace
              }
            >
              <View
                style={
                  styles.actionIcon
                }
              >
                <Ionicons
                  name="map-outline"
                  size={23}
                  color="#111"
                />
              </View>

              <Text
                style={
                  styles.actionText
                }
              >
                Google
              </Text>
            </Pressable>
          </View>

          {selectedLocation.type ===
            'map' && (
            <Pressable
              style={
                styles.addToItineraryButton
              }
              disabled={
                placeLoading ||
                addingToItinerary
              }
              onPress={
                openAddToItinerary
              }
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.addToItineraryText
                }
              >
                Add to itinerary
              </Text>
            </Pressable>
          )}

          {/* ============================================= */}
          {/* GOOGLE ATTRIBUTION                            */}
          {/* ============================================= */}

          {googlePlace && (
            <View
              style={
                styles
                  .attributionContainer
              }
            >
              <Text
                style={
                  styles
                    .googleAttribution
                }
              >
                Place information from Google
              </Text>

              {googlePlace
                .photoAttributions
                ?.length >
                0 && (
                <Pressable
                  onPress={() =>
                    openPhotoAttribution(
                      googlePlace
                        .photoAttributions[0]
                    )
                  }
                >
                  <Text
                    style={
                      styles
                        .photoAttribution
                    }
                  >
                    Photo by{' '}
                    {googlePlace
                      .photoAttributions[0]
                      .displayName ||
                      'Google Maps contributor'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      <Modal
        visible={
          addModalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setAddModalVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalBackdrop
          }
        >
          <View
            style={
              styles.addModalCard
            }
          >
            <View
              style={
                styles.addModalHeader
              }
            >
              <View
                style={{ flex: 1 }}
              >
                <Text
                  style={
                    styles.addModalTitle
                  }
                >
                  Add to itinerary
                </Text>

                <Text
                  style={
                    styles.addModalPlaceName
                  }
                  numberOfLines={2}
                >
                  {googlePlace
                    ?.displayName ||
                    selectedLocation
                      ?.name}
                </Text>
              </View>

              <Pressable
                style={
                  styles.modalCloseButton
                }
                onPress={() =>
                  setAddModalVisible(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#374151"
                />
              </Pressable>
            </View>

            <Text
              style={
                styles.modalLabel
              }
            >
              Date
            </Text>

            <Pressable
              style={
                styles.modalField
              }
              onPress={() =>
                setShowDatePicker(
                  true
                )
              }
            >
              <Ionicons
                name="calendar-outline"
                size={19}
                color="#1769E8"
              />

              <Text
                style={
                  styles.modalFieldText
                }
              >
                {formatDisplayDate(
                  activityDate
                )}
              </Text>
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={
                  activityDate
                }
                mode="date"
                display="default"
                onChange={
                  handleActivityDateChange
                }
              />
            )}

            <Text
              style={
                styles.modalLabel
              }
            >
              Time
            </Text>

            <Pressable
              style={
                styles.modalField
              }
              onPress={() =>
                setShowTimePicker(
                  true
                )
              }
            >
              <Ionicons
                name="time-outline"
                size={19}
                color="#1769E8"
              />

              <Text
                style={
                  styles.modalFieldText
                }
              >
                {formatDisplayTime(
                  activityTime
                )}
              </Text>
            </Pressable>

            {showTimePicker && (
              <DateTimePicker
                value={
                  activityTime
                }
                mode="time"
                display="default"
                onChange={
                  handleActivityTimeChange
                }
              />
            )}

            <Text
              style={
                styles.modalLabel
              }
            >
              Notes (optional)
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
              placeholder="Add a note..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={250}
            />

            <Pressable
              style={[
                styles.confirmAddButton,
                addingToItinerary &&
                  styles.confirmAddButtonDisabled,
              ]}
              disabled={
                addingToItinerary
              }
              onPress={() =>
                void addSelectedPlaceToItinerary()
              }
            >
              {addingToItinerary ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />
              ) : (
                <>
                  <Ionicons
                    name="add"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.confirmAddButtonText
                    }
                  >
                    Add activity
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==========================================================
// FORMAT DATE
// ==========================================================

function formatDate(
  date?: string
) {
  if (!date) {
    return '';
  }

  try {
    const dateObject =
      date.includes('T')
        ? new Date(date)
        : new Date(
            `${date}T00:00:00`
          );

    return dateObject.toLocaleDateString(
      'en-GB',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    );
  } catch {
    return date;
  }
}

// ==========================================================
// FORMAT TIME
// ==========================================================

function formatTime(
  time?: string
) {
  if (!time) {
    return '';
  }

  try {
    const [
      hours,
      minutes,
    ] =
      time.split(':');

    const hourNumber =
      Number(hours);

    const suffix =
      hourNumber >= 12
        ? 'PM'
        : 'AM';

    const displayHour =
      hourNumber % 12 ||
      12;

    return `${displayHour}:${minutes} ${suffix}`;
  } catch {
    return time;
  }
}

function parseStoredDate(
  value: string
) {
  if (value.includes('T')) {
    return new Date(value);
  }

  return new Date(
    `${value}T00:00:00`
  );
}

function startOfDay(
  value: Date
) {
  const result =
    new Date(value);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function formatFirestoreDate(
  value: Date
) {
  const year =
    value.getFullYear();

  const month = String(
    value.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    value.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatFirestoreTime(
  value: Date
) {
  const hours = String(
    value.getHours()
  ).padStart(2, '0');

  const minutes = String(
    value.getMinutes()
  ).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function formatDisplayDate(
  value: Date
) {
  return value.toLocaleDateString(
    'en-GB',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );
}

function formatDisplayTime(
  value: Date
) {
  return value.toLocaleTimeString(
    'en-US',
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  );
}

// ==========================================================
// STYLES
// ==========================================================

const styles =
  StyleSheet.create({
    // ------------------------------------------------------
    // SCREEN
    // ------------------------------------------------------

    container: {
      flex: 1,

      backgroundColor:
        '#f4f4f4',
    },

    // ------------------------------------------------------
    // LOADING
    // ------------------------------------------------------

    loadingContainer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,

      backgroundColor:
        '#fff',
    },

    loadingText: {
      marginTop:
        14,

      fontSize:
        15,

      color:
        '#666',
    },

    errorTitle: {
      marginTop:
        15,

      fontSize:
        20,

      fontWeight:
        '700',

      color:
        '#222',
    },

    errorText: {
      marginTop:
        6,

      textAlign:
        'center',

      fontSize:
        14,

      lineHeight:
        21,

      color:
        '#777',
    },

    // ------------------------------------------------------
    // HEADER
    // ------------------------------------------------------

    headerContainer: {
      position:
        'absolute',

      left:
        16,

      right:
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      pointerEvents:
        'box-none',
    },

    circleButton: {
      width:
        48,

      height:
        48,

      borderRadius:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#fff',

      shadowColor:
        '#000',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.15,

      shadowRadius:
        7,

      elevation:
        6,
    },

    headerTitleContainer: {
      marginLeft:
        12,

      paddingHorizontal:
        18,

      paddingVertical:
        8,

      maxWidth:
        '68%',

      borderRadius:
        23,

      backgroundColor:
        '#fff',

      shadowColor:
        '#000',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.12,

      shadowRadius:
        6,

      elevation:
        5,
    },

    headerTitle: {
      fontSize:
        15,

      fontWeight:
        '700',

      color:
        '#111',
    },

    headerSubtitle: {
      marginTop:
        1,

      fontSize:
        12,

      color:
        '#777',
    },

    // ------------------------------------------------------
    // RECENTER
    // ------------------------------------------------------

    recenterButton: {
      position:
        'absolute',

      right:
        16,

      width:
        48,

      height:
        48,

      borderRadius:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#fff',

      shadowColor:
        '#000',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.14,

      shadowRadius:
        6,

      elevation:
        6,
    },

    // ------------------------------------------------------
    // LEGEND
    // ------------------------------------------------------

    legendCard: {
      position:
        'absolute',

      left:
        18,

      paddingHorizontal:
        16,

      paddingVertical:
        12,

      borderRadius:
        18,

      backgroundColor:
        '#fff',

      shadowColor:
        '#000',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.12,

      shadowRadius:
        6,

      elevation:
        5,
    },

    legendRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginVertical:
        2,
    },

    legendDot: {
      width:
        10,

      height:
        10,

      marginRight:
        8,

      borderRadius:
        5,
    },

    destinationDot: {
      backgroundColor:
        '#367CFF',
    },

    activityDot: {
      backgroundColor:
        '#FF4D4D',
    },

    legendText: {
      fontSize:
        13,

      color:
        '#555',
    },

    // ------------------------------------------------------
    // PLACE CARD
    // ------------------------------------------------------

    placeCard: {
      position:
        'absolute',

      left:
        14,

      right:
        14,

      paddingTop:
        10,

      paddingHorizontal:
        18,

      paddingBottom:
        14,

      borderRadius:
        28,

      backgroundColor:
        '#fff',

      shadowColor:
        '#000',

      shadowOffset: {
        width:
          0,

        height:
          -2,
      },

      shadowOpacity:
        0.18,

      shadowRadius:
        12,

      elevation:
        12,
    },

    dragBar: {
      alignSelf:
        'center',

      width:
        42,

      height:
        4,

      marginBottom:
        13,

      borderRadius:
        4,

      backgroundColor:
        '#D6D6D6',
    },

    closeButton: {
      position:
        'absolute',

      top:
        14,

      right:
        15,

      zIndex:
        20,

      width:
        36,

      height:
        36,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F1F1F1',
    },

    // ------------------------------------------------------
    // PLACE TOP
    // ------------------------------------------------------

    placeTopRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    placeInfo: {
      flex:
        1,

      paddingRight:
        12,
    },

    nameRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingRight:
        24,
    },

    smallLocationIcon: {
      width:
        37,

      height:
        37,

      marginRight:
        9,

      borderRadius:
        19,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    destinationIcon: {
      backgroundColor:
        '#367CFF',
    },

    activityIcon: {
      backgroundColor:
        '#FF5A4F',
    },

    /*
      Purple means the user manually tapped
      somewhere on the map.
    */
    mapTapIcon: {
      backgroundColor:
        '#7C4DFF',
    },

    placeName: {
      flex:
        1,

      fontSize:
        19,

      fontWeight:
        '800',

      color:
        '#161616',
    },

    placeAddress: {
      marginTop:
        9,

      fontSize:
        13,

      lineHeight:
        18,

      color:
        '#606060',
    },

    // ------------------------------------------------------
    // PLACE LOADING
    // ------------------------------------------------------

    placeLoadingRow: {
      marginTop:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    placeLoadingText: {
      marginLeft:
        8,

      fontSize:
        12,

      color:
        '#777',
    },

    // ------------------------------------------------------
    // PHOTO
    // ------------------------------------------------------

    placePhoto: {
      width:
        105,

      height:
        105,

      borderRadius:
        15,

      backgroundColor:
        '#EEE',
    },

    photoPlaceholder: {
      width:
        105,

      height:
        105,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F0F0F0',
    },

    // ------------------------------------------------------
    // RATINGS
    // ------------------------------------------------------

    ratingRow: {
      marginTop:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    ratingText: {
      marginLeft:
        4,

      fontSize:
        14,

      fontWeight:
        '700',

      color:
        '#333',
    },

    ratingCount: {
      marginLeft:
        4,

      fontSize:
        13,

      color:
        '#777',
    },

    categoryText: {
      marginTop:
        5,

      fontSize:
        12,

      color:
        '#666',
    },

    openText: {
      marginTop:
        5,

      fontSize:
        12,

      fontWeight:
        '700',

      color:
        '#188038',
    },

    closedText: {
      marginTop:
        5,

      fontSize:
        12,

      fontWeight:
        '700',

      color:
        '#C5221F',
    },

    // ------------------------------------------------------
    // ACTIVITY INFO
    // ------------------------------------------------------

    activityInformation: {
      marginTop:
        13,

      padding:
        11,

      borderRadius:
        13,

      backgroundColor:
        '#F7F7F7',
    },

    infoRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginVertical:
        3,
    },

    infoText: {
      flex:
        1,

      marginLeft:
        8,

      fontSize:
        12,

      lineHeight:
        17,

      color:
        '#555',
    },

    // ------------------------------------------------------
    // ACTION BUTTONS
    // ------------------------------------------------------

    actionRow: {
      flexDirection:
        'row',

      marginTop:
        16,
    },

    actionButton: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    actionIcon: {
      width:
        47,

      height:
        47,

      borderRadius:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F0F1F3',
    },

    actionText: {
      marginTop:
        5,

      fontSize:
        11,

      fontWeight:
        '600',

      color:
        '#333',
    },

    addToItineraryButton: {
      marginTop: 16,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: '#1769E8',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    addToItineraryText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // ------------------------------------------------------
    // ADD TO ITINERARY MODAL
    // ------------------------------------------------------

    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },

    addModalCard: {
      paddingHorizontal: 22,
      paddingTop: 18,
      paddingBottom: 28,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: '#FFFFFF',
    },

    addModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 18,
    },

    addModalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#111827',
    },

    addModalPlaceName: {
      marginTop: 4,
      paddingRight: 12,
      fontSize: 13,
      lineHeight: 18,
      color: '#6B7280',
    },

    modalCloseButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F3F4F6',
    },

    modalLabel: {
      marginTop: 12,
      marginBottom: 7,
      fontSize: 13,
      fontWeight: '700',
      color: '#374151',
    },

    modalField: {
      minHeight: 50,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
    },

    modalFieldText: {
      marginLeft: 9,
      fontSize: 14,
      color: '#111827',
    },

    notesInput: {
      minHeight: 88,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: 12,
      textAlignVertical: 'top',
      fontSize: 14,
      color: '#111827',
      backgroundColor: '#FFFFFF',
    },

    confirmAddButton: {
      marginTop: 20,
      minHeight: 50,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#1769E8',
    },

    confirmAddButtonDisabled: {
      opacity: 0.6,
    },

    confirmAddButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    // ------------------------------------------------------
    // GOOGLE ATTRIBUTION
    // ------------------------------------------------------

    attributionContainer: {
      marginTop:
        12,

      paddingTop:
        9,

      borderTopWidth:
        1,

      borderTopColor:
        '#EEEEEE',
    },

    googleAttribution: {
      textAlign:
        'center',

      fontSize:
        10,

      color:
        '#777',
    },

    photoAttribution: {
      marginTop:
        3,

      textAlign:
        'center',

      fontSize:
        10,

      color:
        '#666',

      textDecorationLine:
        'underline',
    },
  });