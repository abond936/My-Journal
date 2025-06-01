import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Debug logging
console.log('\nChecking Firebase Admin environment variables:');
console.log('FIREBASE_SERVICE_ACCOUNT_PROJECT_ID:', process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID ? 'Set' : 'Not set');
console.log('FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY:', process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'Set' : 'Not set');
console.log('FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL:', process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL ? 'Set' : 'Not set');

if (!process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_PROJECT_ID environment variable');
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY environment variable');
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL environment variable');
}

const serviceAccount = {
  projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
  privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
};

// Initialize Firebase Admin
const app = getApps().length === 0 ? initializeApp({
  credential: cert(serviceAccount)
}) : getApps()[0];

export const adminDb = getFirestore(app); 