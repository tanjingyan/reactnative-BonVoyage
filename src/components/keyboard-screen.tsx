import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import {
  ReactNode,
} from 'react';

type Props = {
  children: ReactNode;
  contentContainerStyle?: ViewStyle;
};

export default function KeyboardScreen({
  children,
  contentContainerStyle,
}: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    content: {
      flexGrow: 1,
      paddingBottom: 160,
    },
  });