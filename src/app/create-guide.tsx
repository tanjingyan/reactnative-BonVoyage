import { Ionicons } from '@expo/vector-icons';

import {
  router,
} from 'expo-router';

import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';

import {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ImageBackground,
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
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  auth,
  db,
} from '@/firebase/firebaseConfig';

// ==========================================================
// TYPES
// ==========================================================

type DraftPlace = {
  id: string;

  name: string;

  location: string;

  time: string;

  notes: string;
};

type DraftDay = {
  dayNumber: number;

  places: DraftPlace[];
};

// ==========================================================
// CREATE EMPTY PLACE
// ==========================================================

function createEmptyPlace(): DraftPlace {
  return {
    id:
      `${Date.now()}-${Math.random()}`,

    name: '',

    location: '',

    time: '',

    notes: '',
  };
}

// ==========================================================
// SCREEN
// ==========================================================

export default function CreateGuideScreen() {
  const [
    title,
    setTitle,
  ] =
    useState('');

  const [
    destination,
    setDestination,
  ] =
    useState('');

  const [
    caption,
    setCaption,
  ] =
    useState('');

  const [
    tips,
    setTips,
  ] =
    useState('');

  const [
    days,
    setDays,
  ] =
    useState<DraftDay[]>([
      {
        dayNumber: 1,

        places: [
          createEmptyPlace(),
        ],
      },
    ]);

  const [
    publishing,
    setPublishing,
  ] =
    useState(false);

  // ========================================================
  // ADD DAY
  // ========================================================

  function addDay() {
    setDays(
      currentDays => [
        ...currentDays,

        {
          dayNumber:
            currentDays.length +
            1,

          places: [
            createEmptyPlace(),
          ],
        },
      ]
    );
  }

  // ========================================================
  // REMOVE DAY
  // ========================================================

  function removeDay(
    dayIndex: number
  ) {
    if (
      days.length ===
      1
    ) {
      Alert.alert(
        'At least one day required',
        'A travel guide must contain at least one itinerary day.'
      );

      return;
    }

    const updatedDays =
      days
        .filter(
          (
            _,
            index
          ) =>
            index !==
            dayIndex
        )
        .map(
          (
            day,
            index
          ) => ({
            ...day,

            dayNumber:
              index + 1,
          })
        );

    setDays(
      updatedDays
    );
  }

  // ========================================================
  // ADD PLACE
  // ========================================================

  function addPlace(
    dayIndex: number
  ) {
    setDays(
      currentDays =>
        currentDays.map(
          (
            day,
            index
          ) => {
            if (
              index !==
              dayIndex
            ) {
              return day;
            }

            return {
              ...day,

              places: [
                ...day.places,

                createEmptyPlace(),
              ],
            };
          }
        )
    );
  }

  // ========================================================
  // REMOVE PLACE
  // ========================================================

  function removePlace(
    dayIndex: number,
    placeIndex: number
  ) {
    const currentDay =
      days[
        dayIndex
      ];

    if (
      currentDay.places
        .length === 1
    ) {
      Alert.alert(
        'Place required',
        'Each itinerary day must contain at least one place.'
      );

      return;
    }

    setDays(
      currentDays =>
        currentDays.map(
          (
            day,
            index
          ) => {
            if (
              index !==
              dayIndex
            ) {
              return day;
            }

            return {
              ...day,

              places:
                day.places.filter(
                  (
                    _,
                    index
                  ) =>
                    index !==
                    placeIndex
                ),
            };
          }
        )
    );
  }

  // ========================================================
  // UPDATE PLACE
  // ========================================================

  function updatePlace(
    dayIndex: number,
    placeIndex: number,
    field:
      | 'name'
      | 'location'
      | 'time'
      | 'notes',
    value: string
  ) {
    setDays(
      currentDays =>
        currentDays.map(
          (
            day,
            index
          ) => {
            if (
              index !==
              dayIndex
            ) {
              return day;
            }

            return {
              ...day,

              places:
                day.places.map(
                  (
                    place,
                    index
                  ) => {
                    if (
                      index !==
                      placeIndex
                    ) {
                      return place;
                    }

                    return {
                      ...place,

                      [field]:
                        value,
                    };
                  }
                ),
            };
          }
        )
    );
  }

  // ========================================================
  // VALIDATE
  // ========================================================

  function validateGuide() {
    if (
      !title.trim()
    ) {
      Alert.alert(
        'Guide title required',
        'Enter a title for your travel guide.'
      );

      return false;
    }

    if (
      !destination.trim()
    ) {
      Alert.alert(
        'Destination required',
        'Enter the destination for this guide.'
      );

      return false;
    }

    if (
      !caption.trim()
    ) {
      Alert.alert(
        'Description required',
        'Write a short description about your guide.'
      );

      return false;
    }

    for (
      const day of days
    ) {
      for (
        const place of
        day.places
      ) {
        if (
          !place.name.trim()
        ) {
          Alert.alert(
            'Place name required',
            `Add a place name for Day ${day.dayNumber}.`
          );

          return false;
        }

        if (
          !place.location.trim()
        ) {
          Alert.alert(
            'Location required',
            `Add a location for ${place.name}.`
          );

          return false;
        }
      }
    }

    return true;
  }

  // ========================================================
  // PUBLISH GUIDE
  // ========================================================

  async function publishGuide() {
    if (
      !validateGuide()
    ) {
      return;
    }

    const user =
      auth.currentUser;

    if (!user) {
      Alert.alert(
        'Login required',
        'Please log in before publishing a guide.'
      );

      return;
    }

    try {
      setPublishing(
        true
      );

      const creatorName =
        user.displayName ||
        'BonVoyage User';

      const creatorUsername =
        creatorName
          .toLowerCase()
          .replace(
            /[^a-z0-9]/g,
            ''
          );

      // ----------------------------------------------------
      // GUIDE DOCUMENT
      // ----------------------------------------------------

      const guideRef =
        await addDoc(
          collection(
            db,
            'guides'
          ),
          {
            userId:
              user.uid,

            creatorName,

            creatorUsername,

            title:
              title.trim(),

            destination:
              destination.trim(),

            caption:
              caption.trim(),

            /*
              For now BonVoyage generates a visual cover
              from the destination.

              We can replace this later with real image
              upload through Firebase Storage.
            */

            coverImage:
              getGuideCoverImage(
                destination
              ),

            durationDays:
              days.length,

            tips:
              tips
                .split('\n')
                .map(
                  tip =>
                    tip.trim()
                )
                .filter(Boolean),

            isPublished:
              true,

            likeCount: 0,

            saveCount: 0,

            commentCount: 0,

            createdAt:
              serverTimestamp(),
          }
        );

      // ----------------------------------------------------
      // SAVE ITINERARY PLACES
      // ----------------------------------------------------

      const savePlacePromises:
        Promise<any>[] = [];

      days.forEach(
        day => {
          day.places.forEach(
            (
              place,
              placeIndex
            ) => {
              savePlacePromises.push(
                addDoc(
                  collection(
                    db,
                    'guides',
                    guideRef.id,
                    'places'
                  ),
                  {
                    dayNumber:
                      day.dayNumber,

                    order:
                      placeIndex,

                    name:
                      place.name.trim(),

                    location:
                      place.location.trim(),

                    time:
                      place.time.trim(),

                    notes:
                      place.notes.trim(),

                    googlePlaceId:
                      null,

                    latitude:
                      null,

                    longitude:
                      null,

                    photoUri:
                      null,

                    createdAt:
                      serverTimestamp(),
                  }
                )
              );
            }
          );
        }
      );

      await Promise.all(
        savePlacePromises
      );

      // ----------------------------------------------------
      // SUCCESS
      // ----------------------------------------------------

      Alert.alert(
        'Guide published',
        'Your travel guide has been published successfully.',
        [
          {
            text: 'Done',

            onPress: () =>
              router.back(),
          },
        ]
      );
    } catch (error) {
      console.error(
        'Publish guide error:',
        error
      );

      Alert.alert(
        'Unable to publish guide',
        'BonVoyage could not publish your guide. Please try again.'
      );
    } finally {
      setPublishing(
        false
      );
    }
  }

  // ========================================================
  // SCREEN
  // ========================================================

  return (
    <KeyboardAvoidingView
      style={
        styles.container
      }
      behavior={
        Platform.OS ===
        'ios'
          ? 'padding'
          : undefined
      }
    >
      <SafeAreaView
        style={
          styles.safeArea
        }
        edges={['top']}
      >
        {/* ================================================= */}
        {/* HEADER                                            */}
        {/* ================================================= */}

        <View
          style={
            styles.header
          }
        >
          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="chevron-back"
              size={25}
              color="#111827"
            />
          </Pressable>

          <Text
            style={
              styles.headerTitle
            }
          >
            Create Guide
          </Text>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.content
          }
        >
          {/* ================================================= */}
          {/* INSTAGRAM STYLE COVER                             */}
          {/* ================================================= */}

          <ImageBackground
            source={{
              uri:
                getGuideCoverImage(
                  destination
                ),
            }}
            style={
              styles.coverImage
            }
            imageStyle={
              styles.coverImageInner
            }
          >
            <View
              style={
                styles.coverOverlay
              }
            />

            <View
              style={
                styles.coverContent
              }
            >
              <View
                style={
                  styles.coverBadge
                }
              >
                <Ionicons
                  name="book-outline"
                  size={15}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.coverBadgeText
                  }
                >
                  TRAVEL GUIDE
                </Text>
              </View>

              <Text
                style={
                  styles.coverTitle
                }
                numberOfLines={2}
              >
                {title.trim() ||
                  'Your travel guide'}
              </Text>

              <Text
                style={
                  styles.coverDestination
                }
              >
                {destination.trim() ||
                  'Choose a destination'}
              </Text>
            </View>
          </ImageBackground>

          <Text
            style={
              styles.photoHint
            }
          >
            Cover photo upload can be added later.
          </Text>

          {/* ================================================= */}
          {/* SOCIAL / POST INFORMATION                         */}
          {/* ================================================= */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeadingRow
              }
            >
              <View
                style={
                  styles.sectionNumber
                }
              >
                <Text
                  style={
                    styles.sectionNumberText
                  }
                >
                  1
                </Text>
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Guide details
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Introduce your travel guide
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.label
              }
            >
              Guide title
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                title
              }
              onChangeText={
                setTitle
              }
              placeholder="e.g. Tokyo in 3 Days"
              placeholderTextColor="#9CA3AF"
            />

            <Text
              style={
                styles.label
              }
            >
              Destination
            </Text>

            <View
              style={
                styles.inputWithIcon
              }
            >
              <Ionicons
                name="location-outline"
                size={20}
                color="#6B7280"
              />

              <TextInput
                style={
                  styles.iconInput
                }
                value={
                  destination
                }
                onChangeText={
                  setDestination
                }
                placeholder="e.g. Tokyo, Japan"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text
              style={
                styles.label
              }
            >
              Caption
            </Text>

            <TextInput
              style={
                styles.largeInput
              }
              value={
                caption
              }
              onChangeText={
                setCaption
              }
              placeholder="Tell travellers what makes this itinerary special..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* ================================================= */}
          {/* ITINERARY                                        */}
          {/* ================================================= */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeadingRow
              }
            >
              <View
                style={
                  styles.sectionNumber
                }
              >
                <Text
                  style={
                    styles.sectionNumberText
                  }
                >
                  2
                </Text>
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Itinerary
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Build your recommended journey
                </Text>
              </View>
            </View>

            {days.map(
              (
                day,
                dayIndex
              ) => (
                <View
                  key={
                    day.dayNumber
                  }
                  style={
                    styles.dayCard
                  }
                >
                  {/* DAY HEADER */}

                  <View
                    style={
                      styles.dayHeader
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.dayLabel
                        }
                      >
                        DAY{' '}
                        {
                          day.dayNumber
                        }
                      </Text>

                      <Text
                        style={
                          styles.dayTitle
                        }
                      >
                        Day{' '}
                        {
                          day.dayNumber
                        }{' '}
                        itinerary
                      </Text>
                    </View>

                    {days.length >
                      1 && (
                      <Pressable
                        style={
                          styles.deleteDayButton
                        }
                        onPress={() =>
                          removeDay(
                            dayIndex
                          )
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#DC2626"
                        />
                      </Pressable>
                    )}
                  </View>

                  {/* PLACES */}

                  {day.places.map(
                    (
                      place,
                      placeIndex
                    ) => (
                      <View
                        key={
                          place.id
                        }
                        style={
                          styles.placeCard
                        }
                      >
                        <View
                          style={
                            styles.placeTimeline
                          }
                        >
                          <View
                            style={
                              styles.timelineDot
                            }
                          />

                          {placeIndex !==
                            day.places
                              .length -
                              1 && (
                            <View
                              style={
                                styles.timelineLine
                              }
                            />
                          )}
                        </View>

                        <View
                          style={
                            styles.placeForm
                          }
                        >
                          <View
                            style={
                              styles.placeHeader
                            }
                          >
                            <Text
                              style={
                                styles.placeNumber
                              }
                            >
                              Stop{' '}
                              {placeIndex +
                                1}
                            </Text>

                            {day.places
                              .length >
                              1 && (
                              <Pressable
                                onPress={() =>
                                  removePlace(
                                    dayIndex,
                                    placeIndex
                                  )
                                }
                              >
                                <Ionicons
                                  name="close-circle"
                                  size={22}
                                  color="#9CA3AF"
                                />
                              </Pressable>
                            )}
                          </View>

                          <TextInput
                            style={
                              styles.placeInput
                            }
                            value={
                              place.name
                            }
                            onChangeText={
                              value =>
                                updatePlace(
                                  dayIndex,
                                  placeIndex,
                                  'name',
                                  value
                                )
                            }
                            placeholder="Place name"
                            placeholderTextColor="#9CA3AF"
                          />

                          <View
                            style={
                              styles.placeInputRow
                            }
                          >
                            <Ionicons
                              name="location-outline"
                              size={17}
                              color="#6B7280"
                            />

                            <TextInput
                              style={
                                styles.placeRowInput
                              }
                              value={
                                place.location
                              }
                              onChangeText={
                                value =>
                                  updatePlace(
                                    dayIndex,
                                    placeIndex,
                                    'location',
                                    value
                                  )
                              }
                              placeholder="Location"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>

                          <View
                            style={
                              styles.placeInputRow
                            }
                          >
                            <Ionicons
                              name="time-outline"
                              size={17}
                              color="#6B7280"
                            />

                            <TextInput
                              style={
                                styles.placeRowInput
                              }
                              value={
                                place.time
                              }
                              onChangeText={
                                value =>
                                  updatePlace(
                                    dayIndex,
                                    placeIndex,
                                    'time',
                                    value
                                  )
                              }
                              placeholder="09:00"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>

                          <TextInput
                            style={
                              styles.placeNotesInput
                            }
                            value={
                              place.notes
                            }
                            onChangeText={
                              value =>
                                updatePlace(
                                  dayIndex,
                                  placeIndex,
                                  'notes',
                                  value
                                )
                            }
                            placeholder="Recommendation or tip for this place..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            textAlignVertical="top"
                          />
                        </View>
                      </View>
                    )
                  )}

                  <Pressable
                    style={
                      styles.addPlaceButton
                    }
                    onPress={() =>
                      addPlace(
                        dayIndex
                      )
                    }
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color="#1769E8"
                    />

                    <Text
                      style={
                        styles.addPlaceText
                      }
                    >
                      Add another place
                    </Text>
                  </Pressable>
                </View>
              )
            )}

            <Pressable
              style={
                styles.addDayButton
              }
              onPress={
                addDay
              }
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#1769E8"
              />

              <Text
                style={
                  styles.addDayText
                }
              >
                Add another day
              </Text>
            </Pressable>
          </View>

          {/* ================================================= */}
          {/* TRAVEL TIPS                                      */}
          {/* ================================================= */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeadingRow
              }
            >
              <View
                style={
                  styles.sectionNumber
                }
              >
                <Text
                  style={
                    styles.sectionNumberText
                  }
                >
                  3
                </Text>
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Travel tips
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Helpful advice for travellers
                </Text>
              </View>
            </View>

            <TextInput
              style={
                styles.tipsInput
              }
              value={
                tips
              }
              onChangeText={
                setTips
              }
              placeholder={
                'Enter one tip per line.\n\nExample:\nGet an IC transport card\nVisit Shibuya after sunset'
              }
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* ================================================= */}
          {/* PREVIEW INFORMATION                               */}
          {/* ================================================= */}

          <View
            style={
              styles.summaryCard
            }
          >
            <Ionicons
              name="sparkles-outline"
              size={24}
              color="#1769E8"
            />

            <View
              style={
                styles.summaryContent
              }
            >
              <Text
                style={
                  styles.summaryTitle
                }
              >
                Guide preview
              </Text>

              <Text
                style={
                  styles.summaryText
                }
              >
                {days.length}{' '}
                {days.length ===
                1
                  ? 'day'
                  : 'days'}
                {' • '}
                {
                  days.reduce(
                    (
                      total,
                      day
                    ) =>
                      total +
                      day.places
                        .length,
                    0
                  )
                }{' '}
                places
              </Text>
            </View>
          </View>

          {/* ================================================= */}
          {/* PUBLISH                                          */}
          {/* ================================================= */}

          <Pressable
            style={[
              styles.publishButton,

              publishing &&
                styles.publishButtonDisabled,
            ]}
            disabled={
              publishing
            }
            onPress={
              publishGuide
            }
          >
            {publishing ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <>
                <Ionicons
                  name="paper-plane-outline"
                  size={21}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.publishText
                  }
                >
                  Publish Guide
                </Text>
              </>
            )}
          </Pressable>

          <Text
            style={
              styles.publishHint
            }
          >
            Published guides will be visible to other BonVoyage travellers.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ==========================================================
