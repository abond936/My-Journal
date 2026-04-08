import sharp from 'sharp';
import sizeOf from 'image-size';

/** Literal suffix before extension: two underscores + uppercase X (card export / import marker). */
const CARD_EXPORT_SUFFIX = '__X';

export function isCardExportMarkedFilename(filename: string): boolean {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return false;
  const stem = base.slice(0, dot);
  return stem.endsWith(CARD_EXPORT_SUFFIX);
}

const WEBP_QUALITY = 85;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

/**
 * Rotate, resize (if oversized), WebP encode in memory—no disk output.
 * Safe for upload to Storage + Firestore dimensions.
 */
export async function normalizeBufferToWebp(fileBuffer: Buffer): Promise<{
  webpBuffer: Buffer;
  width: number;
  height: number;
}> {
  const metadata = await sharp(fileBuffer).metadata();
  let width = metadata.width;
  let height = metadata.height;
  if (!width || !height) {
    const dims = sizeOf(fileBuffer);
    width = dims.width;
    height = dims.height;
  }
  if (!width || !height) {
    throw new Error('Could not determine image dimensions for in-memory normalize.');
  }

  let pipeline = sharp(fileBuffer).rotate();
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const webpBuffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();

  const outMeta = await sharp(webpBuffer).metadata();
  const outW = outMeta.width ?? width;
  const outH = outMeta.height ?? height;

  return { webpBuffer, width: outW, height: outH };
}
