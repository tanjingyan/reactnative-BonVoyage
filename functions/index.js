const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

const {
  defineSecret,
} = require("firebase-functions/params");

// ==========================================================
// GOOGLE PLACES API KEY
// ==========================================================
//
// The actual API key is stored securely in
// Google Cloud Secret Manager.
//
// We NEVER put the real API key inside this file.
//

const GOOGLE_PLACES_API_KEY = defineSecret(
  "GOOGLE_PLACES_API_KEY"
);

// ==========================================================
// SEARCH PLACE
// ==========================================================
//
// React Native app sends:
//
// {
//   query: "Shibuya Crossing, Tokyo",
//   latitude: 35.6595,
//   longitude: 139.7005
// }
//
// This Cloud Function:
// 1. Checks user is logged in
// 2. Searches Google Places API (New)
// 3. Gets real place information
// 4. Gets a real Google place photo
// 5. Sends safe place data back to BonVoyage
//

exports.searchPlace = onCall(
  {
    // Singapore region
    region: "asia-southeast1",

    // Give this function permission to access the secret.
    secrets: [GOOGLE_PLACES_API_KEY],
  },

  async (request) => {
    // ======================================================
    // 1. REQUIRE FIREBASE LOGIN
    // ======================================================

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to search for places."
      );
    }

    // ======================================================
    // 2. GET DATA FROM REACT NATIVE
    // ======================================================

    const {
      query,
      latitude,
      longitude,
    } = request.data || {};

    // Check search query.
    if (
      !query ||
      typeof query !== "string" ||
      query.trim().length === 0
    ) {
      throw new HttpsError(
        "invalid-argument",
        "A place search query is required."
      );
    }

    // ======================================================
    // 3. GET SECRET API KEY
    // ======================================================

    const apiKey =
      GOOGLE_PLACES_API_KEY.value();

    if (!apiKey) {
      console.error(
        "GOOGLE_PLACES_API_KEY secret is missing."
      );

      throw new HttpsError(
        "internal",
        "Google Places API key is unavailable."
      );
    }

    try {
      // ====================================================
      // 4. CREATE GOOGLE PLACES SEARCH REQUEST
      // ====================================================

      const requestBody = {
        textQuery: query.trim(),

        // We only need the most relevant result.
        pageSize: 1,
      };

      // ----------------------------------------------------
      // LOCATION BIAS
      // ----------------------------------------------------
      //
      // Example:
      //
      // Activity:
      // "Shibuya Crossing"
      //
      // Coordinates:
      // somewhere around Shibuya
      //
      // This helps Google return the actual Shibuya Crossing
      // rather than another similarly named location.
      //

      if (
        typeof latitude === "number" &&
        typeof longitude === "number"
      ) {
        requestBody.locationBias = {
          circle: {
            center: {
              latitude,
              longitude,
            },

            // Search mainly around 5 km from our marker.
            radius: 5000,
          },
        };
      }

      // ====================================================
      // 5. CALL GOOGLE PLACES TEXT SEARCH (NEW)
      // ====================================================

      const placesResponse = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            "X-Goog-Api-Key": apiKey,

            /*
              Only request fields BonVoyage needs.

              This is important because Google Places
              uses field masks for both performance
              and billing.
            */

            "X-Goog-FieldMask": [
              "places.id",

              "places.displayName",

              "places.formattedAddress",

              "places.location",

              "places.rating",

              "places.userRatingCount",

              "places.primaryTypeDisplayName",

              "places.currentOpeningHours",

              "places.googleMapsUri",

              "places.photos",
            ].join(","),
          },

          body: JSON.stringify(
            requestBody
          ),
        }
      );

      // ====================================================
      // 6. GOOGLE PLACES ERROR
      // ====================================================

      if (!placesResponse.ok) {
        const errorText =
          await placesResponse.text();

        console.error(
          "Google Places API error:",
          placesResponse.status,
          errorText
        );

        throw new HttpsError(
          "internal",
          "Google Places could not complete the search."
        );
      }

      // ====================================================
      // 7. READ RESULT
      // ====================================================

      const placesData =
        await placesResponse.json();

      const place =
        placesData?.places?.[0];

      // No matching place found.
      if (!place) {
        console.log(
          "No Google Place found for:",
          query
        );

        return {
          found: false,
        };
      }

      // ====================================================
      // 8. GET PLACE PHOTO
      // ====================================================

      let photoUri = null;

      let photoAttributions = [];

      let photoFlagContentUri = null;

      const firstPhoto =
        place.photos?.[0];

      if (firstPhoto) {
        /*
          Google may provide author attribution
          information for user-contributed photos.

          We return this to the app so it can be
          displayed beneath the photo.
        */

        photoAttributions =
          firstPhoto.authorAttributions || [];

        photoFlagContentUri =
          firstPhoto.flagContentUri || null;
      }

      if (firstPhoto?.name) {
        try {
          /*
            Example photo resource:

            places/ChIJ.../photos/ATKog...

            We ask Google to return JSON instead of
            immediately redirecting to the image.

            JSON will contain:

            {
              "name": "...",
              "photoUri": "https://..."
            }
          */

          const photoEndpoint =
            "https://places.googleapis.com/v1/" +
            `${firstPhoto.name}/media` +
            "?maxWidthPx=900" +
            "&skipHttpRedirect=true";

          const photoResponse =
            await fetch(
              photoEndpoint,
              {
                method: "GET",

                headers: {
                  "X-Goog-Api-Key":
                    apiKey,
                },
              }
            );

          if (
            photoResponse.ok
          ) {
            const photoData =
              await photoResponse.json();

            photoUri =
              photoData?.photoUri ||
              null;
          } else {
            const photoError =
              await photoResponse.text();

            console.error(
              "Google Place Photo error:",
              photoResponse.status,
              photoError
            );
          }
        } catch (photoError) {
          /*
            Photo failure should NOT break
            the entire place card.

            We can still show:

            name
            address
            rating
            etc.
          */

          console.error(
            "Place photo request failed:",
            photoError
          );
        }
      }

      // ====================================================
      // 9. CLEAN DATA BEFORE RETURNING TO APP
      // ====================================================

      const result = {
        found: true,

        place: {
          // -----------------------------------------------
          // GOOGLE PLACE ID
          // -----------------------------------------------

          id:
            place.id ||
            null,

          // -----------------------------------------------
          // NAME
          // -----------------------------------------------

          displayName:
            place.displayName?.text ||
            query,

          // -----------------------------------------------
          // ADDRESS
          // -----------------------------------------------

          formattedAddress:
            place.formattedAddress ||
            null,

          // -----------------------------------------------
          // EXACT GOOGLE COORDINATES
          // -----------------------------------------------

          latitude:
            place.location?.latitude ??
            latitude ??
            null,

          longitude:
            place.location?.longitude ??
            longitude ??
            null,

          // -----------------------------------------------
          // GOOGLE RATING
          // -----------------------------------------------

          rating:
            typeof place.rating ===
            "number"
              ? place.rating
              : null,

          // -----------------------------------------------
          // NUMBER OF GOOGLE RATINGS
          // -----------------------------------------------

          userRatingCount:
            typeof place.userRatingCount ===
            "number"
              ? place.userRatingCount
              : null,

          // -----------------------------------------------
          // PLACE CATEGORY
          //
          // Example:
          // Tourist attraction
          // Restaurant
          // Museum
          // Park
          // -----------------------------------------------

          primaryType:
            place
              .primaryTypeDisplayName
              ?.text ||
            null,

          // -----------------------------------------------
          // OPEN / CLOSED
          // -----------------------------------------------

          openNow:
            typeof place
              .currentOpeningHours
              ?.openNow ===
            "boolean"
              ? place
                  .currentOpeningHours
                  .openNow
              : null,

          // -----------------------------------------------
          // GOOGLE MAPS PAGE
          // -----------------------------------------------

          googleMapsUri:
            place.googleMapsUri ||
            null,

          // -----------------------------------------------
          // PHOTO
          // -----------------------------------------------

          photoUri,

          // -----------------------------------------------
          // PHOTO ATTRIBUTION
          // -----------------------------------------------

          photoAttributions,

          // -----------------------------------------------
          // PHOTO REPORT LINK
          // -----------------------------------------------

          photoFlagContentUri,
        },
      };

      // ====================================================
      // 10. DEBUG LOG
      // ====================================================

      console.log(
        "Google Place found:",
        result.place.displayName
      );

      // ====================================================
      // 11. SEND RESULT TO BONVOYAGE
      // ====================================================

      return result;
    } catch (error) {
      // ====================================================
      // ERROR HANDLING
      // ====================================================

      console.error(
        "searchPlace function error:",
        error
      );

      /*
        If we deliberately threw a Firebase
        HttpsError above, preserve it.
      */

      if (
        error instanceof HttpsError
      ) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Unable to retrieve place information."
      );
    }
  }
);

