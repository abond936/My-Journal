import { config } from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Define Tag interface
interface Tag {
  id: string;
  name: string;
  dimension: 'who' | 'what' | 'when' | 'where' | 'reflection';
  parentId: string | null;
  ancestorTags: string[];
  order: number;
}

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
    privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
  }),
});

const db = getFirestore(app);

async function cleanupOrphanedTags() {
  try {
    console.log('Starting orphaned tags cleanup...');
    
    // Get all tags
    console.log('Fetching all tags...');
    const tagsRef = db.collection('tags');
    const snapshot = await tagsRef.get();
    const allTags = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
    console.log(`Found ${allTags.length} total tags`);
    
    // Create a set of all tag IDs for quick lookup
    const tagIds = new Set(allTags.map(tag => tag.id));
    
    // Find orphaned tags (tags with a parentId that doesn't exist)
    const orphanedTags = allTags.filter(tag => 
      tag.parentId !== null && !tagIds.has(tag.parentId)
    );

    if (orphanedTags.length === 0) {
      console.log('No orphaned tags found.');
      return;
    }

    // Display orphaned tags
    console.log('\n=== Found Orphaned Tags ===');
    orphanedTags.forEach(tag => {
      console.log(`- "${tag.name}" (ID: ${tag.id}, Dimension: ${tag.dimension})`);
    });

    // Ask for confirmation
    console.log(`\nFound ${orphanedTags.length} orphaned tags.`);
    const confirm = await new Promise<boolean>(resolve => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('\nDo you want to delete all orphaned tags? (yes/no): ', (answer: string) => {
        readline.close();
        resolve(answer.toLowerCase() === 'yes');
      });
    });

    if (!confirm) {
      console.log('\nOperation cancelled by user.');
      return;
    }

    // Delete orphaned tags
    console.log('\n=== Deleting Orphaned Tags ===');
    const batch = db.batch();
    for (const tag of orphanedTags) {
      const tagRef = db.collection('tags').doc(tag.id);
      batch.delete(tagRef);
      console.log(`Deleting: "${tag.name}" (ID: ${tag.id})`);
    }
    
    console.log('\nCommitting batch delete...');
    await batch.commit();
    console.log('Batch commit successful!');

    console.log('\n=== Cleanup Summary ===');
    console.log(`Successfully deleted ${orphanedTags.length} orphaned tags.`);
  } catch (error) {
    console.error('\nError during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
console.log('=== Orphaned Tags Cleanup Script ===\n');
cleanupOrphanedTags().then(() => {
  console.log('\nScript completed.');
  process.exit(0);
}); 