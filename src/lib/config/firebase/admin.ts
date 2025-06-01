/**
 * Firebase Admin SDK Configuration
 * 
 * Purpose: Initialize and export Firebase Admin SDK
 * 
 * Required Environment Variables:
 * - FIREBASE_SERVICE_ACCOUNT_PROJECT_ID
 * - FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
 * - FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
      privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    }),
  });
}

// Export Firestore instance
export const adminDb = admin.firestore(); 