// ==========================================================
// SEARCH NEAREST PLACE FROM MAP TAP
// ==========================================================

exports.searchNearbyPlace = onCall(
  {
    region: "asia-southeast1",

    secrets: [
      GOOGLE_PLACES_API_KEY,
    ],
  },

  async (request) => {
    // ------------------------------------------------------
    // REQUIRE LOGIN
    // ------------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to search for places."
      );
    }

    const {
      latitude,
      longitude,
    } = request.data || {};

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Latitude and longitude are required."
      );
    }

    const apiKey =
      GOOGLE_PLACES_API_KEY.value();

    try {
      // ----------------------------------------------------
      // SEARCH FOR THE CLOSEST GOOGLE PLACE
      // ----------------------------------------------------

      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            "X-Goog-Api-Key":
              apiKey,

            "X-Goog-FieldMask": [
              "places.id",
              "places.displayName",
              "places.formattedAddress",
              "places.location",
              "places.rating",
              "places.userRatingCount",
              "places.primaryTypeDisplayName",
              "places.currentOpeningHours",
              "places.googleMapsUri",
              "places.photos",
            ].join(","),
          },

          body: JSON.stringify({
            // Return only the closest result.
            maxResultCount: 1,

            // Important:
            // nearest place first.
            rankPreference:
              "DISTANCE",

            locationRestriction: {
              circle: {
                center: {
                  latitude,
                  longitude,
                },

                /*
                  Search within 120 metres of the tap.

                  If there is nothing there, the React Native
                  app will fall back to reverse geocoding.
                */
                radius: 120,
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "Nearby Search error:",
          response.status,
          errorText
        );

        throw new HttpsError(
          "internal",
          "Nearby place search failed."
        );
      }

      const data =
        await response.json();

      const place =
        data?.places?.[0];

      // ----------------------------------------------------
      // NOTHING REGISTERED NEAR THE TAP
      // ----------------------------------------------------

      if (!place) {
        return {
          found: false,
        };
      }

      // ----------------------------------------------------
      // GET PHOTO
      // ----------------------------------------------------

      let photoUri = null;

      let photoAttributions = [];

      let photoFlagContentUri = null;

      const firstPhoto =
        place.photos?.[0];

      if (firstPhoto) {
        photoAttributions =
          firstPhoto.authorAttributions || [];

        photoFlagContentUri =
          firstPhoto.flagContentUri || null;
      }

      if (firstPhoto?.name) {
        try {
          const photoResponse =
            await fetch(
              "https://places.googleapis.com/v1/" +
                `${firstPhoto.name}/media` +
                "?maxWidthPx=900" +
                "&skipHttpRedirect=true",
              {
                headers: {
                  "X-Goog-Api-Key":
                    apiKey,
                },
              }
            );

          if (photoResponse.ok) {
            const photoData =
              await photoResponse.json();

            photoUri =
              photoData?.photoUri ||
              null;
          } else {
            console.error(
              "Nearby photo error:",
              await photoResponse.text()
            );
          }
        } catch (photoError) {
          console.error(
            "Nearby photo request failed:",
            photoError
          );
        }
      }

      // ----------------------------------------------------
      // RETURN PLACE
      // ----------------------------------------------------

      return {
        found: true,

        place: {
          id:
            place.id ||
            null,

          displayName:
            place.displayName?.text ||
            "Selected place",

          formattedAddress:
            place.formattedAddress ||
            null,

          latitude:
            place.location?.latitude ??
            latitude,

          longitude:
            place.location?.longitude ??
            longitude,

          rating:
            typeof place.rating ===
            "number"
              ? place.rating
              : null,

          userRatingCount:
            typeof place.userRatingCount ===
            "number"
              ? place.userRatingCount
              : null,

          primaryType:
            place
              .primaryTypeDisplayName
              ?.text ||
            null,

          openNow:
            typeof place
              .currentOpeningHours
              ?.openNow ===
            "boolean"
              ? place
                  .currentOpeningHours
                  .openNow
              : null,

          googleMapsUri:
            place.googleMapsUri ||
            null,

          photoUri,

          photoAttributions,

          photoFlagContentUri,
        },
      };
    } catch (error) {
      console.error(
        "searchNearbyPlace error:",
        error
      );

      if (
        error instanceof HttpsError
      ) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Unable to find a place near this location."
      );
    }
  }
);