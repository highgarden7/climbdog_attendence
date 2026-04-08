import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every(Boolean);
}

let firebaseApp = null;
let firebaseDb = null;
let firebaseStorage = null;

function getFirebaseApp() {
  if (!hasFirebaseConfig()) {
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

export function hasFirebaseServices() {
  return hasFirebaseConfig();
}

export function getFirebaseDb() {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  if (!firebaseDb) {
    firebaseDb = getFirestore(app);
  }

  return firebaseDb;
}

export function getFirebaseStorage() {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  return firebaseStorage;
}

export function ensureFirebaseStorage() {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  if (!firebaseStorage) {
    firebaseStorage = getStorage(app);
  }

  return firebaseStorage;
}
