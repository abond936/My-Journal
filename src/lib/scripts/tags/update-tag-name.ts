import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = require('./my-journal-936-firebase-adminsdk-fbsvc-7fb74a04c2.json');
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function updateTagName() {
  try {
    // First, let's check both collections to find where the tag exists
    console.log('Checking collections...');
    
    // Check categories collection
    const categoriesRef = db.collection('categories');
    const categoriesSnapshot = await categoriesRef.where('name', '==', 'WHAT - Themes/Domains').get();
    
    if (!categoriesSnapshot.empty) {
      console.log('Found tag in categories collection');
      const doc = categoriesSnapshot.docs[0];
      console.log('Current document:', doc.data());
      
      await doc.ref.update({
        name: 'WHAT',
        updatedAt: new Date()
      });
      
      console.log('Successfully updated tag name in categories collection');
      return;
    }
    
    // Check tags collection
    const tagsRef = db.collection('tags');
    const tagsSnapshot = await tagsRef.where('name', '==', 'WHAT - Themes/Domains').get();
    
    if (!tagsSnapshot.empty) {
      console.log('Found tag in tags collection');
      const doc = tagsSnapshot.docs[0];
      console.log('Current document:', doc.data());
      
      await doc.ref.update({
        name: 'WHAT',
        updatedAt: new Date()
      });
      
      console.log('Successfully updated tag name in tags collection');
      return;
    }

    console.log('No matching tag found in either collection');
    console.log('Please verify the collection name and tag name in the database');
    
  } catch (error) {
    console.error('Error updating tag:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the update
console.log('Starting tag name update...');
updateTagName()
  .then(() => {
    console.log('Update process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Update process failed:', error);
    process.exit(1);
  }); 