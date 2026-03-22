/**
 * Card-Media Reconciliation: Diagnostics and Fixes
 *
 * Identifies and repairs inconsistencies between cards and media:
 * - Cards with importedFromFolder but empty/missing galleryMedia (e.g. American Adventures)
 * - Media with sourcePath matching a card's importedFromFolder but not linked
 * - Orphaned media (not referenced by any card)
 * - Orphaned references (card references media that doesn't exist)
 * - Storage files missing for media docs
 *
 * Run:
 *   npm run reconcile:media-cards -- --diagnose
 *   npm run reconcile:media-cards -- --diagnose --card "American Adventures"
 *   npm run reconcile:media-cards -- --fix --dry-run
 *   npm run reconcile:media-cards -- --fix
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card, GalleryMediaItem } from '@/lib/types/card';
import { Media } from '@/lib/types/photo';
import { extractMediaFromContent, mediaBelongsToCard } from './reconcile-media-cards-utils';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const MEDIA_COLLECTION = 'media';
const CARDS_COLLECTION = 'cards';

// Re-export for backwards compatibility
export { normalizePath, mediaBelongsToCard } from './reconcile-media-cards-utils';

export interface ReconcileReport {
  // Diagnostics
  cardsWithEmptyGalleryButImportedFolder: Array<{
    cardId: string;
    title: string;
    importedFromFolder: string;
    matchingMediaCount: number;
    matchingMediaIds: string[];
  }>;
  orphanedMedia: Array<{ mediaId: string; filename: string; sourcePath: string }>;
  orphanedReferences: {
    coverImageId: Array<{ cardId: string; mediaId: string }>;
    galleryMedia: Array<{ cardId: string; mediaId: string }>;
    contentMedia: Array<{ cardId: string; mediaId: string }>;
  };
  mediaWithMissingStorage: Array<{ mediaId: string; storagePath: string }>;
  // Fix results (when --fix)
  reLinkedCards: string[];
  removedOrphanedRefs: number;
  errors: string[];
}

export async function runDiagnostics(options?: {
  cardTitleFilter?: string;
  checkStorage?: boolean;
}): Promise<ReconcileReport> {
  const { cardTitleFilter, checkStorage = false } = options ?? {};
  const adminApp = getAdminApp();
  const firestore = adminApp.firestore();
  const bucket = checkStorage ? adminApp.storage().bucket() : null;

  const report: ReconcileReport = {
    cardsWithEmptyGalleryButImportedFolder: [],
    orphanedMedia: [],
    orphanedReferences: {
      coverImageId: [],
      galleryMedia: [],
      contentMedia: [],
    },
    mediaWithMissingStorage: [],
    reLinkedCards: [],
    removedOrphanedRefs: 0,
    errors: [],
  };

  const [cardsSnap, mediaSnap] = await Promise.all([
    firestore.collection(CARDS_COLLECTION).get(),
    firestore.collection(MEDIA_COLLECTION).get(),
  ]);

  const allCards = cardsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Card & { id: string }));
  const allMedia = mediaSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Media & { id: string }));

  const mediaById = new Map(allMedia.map((m) => [m.id, m]));
  const mediaBySourcePath = new Map(allMedia.map((m) => [m.sourcePath, m]));

  const referencedMediaIds = new Set<string>();
  for (const card of allCards) {
    if (card.coverImageId) referencedMediaIds.add(card.coverImageId);
    card.galleryMedia?.forEach((g) => referencedMediaIds.add(g.mediaId));
    extractMediaFromContent(card.content).forEach((id) => referencedMediaIds.add(id));
  }

  // Filter cards if requested
  let cardsToCheck = allCards;
  if (cardTitleFilter?.trim()) {
    const lower = cardTitleFilter.toLowerCase();
    cardsToCheck = allCards.filter(
      (c) => c.title?.toLowerCase().includes(lower) || c.title_lowercase?.includes(lower)
    );
  }

  // 1. Cards with importedFromFolder but empty galleryMedia
  for (const card of cardsToCheck) {
    const importedFrom = card.importedFromFolder;
    if (!importedFrom) continue;
    const galleryCount = card.galleryMedia?.length ?? 0;
    if (galleryCount > 0) continue;

    const matchingMedia = allMedia.filter((m) => mediaBelongsToCard(m.sourcePath, importedFrom));
    const matchingIds = matchingMedia.map((m) => m.id).sort();
    report.cardsWithEmptyGalleryButImportedFolder.push({
      cardId: card.id,
      title: card.title || '(untitled)',
      importedFromFolder: importedFrom,
      matchingMediaCount: matchingMedia.length,
      matchingMediaIds: matchingIds,
    });
  }

  // 2. Orphaned media (not referenced by any card)
  for (const m of allMedia) {
    if (!referencedMediaIds.has(m.id)) {
      report.orphanedMedia.push({
        mediaId: m.id,
        filename: m.filename || '(unknown)',
        sourcePath: m.sourcePath || '(unknown)',
      });
    }
  }

  // 3. Orphaned references (card points to media that doesn't exist)
  for (const card of allCards) {
    if (card.coverImageId && !mediaById.has(card.coverImageId)) {
      report.orphanedReferences.coverImageId.push({ cardId: card.id, mediaId: card.coverImageId });
    }
    card.galleryMedia?.forEach((g) => {
      if (g.mediaId && !mediaById.has(g.mediaId)) {
        report.orphanedReferences.galleryMedia.push({ cardId: card.id, mediaId: g.mediaId });
      }
    });
    const contentIds = extractMediaFromContent(card.content);
    contentIds.forEach((mediaId) => {
      if (!mediaById.has(mediaId)) {
        report.orphanedReferences.contentMedia.push({ cardId: card.id, mediaId });
      }
    });
  }

  // 4. Media with missing storage file
  if (bucket) {
    for (const m of allMedia) {
      if (!m.storagePath) continue;
      try {
        const file = bucket.file(m.storagePath);
        const [exists] = await file.exists();
        if (!exists) {
          report.mediaWithMissingStorage.push({ mediaId: m.id, storagePath: m.storagePath });
        }
      } catch (e) {
        report.errors.push(`Storage check failed for ${m.id}: ${String(e)}`);
      }
    }
  }

  return report;
}

export async function runReconciliation(
  report: ReconcileReport,
  dryRun: boolean
): Promise<ReconcileReport> {
  const adminApp = getAdminApp();
  const firestore = adminApp.firestore();

  const updatedReport = { ...report };

  // Fix 1: Re-link media to cards with empty gallery but matching importedFromFolder
  for (const item of report.cardsWithEmptyGalleryButImportedFolder) {
    if (item.matchingMediaCount === 0) continue;

    const galleryMedia: GalleryMediaItem[] = item.matchingMediaIds.map((id, i) => ({
      mediaId: id,
      order: i,
    }));

    if (!dryRun) {
      try {
        await firestore.collection(CARDS_COLLECTION).doc(item.cardId).update({
          galleryMedia,
          coverImageId: item.matchingMediaIds[0],
          updatedAt: Date.now(),
        });
        updatedReport.reLinkedCards.push(item.cardId);
      } catch (e) {
        updatedReport.errors.push(`Failed to re-link card ${item.cardId}: ${String(e)}`);
      }
    } else {
      updatedReport.reLinkedCards.push(`[DRY RUN] ${item.cardId}`);
    }
  }

  // Fix 2: Remove orphaned references from cards (cover + gallery only; content requires HTML strip - use cleanup-media)
  const orphanedGalleryByCard = new Map<string, Set<string>>();
  for (const { cardId, mediaId } of report.orphanedReferences.galleryMedia) {
    if (!orphanedGalleryByCard.has(cardId)) orphanedGalleryByCard.set(cardId, new Set());
    orphanedGalleryByCard.get(cardId)!.add(mediaId);
  }

  const cardsToUpdate = new Map<
    string,
    { coverImageId?: null; galleryMedia?: GalleryMediaItem[] }
  >();

  for (const { cardId } of report.orphanedReferences.coverImageId) {
    if (!cardsToUpdate.has(cardId)) cardsToUpdate.set(cardId, {});
    cardsToUpdate.get(cardId)!.coverImageId = null;
  }
  for (const [cardId, orphanedIds] of orphanedGalleryByCard) {
    const cardDoc = await firestore.collection(CARDS_COLLECTION).doc(cardId).get();
    const card = cardDoc.data() as Card;
    const valid = (card.galleryMedia ?? []).filter((g) => !orphanedIds.has(g.mediaId));
    if (!cardsToUpdate.has(cardId)) cardsToUpdate.set(cardId, {});
    cardsToUpdate.get(cardId)!.galleryMedia = valid;
  }

  for (const [cardId, updates] of cardsToUpdate) {
    const toApply: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.coverImageId === null) toApply.coverImageId = null;
    if (updates.galleryMedia) toApply.galleryMedia = updates.galleryMedia;
    if (!dryRun) {
      try {
        await firestore.collection(CARDS_COLLECTION).doc(cardId).update(toApply);
        updatedReport.removedOrphanedRefs++;
      } catch (e) {
        updatedReport.errors.push(`Failed to remove orphaned refs from ${cardId}: ${String(e)}`);
      }
    }
  }

  return updatedReport;
}

function printReport(report: ReconcileReport) {
  console.log('\n========== RECONCILE REPORT ==========\n');

  if (report.cardsWithEmptyGalleryButImportedFolder.length > 0) {
    console.log('📋 Cards with empty gallery but importedFromFolder set:');
    report.cardsWithEmptyGalleryButImportedFolder.forEach((c) => {
      console.log(`   - ${c.title} (${c.cardId})`);
      console.log(`     importedFrom: ${c.importedFromFolder}`);
      console.log(`     matching media: ${c.matchingMediaCount} [${c.matchingMediaIds.slice(0, 5).join(', ')}${c.matchingMediaIds.length > 5 ? '...' : ''}]`);
    });
    console.log('');
  }

  if (report.orphanedMedia.length > 0) {
    console.log('📋 Orphaned media (not referenced by any card):');
    report.orphanedMedia.slice(0, 20).forEach((m) => {
      console.log(`   - ${m.mediaId} | ${m.filename} | ${m.sourcePath}`);
    });
    if (report.orphanedMedia.length > 20) {
      console.log(`   ... and ${report.orphanedMedia.length - 20} more`);
    }
    console.log('');
  }

  const totalOrphanedRefs =
    report.orphanedReferences.coverImageId.length +
    report.orphanedReferences.galleryMedia.length +
    report.orphanedReferences.contentMedia.length;
  if (totalOrphanedRefs > 0) {
    console.log('📋 Orphaned references (card points to non-existent media):');
    console.log(`   coverImageId: ${report.orphanedReferences.coverImageId.length}`);
    console.log(`   galleryMedia: ${report.orphanedReferences.galleryMedia.length}`);
    console.log(`   contentMedia: ${report.orphanedReferences.contentMedia.length}`);
    report.orphanedReferences.coverImageId.forEach((r) =>
      console.log(`   - card ${r.cardId} -> cover ${r.mediaId}`)
    );
    report.orphanedReferences.galleryMedia.slice(0, 5).forEach((r) =>
      console.log(`   - card ${r.cardId} -> gallery ${r.mediaId}`)
    );
    if (report.orphanedReferences.galleryMedia.length > 5) {
      console.log(`   ... and ${report.orphanedReferences.galleryMedia.length - 5} more`);
    }
    console.log('');
  }

  if (report.mediaWithMissingStorage.length > 0) {
    console.log('📋 Media with missing storage file:');
    report.mediaWithMissingStorage.forEach((m) =>
      console.log(`   - ${m.mediaId} | ${m.storagePath}`)
    );
    console.log('');
  }

  if (report.reLinkedCards.length > 0) {
    console.log('✅ Re-linked cards:', report.reLinkedCards.join(', '));
  }
  if (report.removedOrphanedRefs > 0) {
    console.log('✅ Removed orphaned refs from', report.removedOrphanedRefs, 'cards');
  }
  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.forEach((e) => console.log('   -', e));
  }

  console.log('\n======================================\n');
}

async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const diagnose = args.includes('--diagnose') || (!fix && args.length === 0);
  const dryRun = args.includes('--dry-run');
  const checkStorage = args.includes('--check-storage');
  const cardArg = args.find((a) => a.startsWith('--card='));
  const cardFilter = cardArg?.replace('--card=', '').trim();

  if (!diagnose && !fix) {
    console.log('Usage:');
    console.log('  npm run reconcile:media-cards                    # diagnose (default)');
    console.log('  npm run reconcile:media-cards -- --diagnose       # diagnose');
    console.log('  npm run reconcile:media-cards -- --diagnose --card="American Adventures"');
    console.log('  npm run reconcile:media-cards -- --diagnose --check-storage');
    console.log('  npm run reconcile:media-cards -- --fix --dry-run  # fix (preview)');
    console.log('  npm run reconcile:media-cards -- --fix            # fix');
    process.exit(1);
  }

  getAdminApp();

  const report = await runDiagnostics({
    cardTitleFilter: cardFilter,
    checkStorage: checkStorage || diagnose,
  });

  printReport(report);

  if (fix) {
    console.log(dryRun ? '🔍 DRY RUN - no changes will be written' : '⚠️  LIVE - applying fixes');
    const after = await runReconciliation(report, dryRun);
    if (after.reLinkedCards.length > 0 || after.removedOrphanedRefs > 0) {
      console.log('\n--- After reconciliation ---');
      printReport(after);
    }
  }

  process.exit(report.errors.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
