import { photoService } from '../services/photos/photoService';
import fs from 'fs';
import path from 'path';

async function main() {
  // Load the Navy album configuration
  const configPath = path.join(process.cwd(), 'temp', 'navy-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  console.log('Loading Navy album...');
  const album = await photoService.loadAlbum(config[0]);
  
  console.log('\nAlbum Details:');
  console.log(`Name: ${album.name}`);
  console.log(`Description: ${album.description}`);
  console.log(`Total Photos: ${album.photoCount}`);
  
  console.log('\nPhotos:');
  album.photos.forEach((photo, index) => {
    console.log(`\n${index + 1}. ${photo.filename}`);
    console.log(`   Path: ${photo.path}`);
    console.log(`   Size: ${(photo.size! / 1024).toFixed(2)} KB`);
    console.log(`   Last Modified: ${photo.lastModified}`);
  });
  
  // Test adding tags to a photo
  const firstPhoto = album.photos[0];
  console.log('\nTesting tag addition...');
  const updatedPhoto = await photoService.addTagsToPhoto(firstPhoto.id, ['navy', 'military', 'service']);
  console.log(`Added tags to ${updatedPhoto?.filename}: ${updatedPhoto?.tags.join(', ')}`);
  
  // Test setting a caption
  console.log('\nTesting caption addition...');
  const photoWithCaption = await photoService.setPhotoCaption(firstPhoto.id, 'Navy service photo');
  console.log(`Added caption to ${photoWithCaption?.filename}: ${photoWithCaption?.caption}`);
}

main().catch(console.error); 