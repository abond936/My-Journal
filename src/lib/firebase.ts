import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyArw7sSTrwMiiNhJI5aTMidMAczMswW12c",
  authDomain: "my-journal-936.firebaseapp.com",
  projectId: "my-journal-936",
  storageBucket: "my-journal-936.firebasestorage.app",
  messagingSenderId: "156365741395",
  appId: "1:156365741395:web:f771a4376082150134d5a6",
  measurementId: "G-12G1PPC6WJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Analytics only in browser environment
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && (analytics = getAnalytics(app)));
}

export { app, analytics, db }; 