/**
 * PowerPoint-style SVGs often use scale(.0001) + huge clip paths so nothing visible.
 * This extracts the first embedded data:image/png from defs and writes a flat SVG.
 *
 * Usage: node src/lib/scripts/dev/normalize-callout-pushpin-svg.mjs [input.svg]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../../..');
const defaultInput = path.join(root, 'public/images/Pushpin (1).svg');
const input = path.resolve(process.argv[2] || defaultInput);
const out = path.join(root, 'public/images/pushpin.svg');

const s = fs.readFileSync(input, 'utf8');

const dataUri =
  s.match(/xlink:href="(data:image\/png;base64,[^"]+)"/)?.[1] ||
  s.match(/href="(data:image\/png;base64,[^"]+)"/)?.[1];

if (!dataUri) {
  console.error('No data:image/png base64 found in', input);
  process.exit(1);
}

let w = 400;
let h = 400;
const idC = s.match(/id="c"\s+width="(\d+)"\s+height="(\d+)"/);
const whAfterId = s.match(/id="c"[^>]*width="(\d+)"[^>]*height="(\d+)"/);
const generic = s.match(/width="(\d+)"\s+height="(\d+)"[^>]*preserveAspectRatio="none"/);
if (idC) {
  w = +idC[1];
  h = +idC[2];
} else if (whAfterId) {
  w = +whAfterId[1];
  h = +whAfterId[2];
} else if (generic) {
  w = +generic[1];
  h = +generic[2];
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="${w}" height="${h}" href="${dataUri}" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;

fs.writeFileSync(out, svg);
console.log('Wrote', out, `(${w}×${h}) from`, path.basename(input));
