import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCwq2QrrKwlGPpRtEPzDH7mFKZlu1nmY0E",
  authDomain: "propostas-lm.firebaseapp.com",
  projectId: "propostas-lm",
  storageBucket: "propostas-lm.firebasestorage.app",
  messagingSenderId: "433956142014",
  appId: "1:433956142014:web:e17daba9cf25c0ca0997ef"
};

// Initialize Firebase directly to satisfy TypeScript
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configura o prompt para selecionar conta sempre, útil para trocar de usuários
googleProvider.setCustomParameters({
  prompt: 'select_account'
});