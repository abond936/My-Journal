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

interface Tag {
  id: string;
  name: string;
  dimension: 'about' | 'who' | 'what' | 'when' | 'where';
  parentId: string | null;
  order: number;
  isReflection: boolean;
}

async function listTags() {
  const tagsRef = db.collection('tags');
  const tags = await tagsRef.get();

  console.log(`Found ${tags.size} tags:`);

  const tagsByDimension = {
    about: [] as Tag[],
    who: [] as Tag[],
    what: [] as Tag[],
    when: [] as Tag[],
    where: [] as Tag[]
  };

  tags.docs.forEach(doc => {
    const tag = doc.data() as Tag;
    if (tag.dimension && tagsByDimension[tag.dimension]) {
      tagsByDimension[tag.dimension].push(tag);
    }
  });

  // Sort tags by order within each dimension
  Object.entries(tagsByDimension).forEach(([dimension, tags]) => {
    tags.sort((a, b) => a.order - b.order);
  });

  // Print tags by dimension
  Object.entries(tagsByDimension).forEach(([dimension, tags]) => {
    console.log(`\n${dimension.toUpperCase()} Tags:`);
    tags.forEach(tag => {
      console.log(`- ${tag.name} (ID: ${tag.id}, Order: ${tag.order}, Parent: ${tag.parentId || 'none'})`);
    });
  });
}

listTags().catch(console.error); 