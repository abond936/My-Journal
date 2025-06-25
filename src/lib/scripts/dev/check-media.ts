import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Debug dotenv loading
const result = dotenv.config();
console.log('\nDotenv config result:', result);
console.log('Current working directory:', process.cwd());
console.log('Looking for .env file in:', resolve(process.cwd(), '.env'));

import { getAdminApp } from '@/lib/config/firebase/admin';

async function main() {
  const mediaId = 'em1vbWRhZHBpY3NcYTFCb2JcMDMgT3RoZXJcTmF2eVwwMTc1NF9wX3cyMmFmNWx3OWttMTE2OC5qcGc=';
  const app = getAdminApp();
  const firestore = app.firestore();

  try {
    const doc = await firestore.collection('media').doc(mediaId).get();
    if (!doc.exists) {
      console.log('Media document not found');
      return;
    }

    console.log('Media document:', doc.data());
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error); 