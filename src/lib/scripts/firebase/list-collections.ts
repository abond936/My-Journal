import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
  }),
});

const db = getFirestore(app);

async function listCollections() {
  let output = '';
  try {
    output += '=== Firestore Collections ===\n\n';
    
    const collections = ['tags', 'entries'];
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      output += `${collectionName}: ${snapshot.size} documents\n`;
    }
    
  } catch (error) {
    output += `\nError listing collections: ${error}\n`;
  } finally {
    // Write output to file
    const outputPath = path.resolve(process.cwd(), 'temp/firebase/collections-output.txt');
    fs.writeFileSync(outputPath, output);
    console.log(`Collections output written to ${outputPath}`);
    process.exit(0);
  }
}

listCollections(); 