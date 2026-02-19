import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCwq2QrrKwlGPpRtEPzDH7mFKZlu1nmY0E",
  authDomain: "propostas-lm.firebaseapp.com",
  projectId: "propostas-lm",
  storageBucket: "propostas-lm.firebasestorage.app",
  messagingSenderId: "433956142014",
  appId: "1:433956142014:web:e17daba9cf25c0ca0997ef"
};

// Initialize Firebase without try/catch to ensure type safety for TS
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});