// TEMPORARY GUIDE COVER
// ==========================================================

function getGuideCoverImage(
  destination: string
) {
  const value =
    destination
      .toLowerCase()
      .trim();

  if (
    value.includes(
      'tokyo'
    ) ||
    value.includes(
      'japan'
    )
  ) {
    return 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200';
  }

  if (
    value.includes(
      'paris'
    ) ||
    value.includes(
      'france'
    )
  ) {
    return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200';
  }

  if (
    value.includes(
      'singapore'
    )
  ) {
    return 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200';
  }

  if (
    value.includes(
      'bali'
    ) ||
    value.includes(
      'indonesia'
    )
  ) {
    return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200';
  }

  return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200';
}

// ==========================================================
// STYLES
// ==========================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor:
        '#F8F9FB',
    },

    safeArea: {
      flex: 1,
    },

    header: {
      height: 62,

      paddingHorizontal:
        18,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        '#FFFFFF',

      borderBottomWidth:
        1,

      borderBottomColor:
        '#EEEEEE',
    },

    headerButton: {
      width: 42,

      height: 42,

      borderRadius: 21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F3F4F6',
    },

    headerTitle: {
      fontSize: 18,

      fontWeight: '800',

      color: '#111827',
    },

    headerSpacer: {
      width: 42,
    },

    content: {
      padding: 18,

      paddingBottom:
        80,
    },

    // ------------------------------------------------------
    // COVER
    // ------------------------------------------------------

    coverImage: {
      height: 290,

      justifyContent:
        'flex-end',

      overflow:
        'hidden',

      borderRadius: 24,
    },

    coverImageInner: {
      borderRadius: 24,
    },

    coverOverlay: {
      ...StyleSheet.absoluteFill,

      backgroundColor:
        'rgba(0,0,0,0.30)',
    },

    coverContent: {
      padding: 22,
    },

    coverBadge: {
      alignSelf:
        'flex-start',

      paddingHorizontal:
        10,

      paddingVertical: 6,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius: 20,

      backgroundColor:
        'rgba(0,0,0,0.40)',
    },

    coverBadgeText: {
      marginLeft: 5,

      fontSize: 10,

      fontWeight: '800',

      color: '#FFFFFF',

      letterSpacing: 1,
    },

    coverTitle: {
      marginTop: 12,

      fontSize: 29,

      fontWeight: '900',

      lineHeight: 33,

      color: '#FFFFFF',
    },

    coverDestination: {
      marginTop: 6,

      fontSize: 14,

      color: '#FFFFFF',
    },

    photoHint: {
      marginTop: 7,

      textAlign:
        'center',

      fontSize: 10,

      color: '#9CA3AF',
    },

    // ------------------------------------------------------
    // SECTION
    // ------------------------------------------------------

    section: {
      marginTop: 24,

      padding: 18,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 20,

      backgroundColor:
        '#FFFFFF',
    },

    sectionHeadingRow: {
      marginBottom: 20,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    sectionNumber: {
      width: 38,

      height: 38,

      marginRight: 11,

      borderRadius: 12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#EEF4FF',
    },

    sectionNumberText: {
      fontSize: 15,

      fontWeight: '800',

      color: '#1769E8',
    },

    sectionTitle: {
      fontSize: 18,

      fontWeight: '800',

      color: '#111827',
    },

    sectionSubtitle: {
      marginTop: 2,

      fontSize: 11,

      color: '#6B7280',
    },

    label: {
      marginTop: 14,

      marginBottom: 7,

      fontSize: 12,

      fontWeight: '700',

      color: '#374151',
    },

    input: {
      minHeight: 51,

      paddingHorizontal:
        14,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 13,

      fontSize: 14,

      color: '#111827',

      backgroundColor:
        '#F9FAFB',
    },

    inputWithIcon: {
      minHeight: 51,

      paddingHorizontal:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 13,

      backgroundColor:
        '#F9FAFB',
    },

    iconInput: {
      flex: 1,

      marginLeft: 8,

      fontSize: 14,

      color: '#111827',
    },

    largeInput: {
      minHeight: 120,

      padding: 14,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 13,

      fontSize: 14,

      lineHeight: 20,

      color: '#111827',

      backgroundColor:
        '#F9FAFB',
    },

    // ------------------------------------------------------
    // DAYS
    // ------------------------------------------------------

    dayCard: {
      marginTop: 15,

      padding: 15,

      borderRadius: 17,

      backgroundColor:
        '#F8FAFC',
    },

    dayHeader: {
      marginBottom: 14,

      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',
    },

    dayLabel: {
      fontSize: 10,

      fontWeight: '800',

      letterSpacing: 1,

      color: '#1769E8',
    },

    dayTitle: {
      marginTop: 3,

      fontSize: 16,

      fontWeight: '800',

      color: '#111827',
    },

    deleteDayButton: {
      width: 35,

      height: 35,

      borderRadius: 11,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FEE2E2',
    },

    // ------------------------------------------------------
    // PLACES
    // ------------------------------------------------------

    placeCard: {
      flexDirection:
        'row',

      marginBottom: 10,
    },

    placeTimeline: {
      width: 22,

      alignItems:
        'center',
    },

    timelineDot: {
      width: 11,

      height: 11,

      marginTop: 18,

      borderRadius: 6,

      backgroundColor:
        '#1769E8',
    },

    timelineLine: {
      flex: 1,

      width: 2,

      marginTop: 4,

      marginBottom: -12,

      backgroundColor:
        '#C7D7F7',
    },

    placeForm: {
      flex: 1,

      marginLeft: 7,

      padding: 13,

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 15,

      backgroundColor:
        '#FFFFFF',
    },

    placeHeader: {
      marginBottom: 8,

      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',
    },

    placeNumber: {
      fontSize: 11,

      fontWeight: '800',

      color: '#6B7280',
    },

    placeInput: {
      minHeight: 42,

      paddingHorizontal:
        11,

      borderRadius: 10,

      fontSize: 13,

      color: '#111827',

      backgroundColor:
        '#F3F4F6',
    },

    placeInputRow: {
      minHeight: 42,

      marginTop: 8,

      paddingHorizontal:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius: 10,

      backgroundColor:
        '#F3F4F6',
    },

    placeRowInput: {
      flex: 1,

      marginLeft: 6,

      fontSize: 13,

      color: '#111827',
    },

    placeNotesInput: {
      minHeight: 72,

      marginTop: 8,

      padding: 11,

      borderRadius: 10,

      fontSize: 12,

      lineHeight: 17,

      color: '#111827',

      backgroundColor:
        '#F3F4F6',
    },

    addPlaceButton: {
      minHeight: 43,

      marginTop: 6,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        '#BFDBFE',

      borderRadius: 12,

      backgroundColor:
        '#EFF6FF',
    },

    addPlaceText: {
      marginLeft: 6,

      fontSize: 12,

      fontWeight: '700',

      color: '#1769E8',
    },

    addDayButton: {
      height: 50,

      marginTop: 18,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        '#1769E8',

      borderStyle:
        'dashed',

      borderRadius: 14,
    },

    addDayText: {
      marginLeft: 7,

      fontSize: 13,

      fontWeight: '700',

      color: '#1769E8',
    },

    // ------------------------------------------------------
    // TIPS
    // ------------------------------------------------------

    tipsInput: {
      minHeight: 150,

      padding: 14,

      borderRadius: 13,

      fontSize: 13,

      lineHeight: 20,

      color: '#111827',

      backgroundColor:
        '#F9FAFB',
    },

    // ------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------

    summaryCard: {
      marginTop: 20,

      padding: 16,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius: 17,

      backgroundColor:
        '#EEF4FF',
    },

    summaryContent: {
      marginLeft: 11,
    },

    summaryTitle: {
      fontSize: 14,

      fontWeight: '800',

      color: '#111827',
    },

    summaryText: {
      marginTop: 2,

      fontSize: 12,

      color: '#6B7280',
    },

    // ------------------------------------------------------
    // PUBLISH
    // ------------------------------------------------------

    publishButton: {
      height: 56,

      marginTop: 22,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 16,

      backgroundColor:
        '#1769E8',

      elevation: 4,

      shadowColor:
        '#1769E8',

      shadowOpacity: 0.2,

      shadowRadius: 8,

      shadowOffset: {
        width: 0,
        height: 4,
      },
    },

    publishButtonDisabled: {
      opacity: 0.6,
    },

    publishText: {
      marginLeft: 8,

      fontSize: 15,

      fontWeight: '800',

      color: '#FFFFFF',
    },

    publishHint: {
      marginTop: 9,

      textAlign:
        'center',

      fontSize: 10,

      color: '#9CA3AF',
    },
  });