import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title">BonVoyage</ThemedText>
          <ThemedText style={styles.subtitle}>
            Plan smarter. Travel better.
          </ThemedText>
        </View>

        <View style={styles.content}>
          <ThemedText type="subtitle">
            Welcome to BonVoyage
          </ThemedText>

          <ThemedText>
            Your smart travel planning companion.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },

  header: {
    marginTop: 20,
    gap: 8,
  },

  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },

  content: {
    marginTop: 40,
    gap: 12,
  },
});