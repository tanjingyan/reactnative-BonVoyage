import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme =
    useColorScheme();

  const colors =
    Colors[
      scheme === 'dark'
        ? 'dark'
        : 'light'
    ];

  return (
    <NativeTabs
      backgroundColor={
        colors.background
      }

      indicatorColor={
        colors.backgroundElement
      }

      // Keep ALL tab names visible
      labelVisibilityMode="labeled"

      labelStyle={{
        selected: {
          color: colors.text,
        },
      }}
    >
      {/* ==================================================== */}
      {/* HOME                                                 */}
      {/* ==================================================== */}

      <NativeTabs.Trigger
        name="index"
      >
        <NativeTabs.Trigger.Label>
          Home
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require(
            '@/assets/images/tabIcons/home.png'
          )}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* ==================================================== */}
      {/* EXPLORE                                              */}
      {/* ==================================================== */}

      <NativeTabs.Trigger
        name="explore"
      >
        <NativeTabs.Trigger.Label>
          Explore
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require(
            '@/assets/images/explore.png'
          )}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* ==================================================== */}
      {/* TRIPS                                                */}
      {/* ==================================================== */}

      <NativeTabs.Trigger
        name="trips"
      >
        <NativeTabs.Trigger.Label>
          Trips
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require(
            '@/assets/images/my-trips.png'
          )}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* ==================================================== */}
      {/* PROFILE                                              */}
      {/* ==================================================== */}

      <NativeTabs.Trigger
        name="profile"
      >
        <NativeTabs.Trigger.Label>
          Profile
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require(
            '@/assets/images/user.png'
          )}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}