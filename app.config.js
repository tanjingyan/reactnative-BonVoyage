const appJson = require('./app.json');

module.exports = {
  ...appJson.expo,

  extra: {
    ...(appJson.expo.extra || {}),

    eas: {
      ...(appJson.expo.extra?.eas || {}),

      projectId: '86cc2de4-605c-4878-bb3a-e7417ad51be1',
    },
  },

  plugins: [
    ...(appJson.expo.plugins || []),

    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey:
          process.env.GOOGLE_MAPS_API_KEY,
      },
    ],
  ],
};