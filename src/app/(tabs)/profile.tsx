import { Ionicons } from '@expo/vector-icons';

import {
  useEffect,
  useState,
} from 'react';

import {
  router,
} from 'expo-router';

import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  signOut,
} from 'firebase/auth';

import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import {
  auth,
  db,
} from '@/firebase/firebaseConfig';

// ==========================================================
// TYPES
// ==========================================================

type ProfileTab =
  | 'guides'
  | 'posts'
  | 'saved';

type Guide = {
  id: string;
  userId: string;
  title: string;
  destination: string;
  caption: string;
  coverImage: string | null;
  durationDays: number;
  isPublished: boolean;
  likeCount: number;
  saveCount: number;
  createdAt?: {
    toMillis?: () => number;
  } | null;
};

// ==========================================================
// SCREEN
// ==========================================================

export default function ProfileScreen() {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ProfileTab>(
      'guides'
    );

  const [
    settingsVisible,
    setSettingsVisible,
  ] =
    useState(false);

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

  const user =
    auth.currentUser;

  const displayName =
    user?.displayName ||
    'BonVoyage User';

  const email =
    user?.email ||
    'No email available';

  const username =
    createUsername(
      displayName
    );

  const initials =
    getInitials(
      displayName
    );

  // ========================================================
  // LOAD USER GUIDES
  // ========================================================

  useEffect(() => {
    if (!user) {
      setGuides([]);
      setGuidesLoading(false);

      return;
    }

    setGuidesLoading(true);

    const guidesQuery =
      query(
        collection(
          db,
          'guides'
        ),
        where(
          'userId',
          '==',
          user.uid
        )
      );

    const unsubscribe =
      onSnapshot(
        guidesQuery,
        snapshot => {
          const loadedGuides =
            snapshot.docs
              .map(document => {
                const data =
                  document.data();

                return {
                  id:
                    document.id,

                  userId:
                    data.userId ??
                    '',

                  title:
                    data.title ??
                    'Untitled guide',

                  destination:
                    data.destination ??
                    '',

                  caption:
                    data.caption ??
                    '',

                  coverImage:
                    data.coverImage ??
                    null,

                  durationDays:
                    Number(
                      data.durationDays ??
                      1
                    ),

                  isPublished:
                    data.isPublished ===
                    true,

                  likeCount:
                    Number(
                      data.likeCount ??
                      0
                    ),

                  saveCount:
                    Number(
                      data.saveCount ??
                      0
                    ),

                  createdAt:
                    data.createdAt ??
                    null,
                } satisfies Guide;
              })
              .sort(
                (
                  a,
                  b
                ) =>
                  getGuideCreatedTime(
                    b
                  ) -
                  getGuideCreatedTime(
                    a
                  )
              );

          setGuides(
            loadedGuides
          );

          setGuidesLoading(
            false
          );
        },
        error => {
          console.log(
            'Load guides error:',
            error
          );

          setGuidesLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, [user?.uid]);

  // ========================================================
  // LOGOUT
  // ========================================================

  async function handleLogout() {
    try {
      setSettingsVisible(
        false
      );

      await signOut(
        auth
      );
    } catch (error) {
      console.log(
        'Logout error:',
        error
      );

      Alert.alert(
        'Logout Failed',
        'Unable to log out. Please try again.'
      );
    }
  }

  function confirmLogout() {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Log Out',
          style:
            'destructive',

          onPress:
            handleLogout,
        },
      ]
    );
  }

  // ========================================================
  // PLACEHOLDER ACTIONS
  // ========================================================

  function showComingSoon(
    feature: string
  ) {
    Alert.alert(
      feature,
      'This feature will be connected next.'
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
      <SafeAreaView
        style={
          styles.safeArea
        }
        edges={['top']}
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.scrollContent
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
            <View
              style={
                styles.headerSpacer
              }
            />

            <Text
              style={
                styles.title
              }
            >
              Profile
            </Text>

            <Pressable
              style={
                styles.settingsButton
              }
              onPress={() =>
                setSettingsVisible(
                  true
                )
              }
            >
              <Ionicons
                name="settings-outline"
                size={23}
                color="#111827"
              />
            </Pressable>
          </View>

          {/* ================================================= */}
          {/* PROFILE INFORMATION                               */}
          {/* ================================================= */}

          <View
            style={
              styles.profileSection
            }
          >
            <View
              style={
                styles.avatar
              }
            >
              <Text
                style={
                  styles.avatarText
                }
              >
                {initials}
              </Text>
            </View>

            <Text
              style={
                styles.name
              }
            >
              {displayName}
            </Text>

            <Text
              style={
                styles.username
              }
            >
              @{username}
            </Text>

            <Text
              style={
                styles.bio
              }
            >
              Exploring the world
              one trip at a time ✈️
            </Text>

            <View
              style={
                styles.locationRow
              }
            >
              <Ionicons
                name="location-outline"
                size={15}
                color="#6B7280"
              />

              <Text
                style={
                  styles.locationText
                }
              >
                Singapore
              </Text>
            </View>
          </View>

          {/* ================================================= */}
          {/* SOCIAL STATS                                     */}
          {/* ================================================= */}

          <View
            style={
              styles.statsContainer
            }
          >
            <StatItem
              value={
                guides.length.toString()
              }
              label="Guides"
            />

            <View
              style={
                styles.statDivider
              }
            />

            <StatItem
              value="0"
              label="Posts"
            />

            <View
              style={
                styles.statDivider
              }
            />

            <StatItem
              value="0"
              label="Saved"
            />
          </View>

          {/* ================================================= */}
          {/* EDIT PROFILE                                     */}
          {/* ================================================= */}

          <Pressable
            style={
              styles.editProfileButton
            }
            onPress={() =>
              showComingSoon(
                'Edit Profile'
              )
            }
          >
            <Ionicons
              name="create-outline"
              size={18}
              color="#111827"
            />

            <Text
              style={
                styles.editProfileText
              }
            >
              Edit profile
            </Text>
          </Pressable>

          {/* ================================================= */}
          {/* PROFILE TABS                                     */}
          {/* ================================================= */}

          <View
            style={
              styles.tabsContainer
            }
          >
            <ProfileTabButton
              title="Guides"
              icon="book-outline"
              active={
                activeTab ===
                'guides'
              }
              onPress={() =>
                setActiveTab(
                  'guides'
                )
              }
            />

            <ProfileTabButton
              title="Posts"
              icon="images-outline"
              active={
                activeTab ===
                'posts'
              }
              onPress={() =>
                setActiveTab(
                  'posts'
                )
              }
            />

            <ProfileTabButton
              title="Saved"
              icon="bookmark-outline"
              active={
                activeTab ===
                'saved'
              }
              onPress={() =>
                setActiveTab(
                  'saved'
                )
              }
            />
          </View>

          {/* ================================================= */}
          {/* GUIDES TAB                                       */}
          {/* ================================================= */}

          {activeTab ===
            'guides' && (
            <>
              {guidesLoading ? (
                <View
                  style={
                    styles.guidesLoading
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color="#1769E8"
                  />

                  <Text
                    style={
                      styles.guidesLoadingText
                    }
                  >
                    Loading guides...
                  </Text>
                </View>
              ) : guides.length ===
                0 ? (
                <EmptyProfileSection
                  icon="book-outline"
                  title="No guides yet"
                  description="Create itinerary-style travel guides and share recommendations with other BonVoyage travellers."
                  buttonText="Create a guide"
                  onPress={() =>
                    router.push(
                      '/create-guide'
                    )
                  }
                />
              ) : (
                <View
                  style={
                    styles.guidesSection
                  }
                >
                  <View
                    style={
                      styles.guidesHeader
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.guidesTitle
                        }
                      >
                        My guides
                      </Text>

                      <Text
                        style={
                          styles.guidesSubtitle
                        }
                      >
                        Your published travel recommendations
                      </Text>
                    </View>

                    <Pressable
                      style={
                        styles.newGuideButton
                      }
                      onPress={() =>
                        router.push(
                          '/create-guide'
                        )
                      }
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color="#1769E8"
                      />

                      <Text
                        style={
                          styles.newGuideText
                        }
                      >
                        New
                      </Text>
                    </Pressable>
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
                        onPress={() =>
                          showComingSoon(
                            'Guide Details'
                          )
                        }
                      />
                    )
                  )}
                </View>
              )}
            </>
          )}

          {/* ================================================= */}
          {/* POSTS TAB                                        */}
          {/* ================================================= */}

          {activeTab ===
            'posts' && (
            <EmptyProfileSection
              icon="images-outline"
              title="No posts yet"
              description="Share travel photos, experiences and recommendations from your adventures."
              buttonText="Create a post"
              onPress={() =>
                showComingSoon(
                  'Create Post'
                )
              }
            />
          )}

          {/* ================================================= */}
          {/* SAVED TAB                                        */}
          {/* ================================================= */}

          {activeTab ===
            'saved' && (
            <EmptyProfileSection
              icon="bookmark-outline"
              title="Nothing saved yet"
              description="Places and travel guides that you save will appear here."
            />
          )}

          <View
            style={
              styles.bottomSpace
            }
          />
        </ScrollView>

        {/* =================================================== */}
        {/* SETTINGS MODAL                                     */}
        {/* =================================================== */}

        <Modal
          visible={
            settingsVisible
          }
          transparent
          animationType="slide"
          onRequestClose={() =>
            setSettingsVisible(
              false
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <Pressable
              style={
                styles.modalBackdrop
              }
              onPress={() =>
                setSettingsVisible(
                  false
                )
              }
            />

            <View
              style={
                styles.settingsSheet
              }
            >
              {/* DRAG BAR */}

              <View
                style={
                  styles.dragBar
                }
              />

              {/* SETTINGS HEADER */}

              <View
                style={
                  styles.settingsHeader
                }
              >
                <Text
                  style={
                    styles.settingsTitle
                  }
                >
                  Settings
                </Text>

                <Pressable
                  style={
                    styles.closeButton
                  }
                  onPress={() =>
                    setSettingsVisible(
                      false
                    )
                  }
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color="#111827"
                  />
                </Pressable>
              </View>

              {/* ACCOUNT */}

              <View
                style={
                  styles.settingsProfile
                }
              >
                <View
                  style={
                    styles.smallAvatar
                  }
                >
                  <Text
                    style={
                      styles.smallAvatarText
                    }
                  >
                    {initials}
                  </Text>
                </View>

                <View
                  style={
                    styles.settingsUserInfo
                  }
                >
                  <Text
                    style={
                      styles.settingsName
                    }
                  >
                    {displayName}
                  </Text>

                  <Text
                    style={
                      styles.settingsEmail
                    }
                  >
                    {email}
                  </Text>
                </View>
              </View>

              {/* SETTINGS ITEMS */}

              <View
                style={
                  styles.menuContainer
                }
              >
                <SettingsItem
                  icon="person-outline"
                  title="Personal Information"
                  onPress={() =>
                    showComingSoon(
                      'Personal Information'
                    )
                  }
                />

                <SettingsItem
                  icon="heart-outline"
                  title="Travel Preferences"
                  onPress={() =>
                    showComingSoon(
                      'Travel Preferences'
                    )
                  }
                />

                <SettingsItem
                  icon="notifications-outline"
                  title="Notifications"
                  onPress={() =>
                    showComingSoon(
                      'Notifications'
                    )
                  }
                />

                <SettingsItem
                  icon="help-circle-outline"
                  title="Help & Support"
                  onPress={() =>
                    showComingSoon(
                      'Help & Support'
                    )
                  }
                  last
                />
              </View>

              {/* LOGOUT */}

              <Pressable
                style={
                  styles.logoutButton
                }
                onPress={
                  confirmLogout
                }
              >
                <Ionicons
                  name="log-out-outline"
                  size={19}
                  color="#DC2626"
                />

                <Text
                  style={
                    styles.logoutText
                  }
                >
                  Log Out
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// ==========================================================
// STAT ITEM
// ==========================================================

type StatItemProps = {
  value: string;
  label: string;
};

function StatItem({
  value,
  label,
}: StatItemProps) {
  return (
    <View
      style={
        styles.statItem
      }
    >
      <Text
        style={
          styles.statValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.statLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

// ==========================================================
// PROFILE TAB
// ==========================================================

type ProfileTabButtonProps = {
  title: string;

  icon:
    keyof typeof Ionicons.glyphMap;

  active: boolean;

  onPress: () => void;
};

function ProfileTabButton({
  title,
  icon,
  active,
  onPress,
}: ProfileTabButtonProps) {
  return (
    <Pressable
      style={
        styles.tabButton
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.tabContent
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
      </View>

      {active && (
        <View
          style={
            styles.activeTabLine
          }
        />
      )}
    </Pressable>
  );
}

// ==========================================================
// GUIDE CARD
// ==========================================================

type GuideCardProps = {
  guide: Guide;
  onPress: () => void;
};

function GuideCard({
  guide,
  onPress,
}: GuideCardProps) {
  return (
    <Pressable
      style={
        styles.guideCard
      }
      onPress={
        onPress
      }
    >
      {guide.coverImage ? (
        <ImageBackground
          source={{
            uri:
              guide.coverImage,
          }}
          style={
            styles.guideImage
          }
          imageStyle={
            styles.guideImageInner
          }
        >
          <View
            style={
              styles.guideImageOverlay
            }
          />

          <View
            style={
              styles.guideImageTop
            }
          >
            <View
              style={[
                styles.guideStatusBadge,

                !guide.isPublished &&
                  styles.guideDraftBadge,
              ]}
            >
              <Text
                style={
                  styles.guideStatusText
                }
              >
                {guide.isPublished
                  ? 'PUBLISHED'
                  : 'DRAFT'}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.guideImageBottom
            }
          >
            <Text
              style={
                styles.guideImageTitle
              }
              numberOfLines={2}
            >
              {guide.title}
            </Text>

            <View
              style={
                styles.guideDestinationRow
              }
            >
              <Ionicons
                name="location"
                size={13}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.guideImageDestination
                }
                numberOfLines={1}
              >
                {guide.destination}
              </Text>
            </View>
          </View>
        </ImageBackground>
      ) : (
        <View
          style={
            styles.guideImageFallback
          }
        >
          <Ionicons
            name="map-outline"
            size={34}
            color="#1769E8"
          />
        </View>
      )}

      <View
        style={
          styles.guideCardBody
        }
      >
        <Text
          style={
            styles.guideCaption
          }
          numberOfLines={2}
        >
          {guide.caption ||
            'Travel itinerary and recommendations.'}
        </Text>

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
              {guide.durationDays}{' '}
              {guide.durationDays ===
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
              size={15}
              color="#6B7280"
            />

            <Text
              style={
                styles.guideMetaText
              }
            >
              {guide.likeCount}
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
              {guide.saveCount}
            </Text>
          </View>

          <View
            style={
              styles.guideCardArrow
            }
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color="#9CA3AF"
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ==========================================================
// EMPTY PROFILE SECTION
// ==========================================================

type EmptyProfileSectionProps = {
  icon:
    keyof typeof Ionicons.glyphMap;

  title: string;

  description: string;

  buttonText?: string;

  onPress?: () => void;
};

function EmptyProfileSection({
  icon,
  title,
  description,
  buttonText,
  onPress,
}: EmptyProfileSectionProps) {
  return (
    <View
      style={
        styles.emptyContainer
      }
    >
      <View
        style={
          styles.emptyIcon
        }
      >
        <Ionicons
          name={icon}
          size={33}
          color="#1769E8"
        />
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.emptyDescription
        }
      >
        {description}
      </Text>

      {buttonText &&
      onPress ? (
        <Pressable
          style={
            styles.createButton
          }
          onPress={
            onPress
          }
        >
          <Ionicons
            name="add"
            size={19}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.createButtonText
            }
          >
            {buttonText}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ==========================================================
// SETTINGS ITEM
// ==========================================================

type SettingsItemProps = {
  icon:
    keyof typeof Ionicons.glyphMap;

  title: string;

  onPress: () => void;

  last?: boolean;
};

function SettingsItem({
  icon,
  title,
  onPress,
  last = false,
}: SettingsItemProps) {
  return (
    <Pressable
      style={[
        styles.menuItem,

        last &&
          styles.menuItemLast,
      ]}
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.menuLeft
        }
      >
        <View
          style={
            styles.menuIcon
          }
        >
          <Ionicons
            name={icon}
            size={19}
            color="#4B5563"
          />
        </View>

        <Text
          style={
            styles.menuText
          }
        >
          {title}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color="#9CA3AF"
      />
    </Pressable>
  );
}

// ==========================================================
// GUIDE CREATED TIME
// ==========================================================

function getGuideCreatedTime(
  guide: Guide
) {
  try {
    return (
      guide.createdAt
        ?.toMillis?.() ??
      0
    );
  } catch {
    return 0;
  }
}

// ==========================================================
// USERNAME
// ==========================================================

function createUsername(
  displayName: string
) {
  return displayName
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ''
    );
}

// ==========================================================
// INITIALS
// ==========================================================

function getInitials(
  displayName: string
) {
  const parts =
    displayName
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
// STYLES
// ==========================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor:
        '#FFFFFF',
    },

    safeArea: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal:
        22,

      paddingBottom:
        110,
    },

    // ------------------------------------------------------
    // HEADER
    // ------------------------------------------------------

    header: {
      minHeight: 64,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    headerSpacer: {
      width: 44,
    },

    title: {
      fontSize: 23,

      fontWeight: '800',

      color: '#111827',
    },

    settingsButton: {
      width: 44,

      height: 44,

      borderRadius: 22,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F3F4F6',
    },

    // ------------------------------------------------------
    // PROFILE
    // ------------------------------------------------------

    profileSection: {
      alignItems:
        'center',

      paddingTop: 16,
    },

    avatar: {
      width: 92,

      height: 92,

      borderRadius: 46,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#DCEBFF',

      borderWidth: 4,

      borderColor:
        '#FFFFFF',

      shadowColor:
        '#000',

      shadowOpacity:
        0.09,

      shadowRadius: 8,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 3,
    },

    avatarText: {
      fontSize: 27,

      fontWeight: '800',

      color: '#1769E8',
    },

    name: {
      marginTop: 14,

      fontSize: 22,

      fontWeight: '800',

      color: '#111827',
    },

    username: {
      marginTop: 3,

      fontSize: 13,

      color: '#6B7280',
    },

    bio: {
      marginTop: 13,

      maxWidth: 270,

      textAlign:
        'center',

      fontSize: 14,

      lineHeight: 20,

      color: '#374151',
    },

    locationRow: {
      marginTop: 8,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    locationText: {
      marginLeft: 4,

      fontSize: 12,

      color: '#6B7280',
    },

    // ------------------------------------------------------
    // STATS
    // ------------------------------------------------------

    statsContainer: {
      marginTop: 25,

      paddingVertical:
        17,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderTopWidth: 1,

      borderBottomWidth: 1,

      borderColor:
        '#E5E7EB',
    },

    statItem: {
      flex: 1,

      alignItems:
        'center',
    },

    statValue: {
      fontSize: 18,

      fontWeight: '800',

      color: '#111827',
    },

    statLabel: {
      marginTop: 3,

      fontSize: 12,

      color: '#6B7280',
    },

    statDivider: {
      width: 1,

      height: 30,

      backgroundColor:
        '#E5E7EB',
    },

    // ------------------------------------------------------
    // EDIT PROFILE
    // ------------------------------------------------------

    editProfileButton: {
      height: 47,

      marginTop: 18,

      flexDirection:
        'row',

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

    editProfileText: {
      marginLeft: 7,

      fontSize: 14,

      fontWeight: '700',

      color: '#111827',
    },

    // ------------------------------------------------------
    // TABS
    // ------------------------------------------------------

    tabsContainer: {
      marginTop: 27,

      flexDirection:
        'row',

      borderBottomWidth: 1,

      borderBottomColor:
        '#E5E7EB',
    },

    tabButton: {
      flex: 1,

      position:
        'relative',

      alignItems:
        'center',
    },

    tabContent: {
      height: 48,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    tabText: {
      marginLeft: 6,

      fontSize: 13,

      fontWeight: '600',

      color: '#6B7280',
    },

    activeTabText: {
      color: '#1769E8',
    },

    activeTabLine: {
      position:
        'absolute',

      left: 8,

      right: 8,

      bottom: -1,

      height: 2,

      borderRadius: 2,

      backgroundColor:
        '#1769E8',
    },

    // ------------------------------------------------------
    // GUIDES
    // ------------------------------------------------------

    guidesLoading: {
      paddingTop: 55,

      alignItems:
        'center',
    },

    guidesLoadingText: {
      marginTop: 10,

      fontSize: 12,

      color: '#6B7280',
    },

    guidesSection: {
      paddingTop: 22,
    },

    guidesHeader: {
      marginBottom: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    guidesTitle: {
      fontSize: 17,

      fontWeight: '800',

      color: '#111827',
    },

    guidesSubtitle: {
      marginTop: 3,

      fontSize: 11,

      color: '#6B7280',
    },

    newGuideButton: {
      height: 38,

      paddingHorizontal:
        12,

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

    newGuideText: {
      marginLeft: 4,

      fontSize: 12,

      fontWeight: '700',

      color: '#1769E8',
    },

    guideCard: {
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
        0.05,

      shadowRadius: 8,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 2,
    },

    guideImage: {
      height: 190,

      justifyContent:
        'space-between',
    },

    guideImageInner: {
      borderTopLeftRadius:
        18,

      borderTopRightRadius:
        18,
    },

    guideImageOverlay: {
      ...StyleSheet.absoluteFill,

      backgroundColor:
        'rgba(0,0,0,0.28)',
    },

    guideImageTop: {
      padding: 13,

      alignItems:
        'flex-end',
    },

    guideStatusBadge: {
      paddingHorizontal:
        9,

      paddingVertical: 5,

      borderRadius: 20,

      backgroundColor:
        'rgba(23,105,232,0.92)',
    },

    guideDraftBadge: {
      backgroundColor:
        'rgba(75,85,99,0.92)',
    },

    guideStatusText: {
      fontSize: 9,

      fontWeight: '800',

      letterSpacing:
        0.7,

      color: '#FFFFFF',
    },

    guideImageBottom: {
      padding: 15,
    },

    guideImageTitle: {
      fontSize: 21,

      fontWeight: '900',

      color: '#FFFFFF',
    },

    guideDestinationRow: {
      marginTop: 5,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    guideImageDestination: {
      flex: 1,

      marginLeft: 4,

      fontSize: 12,

      color: '#FFFFFF',
    },

    guideImageFallback: {
      height: 190,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#EEF4FF',
    },

    guideCardBody: {
      padding: 14,
    },

    guideCaption: {
      fontSize: 13,

      lineHeight: 19,

      color: '#374151',
    },

    guideMetaRow: {
      marginTop: 13,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    guideMetaItem: {
      marginRight: 15,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    guideMetaText: {
      marginLeft: 4,

      fontSize: 11,

      color: '#6B7280',
    },

    guideCardArrow: {
      marginLeft: 'auto',
    },

    // ------------------------------------------------------
    // EMPTY CONTENT
    // ------------------------------------------------------

    emptyContainer: {
      alignItems:
        'center',

      paddingTop: 55,

      paddingHorizontal:
        28,
    },

    emptyIcon: {
      width: 70,

      height: 70,

      borderRadius: 22,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#EEF4FF',
    },

    emptyTitle: {
      marginTop: 17,

      fontSize: 18,

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

    createButton: {
      marginTop: 18,

      paddingHorizontal:
        18,

      height: 44,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 13,

      backgroundColor:
        '#1769E8',
    },

    createButtonText: {
      marginLeft: 5,

      fontSize: 13,

      fontWeight: '700',

      color: '#FFFFFF',
    },

    bottomSpace: {
      height: 30,
    },

    // ------------------------------------------------------
    // SETTINGS MODAL
    // ------------------------------------------------------

    modalOverlay: {
      flex: 1,

      justifyContent:
        'flex-end',
    },

    modalBackdrop: {
      ...StyleSheet.absoluteFill,

      backgroundColor:
        'rgba(0,0,0,0.38)',
    },

    settingsSheet: {
      paddingHorizontal:
        22,

      paddingTop: 10,

      paddingBottom: 35,

      borderTopLeftRadius:
        28,

      borderTopRightRadius:
        28,

      backgroundColor:
        '#FFFFFF',
    },

    dragBar: {
      width: 42,

      height: 4,

      alignSelf:
        'center',

      borderRadius: 4,

      backgroundColor:
        '#D1D5DB',
    },

    settingsHeader: {
      marginTop: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    settingsTitle: {
      fontSize: 22,

      fontWeight: '800',

      color: '#111827',
    },

    closeButton: {
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

    // ------------------------------------------------------
    // SETTINGS PROFILE
    // ------------------------------------------------------

    settingsProfile: {
      marginTop: 20,

      padding: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius: 17,

      backgroundColor:
        '#F8FAFC',
    },

    smallAvatar: {
      width: 50,

      height: 50,

      borderRadius: 25,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#DCEBFF',
    },

    smallAvatarText: {
      fontSize: 16,

      fontWeight: '800',

      color: '#1769E8',
    },

    settingsUserInfo: {
      flex: 1,

      marginLeft: 12,
    },

    settingsName: {
      fontSize: 15,

      fontWeight: '700',

      color: '#111827',
    },

    settingsEmail: {
      marginTop: 3,

      fontSize: 12,

      color: '#6B7280',
    },

    // ------------------------------------------------------
    // SETTINGS ITEMS
    // ------------------------------------------------------

    menuContainer: {
      marginTop: 20,

      overflow:
        'hidden',

      borderWidth: 1,

      borderColor:
        '#E5E7EB',

      borderRadius: 17,
    },

    menuItem: {
      minHeight: 58,

      paddingHorizontal:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        1,

      borderBottomColor:
        '#E5E7EB',
    },

    menuItemLast: {
      borderBottomWidth:
        0,
    },

    menuLeft: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    menuIcon: {
      width: 36,

      height: 36,

      borderRadius: 11,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F3F4F6',
    },

    menuText: {
      marginLeft: 11,

      fontSize: 14,

      fontWeight: '600',

      color: '#111827',
    },

    // ------------------------------------------------------
    // LOGOUT
    // ------------------------------------------------------

    logoutButton: {
      height: 50,

      marginTop: 20,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        '#FCA5A5',

      borderRadius: 14,
    },

    logoutText: {
      marginLeft: 7,

      color: '#DC2626',

      fontSize: 14,

      fontWeight: '700',
    },
  });