import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Debug dotenv loading
const result = dotenv.config();
console.log('\nDotenv config result:', result);
console.log('Current working directory:', process.cwd());
console.log('Looking for .env file in:', resolve(process.cwd(), '.env'));

import { adminDb } from '@/lib/config/firebase/admin';

// Debug logging for all Firebase environment variables
console.log('\nClient-side Firebase variables:');
console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_APP_ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:', process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ? 'Set' : 'Not set');

console.log('\nAdmin Firebase variables:');
console.log('FIREBASE_SERVICE_ACCOUNT_PROJECT_ID:', process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID ? 'Set' : 'Not set');
console.log('FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL:', process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL ? 'Set' : 'Not set');
console.log('FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY:', process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'Set' : 'Not set');

// Debug private key formatting
if (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY) {
  const formattedKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
  console.log('\nPrivate key format check:');
  console.log('Starts with -----BEGIN:', formattedKey.startsWith('-----BEGIN'));
  console.log('Ends with -----END:', formattedKey.endsWith('-----END PRIVATE KEY-----'));
  console.log('Contains newlines:', formattedKey.includes('\n'));
}

async function testFirebaseConfig() {
  try {
    console.log('Testing Firebase configurations...');

    // Test admin Firebase
    console.log('\nTesting admin Firebase...');
    const adminSnapshot = await adminDb.collection('entries').get();
    console.log('Admin Firebase connection successful');
    console.log(`Found ${adminSnapshot.size} entries`);

    console.log('\nAll Firebase configurations are working correctly!');
  } catch (error) {
    console.error('Error testing Firebase configurations:', error);
    process.exit(1);
  }
}

testFirebaseConfig(); 