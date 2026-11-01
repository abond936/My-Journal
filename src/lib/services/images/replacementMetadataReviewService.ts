import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { readEmbeddedReplacementMetadataEvidence } from '@/lib/services/images/embeddedMetadataForImport';
import type { Media } from '@/lib/types/photo';
import type { Tag } from '@/lib/types/tag';
import {
  buildReplacementMetadataReview,
  type ReplacementMetadataReview,
} from '@/lib/utils/replacementMetadataReview';

function safeExtension(filename: string): string {
  const extension = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '.image';
}

export async function reviewReplacementMetadata(
  mediaId: string,
  fileBuffer: Buffer,
  filename: string
): Promise<ReplacementMetadataReview> {
  const db = getAdminApp().firestore();
  const [mediaSnapshot, tagsSnapshot] = await Promise.all([
    db.collection('media').doc(mediaId).get(),
    db.collection('tags').get(),
  ]);
  if (!mediaSnapshot.exists) {
    throw new Error(`Media document with ID ${mediaId} not found.`);
  }

  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'my-stories-replacement-'));
  const tempPath = path.join(tempDirectory, `candidate${safeExtension(filename)}`);
  try {
    await writeFile(tempPath, fileBuffer);
    const evidence = await readEmbeddedReplacementMetadataEvidence(tempPath);
    const media = { docId: mediaSnapshot.id, ...mediaSnapshot.data() } as Media;
    const tags = tagsSnapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() } as Tag));
    return buildReplacementMetadataReview(media, evidence, tags);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}
