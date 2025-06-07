import { adminDb } from '@/lib/config/firebase/admin';
import { CollectionReference } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import { getConfig } from '@/lib/services/onedrive/config';
import { AlbumMapping } from '@/lib/services/onedrive/albumConfig';

interface PhotoMetadata {
    id: string;
    filename: string;
    path: string;
    albumId: string;
    albumName: string;
    tags: string[];
    size: number;
    lastModified: Date;
    thumbnailUrl: string;
    previewUrl: string;
    caption?: string;
}

async function scanPhotosForAlbum(folderPath: string, albumId: string, albumName: string): Promise<PhotoMetadata[]> {
    const photos: PhotoMetadata[] = [];
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.heic'].includes(ext)) {
          const fullPath = path.join(folderPath, entry.name);
          const stats = fs.statSync(fullPath);
          
          const photoId = Buffer.from(fullPath).toString('base64');
          photos.push({
            id: photoId,
            filename: entry.name,
            path: fullPath,
            albumId: albumId,
            albumName: albumName,
            tags: [],
            size: stats.size,
            lastModified: stats.mtime,
            thumbnailUrl: `/api/photos/thumbnail/${photoId}`,
            previewUrl: `/api/photos/preview/${photoId}`
          });
        }
      }
    }
    return photos;
}

async function migratePhotos() {
  console.log('Starting photo migration to Firestore...');
  
  const photosCollection = adminDb.collection('photos') as CollectionReference<PhotoMetadata>;
  const albumsCollection = adminDb.collection('albums');

  const configPath = path.join(process.cwd(), 'temp', 'navy-config.json');
  const albumMappings: AlbumMapping[] = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  for (const mapping of albumMappings) {
    const albumId = Buffer.from(mapping.folderPath).toString('base64');
    console.log(`Processing album: ${mapping.albumName} (${albumId})`);

    const fullPath = path.join(getConfig().rootPath, mapping.folderPath);
    const photos = await scanPhotosForAlbum(fullPath, albumId, mapping.albumName);

    const albumDoc = {
        id: albumId,
        name: mapping.albumName,
        description: mapping.description,
        path: mapping.folderPath,
        photoCount: photos.length,
        tags: [],
        isEnabled: mapping.isEnabled
    };

    await albumsCollection.doc(albumId).set(albumDoc);
    console.log(`  > Album document created/updated for ${mapping.albumName}.`);

    const batch = adminDb.batch();
    let batchCount = 0;

    for (const photo of photos) {
        const photoRef = photosCollection.doc(photo.id);
        batch.set(photoRef, photo);
        batchCount++;
        
        if (batchCount >= 499) {
            await batch.commit();
            console.log(`  > Committed batch of ${batchCount} photos.`);
            batch = adminDb.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
        console.log(`  > Committed final batch of ${batchCount} photos.`);
    }

    console.log(`  > Finished migrating ${photos.length} photos for album ${mapping.albumName}.`);
  }

  console.log('Photo migration completed successfully!');
}

migratePhotos().catch(console.error); 