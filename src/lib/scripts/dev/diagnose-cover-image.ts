/**
 * Diagnose cover image for a card by title.
 * Run: npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/dev/diagnose-cover-image.ts "High School Graduation"
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as admin from 'firebase-admin';
import { getAdminApp } from '@/lib/config/firebase/admin';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

export interface CoverDiagnosticCard {
  cardId: string;
  title: string;
  coverImageId: string | null;
  coverImageFocalPoint: unknown;
  media?: {
    docId: string;
    filename: string;
    width: number;
    height: number;
    storagePath: string | null;
    hasStorageUrl: boolean;
    objectPosition: string | null;
    warnings: string[];
  };
  mediaNotFound?: boolean;
  noCover?: boolean;
}

export interface CoverDiagnosticResult {
  searchTitle: string;
  cards: CoverDiagnosticCard[];
  error?: string;
}

/**
 * Returns structured diagnostic data for cover images of cards matching the given title.
 */
export async function diagnoseCoverImage(searchTitle: string): Promise<CoverDiagnosticResult> {
  const title = searchTitle || 'High School Graduation';

  try {
    getAdminApp();
    const firestore = admin.firestore();

    let docs: admin.firestore.QueryDocumentSnapshot[] = [];
    const prefix = title.toLowerCase();
    const snapshot = await firestore
      .collection('cards')
      .where('title_lowercase', '>=', prefix)
      .where('title_lowercase', '<=', prefix + '\uf8ff')
      .limit(10)
      .get();
    docs = [...snapshot.docs];

    if (docs.length === 0) {
      const exactSnapshot = await firestore
        .collection('cards')
        .where('title', '==', title)
        .limit(5)
        .get();
      if (exactSnapshot.empty) {
        return { searchTitle: title, cards: [] };
      }
      docs = [...exactSnapshot.docs];
    }

    const cards: CoverDiagnosticCard[] = [];

    for (const doc of docs) {
      const cardData = doc.data();
      const cardId = doc.id;

      if (!cardData.coverImageId) {
        cards.push({
          cardId,
          title: cardData.title ?? '',
          coverImageId: null,
          coverImageFocalPoint: cardData.coverImageFocalPoint ?? null,
          noCover: true,
        });
        continue;
      }

      const mediaDoc = await firestore.collection('media').doc(cardData.coverImageId).get();
      if (!mediaDoc.exists) {
        cards.push({
          cardId,
          title: cardData.title ?? '',
          coverImageId: cardData.coverImageId,
          coverImageFocalPoint: cardData.coverImageFocalPoint ?? null,
          mediaNotFound: true,
        });
        continue;
      }

      const media = mediaDoc.data();
      const warnings: string[] = [];
      if (!media?.storagePath) {
        warnings.push('storagePath is missing - signed URL generation will fail');
      }
      if (!media?.width || !media?.height) {
        warnings.push('width/height missing - focal point calc may fail');
      }

      cards.push({
        cardId,
        title: cardData.title ?? '',
        coverImageId: cardData.coverImageId,
        coverImageFocalPoint: cardData.coverImageFocalPoint ?? null,
        media: {
          docId: media?.docId ?? mediaDoc.id,
          filename: media?.filename ?? '',
          width: media?.width ?? 0,
          height: media?.height ?? 0,
          storagePath: media?.storagePath ?? null,
          hasStorageUrl: !!(media?.storageUrl),
          objectPosition: media?.objectPosition ?? null,
          warnings,
        },
      });
    }

    return { searchTitle: title, cards };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { searchTitle: title, cards: [], error: message };
  }
}

function formatForCli(result: CoverDiagnosticResult): string {
  const lines: string[] = [`\nSearching for card with title containing: "${result.searchTitle}"\n`];
  if (result.error) {
    lines.push(`Error: ${result.error}\n`);
    return lines.join('\n');
  }
  for (const c of result.cards) {
    lines.push('========================================');
    lines.push(`Card ID: ${c.cardId}`);
    lines.push(`Title: ${c.title}`);
    lines.push('----------------------------------------');
    lines.push(`coverImageId: ${c.coverImageId ?? '(null/undefined)'}`);
    lines.push(`coverImageFocalPoint: ${c.coverImageFocalPoint ? JSON.stringify(c.coverImageFocalPoint) : '(null/undefined)'}`);
    lines.push('----------------------------------------');
    if (c.noCover) {
      lines.push('No coverImageId - card has no cover image assigned');
    } else if (c.mediaNotFound) {
      lines.push('Media document NOT FOUND (orphaned reference)');
    } else if (c.media) {
      lines.push('Media document EXISTS:');
      lines.push(`  - docId: ${c.media.docId}`);
      lines.push(`  - filename: ${c.media.filename}`);
      lines.push(`  - width: ${c.media.width}`);
      lines.push(`  - height: ${c.media.height}`);
      lines.push(`  - storagePath: ${c.media.storagePath ?? '(missing)'}`);
      lines.push(`  - storageUrl: ${c.media.hasStorageUrl ? '(set)' : '(missing/empty)'}`);
      lines.push(`  - objectPosition: ${c.media.objectPosition ?? '(not set)'}`);
      c.media.warnings.forEach(w => lines.push(`\n  ⚠️  WARNING: ${w}`));
    }
    lines.push('');
  }
  return lines.join('\n');
}

if (require.main === module) {
  const searchTitle = process.argv[2] || 'High School Graduation';
  diagnoseCoverImage(searchTitle)
    .then(result => {
      console.log(formatForCli(result));
      process.exit(result.error ? 1 : 0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}
