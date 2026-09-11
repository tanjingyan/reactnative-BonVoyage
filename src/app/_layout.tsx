import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import {
  AuthProvider,
  useAuth,
} from '@/hooks/use-Auth';

function RootNavigator() {
  const {
    user,
    loading,
  } = useAuth();

  // Wait until Firebase has checked whether
  // there is already a logged-in user.
  if (loading) {
    return null;
  }

  return (
    <>
      <StatusBar
        hidden={false}
        style="dark"
      />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor:
              '#FFFFFF',
          },
        }}
      >
        {/* ===================================================== */}
        {/* LOGGED OUT ROUTES                                    */}
        {/* ===================================================== */}

        <Stack.Protected
          guard={!user}
        >
          {/* Welcome page */}
          <Stack.Screen
            name="index"
          />

          {/* Login + Register */}
          <Stack.Screen
            name="(auth)"
          />
        </Stack.Protected>

        {/* ===================================================== */}
        {/* LOGGED IN ROUTES                                     */}
        {/* ===================================================== */}

        <Stack.Protected
          guard={!!user}
        >
          {/* Main application */}
          <Stack.Screen
            name="(tabs)"
          />

          {/* Create Trip */}
          <Stack.Screen
            name="create-trip"
          />

          {/* Trip Details */}
          <Stack.Screen
            name="trip/[id]"
          />

          {/* Add Activity */}
          <Stack.Screen
            name="trip/[id]/add-activity"
          />

          {/* Activity Details */}
          <Stack.Screen
            name="trip/[id]/activity/[activityId]"
          />

          {/* Trip Map */}
          <Stack.Screen
            name="trip/[id]/map"
          />

          {/* Create Guide */}
          <Stack.Screen
            name="create-guide"
          />

          {/* Guide Details */}
          <Stack.Screen
            name="guide/[id]"
          />

          {/* Public Traveller Profile */}
          <Stack.Screen
            name="user/[id]"
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}