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

import AppTabs from '@/components/app-tabs';

export default function TabsLayout() {
  const colorScheme =
    useColorScheme();

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
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});