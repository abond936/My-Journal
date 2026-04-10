/**
 * One-off: embed public PNG as raster-in-SVG for callout watermark (same idea as ImageMagick PNG→SVG).
 * Usage: node src/lib/scripts/dev/png-to-pushpin-svg.mjs [input.png]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sizeOf from 'image-size';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../../..');
const defaultInput = path.join(root, 'public/images/NicePng_push-pins-png_3788873.png');
const input = path.resolve(process.argv[2] || defaultInput);
const out = path.join(root, 'public/images/pushpin.svg');

if (!fs.existsSync(input)) {
  console.error('File not found:', input);
  process.exit(1);
}

const buf = fs.readFileSync(input);
const dim = sizeOf(buf);
const b64 = buf.toString('base64');
const svg =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">\n` +
  `  <image width="${dim.width}" height="${dim.height}" href="data:image/png;base64,${b64}" preserveAspectRatio="xMidYMid meet"/>\n` +
  `</svg>\n`;

fs.writeFileSync(out, svg);
console.log('Wrote', out);
console.log(`  ${dim.width}x${dim.height} from ${path.basename(input)} (${(buf.length / 1024).toFixed(1)} KiB)`);
