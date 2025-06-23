/**
 * Firebase Admin SDK Configuration
 * 
 * Purpose: Initialize and export Firebase Admin SDK
 * 
 * Required Environment Variables:
 * - FIREBASE_SERVICE_ACCOUNT_PROJECT_ID
 * - FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
 * - FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL
 * - FIREBASE_STORAGE_BUCKET_URL
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
export function getAdminApp() {
  console.log('--- Initializing Firebase Admin ---');
  console.log('PROJECT_ID:', process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID ? 'Loaded' : 'MISSING');
  console.log('CLIENT_EMAIL:', process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL ? 'Loaded' : 'MISSING');
  console.log('STORAGE_BUCKET:', process.env.FIREBASE_STORAGE_BUCKET_URL ? 'Loaded' : 'MISSING');
  // Be careful not to log the full private key
  console.log('PRIVATE_KEY:', process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'Loaded' : 'MISSING');
  console.log('------------------------------------');

  const serviceAccount = {
    projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
  };

  const firebaseConfig = {
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET_URL
  };

  try {
    if (admin.apps.length === 0) {
      admin.initializeApp(firebaseConfig);
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }

  return admin.app();
}