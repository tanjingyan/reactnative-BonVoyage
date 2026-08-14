import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut } from 'firebase/auth';

import { auth } from '@/firebase/firebaseConfig';

export default function ProfileScreen() {
  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.log('Logout error:', error);

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
          style: 'destructive',
          onPress: handleLogout,
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>BV</Text>
          </View>

          <View>
            <Text style={styles.name}>
              {auth.currentUser?.displayName || 'BonVoyage User'}
            </Text>

            <Text style={styles.email}>
              {auth.currentUser?.email || 'No email available'}
            </Text>
          </View>
        </View>

        <View style={styles.menuContainer}>
          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>Personal Information</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>Saved Places</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>Travel Preferences</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>Notifications</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>Help & Support</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={confirmLogout}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 30,
  },

  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 30,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#DCEBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1769E8',
  },

  name: {
    fontSize: 20,
    fontWeight: '700',
  },

  email: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },

  menuContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    overflow: 'hidden',
  },

  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  menuText: {
    fontSize: 16,
  },

  arrow: {
    fontSize: 24,
    color: '#9CA3AF',
  },

  logoutButton: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },

  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});