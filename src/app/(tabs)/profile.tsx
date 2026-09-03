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
  Image,
  ImageBackground,
  Modal,
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

import * as ImagePicker from 'expo-image-picker';

import {
  getApp,
} from 'firebase/app';

import {
  signOut,
  updateProfile,
} from 'firebase/auth';

import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';

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

type SettingsPage =
  | 'main'
  | 'personal';

type UserProfile = {
  displayName: string;
  username: string;
  email: string;
  bio: string;
  location: string;
  photoURL: string | null;
};

const DEFAULT_BIO =
  'Exploring the world one trip at a time ✈️';

const DEFAULT_LOCATION =
  'Singapore';

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
    settingsPage,
    setSettingsPage,
  ] =
    useState<SettingsPage>(
      'main'
    );

  const [
    editName,
    setEditName,
  ] =
    useState('');

  const [
    editBio,
    setEditBio,
  ] =
    useState('');

  const [
    editLocation,
    setEditLocation,
  ] =
    useState('');

  const [
    savingProfile,
    setSavingProfile,
  ] =
    useState(false);

  const [
    profile,
    setProfile,
  ] =
    useState<UserProfile | null>(
      null
    );

  const [
    profileLoading,
    setProfileLoading,
  ] =
    useState(true);

  const [
    uploadingPhoto,
    setUploadingPhoto,
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

  /*
   * Use the exact BonVoyage Storage bucket explicitly.
   * This avoids storage/no-default-bucket if storageBucket
   * is missing from firebaseConfig.ts.
   */
  const storage =
    getStorage(
      getApp(),
      'gs://bonvoyage-d9131.firebasestorage.app'
    );

  /*
   * Firestore is the primary source for the social profile
   * because Firebase Authentication does not have a username.
   * Firebase Auth remains a fallback for older accounts.
   */
  const displayName =
    profile?.displayName ||
    user?.displayName ||
    'BonVoyage User';

  const email =
    profile?.email ||
    user?.email ||
    'No email available';

  const username =
    profile?.username ||
    createUsername(
      displayName
    );

  const bio =
    profile?.bio ??
    DEFAULT_BIO;

  const location =
    profile?.location ??
    DEFAULT_LOCATION;

  const photoURL =
    profile?.photoURL ||
    user?.photoURL ||
    null;

  const initials =
    getInitials(
      displayName
    );

  // ========================================================
  // LOAD USER PROFILE
  // ========================================================

  useEffect(() => {
    if (!user) {
      setProfile(
        null
      );

      setProfileLoading(
        false
      );

      return;
    }

    setProfileLoading(
      true
    );

    const userRef =
      doc(
        db,
        'users',
        user.uid
      );

    const unsubscribe =
      onSnapshot(
        userRef,

        snapshot => {
          if (
            snapshot.exists()
          ) {
            const data =
              snapshot.data();

            const loadedDisplayName =
              String(
                data.displayName ??
                user.displayName ??
                'BonVoyage User'
              );

            setProfile({
              displayName:
                loadedDisplayName,

              username:
                String(
                  data.username ??
                  createUsername(
                    loadedDisplayName
                  )
                ),

              email:
                String(
                  data.email ??
                  user.email ??
                  'No email available'
                ),

              bio:
                String(
                  data.bio ??
                  DEFAULT_BIO
                ),

              location:
                String(
                  data.location ??
                  DEFAULT_LOCATION
                ),

              photoURL:
                data.photoURL
                  ? String(
                      data.photoURL
                    )
                  : user.photoURL ??
                    null,
            });
          } else {
            setProfile({
              displayName:
                user.displayName ||
                'BonVoyage User',

              username:
                createUsername(
                  user.displayName ||
                  'BonVoyage User'
                ),

              email:
                user.email ||
                'No email available',

              bio:
                DEFAULT_BIO,

              location:
                DEFAULT_LOCATION,

              photoURL:
                user.photoURL ||
                null,
            });
          }

          setProfileLoading(
            false
          );
        },

        error => {
          console.log(
            'Load profile error:',
            error
          );

          setProfile({
            displayName:
              user.displayName ||
              'BonVoyage User',

            username:
              createUsername(
                user.displayName ||
                'BonVoyage User'
              ),

            email:
              user.email ||
              'No email available',

            bio:
              DEFAULT_BIO,

            location:
              DEFAULT_LOCATION,

            photoURL:
              user.photoURL ||
              null,
          });

          setProfileLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, [user?.uid]);

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
  // PROFILE PICTURE
  // ========================================================

  async function chooseProfilePicture() {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please log in again before changing your profile picture.'
      );

      return;
    }

    if (
      uploadingPhoto
    ) {
      return;
    }

    try {
      const permission =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (
        !permission.granted
      ) {
        Alert.alert(
          'Photo Permission Required',
          'BonVoyage needs access to your photo library so you can choose a profile picture.'
        );

        return;
      }

      const result =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes: [
              'images',
            ],

            allowsEditing:
              true,

            aspect: [
              1,
              1,
            ],

            quality:
              0.75,
          });

      if (
        result.canceled ||
        !result.assets?.[0]
      ) {
        return;
      }

      const selectedImage =
        result.assets[0];

      setUploadingPhoto(
        true
      );

      /*
       * IMPORTANT:
       *
       * Do not use uploadString(base64) here.
       *
       * Firebase Storage converts base64 into an ArrayBuffer
       * internally, and React Native/Hermes can throw:
       *
       * "Creating blobs from 'ArrayBuffer' and
       *  'ArrayBufferView' are not supported"
       *
       * Instead, read the local image URI as an existing Blob
       * and give that Blob directly to Firebase Storage.
       */
      const imageBlob =
        await getBlobFromUri(
          selectedImage.uri
        );

      const imageRef =
        ref(
          storage,
          `profilePictures/${user.uid}/avatar`
        );

      await uploadBytes(
        imageRef,
        imageBlob,
        {
          contentType:
            selectedImage.mimeType ||
            'image/jpeg',
        }
      );

      const downloadURL =
        await getDownloadURL(
          imageRef
        );

      /*
       * Keep Firebase Authentication and Firestore in sync.
       */
      await updateProfile(
        user,
        {
          photoURL:
            downloadURL,
        }
      );

      await setDoc(
        doc(
          db,
          'users',
          user.uid
        ),
        {
          photoURL:
            downloadURL,

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      Alert.alert(
        'Profile Picture Updated',
        'Your new profile picture has been saved.'
      );
    } catch (error: any) {
      console.log(
        'Profile picture upload error:',
        error
      );

      console.log(
        'Storage error code:',
        error?.code
      );

      console.log(
        'Storage error message:',
        error?.message
      );

      /*
       * Show the Firebase error code during development so
       * Storage setup problems are easy to diagnose.
       */
      const errorCode =
        error?.code
          ? String(
              error.code
            )
          : 'unknown';

      const errorMessage =
        error?.message
          ? String(
              error.message
            )
          : 'Unable to upload the selected image.';

      Alert.alert(
        'Upload Failed',
        `${errorCode}\n\n${errorMessage}`
      );
    } finally {
      setUploadingPhoto(
        false
      );
    }
  }

  // ========================================================
  // LOCAL IMAGE URI -> BLOB
  // ========================================================

  function getBlobFromUri(
    uri: string
  ): Promise<Blob> {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const xhr =
          new XMLHttpRequest();

        xhr.onload = () => {
          resolve(
            xhr.response
          );
        };

        xhr.onerror = () => {
          reject(
            new Error(
              'Unable to read the selected image.'
            )
          );
        };

        xhr.responseType =
          'blob';

        xhr.open(
          'GET',
          uri,
          true
        );

        xhr.send(
          null
        );
      }
    );
  }

  // ========================================================
  // SETTINGS
  // ========================================================

  function openSettings() {
    setSettingsPage(
      'main'
    );

    setSettingsVisible(
      true
    );
  }

  function closeSettings() {
    if (
      savingProfile
    ) {
      return;
    }

    setSettingsVisible(
      false
    );

    setSettingsPage(
      'main'
    );
  }

  function openPersonalInformation() {
    setEditName(
      displayName
    );

    setEditBio(
      bio
    );

    setEditLocation(
      location
    );

    setSettingsPage(
      'personal'
    );

    setSettingsVisible(
      true
    );
  }

  async function savePersonalInformation() {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please log in again before updating your profile.'
      );

      return;
    }

    const cleanedName =
      editName.trim();

    const cleanedBio =
      editBio.trim();

    const cleanedLocation =
      editLocation.trim();

    if (!cleanedName) {
      Alert.alert(
        'Name Required',
        'Please enter your name.'
      );

      return;
    }

    if (
      cleanedName.length >
      50
    ) {
      Alert.alert(
        'Name Too Long',
        'Please keep your name under 50 characters.'
      );

      return;
    }

    if (
      cleanedBio.length >
      120
    ) {
      Alert.alert(
        'Bio Too Long',
        'Please keep your bio under 120 characters.'
      );

      return;
    }

    if (
      cleanedLocation.length >
      50
    ) {
      Alert.alert(
        'Location Too Long',
        'Please keep your location under 50 characters.'
      );

      return;
    }

    try {
      setSavingProfile(
        true
      );

      await updateProfile(
        user,
        {
          displayName:
            cleanedName,
        }
      );

      await setDoc(
        doc(
          db,
          'users',
          user.uid
        ),
        {
          displayName:
            cleanedName,

          bio:
            cleanedBio,

          location:
            cleanedLocation,

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setSettingsPage(
        'main'
      );

      Alert.alert(
        'Profile Updated',
        'Your profile information has been saved.'
      );
    } catch (error) {
      console.log(
        'Save profile error:',
        error
      );

      Alert.alert(
        'Update Failed',
        'Unable to update your profile. Please try again.'
      );
    } finally {
      setSavingProfile(
        false
      );
    }
  }

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
              onPress={
                openSettings
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
            <Pressable
              style={
                styles.avatarButton
              }
              disabled={
                uploadingPhoto
              }
              onPress={() =>
                void chooseProfilePicture()
              }
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
            >
              <View
                style={
                  styles.avatar
                }
              >
                {photoURL ? (
                  <Image
                    source={{
                      uri:
                        photoURL,
                    }}
                    style={
                      styles.avatarImage
                    }
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={
                      styles.avatarText
                    }
                  >
                    {initials}
                  </Text>
                )}

                {uploadingPhoto ? (
                  <View
                    style={
                      styles.avatarLoadingOverlay
                    }
                  >
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  </View>
                ) : null}
              </View>

              <View
                style={
                  styles.cameraBadge
                }
              >
                <Ionicons
                  name="camera"
                  size={15}
                  color="#FFFFFF"
                />
              </View>
            </Pressable>

            <Text
              style={
                styles.name
              }
            >
              {profileLoading
                ? 'Loading...'
                : displayName}
            </Text>

            <Text
              style={
                styles.username
              }
            >
              {profileLoading
                ? '@...'
                : `@${username}`}
            </Text>

            {bio ? (
              <Text
                style={
                  styles.bio
                }
              >
                {bio}
              </Text>
            ) : null}

            {location ? (
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
                  {location}
                </Text>
              </View>
            ) : null}
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
            onPress={
              openPersonalInformation
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
          onRequestClose={
            closeSettings
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
              onPress={
                closeSettings
              }
            />

            <View
              style={[
                styles.settingsSheet,

                settingsPage ===
                  'personal' &&
                  styles.personalSettingsSheet,
              ]}
            >
              <View
                style={
                  styles.dragBar
                }
              />

              {settingsPage ===
              'main' ? (
                <>
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
                      onPress={
                        closeSettings
                      }
                    >
                      <Ionicons
                        name="close"
                        size={22}
                        color="#111827"
                      />
                    </Pressable>
                  </View>

                  <View
                    style={
                      styles.settingsProfile
                    }
                  >
                    <Pressable
                      style={
                        styles.smallAvatar
                      }
                      disabled={
                        uploadingPhoto
                      }
                      onPress={() =>
                        void chooseProfilePicture()
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Change profile picture"
                    >
                      {photoURL ? (
                        <Image
                          source={{
                            uri:
                              photoURL,
                          }}
                          style={
                            styles.smallAvatarImage
                          }
                          resizeMode="cover"
                        />
                      ) : (
                        <Text
                          style={
                            styles.smallAvatarText
                          }
                        >
                          {initials}
                        </Text>
                      )}
                    </Pressable>

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
                        {profileLoading
                          ? 'Loading...'
                          : displayName}
                      </Text>

                      <Text
                        style={
                          styles.settingsEmail
                        }
                      >
                        {profileLoading
                          ? 'Loading account...'
                          : email}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.menuContainer
                    }
                  >
                    <SettingsItem
                      icon="person-outline"
                      title="Personal Information"
                      onPress={
                        openPersonalInformation
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
                </>
              ) : (
                <>
                  <View
                    style={
                      styles.personalHeader
                    }
                  >
                    <Pressable
                      style={
                        styles.personalBackButton
                      }
                      disabled={
                        savingProfile
                      }
                      onPress={() =>
                        setSettingsPage(
                          'main'
                        )
                      }
                    >
                      <Ionicons
                        name="arrow-back"
                        size={21}
                        color="#111827"
                      />
                    </Pressable>

                    <View
                      style={
                        styles.personalHeaderText
                      }
                    >
                      <Text
                        style={
                          styles.personalTitle
                        }
                      >
                        Personal Information
                      </Text>

                      <Text
                        style={
                          styles.personalSubtitle
                        }
                      >
                        Update how your profile appears on BonVoyage
                      </Text>
                    </View>

                    <Pressable
                      style={
                        styles.closeButton
                      }
                      disabled={
                        savingProfile
                      }
                      onPress={
                        closeSettings
                      }
                    >
                      <Ionicons
                        name="close"
                        size={22}
                        color="#111827"
                      />
                    </Pressable>
                  </View>

                  <ScrollView
                    style={
                      styles.personalFormScroll
                    }
                    contentContainerStyle={
                      styles.personalFormContent
                    }
                    showsVerticalScrollIndicator={
                      false
                    }
                    keyboardShouldPersistTaps="handled"
                  >
                    <View
                      style={
                        styles.photoEditor
                      }
                    >
                      <Pressable
                        style={
                          styles.editAvatarButton
                        }
                        disabled={
                          uploadingPhoto
                        }
                        onPress={() =>
                          void chooseProfilePicture()
                        }
                      >
                        <View
                          style={
                            styles.editAvatar
                          }
                        >
                          {photoURL ? (
                            <Image
                              source={{
                                uri:
                                  photoURL,
                              }}
                              style={
                                styles.editAvatarImage
                              }
                              resizeMode="cover"
                            />
                          ) : (
                            <Text
                              style={
                                styles.editAvatarText
                              }
                            >
                              {initials}
                            </Text>
                          )}

                          {uploadingPhoto ? (
                            <View
                              style={
                                styles.editAvatarLoading
                              }
                            >
                              <ActivityIndicator
                                size="small"
                                color="#FFFFFF"
                              />
                            </View>
                          ) : null}
                        </View>

                        <View
                          style={
                            styles.editAvatarCamera
                          }
                        >
                          <Ionicons
                            name="camera"
                            size={14}
                            color="#FFFFFF"
                          />
                        </View>
                      </Pressable>

                      <View
                        style={
                          styles.photoEditorText
                        }
                      >
                        <Text
                          style={
                            styles.photoEditorTitle
                          }
                        >
                          Profile picture
                        </Text>

                        <Pressable
                          disabled={
                            uploadingPhoto
                          }
                          onPress={() =>
                            void chooseProfilePicture()
                          }
                        >
                          <Text
                            style={
                              styles.changePhotoText
                            }
                          >
                            {uploadingPhoto
                              ? 'Uploading...'
                              : 'Change photo'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.formLabel
                      }
                    >
                      Full name
                    </Text>

                    <TextInput
                      style={
                        styles.formInput
                      }
                      value={
                        editName
                      }
                      onChangeText={
                        setEditName
                      }
                      placeholder="Your name"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                      maxLength={50}
                    />

                    <Text
                      style={
                        styles.formLabel
                      }
                    >
                      Username
                    </Text>

                    <View
                      style={
                        styles.readOnlyField
                      }
                    >
                      <Ionicons
                        name="at"
                        size={17}
                        color="#6B7280"
                      />

                      <Text
                        style={
                          styles.readOnlyText
                        }
                      >
                        {username}
                      </Text>

                      <Ionicons
                        name="lock-closed-outline"
                        size={15}
                        color="#9CA3AF"
                      />
                    </View>

                    <Text
                      style={
                        styles.formHint
                      }
                    >
                      Usernames are unique and cannot be changed here.
                    </Text>

                    <View
                      style={
                        styles.formLabelRow
                      }
                    >
                      <Text
                        style={
                          styles.formLabelNoMargin
                        }
                      >
                        Bio
                      </Text>

                      <Text
                        style={
                          styles.characterCount
                        }
                      >
                        {editBio.length}/120
                      </Text>
                    </View>

                    <TextInput
                      style={[
                        styles.formInput,
                        styles.bioInput,
                      ]}
                      value={
                        editBio
                      }
                      onChangeText={
                        setEditBio
                      }
                      placeholder="Tell travellers a little about yourself..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                      maxLength={120}
                    />

                    <Text
                      style={
                        styles.formLabel
                      }
                    >
                      Location
                    </Text>

                    <View
                      style={
                        styles.formInputWithIcon
                      }
                    >
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color="#6B7280"
                      />

                      <TextInput
                        style={
                          styles.formInputInner
                        }
                        value={
                          editLocation
                        }
                        onChangeText={
                          setEditLocation
                        }
                        placeholder="e.g. Singapore"
                        placeholderTextColor="#9CA3AF"
                        maxLength={50}
                      />
                    </View>

                    <Text
                      style={
                        styles.formLabel
                      }
                    >
                      Email
                    </Text>

                    <View
                      style={
                        styles.readOnlyField
                      }
                    >
                      <Ionicons
                        name="mail-outline"
                        size={17}
                        color="#6B7280"
                      />

                      <Text
                        style={
                          styles.readOnlyText
                        }
                        numberOfLines={1}
                      >
                        {email}
                      </Text>

                      <Ionicons
                        name="lock-closed-outline"
                        size={15}
                        color="#9CA3AF"
                      />
                    </View>

                    <Text
                      style={
                        styles.formHint
                      }
                    >
                      Email changes are not available from this screen.
                    </Text>

                    <Pressable
                      style={[
                        styles.saveProfileButton,

                        savingProfile &&
                          styles.saveProfileButtonDisabled,
                      ]}
                      disabled={
                        savingProfile
                      }
                      onPress={() =>
                        void savePersonalInformation()
                      }
                    >
                      {savingProfile ? (
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                        />
                      ) : (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color="#FFFFFF"
                        />
                      )}

                      <Text
                        style={
                          styles.saveProfileText
                        }
                      >
                        {savingProfile
                          ? 'Saving...'
                          : 'Save changes'}
                      </Text>
                    </Pressable>
                  </ScrollView>
                </>
              )}
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

    avatarButton: {
      position:
        'relative',

      width: 100,

      height: 100,

      alignItems:
        'center',

      justifyContent:
        'center',
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

    avatarImage: {
      width: '100%',

      height: '100%',

      borderRadius: 46,
    },

    avatarLoadingOverlay: {
      position:
        'absolute',

      top: 0,
      left: 0,
      right: 0,
      bottom: 0,

      borderRadius: 46,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(0,0,0,0.35)',
    },

    cameraBadge: {
      position:
        'absolute',

      right: 0,

      bottom: 5,

      width: 31,

      height: 31,

      borderRadius: 16,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 3,

      borderColor:
        '#FFFFFF',

      backgroundColor:
        '#1769E8',

      shadowColor:
        '#000',

      shadowOpacity:
        0.12,

      shadowRadius: 4,

      shadowOffset: {
        width: 0,
        height: 2,
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

    personalSettingsSheet: {
      maxHeight: '88%',
    },

    personalHeader: {
      marginTop: 14,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    personalBackButton: {
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

    personalHeaderText: {
      flex: 1,

      marginHorizontal: 10,
    },

    personalTitle: {
      fontSize: 18,

      fontWeight: '800',

      color: '#111827',
    },

    personalSubtitle: {
      marginTop: 3,

      fontSize: 11,

      lineHeight: 16,

      color: '#6B7280',
    },

    personalFormScroll: {
      marginTop: 16,
    },

    personalFormContent: {
      paddingBottom: 6,
    },

    photoEditor: {
      paddingBottom: 18,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth: 1,

      borderBottomColor:
        '#F3F4F6',
    },

    editAvatarButton: {
      position:
        'relative',

      width: 72,

      height: 72,
    },

    editAvatar: {
      width: 72,

      height: 72,

      overflow:
        'hidden',

      borderRadius: 36,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#DCEBFF',
    },

    editAvatarImage: {
      width: '100%',

      height: '100%',
    },

    editAvatarText: {
      fontSize: 21,

      fontWeight: '800',

      color: '#1769E8',
    },

    editAvatarLoading: {
      position:
        'absolute',

      top: 0,
      left: 0,
      right: 0,
      bottom: 0,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(0,0,0,0.35)',
    },

    editAvatarCamera: {
      position:
        'absolute',

      right: -1,

      bottom: 1,

      width: 27,

      height: 27,

      borderRadius: 14,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 2,

      borderColor:
        '#FFFFFF',

      backgroundColor:
        '#1769E8',
    },

    photoEditorText: {
      marginLeft: 15,
    },

    photoEditorTitle: {
      fontSize: 14,

      fontWeight: '700',

      color: '#111827',
    },

    changePhotoText: {
      marginTop: 5,

      fontSize: 13,

      fontWeight: '700',

      color: '#1769E8',
    },

    formLabel: {
      marginTop: 13,

      marginBottom: 7,

      fontSize: 13,

      fontWeight: '700',

      color: '#374151',
    },

    formLabelRow: {
      marginTop: 13,

      marginBottom: 7,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    formLabelNoMargin: {
      fontSize: 13,

      fontWeight: '700',

      color: '#374151',
    },

    characterCount: {
      fontSize: 10,

      color: '#9CA3AF',
    },

    formInput: {
      minHeight: 50,

      paddingHorizontal: 14,

      borderWidth: 1,

      borderColor: '#D1D5DB',

      borderRadius: 13,

      fontSize: 14,

      color: '#111827',

      backgroundColor:
        '#FFFFFF',
    },

    bioInput: {
      minHeight: 96,

      paddingTop: 13,

      paddingBottom: 13,
    },

    formInputWithIcon: {
      minHeight: 50,

      paddingHorizontal: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor: '#D1D5DB',

      borderRadius: 13,

      backgroundColor:
        '#FFFFFF',
    },

    formInputInner: {
      flex: 1,

      marginLeft: 8,

      fontSize: 14,

      color: '#111827',
    },

    readOnlyField: {
      minHeight: 50,

      paddingHorizontal: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor: '#E5E7EB',

      borderRadius: 13,

      backgroundColor:
        '#F8FAFC',
    },

    readOnlyText: {
      flex: 1,

      marginHorizontal: 8,

      fontSize: 14,

      color: '#4B5563',
    },

    formHint: {
      marginTop: 6,

      fontSize: 10,

      lineHeight: 15,

      color: '#9CA3AF',
    },

    saveProfileButton: {
      height: 50,

      marginTop: 22,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 14,

      backgroundColor:
        '#1769E8',
    },

    saveProfileButtonDisabled: {
      opacity: 0.65,
    },

    saveProfileText: {
      marginLeft: 7,

      fontSize: 14,

      fontWeight: '800',

      color: '#FFFFFF',
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

      overflow:
        'hidden',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#DCEBFF',
    },

    smallAvatarImage: {
      width: '100%',

      height: '100%',
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