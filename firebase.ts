import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCwq2QrrKwlGPpRtEPzDH7mFKZlu1nmY0E",
  authDomain: "propostas-lm.firebaseapp.com",
  projectId: "propostas-lm",
  storageBucket: "propostas-lm.firebasestorage.app",
  messagingSenderId: "433956142014",
  appId: "1:433956142014:web:e17daba9cf25c0ca0997ef"
};

// Initialize Firebase only if it hasn't been initialized yet
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});