import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from 'expo-router';

import {
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppTabs from '@/components/app-tabs';

export default function TabsLayout() {
  const colorScheme =
    useColorScheme();

  const insets =
    useSafeAreaInsets();

  return (
    <ThemeProvider
      value={
        colorScheme === 'dark'
          ? DarkTheme
          : DefaultTheme
      }
    >
      <View style={styles.container}>
        <StatusBar
          hidden={false}
          style={
            colorScheme === 'dark'
              ? 'light'
              : 'dark'
          }
        />

        <AppTabs />

        {/* Divider above native bottom navigation */}
        <View
          pointerEvents="none"
          style={[
            styles.tabDivider,
            {
              bottom:
                insets.bottom + 80,
            },
          ]}
        />
      </View>
    </ThemeProvider>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },

    tabDivider: {
      position: 'absolute',

      left: 0,
      right: 0,

      height: 1,

      backgroundColor: '#d2d2d2',

      zIndex: 999,
      elevation: 999,
    },
  });