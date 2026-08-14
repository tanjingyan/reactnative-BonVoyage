import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBhSNHsVDsFDWmaznkhbWVHsQLzh7gVxX0",
  authDomain: "bonvoyage-d9131.firebaseapp.com",
  projectId: "bonvoyage-d9131",
  storageBucket: "bonvoyage-d9131.firebasestorage.app",
  messagingSenderId: "579033673933",
  appId: "1:579033673933:web:95eaceae06a2d7ed3fb984"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

export { app, auth };