import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor="#FFFFFF"

      indicatorColor="#EEF4FF"

      iconColor={{
        default: '#4B5563',
        selected: '#1769E8',
      }}

      labelVisibilityMode="labeled"

      labelStyle={{
        default: {
          color: '#4B5563',
        },

        selected: {
          color: '#1769E8',
          fontWeight: '600',
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