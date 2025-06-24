const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const album = 'Wedding';
const root = 'C:/Users/alanb/OneDrive/Pictures/zMomDadPics/BobSandra/';
const inputDir = path.join(root, album, 'zOriginals');
const outputDir = path.join(root, album, 'normalized');

fs.mkdirSync(outputDir, { recursive: true });

fs.readdirSync(inputDir).forEach((file) => {
  if (!/\.(jpe?g|png)$/i.test(file)) return;

  const inputPath = path.join(inputDir, file);
  const outputPath = path.join(outputDir, file);

  sharp(inputPath)
    .resize({ width: 2048, withoutEnlargement: true })
    .normalize()
    .sharpen()
    .withMetadata() // keep EXIF
    .toFile(outputPath)
    .then(() => console.log(`Normalized: ${file}`))
    .catch(err => console.error(`Error processing ${file}:`, err));
});