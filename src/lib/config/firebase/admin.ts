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
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
  };

  const hasServiceAccount = Boolean(
    serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail
  );
  const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';

  if (!hasServiceAccount && !isProductionBuild) {
    throw new Error(
      'Firebase Admin credentials are unavailable. Set FIREBASE_SERVICE_ACCOUNT_PROJECT_ID, ' +
      'FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY, and FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL.'
    );
  }

  admin.initializeApp({
    ...(hasServiceAccount
      ? { credential: admin.credential.cert(serviceAccount) }
      : { projectId: serviceAccount.projectId || 'build-time-placeholder' }),
    ...(process.env.FIREBASE_STORAGE_BUCKET_URL
      ? { storageBucket: process.env.FIREBASE_STORAGE_BUCKET_URL }
      : {}),
  });

  return admin.app();
}

// Export Firestore instance for scripts
export const adminDb = getAdminApp().firestore();
