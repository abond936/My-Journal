/**
 * Remove legacy embedded coverImage from card documents.
 *
 * Canonical shape: cards store only coverImageId (reference). The coverImage
 * object is transient and hydrated at read time. Legacy migrations/seed may
 * have written embedded coverImage objects; this script removes them.
 *
 * Run:
 *   npm run remove:legacy-cover -- --diagnose
 *   npm run remove:legacy-cover -- --fix --dry-run
 *   npm run remove:legacy-cover -- --fix
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const CARDS_COLLECTION = 'cards';

function hasEmbeddedCoverImage(data: Record<string, unknown>): boolean {
  const coverImage = data.coverImage;
  return coverImage !== undefined && coverImage !== null && typeof coverImage === 'object';
}

async function main() {
  const args = process.argv.slice(2);
  const diagnose = args.includes('--diagnose');
  const fix = args.includes('--fix');
  const dryRun = args.includes('--dry-run');

  if (!diagnose && !fix) {
    console.log('Usage: npm run remove:legacy-cover -- [--diagnose | --fix [--dry-run]]');
    console.log('  --diagnose   List cards with embedded coverImage');
    console.log('  --fix        Remove embedded coverImage from those cards');
    console.log('  --dry-run    With --fix, report only (no writes)');
    process.exit(1);
  }

  const adminApp = getAdminApp();
  const firestore = adminApp.firestore();

  const cardsSnap = await firestore.collection(CARDS_COLLECTION).get();
  const cardsWithLegacy: { id: string; title: string }[] = [];

  cardsSnap.docs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    if (hasEmbeddedCoverImage(data)) {
      cardsWithLegacy.push({
        id: doc.id,
        title: (data.title as string) || '(untitled)',
      });
    }
  });

  console.log(`Found ${cardsWithLegacy.length} card(s) with embedded coverImage`);

  if (diagnose) {
    cardsWithLegacy.forEach((c) => console.log(`  - ${c.id}: ${c.title}`));
    return;
  }

  if (fix) {
    if (dryRun) {
      console.log('[DRY RUN] Would remove coverImage from:');
      cardsWithLegacy.forEach((c) => console.log(`  - ${c.id}: ${c.title}`));
      return;
    }

    for (const { id } of cardsWithLegacy) {
      const docRef = firestore.collection(CARDS_COLLECTION).doc(id);
      await docRef.update({
        coverImage: FieldValue.delete(),
        updatedAt: Date.now(),
      });
      console.log(`Removed coverImage from card ${id}`);
    }
    console.log(`Done. Removed embedded coverImage from ${cardsWithLegacy.length} card(s).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
