import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

async function updateEntryTags() {
  const entriesRef = db.collection('entries');
  const entries = await entriesRef.get();

  console.log(`Found ${entries.size} entries to process`);

  for (const entry of entries.docs) {
    const data = entry.data();
    const tags = data.tags || [];

    // Update tags array if needed
    if (tags.length > 0) {
      console.log(`Updating tags for entry ${entry.id}:`, tags);
      await entry.ref.update({ tags });
    }
  }

  console.log('Finished updating entry tags');
}

updateEntryTags().catch(console.error); 