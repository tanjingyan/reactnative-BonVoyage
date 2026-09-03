import { initializeApp } from 'firebase/app';

import {
  getAuth,
  initializeAuth,
  type Auth,

  // Firebase React Native TypeScript declarations can fail
  // to expose this export correctly in Expo projects.
  // @ts-expect-error Firebase RN typings issue
  getReactNativePersistence,
} from 'firebase/auth';

import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

import { getFirestore } from 'firebase/firestore';

import { getFunctions } from 'firebase/functions';

import {
  getStorage,
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBhSNHsVDsFDWmaznkhbWVHsQLzh7gVxX0",
  authDomain: "bonvoyage-d9131.firebaseapp.com",
  projectId: "bonvoyage-d9131",
  storageBucket: "bonvoyage-d9131.firebasestorage.app",
  messagingSenderId: "579033673933",
  appId: "1:579033673933:web:95eaceae06a2d7ed3fb984"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'asia-southeast1');
const storage = getStorage(app);

let auth: Auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(
      ReactNativeAsyncStorage
    ),
  });
} catch {
  // Used if Firebase Auth was already initialized,
  // for example during Expo Fast Refresh.
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db, functions, storage };