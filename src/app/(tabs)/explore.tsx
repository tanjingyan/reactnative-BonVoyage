import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import AsyncStorage from '@react-native-async-storage/async-storage';

import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import {
  httpsCallable,
} from 'firebase/functions';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query as firestoreQuery,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import {
  useEffect,
  useMemo,
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


// ==========================================================
// WORLD RECOMMENDATIONS
// ==========================================================

const WORLD_RECOMMENDATION_GROUPS = [
  {
    region: 'Europe',
    queries: [
      'Eiffel Tower Paris',
      'Colosseum Rome',
      'Sagrada Familia Barcelona',
      'Big Ben London',
      'Acropolis Athens',
    ],
  },
  {
    region: 'Asia',
    queries: [
      'Senso-ji Temple Tokyo',
      'Fushimi Inari Shrine Kyoto',
      'Marina Bay Sands Singapore',
      'Petronas Twin Towers Kuala Lumpur',
      'Grand Palace Bangkok',
    ],
  },
  {
    region: 'Americas',
    queries: [
      'Statue of Liberty New York',
      'Golden Gate Bridge San Francisco',
      'Christ the Redeemer Rio de Janeiro',
      'Machu Picchu Peru',
      'Chichen Itza Mexico',
    ],
  },
  {
    region: 'Africa',
    queries: [
      'Pyramids of Giza Egypt',
      'Table Mountain Cape Town',
      'Victoria Falls Zimbabwe',
      'Kirstenbosch National Botanical Garden Cape Town',
      'Hassan II Mosque Casablanca',
    ],
  },
  {
    region: 'Oceania',
    queries: [
      'Sydney Opera House Australia',
      'Great Barrier Reef Cairns',
      'Milford Sound New Zealand',
      'Sky Tower Auckland',
      'Twelve Apostles Victoria Australia',
    ],
  },
  {
    region: 'Middle East',
    queries: [
      'Burj Khalifa Dubai',
      'Sheikh Zayed Grand Mosque Abu Dhabi',
      'Petra Jordan',
      'Museum of the Future Dubai',
      'AlUla Hegra Saudi Arabia',
    ],
  },
] as const;

type TripOption = {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
};

type Guide = {
  id: string;
  userId: string;
  creatorName: string;
  creatorUsername: string;
  title: string;
  destination: string;
  caption: string;
  coverImage: string | null;
  durationDays: number;
  isPublished: boolean;
  likeCount: number;
  saveCount: number;
  commentCount?: number;
  tips?: string[];
  createdAt?: {
    seconds?: number;
  } | null;
};

type PublicProfile = {
  userId: string;
  displayName: string;
  username: string;
  bio: string;
  location: string;
  photoURL: string | null;
};

type TravellerSummary = {
  userId: string;
  displayName: string;
  username: string;
  guideCount: number;
  destinations: string[];
  coverImage: string | null;
  photoURL: string | null;
  bio: string;
  location: string;
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

  // ========================================================
  // RECENT PLACE SEARCHES
  // ========================================================

  const [
    searchFocused,
    setSearchFocused,
  ] =
    useState(false);

  const [
    recentSearches,
    setRecentSearches,
  ] =
    useState<string[]>([]);

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

  const [
    recommendedPlaces,
    setRecommendedPlaces,
  ] =
    useState<GooglePlace[]>([]);

  const [
    recommendedPlacesLoading,
    setRecommendedPlacesLoading,
  ] =
    useState(true);

  const [
    savedPlaceIds,
    setSavedPlaceIds,
  ] =
    useState<Set<string>>(
      new Set()
    );

  // ========================================================
  // SAVED PLACES
  // ========================================================

  useEffect(() => {
    const user =
      auth.currentUser;

    if (!user) {
      setSavedPlaceIds(
        new Set()
      );
      return;
    }

    const savedPlacesRef =
      collection(
        db,
        'users',
        user.uid,
        'savedPlaces'
      );

    const unsubscribe =
      onSnapshot(
        savedPlacesRef,
        snapshot => {
          setSavedPlaceIds(
            new Set(
              snapshot.docs.map(
                item => item.id
              )
            )
          );
        },
        error => {
          console.log(
            'Load saved places error:',
            error
          );
        }
      );

    return unsubscribe;
  }, []);

  function getSavedPlaceDocumentId(
    place: GooglePlace
  ) {
    if (place.id) {
      return place.id;
    }

    return encodeURIComponent(
      `${place.displayName}|${place.formattedAddress ?? ''}`
    );
  }

  async function toggleSavedPlace(
    place: GooglePlace
  ) {
    const user =
      auth.currentUser;

    if (!user) {
      Alert.alert(
        'Login required',
        'Please log in before saving a place.'
      );
      return;
    }

    const savedPlaceId =
      getSavedPlaceDocumentId(
        place
      );

    const savedPlaceRef =
      doc(
        db,
        'users',
        user.uid,
        'savedPlaces',
        savedPlaceId
      );

    try {
      if (
        savedPlaceIds.has(
          savedPlaceId
        )
      ) {
        await deleteDoc(
          savedPlaceRef
        );
        return;
      }

      await setDoc(
        savedPlaceRef,
        {
          placeId:
            place.id,
          displayName:
            place.displayName,
          formattedAddress:
            place.formattedAddress,
          latitude:
            place.latitude,
          longitude:
            place.longitude,
          rating:
            place.rating,
          userRatingCount:
            place.userRatingCount,
          primaryType:
            place.primaryType,
          googleMapsUri:
            place.googleMapsUri,
          photoUri:
            place.photoUri,
          savedAt:
            serverTimestamp(),
        }
      );
    } catch (error) {
      console.error(
        'Save place error:',
        error
      );

      Alert.alert(
        'Unable to save place',
        'BonVoyage could not update your saved places. Please try again.'
      );
    }
  }

  // ========================================================
  // RANDOM WORLD RECOMMENDATIONS
  // ========================================================

  useEffect(() => {
    void loadRecommendedPlaces();
  }, []);

  async function loadRecommendedPlaces() {
    const user =
      auth.currentUser;

    if (!user) {
      setRecommendedPlaces([]);
      setRecommendedPlacesLoading(false);
      return;
    }

    try {
      setRecommendedPlacesLoading(true);

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

      /*
       * Pick one landmark from several different world regions.
       * We request more than three candidates so that places without
       * a Google photo can be skipped without showing a placeholder.
       */
      const shuffledGroups =
        shuffleArray(
          WORLD_RECOMMENDATION_GROUPS
        );

      const candidateQueries =
        shuffledGroups
          .slice(0, 5)
          .map(group => {
            const randomIndex =
              Math.floor(
                Math.random() *
                  group.queries.length
              );

            return group.queries[
              randomIndex
            ];
          });

      const responses =
        await Promise.all(
          candidateQueries.map(
            async query => {
              try {
                const result =
                  await searchPlacesFunction({
                    query,
                  });

                const candidates =
                  result.data.places ??
                  [];

                /*
                 * Only keep a result that has a real Google Places
                 * photo. This prevents the grey placeholder shown by
                 * the earlier hard-coded recommendations.
                 */
                return (
                  candidates.find(
                    place =>
                      Boolean(
                        place.photoUri
                      )
                  ) ??
                  null
                );
              } catch (error) {
                console.log(
                  'Recommendation search failed:',
                  query,
                  error
                );

                return null;
              }
            }
          )
        );

      const uniquePlaces:
        GooglePlace[] = [];

      responses.forEach(
        place => {
          if (!place) {
            return;
          }

          const alreadyAdded =
            uniquePlaces.some(
              item =>
                (
                  item.id &&
                  place.id &&
                  item.id ===
                    place.id
                ) ||
                item.displayName
                  .toLowerCase() ===
                  place.displayName
                    .toLowerCase()
            );

          if (!alreadyAdded) {
            uniquePlaces.push(
              place
            );
          }
        }
      );

      /*
       * If fewer than three photo-backed places were returned,
       * try additional landmark queries from the remaining regions.
       */
      if (
        uniquePlaces.length <
        3
      ) {
        const fallbackQueries =
          shuffleArray(
            WORLD_RECOMMENDATION_GROUPS
              .flatMap(
                group =>
                  group.queries
              )
              .filter(
                query =>
                  !candidateQueries.some(
                    candidate =>
                      candidate ===
                      query
                  )
              )
          ).slice(0, 6);

        for (
          const query of
          fallbackQueries
        ) {
          if (
            uniquePlaces.length >=
            3
          ) {
            break;
          }

          try {
            const result =
              await searchPlacesFunction({
                query,
              });

            const candidate =
              (
                result.data.places ??
                []
              ).find(
                place =>
                  Boolean(
                    place.photoUri
                  )
              );

            if (
              candidate &&
              !uniquePlaces.some(
                item =>
                  (
                    item.id &&
                    candidate.id &&
                    item.id ===
                      candidate.id
                  ) ||
                  item.displayName
                    .toLowerCase() ===
                    candidate.displayName
                      .toLowerCase()
              )
            ) {
              uniquePlaces.push(
                candidate
              );
            }
          } catch (error) {
            console.log(
              'Fallback recommendation failed:',
              query,
              error
            );
          }
        }
      }

      setRecommendedPlaces(
        shuffleArray(
          uniquePlaces
        ).slice(0, 3)
      );
    } catch (error) {
      console.error(
        'Load recommended places error:',
        error
      );

      setRecommendedPlaces([]);
    } finally {
      setRecommendedPlacesLoading(
        false
      );
    }
  }

  // ========================================================
  // PUBLISHED GUIDES / TRAVELLERS
  // ========================================================

  const [
    guides,
    setGuides,
  ] =
    useState<Guide[]>([]);

  const [
    guidesLoading,
    setGuidesLoading,
  ] =
    useState(true);

  const [
    publicProfiles,
    setPublicProfiles,
  ] =
    useState<
      Record<
        string,
        PublicProfile
      >
    >({});

  const [
    publicProfilesLoading,
    setPublicProfilesLoading,
  ] =
    useState(true);

  useEffect(() => {
    const user =
      auth.currentUser;

    if (!user) {
      setGuidesLoading(
        false
      );

      return;
    }

    const guidesQuery =
      firestoreQuery(
        collection(
          db,
          'guides'
        ),
        where(
          'isPublished',
          '==',
          true
        )
      );

    const unsubscribe =
      onSnapshot(
        guidesQuery,
        snapshot => {
          const guideList:
            Guide[] =
            snapshot.docs.map(
              guideDocument => ({
                id:
                  guideDocument.id,

                ...(guideDocument.data() as Omit<
                  Guide,
                  'id'
                >),
              })
            );

          guideList.sort(
            (a, b) =>
              (b.createdAt?.seconds ??
                0) -
              (a.createdAt?.seconds ??
                0)
          );

          setGuides(
            guideList
          );

          setGuidesLoading(
            false
          );
        },
        error => {
          console.error(
            'Explore guides error:',
            error
          );

          setGuidesLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, []);

  // ========================================================
  // PUBLIC TRAVELLER PROFILES
  // ========================================================
  //
  // Safe social profile data is stored separately from the
  // private users/{uid} account document. This keeps fields
  // such as email private while allowing Explore -> People
  // to display the same name, bio, location and profile photo
  // as the account owner's Profile screen.
  // ========================================================

  useEffect(() => {
    const user =
      auth.currentUser;

    if (!user) {
      setPublicProfiles(
        {}
      );

      setPublicProfilesLoading(
        false
      );

      return;
    }

    setPublicProfilesLoading(
      true
    );

    const publicProfilesRef =
      collection(
        db,
        'publicProfiles'
      );

    const unsubscribe =
      onSnapshot(
        publicProfilesRef,

        snapshot => {
          const loadedProfiles:
            Record<
              string,
              PublicProfile
            > = {};

          snapshot.docs.forEach(
            profileDocument => {
              const data =
                profileDocument.data();

              loadedProfiles[
                profileDocument.id
              ] = {
                userId:
                  profileDocument.id,

                displayName:
                  String(
                    data.displayName ??
                    'BonVoyage Traveller'
                  ),

                username:
                  String(
                    data.username ??
                    'traveller'
                  ),

                bio:
                  String(
                    data.bio ??
                    ''
                  ),

                location:
                  String(
                    data.location ??
                    ''
                  ),

                photoURL:
                  data.photoURL
                    ? String(
                        data.photoURL
                      )
                    : null,
              };
            }
          );

          setPublicProfiles(
            loadedProfiles
          );

          setPublicProfilesLoading(
            false
          );
        },

        error => {
          console.error(
            'Explore public profiles error:',
            error
          );

          setPublicProfiles(
            {}
          );

          setPublicProfilesLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, []);

  /*
   * Explore is for discovering content from other BonVoyage
   * users. The currently logged-in user's own guides remain
   * available from Profile, but are hidden from Explore.
   */
  const currentUserId =
    auth.currentUser?.uid ??
    '';

  const discoverableGuides =
    useMemo(
      () =>
        guides.filter(
          guide =>
            guide.userId !==
            currentUserId
        ),
      [
        guides,
        currentUserId,
      ]
    );

  const filteredGuides =
    useMemo(() => {
      const search =
        normaliseSocialSearch(
          searchText
        );

      if (!search) {
        return discoverableGuides;
      }

      return discoverableGuides.filter(
        guide => {
          const searchable =
            [
              guide.title,
              guide.destination,
              guide.caption,
              guide.creatorName,
              guide.creatorUsername,
            ]
              .join(' ')
              .toLowerCase();

          return searchable.includes(
            search
          );
        }
      );
    }, [
      discoverableGuides,
      searchText,
    ]);

  /*
   * People is built from the same discoverable guide list.
   * Therefore the currently logged-in user is also excluded
   * from Explore -> People.
   */
  const travellers =
    useMemo(
      () =>
        buildTravellerSummaries(
          discoverableGuides,
          publicProfiles
        ),
      [
        discoverableGuides,
        publicProfiles,
      ]
    );

  const filteredTravellers =
    useMemo(() => {
      const search =
        normaliseSocialSearch(
          searchText
        );

      if (!search) {
        return travellers;
      }

      return travellers.filter(
        traveller => {
          const searchable =
            [
              traveller.displayName,
              traveller.username,
              traveller.bio,
              traveller.location,
              ...traveller.destinations,
            ]
              .join(' ')
              .toLowerCase();

          return searchable.includes(
            search
          );
        }
      );
    }, [
      travellers,
      searchText,
    ]);

  function openTravellerProfile(
    traveller:
      TravellerSummary
  ) {
    router.push({
      pathname:
        '/user/[id]',
      params: {
        id:
          traveller.userId,
        displayName:
          traveller.displayName,
        username:
          traveller.username,

        photoURL:
          traveller.photoURL ??
          '',

        bio:
          traveller.bio,

        location:
          traveller.location,
      },
    } as any);
  }

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
  // RECENT PLACE SEARCHES
  // ========================================================

  /*
   * Recent searches are stored locally on the device.
   * The storage key includes the logged-in user's UID so
   * different BonVoyage accounts do not share search history.
   */
  function getRecentSearchStorageKey() {
    const uid =
      auth.currentUser?.uid ??
      'guest';

    return `bonvoyage_recent_place_searches_${uid}`;
  }

  useEffect(() => {
    async function loadRecentSearches() {
      try {
        const stored =
          await AsyncStorage.getItem(
            getRecentSearchStorageKey()
          );

        if (!stored) {
          setRecentSearches([]);
          return;
        }

        const parsed =
          JSON.parse(stored);

        if (
          Array.isArray(parsed)
        ) {
          const validSearches =
            parsed
              .filter(
                value =>
                  typeof value ===
                  'string'
              )
              .slice(0, 6);

          setRecentSearches(
            validSearches
          );
        }
      } catch (error) {
        console.log(
          'Load recent searches error:',
          error
        );

        setRecentSearches([]);
      }
    }

    void loadRecentSearches();
  }, []);

  async function saveRecentSearch(
    value: string
  ) {
    const cleaned =
      value.trim();

    if (!cleaned) {
      return;
    }

    const updated = [
      cleaned,

      ...recentSearches.filter(
        item =>
          item
            .toLowerCase() !==
          cleaned
            .toLowerCase()
      ),
    ].slice(0, 6);

    setRecentSearches(
      updated
    );

    try {
      await AsyncStorage.setItem(
        getRecentSearchStorageKey(),
        JSON.stringify(
          updated
        )
      );
    } catch (error) {
      console.log(
        'Save recent search error:',
        error
      );
    }
  }

  function selectRecentSearch(
    value: string
  ) {
    setSearchText(
      value
    );

    setSearchFocused(
      false
    );

    void searchPlaces(
      value
    );
  }

  async function removeRecentSearch(
    value: string
  ) {
    const updated =
      recentSearches.filter(
        item =>
          item !== value
      );

    setRecentSearches(
      updated
    );

    try {
      await AsyncStorage.setItem(
        getRecentSearchStorageKey(),
        JSON.stringify(
          updated
        )
      );
    } catch (error) {
      console.log(
        'Remove recent search error:',
        error
      );
    }
  }

  async function clearRecentSearches() {
    setRecentSearches([]);

    try {
      await AsyncStorage.removeItem(
        getRecentSearchStorageKey()
      );
    } catch (error) {
      console.log(
        'Clear recent searches error:',
        error
      );
    }
  }

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
        'Enter a place or destination to search.'
      );

      return;
    }

    /*
     * Category-only searches such as "restaurants" or
     * "tourist attractions" are too broad for a travel app.
     * Ask the user to include a destination before sending the
     * request to Google Places.
     */
    const genericCategoryMap: Record<string, string> = {
      attraction: 'tourist attractions',
      attractions: 'tourist attractions',
      'tourist attraction': 'tourist attractions',
      'tourist attractions': 'tourist attractions',
      restaurant: 'restaurants',
      restaurants: 'restaurants',
      cafe: 'cafes',
      cafes: 'cafes',
      café: 'cafes',
      cafés: 'cafes',
      shopping: 'shopping',
    };

    const normalisedQuery =
      query
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    const queryWithoutTrailingIn =
      normalisedQuery.replace(
        /\s+in$/,
        ''
      );

    const genericCategory =
      genericCategoryMap[
        queryWithoutTrailingIn
      ];

    if (genericCategory) {
      setSearchText(
        `${genericCategory} in `
      );

      setPlaces([]);
      setHasSearched(false);

      Alert.alert(
        'Add a destination',
        `Choose where you want to search, for example "${genericCategory} in Tokyo".`
      );

      return;
    }

    /*
     * Only Google Places searches are added to the recent
     * search history. Guide and People searches are currently
     * live filters and are not stored.
     */
    await saveRecentSearch(
      query
    );

    setSearchFocused(
      false
    );

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
    const currentQuery =
      searchText.trim();

    const categoryTerms = [
      'tourist attractions',
      'attractions',
      'restaurants',
      'cafes',
      'shopping',
    ];

    /*
     * If the current search already looks like a category search,
     * keep its destination when the user switches category.
     * Example: "restaurants in Tokyo" -> "cafes in Tokyo".
     */
    const existingCategory =
      categoryTerms.find(
        item =>
          currentQuery
            .toLowerCase()
            .startsWith(
              `${item} in `
            )
      );

    if (existingCategory) {
      const destination =
        currentQuery
          .slice(
            existingCategory.length +
              4
          )
          .trim();

      if (destination) {
        const query =
          `${category} in ${destination}`;

        setSearchText(
          query
        );

        void searchPlaces(
          query
        );

        return;
      }
    }

    /*
     * If the user typed a destination first, use it immediately.
     * Example: "Tokyo" + Attractions ->
     * "tourist attractions in Tokyo".
     */
    const currentIsCategory =
      categoryTerms.some(
        item =>
          currentQuery.toLowerCase() ===
            item ||
          currentQuery.toLowerCase() ===
            `${item} in`
      );

    if (
      currentQuery &&
      !currentIsCategory
    ) {
      const query =
        `${category} in ${currentQuery}`;

      setSearchText(
        query
      );

      void searchPlaces(
        query
      );

      return;
    }

    /*
     * No destination yet: pre-fill the useful query template
     * instead of making an overly broad API request.
     */
    setSearchText(
      `${category} in `
    );

    setPlaces([]);
    setHasSearched(false);

    Alert.alert(
      'Add a destination',
      `Enter a city or destination after "${category} in", for example Tokyo.`
    );
  }

  function searchRecommendedPlace(
    place: GooglePlace
  ) {
    /*
     * The recommendation already came from Google Places, so there
     * is no reason to make another network request when it is tapped.
     * Reuse the complete place object, including its real photo.
     */
    const label =
      place.formattedAddress
        ? `${place.displayName}, ${place.formattedAddress}`
        : place.displayName;

    setSearchText(
      place.displayName
    );

    setSearchFocused(
      false
    );

    setPlaces([
      place,
    ]);

    setHasSearched(
      true
    );

    void saveRecentSearch(
      label
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

      /*
       * Only allow places to be added to trips that are still active
       * or upcoming. A trip is considered past once its end date is
       * before today's date.
       */
      const today =
        startOfDay(
          new Date()
        );

      const tripList:
        TripOption[] =
        snapshot.docs
          .map(
            tripDocument => ({
              id:
                tripDocument.id,

              ...(tripDocument.data() as Omit<
                TripOption,
                'id'
              >),
            })
          )
          .filter(
            trip =>
              startOfDay(
                parseStoredDate(
                  trip.endDate
                )
              ).getTime() >=
              today.getTime()
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

        const firstTripStart =
          startOfDay(
            parseStoredDate(
              firstTrip.startDate
            )
          );

        const defaultDate =
          firstTripStart.getTime() <
          today.getTime()
            ? today
            : firstTripStart;

        setActivityDate(
          defaultDate
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

    const today =
      startOfDay(
        new Date()
      );

    const tripStart =
      startOfDay(
        parseStoredDate(
          trip.startDate
        )
      );

    setActivityDate(
      tripStart.getTime() <
      today.getTime()
        ? today
        : tripStart
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

    /*
     * Safety check: even if the modal has been open while the trip
     * ends, do not allow a new place to be written into a past trip.
     */
    const today =
      startOfDay(
        new Date()
      );

    const selectedTripEnd =
      startOfDay(
        parseStoredDate(
          selectedTrip.endDate
        )
      );

    if (
      selectedTripEnd.getTime() <
      today.getTime()
    ) {
      Alert.alert(
        'Trip has ended',
        'Places cannot be added to a past trip. Please choose an upcoming or in-progress trip.'
      );

      setSelectedTripId(
        ''
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
            onFocus={() => {
              if (
                activeTab ===
                'places'
              ) {
                setSearchFocused(
                  true
                );
              }
            }}
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
        {/* RECENT PLACE SEARCHES                             */}
        {/* ================================================= */}

        {activeTab ===
          'places' &&
        searchFocused &&
        searchText.trim()
          .length ===
          0 &&
        recentSearches.length >
          0 ? (
          <View
            style={
              styles.recentSearchContainer
            }
          >
            <View
              style={
                styles.recentSearchHeader
              }
            >
              <View
                style={
                  styles.recentSearchHeading
                }
              >
                <Ionicons
                  name="time-outline"
                  size={17}
                  color="#6B7280"
                />

                <Text
                  style={
                    styles.recentSearchTitle
                  }
                >
                  Recent searches
                </Text>
              </View>

              <Pressable
                hitSlop={10}
                onPress={() =>
                  void clearRecentSearches()
                }
              >
                <Text
                  style={
                    styles.clearRecentText
                  }
                >
                  Clear all
                </Text>
              </Pressable>
            </View>

            {recentSearches.map(
              (
                item,
                index
              ) => (
                <View
                  key={`${item}-${index}`}
                  style={[
                    styles.recentSearchItem,

                    index ===
                      recentSearches.length -
                        1 &&
                      styles.recentSearchItemLast,
                  ]}
                >
                  <Pressable
                    style={
                      styles.recentSearchMain
                    }
                    onPress={() =>
                      selectRecentSearch(
                        item
                      )
                    }
                  >
                    <View
                      style={
                        styles.recentSearchIcon
                      }
                    >
                      <Ionicons
                        name="search-outline"
                        size={17}
                        color="#6B7280"
                      />
                    </View>

                    <Text
                      style={
                        styles.recentSearchText
                      }
                      numberOfLines={1}
                    >
                      {item}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={
                      styles.removeRecentButton
                    }
                    hitSlop={8}
                    onPress={() =>
                      void removeRecentSearch(
                        item
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item} from recent searches`}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color="#9CA3AF"
                    />
                  </Pressable>
                </View>
              )
            )}
          </View>
        ) : null}

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

              setSearchFocused(
                false
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

              setSearchFocused(
                false
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

              setSearchFocused(
                false
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
                  savedPlaceIds={
                    savedPlaceIds
                  }
                  onBack={
                    clearSearch
                  }
                  onOpenGoogleMaps={
                    openGoogleMaps
                  }
                  onAddToTrip={
                    openAddToTrip
                  }
                  onToggleSavedPlace={
                    toggleSavedPlace
                  }
                />
              ) : (
                <PlacesSection
                  onCategoryPress={
                    searchCategory
                  }
                  recommendedPlaces={
                    recommendedPlaces
                  }
                  recommendedPlacesLoading={
                    recommendedPlacesLoading
                  }
                  savedPlaceIds={
                    savedPlaceIds
                  }
                  onRecommendedPlacePress={
                    searchRecommendedPlace
                  }
                  onToggleSavedPlace={
                    toggleSavedPlace
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
            <GuidesSection
              guides={
                filteredGuides
              }
              loading={
                guidesLoading ||
                publicProfilesLoading
              }
              searchText={
                searchText
              }
              publicProfiles={
                publicProfiles
              }
            />
          )}

          {/* =============================================== */}
          {/* PEOPLE                                          */}
          {/* =============================================== */}

          {activeTab ===
            'people' && (
            <PeopleSection
              travellers={
                filteredTravellers
              }
              loading={
                guidesLoading ||
                publicProfilesLoading
              }
              searchText={
                searchText
              }
              onViewProfile={
                openTravellerProfile
              }
            />
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
                      No available trips
                    </Text>

                    <Text
                      style={
                        styles.noTripsText
                      }
                    >
                      Create a new trip to add this place to your itinerary. Past trips are not available for new activities.
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
  active,
  onPress,
}: TabButtonProps) {
  return (
    <Pressable
      style={
        styles.tabButton
      }
      onPress={
        onPress
      }
      accessibilityRole="tab"
      accessibilityState={{
        selected: active,
      }}
    >
      <Text
        style={[
          styles.tabText,

          active &&
            styles.activeTabText,
        ]}
      >
        {title}
      </Text>

      {active && (
        <View
          style={
            styles.activeTabIndicator
          }
        />
      )}
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

  recommendedPlaces:
    GooglePlace[];

  recommendedPlacesLoading:
    boolean;

  savedPlaceIds:
    Set<string>;

  onRecommendedPlacePress:
    (
      place: GooglePlace
    ) => void;

  onToggleSavedPlace:
    (
      place: GooglePlace
    ) => void;
};

function PlacesSection({
  onCategoryPress,
  recommendedPlaces,
  recommendedPlacesLoading,
  savedPlaceIds,
  onRecommendedPlacePress,
  onToggleSavedPlace,
}: PlacesSectionProps) {
  return (
    <>
      <Text
        style={
          styles.placesSectionTitle
        }
      >
        Popular Categories
      </Text>

      <View
        style={
          styles.categoryGrid
        }
      >
        <CategoryCard
          title="Attractions"
          icon="business-outline"
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

      <Text
        style={[
          styles.placesSectionTitle,
          styles.recommendedTitle,
        ]}
      >
        Recommended Places
      </Text>

      {recommendedPlacesLoading ? (
        <View
          style={
            styles.recommendedLoading
          }
        >
          <ActivityIndicator
            size="small"
            color="#1769E8"
          />

          <Text
            style={
              styles.recommendedLoadingText
            }
          >
            Finding places around the world...
          </Text>
        </View>
      ) : recommendedPlaces.length ===
        0 ? (
        <View
          style={
            styles.recommendedEmpty
          }
        >
          <Ionicons
            name="globe-outline"
            size={24}
            color="#9CA3AF"
          />

          <Text
            style={
              styles.recommendedEmptyText
            }
          >
            Recommendations are unavailable right now.
          </Text>
        </View>
      ) : (
        <View
          style={
            styles.recommendedList
          }
        >
          {recommendedPlaces.map(
            place => (
              <Pressable
                key={
                  place.id ??
                  `${place.displayName}-${place.formattedAddress ?? ''}`
                }
                style={({
                  pressed,
                }) => [
                  styles.recommendedPlaceRow,
                  pressed &&
                    styles.recommendedPlaceRowPressed,
                ]}
                onPress={() =>
                  onRecommendedPlacePress(
                    place
                  )
                }
              >
                {place.photoUri ? (
                  <Image
                    source={{
                      uri:
                        place.photoUri,
                    }}
                    style={
                      styles.recommendedImage
                    }
                    resizeMode="cover"
                  />
                ) : null}

                <View
                  style={
                    styles.recommendedPlaceInfo
                  }
                >
                  <Text
                    style={
                      styles.recommendedPlaceName
                    }
                    numberOfLines={1}
                  >
                    {
                      place.displayName
                    }
                  </Text>

                  {place.formattedAddress ? (
                    <Text
                      style={
                        styles.recommendedPlaceLocation
                      }
                      numberOfLines={1}
                    >
                      {
                        place.formattedAddress
                      }
                    </Text>
                  ) : null}

                  {place.rating !==
                    null ? (
                    <View
                      style={
                        styles.recommendedRatingRow
                      }
                    >
                      <Ionicons
                        name="star"
                        size={13}
                        color="#111827"
                      />

                      <Text
                        style={
                          styles.recommendedRatingText
                        }
                      >
                        {place.rating.toFixed(
                          1
                        )}
                        {place.userRatingCount !==
                        null
                          ? ` (${formatCompactCount(
                              place.userRatingCount
                            )})`
                          : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Pressable
                  style={
                    styles.recommendedBookmarkButton
                  }
                  hitSlop={8}
                  onPress={event => {
                    event.stopPropagation();
                    onToggleSavedPlace(
                      place
                    );
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    savedPlaceIds.has(
                      place.id ??
                        encodeURIComponent(
                          `${place.displayName}|${place.formattedAddress ?? ''}`
                        )
                    )
                      ? `Remove ${place.displayName} from saved places`
                      : `Save ${place.displayName}`
                  }
                >
                  <Ionicons
                    name={
                      savedPlaceIds.has(
                        place.id ??
                          encodeURIComponent(
                            `${place.displayName}|${place.formattedAddress ?? ''}`
                          )
                      )
                        ? 'bookmark'
                        : 'bookmark-outline'
                    }
                    size={23}
                    color={
                      savedPlaceIds.has(
                        place.id ??
                          encodeURIComponent(
                            `${place.displayName}|${place.formattedAddress ?? ''}`
                          )
                      )
                        ? '#1769E8'
                        : '#374151'
                    }
                  />
                </Pressable>
              </Pressable>
            )
          )}
        </View>
      )}
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

  savedPlaceIds:
    Set<string>;

  onBack:
    () => void;

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

  onToggleSavedPlace:
    (
      place:
        GooglePlace
    ) => void;
};

function SearchResults({
  places,
  savedPlaceIds,
  onBack,
  onOpenGoogleMaps,
  onAddToTrip,
  onToggleSavedPlace,
}: SearchResultsProps) {
  if (
    places.length ===
    0
  ) {
    return (
      <>
        <View
          style={
            styles.resultHeader
          }
        >
          <View
            style={
              styles.resultHeaderLeft
            }
          >
            <Pressable
              style={
                styles.resultBackButton
              }
              onPress={
                onBack
              }
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to Explore places"
            >
              <Ionicons
                name="chevron-back"
                size={23}
                color="#111827"
              />
            </Pressable>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Search results
            </Text>
          </View>
        </View>

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
      </>
    );
  }

  return (
    <>
      <View
        style={
          styles.resultHeader
        }
      >
        <View
          style={
            styles.resultHeaderLeft
          }
        >
          <Pressable
            style={
              styles.resultBackButton
            }
            onPress={
              onBack
            }
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to Explore places"
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color="#111827"
            />
          </Pressable>

          <Text
            style={
              styles.sectionTitle
            }
          >
            Search results
          </Text>
        </View>

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
        ) => {
          const savedPlaceId =
            place.id ??
            encodeURIComponent(
              `${place.displayName}|${place.formattedAddress ?? ''}`
            );

          return (
            <PlaceCard
              key={
                savedPlaceId ||
                `${place.displayName}-${index}`
              }
              place={
                place
              }
              isSaved={
                savedPlaceIds.has(
                  savedPlaceId
                )
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
              onToggleSaved={() =>
                onToggleSavedPlace(
                  place
                )
              }
            />
          );
        }
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

  isSaved:
    boolean;

  onOpenGoogleMaps:
    () => void;

  onAddToTrip:
    () => void;

  onToggleSaved:
    () => void;
};

function PlaceCard({
  place,
  isSaved,
  onOpenGoogleMaps,
  onAddToTrip,
  onToggleSaved,
}: PlaceCardProps) {
  return (
    <View
      style={
        styles.placeCard
      }
    >
      {/* BOOKMARK */}

      <Pressable
        style={({
          pressed,
        }) => [
          styles.placeBookmarkButton,
          pressed &&
            styles.placeBookmarkButtonPressed,
        ]}
        onPress={
          onToggleSaved
        }
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          isSaved
            ? `Remove ${place.displayName} from saved places`
            : `Save ${place.displayName}`
        }
      >
        <Ionicons
          name={
            isSaved
              ? 'bookmark'
              : 'bookmark-outline'
          }
          size={23}
          color={
            isSaved
              ? '#1769E8'
              : '#374151'
          }
        />
      </Pressable>

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

type GuidesSectionProps = {
  guides: Guide[];
  loading: boolean;
  searchText: string;
  publicProfiles:
    Record<
      string,
      PublicProfile
    >;
};

function GuidesSection({
  guides,
  loading,
  searchText,
  publicProfiles,
}: GuidesSectionProps) {
  if (loading) {
    return (
      <SocialLoading
        icon="book-outline"
        title="Loading travel guides..."
      />
    );
  }

  if (
    guides.length ===
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
            name={
              searchText.trim()
                ? 'search-outline'
                : 'book-outline'
            }
            size={34}
            color="#1769E8"
          />
        </View>

        <Text
          style={
            styles.emptyTitle
          }
        >
          {searchText.trim()
            ? 'No guides found'
            : 'No published guides yet'}
        </Text>

        <Text
          style={
            styles.emptyDescription
          }
        >
          {searchText.trim()
            ? 'Try another destination, guide title or traveller.'
            : 'Published travel guides from BonVoyage travellers will appear here.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={
          styles.socialSectionHeader
        }
      >
        <View>
          <Text
            style={
              styles.sectionTitle
            }
          >
            Travel guides
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Itinerary-style recommendations shared by travellers
          </Text>
        </View>

        <View
          style={
            styles.socialCountBadge
          }
        >
          <Text
            style={
              styles.socialCountText
            }
          >
            {guides.length}
          </Text>
        </View>
      </View>

      {guides.map(
        guide => (
          <GuideCard
            key={
              guide.id
            }
            guide={
              guide
            }
            publicProfile={
              publicProfiles[
                guide.userId
              ] ??
              null
            }
          />
        )
      )}
    </>
  );
}

// ==========================================================
// GUIDE CARD
// ==========================================================

function GuideCard({
  guide,
  publicProfile,
}: {
  guide: Guide;
  publicProfile:
    | PublicProfile
    | null;
}) {
  const creatorName =
    publicProfile
      ?.displayName ||
    guide.creatorName ||
    'BonVoyage Traveller';

  const creatorUsername =
    publicProfile
      ?.username ||
    guide.creatorUsername ||
    'traveller';

  const creatorPhotoURL =
    publicProfile
      ?.photoURL ??
    null;

  const initials =
    getSocialInitials(
      creatorName
    );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.guideCard,
        pressed && {
          opacity: 0.92,
        },
      ]}
      onPress={() =>
        router.push({
          pathname:
            '/guide/[id]',
          params: {
            id:
              guide.id,
          },
        } as any)
      }
      accessibilityRole="button"
      accessibilityLabel={`View ${guide.title} travel guide`}
    >
      {/* CREATOR */}

      <View
        style={
          styles.guideCreatorRow
        }
      >
        <View
          style={
            styles.guideAvatar
          }
        >
          {creatorPhotoURL ? (
            <Image
              source={{
                uri:
                  creatorPhotoURL,
              }}
              style={
                styles.guideAvatarImage
              }
              resizeMode="cover"
            />
          ) : (
            <Text
              style={
                styles.guideAvatarText
              }
            >
              {initials}
            </Text>
          )}
        </View>

        <View
          style={
            styles.guideCreatorInfo
          }
        >
          <Text
            style={
              styles.guideCreatorName
            }
          >
            {creatorName}
          </Text>

          <Text
            style={
              styles.guideCreatorUsername
            }
          >
            @{creatorUsername}
          </Text>
        </View>

        <View
          style={
            styles.publishedBadge
          }
        >
          <Text
            style={
              styles.publishedBadgeText
            }
          >
            GUIDE
          </Text>
        </View>
      </View>

      {/* COVER */}

      {guide.coverImage ? (
        <Image
          source={{
            uri:
              guide.coverImage,
          }}
          style={
            styles.guideImage
          }
          resizeMode="cover"
        />
      ) : (
        <View
          style={
            styles.guideImagePlaceholder
          }
        >
          <Ionicons
            name="image-outline"
            size={34}
            color="#9CA3AF"
          />
        </View>
      )}

      {/* CONTENT */}

      <View
        style={
          styles.guideContent
        }
      >
        <Text
          style={
            styles.guideTitle
          }
          numberOfLines={2}
        >
          {guide.title}
        </Text>

        <View
          style={
            styles.guideLocationRow
          }
        >
          <Ionicons
            name="location-outline"
            size={15}
            color="#6B7280"
          />

          <Text
            style={
              styles.guideLocation
            }
            numberOfLines={1}
          >
            {guide.destination}
          </Text>
        </View>

        {guide.caption ? (
          <Text
            style={
              styles.guideCaption
            }
            numberOfLines={3}
          >
            {guide.caption}
          </Text>
        ) : null}

        <View
          style={
            styles.guideMetaRow
          }
        >
          <View
            style={
              styles.guideMetaItem
            }
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color="#6B7280"
            />

            <Text
              style={
                styles.guideMetaText
              }
            >
              {guide.durationDays ||
                1}{' '}
              {(guide.durationDays ||
                1) ===
              1
                ? 'day'
                : 'days'}
            </Text>
          </View>

          <View
            style={
              styles.guideMetaItem
            }
          >
            <Ionicons
              name="heart-outline"
              size={16}
              color="#6B7280"
            />

            <Text
              style={
                styles.guideMetaText
              }
            >
              {guide.likeCount ??
                0}
            </Text>
          </View>

          <View
            style={
              styles.guideMetaItem
            }
          >
            <Ionicons
              name="bookmark-outline"
              size={15}
              color="#6B7280"
            />

            <Text
              style={
                styles.guideMetaText
              }
            >
              {guide.saveCount ??
                0}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.guideFooter
          }
        >
          <Text
            style={
              styles.guideFooterText
            }
          >
            Itinerary travel guide
          </Text>

          <View
            style={
              styles.guideViewHint
            }
          >
            <Text
              style={
                styles.guideViewHintText
              }
            >
              View guide
            </Text>

            <Ionicons
              name="arrow-forward"
              size={15}
              color="#1769E8"
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ==========================================================
// PEOPLE
// ==========================================================

type PeopleSectionProps = {
  travellers:
    TravellerSummary[];
  loading: boolean;
  searchText: string;
  onViewProfile:
    (
      traveller:
        TravellerSummary
    ) => void;
};

function PeopleSection({
  travellers,
  loading,
  searchText,
  onViewProfile,
}: PeopleSectionProps) {
  if (loading) {
    return (
      <SocialLoading
        icon="people-outline"
        title="Finding travellers..."
      />
    );
  }

  if (
    travellers.length ===
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
            name={
              searchText.trim()
                ? 'search-outline'
                : 'people-outline'
            }
            size={34}
            color="#1769E8"
          />
        </View>

        <Text
          style={
            styles.emptyTitle
          }
        >
          {searchText.trim()
            ? 'No travellers found'
            : 'No guide creators yet'}
        </Text>

        <Text
          style={
            styles.emptyDescription
          }
        >
          {searchText.trim()
            ? 'Try searching for another traveller or destination.'
            : 'Travellers who publish guides will appear here.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={
          styles.socialSectionHeader
        }
      >
        <View>
          <Text
            style={
              styles.sectionTitle
            }
          >
            Travellers
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Discover people through the guides they share
          </Text>
        </View>

        <View
          style={
            styles.socialCountBadge
          }
        >
          <Text
            style={
              styles.socialCountText
            }
          >
            {travellers.length}
          </Text>
        </View>
      </View>

      {travellers.map(
        traveller => (
          <TravellerCard
            key={
              traveller.userId
            }
            traveller={
              traveller
            }
            onViewProfile={() =>
              onViewProfile(
                traveller
              )
            }
          />
        )
      )}
    </>
  );
}

// ==========================================================
// TRAVELLER CARD
// ==========================================================

function TravellerCard({
  traveller,
  onViewProfile,
}: {
  traveller:
    TravellerSummary;
  onViewProfile:
    () => void;
}) {
  const initials =
    getSocialInitials(
      traveller.displayName
    );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.travellerCard,
        pressed &&
          styles.travellerCardPressed,
      ]}
      onPress={
        onViewProfile
      }
      accessibilityRole="button"
      accessibilityLabel={`View ${traveller.displayName} profile`}
    >
      <View
        style={
          styles.travellerAvatar
        }
      >
        {traveller.photoURL ? (
          <Image
            source={{
              uri:
                traveller.photoURL,
            }}
            style={
              styles.travellerAvatarImage
            }
            resizeMode="cover"
          />
        ) : (
          <Text
            style={
              styles.travellerAvatarText
            }
          >
            {initials}
          </Text>
        )}
      </View>

      <View
        style={
          styles.travellerContent
        }
      >
        <Text
          style={
            styles.travellerName
          }
          numberOfLines={1}
        >
          {traveller.displayName}
        </Text>

        <Text
          style={
            styles.travellerUsername
          }
          numberOfLines={1}
        >
          @{traveller.username}
        </Text>

        <View
          style={
            styles.travellerMetaRow
          }
        >
          <Ionicons
            name="book-outline"
            size={14}
            color="#1769E8"
          />

          <Text
            style={
              styles.travellerGuideCount
            }
          >
            {traveller.guideCount}{' '}
            {traveller.guideCount ===
            1
              ? 'guide'
              : 'guides'}
          </Text>

          {traveller.destinations
            .length > 0 ? (
            <>
              <Text
                style={
                  styles.travellerDot
                }
              >
                •
              </Text>

              <Text
                style={
                  styles.travellerDestination
                }
                numberOfLines={1}
              >
                {
                  traveller
                    .destinations[0]
                }
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <View
        style={
          styles.travellerAction
        }
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color="#1769E8"
        />
      </View>
    </Pressable>
  );
}

// ==========================================================
// SOCIAL LOADING
// ==========================================================

function SocialLoading({
  icon,
  title,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View
      style={
        styles.socialLoading
      }
    >
      <View
        style={
          styles.largeIcon
        }
      >
        <Ionicons
          name={icon}
          size={32}
          color="#1769E8"
        />
      </View>

      <ActivityIndicator
        style={{
          marginTop: 17,
        }}
        color="#1769E8"
      />

      <Text
        style={
          styles.socialLoadingText
        }
      >
        {title}
      </Text>
    </View>
  );
}

// ==========================================================
// SOCIAL HELPERS
// ==========================================================

function normaliseSocialSearch(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /^@/,
      ''
    );
}

function buildTravellerSummaries(
  guides: Guide[],
  publicProfiles:
    Record<
      string,
      PublicProfile
    >
) {
  const travellerMap =
    new Map<
      string,
      TravellerSummary
    >();

  guides.forEach(
    guide => {
      const publicProfile =
        publicProfiles[
          guide.userId
        ];

      const existing =
        travellerMap.get(
          guide.userId
        );

      if (existing) {
        existing.guideCount +=
          1;

        if (
          guide.destination &&
          !existing.destinations.includes(
            guide.destination
          )
        ) {
          existing.destinations.push(
            guide.destination
          );
        }

        if (
          !existing.coverImage &&
          guide.coverImage
        ) {
          existing.coverImage =
            guide.coverImage;
        }

        return;
      }

      travellerMap.set(
        guide.userId,
        {
          userId:
            guide.userId,

          displayName:
            publicProfile
              ?.displayName ||
            guide.creatorName ||
            'BonVoyage Traveller',

          username:
            publicProfile
              ?.username ||
            guide.creatorUsername ||
            'traveller',

          guideCount:
            1,

          destinations:
            guide.destination
              ? [
                  guide.destination,
                ]
              : [],

          coverImage:
            guide.coverImage ??
            null,

          photoURL:
            publicProfile
              ?.photoURL ??
            null,

          bio:
            publicProfile
              ?.bio ??
            '',

          location:
            publicProfile
              ?.location ??
            '',
        }
      );
    }
  );

  return Array.from(
    travellerMap.values()
  ).sort(
    (a, b) =>
      b.guideCount -
      a.guideCount
  );
}

function getSocialInitials(
  name: string
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length ===
    0
  ) {
    return 'BV';
  }

  if (
    parts.length ===
    1
  ) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
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

  const today =
    startOfDay(
      new Date()
    );

  const tripStart =
    startOfDay(
      parseStoredDate(
        selectedTrip.startDate
      )
    );

  return {
    minimumDate:
      tripStart.getTime() <
      today.getTime()
        ? today
        : tripStart,

    maximumDate:
      parseStoredDate(
        selectedTrip.endDate
      ),
  };
}

// ==========================================================
// STYLES
// ==========================================================


function shuffleArray<T>(
  values: readonly T[]
) {
  const copy =
    [...values];

  for (
    let index =
      copy.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
          (index + 1)
      );

    const temporary =
      copy[index];

    copy[index] =
      copy[randomIndex];

    copy[randomIndex] =
      temporary;
  }

  return copy;
}

function formatCompactCount(
  value: number
) {
  if (value >= 1_000_000) {
    const millions =
      value / 1_000_000;

    return `${millions.toFixed(
      millions >= 10 ? 0 : 1
    )}M`;
  }

  if (value >= 1_000) {
    const thousands =
      value / 1_000;

    return `${thousands.toFixed(
      thousands >= 10 ? 0 : 1
    )}K`;
  }

  return String(value);
}

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
    // RECENT SEARCHES
    // ------------------------------------------------------

    recentSearchContainer: {
      marginHorizontal:
        22,

      marginTop: 10,

      paddingHorizontal:
        14,

      paddingTop: 13,

      paddingBottom: 3,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 17,

      backgroundColor:
        '#FFFFFF',

      shadowColor:
        '#000',

      shadowOpacity:
        0.04,

      shadowRadius: 8,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 2,
    },

    recentSearchHeader: {
      minHeight: 35,

      paddingHorizontal: 2,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    recentSearchHeading: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 7,
    },

    recentSearchTitle: {
      fontSize: 13,

      fontWeight: '800',

      color: '#111827',
    },

    clearRecentText: {
      fontSize: 11,

      fontWeight: '700',

      color: '#1769E8',
    },

    recentSearchItem: {
      minHeight: 50,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderTopWidth: 1,

      borderTopColor:
        '#F0F1F3',
    },

    recentSearchItemLast: {
      borderBottomWidth: 0,
    },

    recentSearchMain: {
      flex: 1,

      minHeight: 50,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingRight: 8,
    },

    recentSearchIcon: {
      width: 32,

      height: 32,

      marginRight: 9,

      borderRadius: 10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F3F4F6',
    },

    recentSearchText: {
      flex: 1,

      fontSize: 13,

      color: '#374151',
    },

    removeRecentButton: {
      width: 36,

      height: 42,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    // ------------------------------------------------------
    // TABS
    // ------------------------------------------------------

    tabContainer: {
      marginHorizontal:
        22,

      marginTop: 18,

      flexDirection:
        'row',

      borderBottomWidth: 1,

      borderBottomColor:
        '#E5E7EB',

      backgroundColor:
        '#FFFFFF',
    },

    tabButton: {
      flex: 1,

      minHeight: 46,

      alignItems:
        'center',

      justifyContent:
        'center',

      position:
        'relative',
    },

    activeTabButton: {
      // Kept for compatibility with older references.
      // The active state is now shown using the underline below.
    },

    tabText: {
      fontSize: 14,

      fontWeight: '600',

      color: '#6B7280',
    },

    activeTabText: {
      color: '#1769E8',

      fontWeight: '700',
    },

    activeTabIndicator: {
      position:
        'absolute',

      left: 18,

      right: 18,

      bottom: -1,

      height: 2,

      borderRadius: 2,

      backgroundColor:
        '#1769E8',
    },

    // ------------------------------------------------------
    // CONTENT
    // ------------------------------------------------------

    content: {
      flex: 1,
    },

    sectionTitle: {
      fontSize: 21,
      fontWeight: '800',
      color: '#111827',
    },

    sectionSubtitle: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
      color: '#6B7280',
    },

    contentContainer: {
      paddingHorizontal:
        22,

      paddingTop: 28,

      paddingBottom: 120,
    },

    placesSectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#111827',
      marginBottom: 14,
    },

    // ------------------------------------------------------
    // CATEGORIES
    // ------------------------------------------------------

    categoryGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },

    categoryCard: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
    },

    categoryIcon: {
      width: 54,
      height: 54,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F3F4F6',
    },

    categoryTitle: {
      marginTop: 7,
      fontSize: 11,
      fontWeight: '700',
      color: '#111827',
      textAlign: 'center',
    },

    // ------------------------------------------------------
    // RECOMMENDED PLACES
    // ------------------------------------------------------

    recommendedTitle: {
      marginTop: 28,
    },

    recommendedList: {
      gap: 12,
    },

    recommendedLoading: {
      minHeight: 92,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },

    recommendedLoadingText: {
      fontSize: 12,
      color: '#6B7280',
    },

    recommendedEmpty: {
      minHeight: 92,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    recommendedEmptyText: {
      fontSize: 12,
      color: '#6B7280',
      textAlign: 'center',
    },

    recommendedPlaceRow: {
      minHeight: 82,
      flexDirection: 'row',
      alignItems: 'center',
    },

    recommendedPlaceRowPressed: {
      opacity: 0.72,
    },

    recommendedImage: {
      width: 82,
      height: 72,
      borderRadius: 10,
      backgroundColor: '#E5E7EB',
      marginRight: 13,
    },

    recommendedPlaceInfo: {
      flex: 1,
      paddingRight: 8,
    },

    recommendedBookmarkButton: {
      width: 38,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },

    recommendedPlaceName: {
      fontSize: 14,
      fontWeight: '800',
      color: '#111827',
    },

    recommendedPlaceLocation: {
      marginTop: 3,
      fontSize: 12,
      color: '#6B7280',
    },

    recommendedRatingRow: {
      marginTop: 5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    recommendedRatingText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#374151',
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

    resultHeaderLeft: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    resultBackButton: {
      width: 34,

      height: 34,

      marginRight: 7,

      marginLeft: -6,

      borderRadius: 17,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F3F4F6',
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

    placeBookmarkButton: {
      position: 'absolute',

      top: 12,

      right: 12,

      zIndex: 5,

      width: 40,

      height: 40,

      borderRadius: 20,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(255,255,255,0.96)',

      shadowColor:
        '#000',

      shadowOpacity:
        0.12,

      shadowRadius: 5,

      shadowOffset: {
        width: 0,
        height: 2,
      },

      elevation: 4,
    },

    placeBookmarkButtonPressed: {
      opacity: 0.72,
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
    // GUIDES / PEOPLE
    // ------------------------------------------------------

    socialSectionHeader: {
      marginBottom: 17,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',
    },

    socialCountBadge: {
      minWidth: 32,

      height: 32,

      paddingHorizontal: 8,

      borderRadius: 16,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#EEF4FF',
    },

    socialCountText: {
      fontSize: 12,

      fontWeight: '800',

      color: '#1769E8',
    },

    // GUIDE CARD

    guideCard: {
      marginBottom: 18,

      overflow:
        'hidden',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 20,

      backgroundColor:
        '#FFFFFF',

      shadowColor:
        '#000',

      shadowOpacity: 0.04,

      shadowRadius: 8,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 2,
    },

    guideCreatorRow: {
      minHeight: 67,

      paddingHorizontal:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    guideAvatar: {
      width: 40,

      height: 40,

      borderRadius: 20,

      overflow:
        'hidden',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#DCEBFF',
    },

    guideAvatarImage: {
      width: '100%',

      height: '100%',
    },

    guideAvatarText: {
      fontSize: 13,

      fontWeight: '800',

      color: '#1769E8',
    },

    guideCreatorInfo: {
      flex: 1,

      marginLeft: 10,
    },

    guideCreatorName: {
      fontSize: 13,

      fontWeight: '800',

      color: '#111827',
    },

    guideCreatorUsername: {
      marginTop: 2,

      fontSize: 11,

      color: '#6B7280',
    },

    publishedBadge: {
      paddingHorizontal: 9,

      paddingVertical: 5,

      borderRadius: 15,

      backgroundColor:
        '#EEF4FF',
    },

    publishedBadgeText: {
      fontSize: 9,

      fontWeight: '800',

      letterSpacing: 0.5,

      color: '#1769E8',
    },

    guideImage: {
      width: '100%',

      height: 190,

      backgroundColor:
        '#F3F4F6',
    },

    guideImagePlaceholder: {
      width: '100%',

      height: 170,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F3F4F6',
    },

    guideContent: {
      padding: 15,
    },

    guideTitle: {
      fontSize: 20,

      fontWeight: '800',

      color: '#111827',

      letterSpacing: -0.3,
    },

    guideLocationRow: {
      marginTop: 7,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    guideLocation: {
      flex: 1,

      marginLeft: 5,

      fontSize: 12,

      color: '#6B7280',
    },

    guideCaption: {
      marginTop: 11,

      fontSize: 12,

      lineHeight: 18,

      color: '#4B5563',
    },

    guideMetaRow: {
      marginTop: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 14,
    },

    guideMetaItem: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 5,
    },

    guideMetaText: {
      fontSize: 11,

      fontWeight: '600',

      color: '#6B7280',
    },

    guideFooter: {
      marginTop: 15,

      paddingTop: 13,

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

    guideFooterText: {
      fontSize: 10,

      color: '#9CA3AF',
    },

    guideViewHint: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 5,
    },

    guideViewHintText: {
      fontSize: 11,

      fontWeight: '800',

      color: '#1769E8',
    },

    // TRAVELLER CARD

    travellerCard: {
      minHeight: 96,

      marginBottom: 12,

      padding: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 18,

      backgroundColor:
        '#FFFFFF',
    },

    travellerCardPressed: {
      opacity: 0.72,

      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    travellerAvatar: {
      width: 56,

      height: 56,

      borderRadius: 28,

      overflow:
        'hidden',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#DCEBFF',
    },

    travellerAvatarImage: {
      width: '100%',

      height: '100%',
    },

    travellerAvatarText: {
      fontSize: 17,

      fontWeight: '800',

      color: '#1769E8',
    },

    travellerContent: {
      flex: 1,

      marginLeft: 13,
    },

    travellerName: {
      fontSize: 15,

      fontWeight: '800',

      color: '#111827',
    },

    travellerUsername: {
      marginTop: 2,

      fontSize: 11,

      color: '#6B7280',
    },

    travellerMetaRow: {
      marginTop: 8,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    travellerGuideCount: {
      marginLeft: 5,

      fontSize: 11,

      fontWeight: '700',

      color: '#1769E8',
    },

    travellerDot: {
      marginHorizontal: 7,

      fontSize: 11,

      color: '#CBD5E1',
    },

    travellerDestination: {
      flex: 1,

      fontSize: 11,

      color: '#6B7280',
    },

    travellerAction: {
      width: 36,

      height: 36,

      marginLeft: 8,

      borderRadius: 12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F5F8FF',
    },

    socialLoading: {
      alignItems:
        'center',

      paddingTop: 65,
    },

    socialLoadingText: {
      marginTop: 8,

      fontSize: 12,

      color: '#6B7280',
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