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

        <Pressable
          style={[
            styles.floatingButton,
            {
              bottom: insets.bottom + 70,
            },
          ]}
          onPress={() => router.push('/create-trip')}
        >
          <Text style={styles.plus}>+</Text>
        </Pressable>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  floatingButton: {
    position: 'absolute',
    right: 22,

    width: 58,
    height: 58,
    borderRadius: 29,

    backgroundColor: '#1769E8',

    alignItems: 'center',
    justifyContent: 'center',

    elevation: 8,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,

    zIndex: 100,
  },

  plus: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 39,
  },
});