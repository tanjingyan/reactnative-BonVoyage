import { Ionicons } from '@expo/vector-icons';

import {
  httpsCallable,
} from 'firebase/functions';

import {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
};

function SearchResults({
  places,
  onOpenGoogleMaps,
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
};

function PlaceCard({
  place,
  onOpenGoogleMaps,
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

          {/* We will connect this next */}

          <View
            style={
              styles.futureAddButton
            }
          >
            <Ionicons
              name="add"
              size={17}
              color="#9CA3AF"
            />

            <Text
              style={
                styles.futureAddText
              }
            >
              Add to trip
            </Text>
          </View>
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

    futureAddButton: {
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
        '#F3F4F6',
    },

    futureAddText: {
      fontSize: 12,

      fontWeight: '600',

      color: '#9CA3AF',
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