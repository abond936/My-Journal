/**
 * Minimal test: direct Firestore update to clear coverImageId.
 * Bypasses all app logic - just writes to Firestore.
 *
 * Run: npx ts-node -r dotenv/config -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/dev/test-clear-cover-direct.ts YcUGzYM5shusuwsjyMVt
 *
 * Then check Firestore console - does coverImageId show as null or removed?
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { getAdminApp } from '@/lib/config/firebase/admin';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const cardId = process.argv[2] || 'YcUGzYM5shusuwsjyMVt';

async function main() {
  const app = getAdminApp();
  const firestore = app.firestore();
  const docRef = firestore.collection('cards').doc(cardId);

  const before = await docRef.get();
  if (!before.exists) {
    console.error(`Card ${cardId} not found.`);
    process.exit(1);
  }
  const beforeData = before.data();
  console.log('BEFORE:', { coverImageId: beforeData?.coverImageId, coverImageFocalPoint: beforeData?.coverImageFocalPoint });

  await docRef.update({ coverImageId: null, coverImageFocalPoint: null });

  const after = await docRef.get();
  const afterData = after.data();
  console.log('AFTER:', { coverImageId: afterData?.coverImageId, coverImageFocalPoint: afterData?.coverImageFocalPoint });

  if (afterData?.coverImageId !== null && afterData?.coverImageId !== undefined) {
    console.error('FAIL: coverImageId still has value after update. Firestore may be rejecting null.');
    process.exit(1);
  }
  console.log('SUCCESS: coverImageId is now null. Check Firestore console to confirm.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
