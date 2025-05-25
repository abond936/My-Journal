const { db } = require('../lib/firebase');
const { collection, doc, setDoc } = require('firebase/firestore');
const content = require('../data/content.json');

async function migrateToFirestore() {
  try {
    const pagesCollection = collection(db, 'pages');
    
    // Migrate each page
    for (const page of content.pages) {
      const pageRef = doc(pagesCollection, page.id);
      await setDoc(pageRef, page);
      console.log(`Migrated page: ${page.id}`);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Run the migration
migrateToFirestore(); 