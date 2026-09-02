import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppTabs from '@/components/app-tabs';

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <View style={styles.container}>
        <AppTabs />

      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  plus: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 39,
  },
});