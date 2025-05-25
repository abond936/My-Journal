import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = require('../my-journal-936-firebase-adminsdk-fbsvc-7fb74a04c2.json');
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function testFirestore() {
  try {
    console.log('Testing Firestore connection...');
    
    // Test the exact path structure we'll use
    const categoriesRef = db.collection('categories');
    const testDocRef = categoriesRef.doc('test-category');
    
    console.log('Attempting to write test category...');
    await testDocRef.set({
      id: 'test-category',
      name: 'Test Category',
      dimension: 'about',
      parentId: null,
      order: 0,
      isReflection: false,
      path: ['Test Category'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Successfully wrote test category');
    
    // Try to read it back
    const doc = await testDocRef.get();
    console.log('Successfully read test category:', doc.data());
    
    // Clean up
    await testDocRef.delete();
    console.log('Successfully deleted test category');
    
  } catch (error) {
    console.error('Error testing Firestore:', error);
    throw error;
  }
}

// Run the test
testFirestore(); 