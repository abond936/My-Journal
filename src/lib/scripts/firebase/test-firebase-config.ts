import * as dotenv from 'dotenv';

dotenv.config();

import { adminDb } from '@/lib/config/firebase/admin';
import { logEnvPresence } from '@/lib/scripts/utils/safeMaintenanceLog';

console.log('\nClient-side Firebase variables:');
logEnvPresence({
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
});

console.log('\nAdmin Firebase variables:');
logEnvPresence({
  FIREBASE_SERVICE_ACCOUNT_PROJECT_ID: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
  FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY,
});

if (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY) {
  const formattedKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
  console.log('\nPrivate key format check (no key material logged):');
  console.log('Starts with -----BEGIN:', formattedKey.startsWith('-----BEGIN'));
  console.log('Ends with -----END:', formattedKey.endsWith('-----END PRIVATE KEY-----'));
  console.log('Contains newlines:', formattedKey.includes('\n'));
}

async function testFirebaseConfig() {
  try {
    console.log('Testing Firebase configurations...');

    console.log('\nTesting admin Firebase...');
    const adminSnapshot = await adminDb.collection('entries').get();
    console.log('Admin Firebase connection successful');
    console.log(`Found ${adminSnapshot.size} entries`);

    console.log('\nAll Firebase configurations are working correctly!');
  } catch (error) {
    console.error('Error testing Firebase configurations:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testFirebaseConfig();
