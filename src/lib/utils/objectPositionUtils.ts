/**
 * Utility functions for calculating object-position from focal points
 * across different aspect ratios and container sizes.
 */

interface FocalPoint {
  x: number;
  y: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface ContainerDimensions {
  width: number;
  height: number;
}

export type AspectRatioBucket = 'portrait' | 'landscape' | 'square';

/**
 * Calculate object-position percentage to center a focal point in the container.
 * Uses the formula from https://odland.dev/2023/02/26/cropping-images-with-css-while-keeping-a-focal-point-in-the-center/
 * @param focalPoint - Pixel coordinates of the focal point relative to original image
 * @param originalImage - Dimensions of the original image
 * @param targetContainer - Dimensions of the target container
 * @returns CSS object-position string (e.g., "50% 50%")
 */
export function calculateObjectPosition(
  focalPoint: FocalPoint,
  originalImage: ImageDimensions,
  targetContainer: ContainerDimensions
): string {
  const scaleX = targetContainer.width / originalImage.width;
  const scaleY = targetContainer.height / originalImage.height;
  const scale = Math.max(scaleX, scaleY); // object-fit: cover uses the larger scale

  const scaledWidth = originalImage.width * scale;
  const scaledHeight = originalImage.height * scale;

  // Focal point as fraction of original image (0–1)
  const focalXFraction = originalImage.width > 0 ? focalPoint.x / originalImage.width : 0.5;
  const focalYFraction = originalImage.height > 0 ? focalPoint.y / originalImage.height : 0.5;

  // Offset needed to place focal point at container center:
  // pos = 0.5 * container - focalFraction * scaledImage
  const posX = 0.5 * targetContainer.width - focalXFraction * scaledWidth;
  const posY = 0.5 * targetContainer.height - focalYFraction * scaledHeight;

  // object-position percentage: pos / (container - scaledImage)
  const denomX = targetContainer.width - scaledWidth;
  const denomY = targetContainer.height - scaledHeight;
  let percentX = 50;
  let percentY = 50;
  if (Math.abs(denomX) > 1e-6) {
    percentX = (posX / denomX) * 100;
  }
  if (Math.abs(denomY) > 1e-6) {
    percentY = (posY / denomY) * 100;
  }

  // Clamp to 0–100 (keeps image edges from entering container)
  const clampedX = Math.max(0, Math.min(100, percentX));
  const clampedY = Math.max(0, Math.min(100, percentY));

  return `${clampedX}% ${clampedY}%`;
}

/**
 * Get object-position for common aspect ratios
 * @param focalPoint - Focal point coordinates
 * @param originalImage - Original image dimensions
 * @param aspectRatio - Target aspect ratio (e.g., "16/9", "4/5", "1/1")
 * @param baseWidth - Base width for calculation (height will be calculated)
 * @returns CSS object-position string
 */
export function getObjectPositionForAspectRatio(
  focalPoint: FocalPoint,
  originalImage: ImageDimensions,
  aspectRatio: string,
  baseWidth: number = 600
): string {
  const [widthRatio, heightRatio] = aspectRatio.split('/').map(Number);
  const baseHeight = (baseWidth * heightRatio) / widthRatio;
  
  return calculateObjectPosition(
    focalPoint,
    originalImage,
    { width: baseWidth, height: baseHeight }
  );
} 

/**
 * Buckets media orientation into a bounded set used by reader/admin framing.
 */
export function getAspectRatioBucket(
  media?: { width?: number; height?: number } | null
): AspectRatioBucket {
  const width = media?.width ?? 0;
  const height = media?.height ?? 0;
  if (width <= 0 || height <= 0) return 'portrait';
  const ratio = width / height;
  if (Math.abs(ratio - 1) <= 0.08) return 'square';
  return ratio > 1 ? 'landscape' : 'portrait';
}

/**
 * Ratio contract for edit/view surfaces.
 */
export function getAspectRatioValue(bucket: AspectRatioBucket): '4/5' | '3/2' | '1/1' {
  if (bucket === 'landscape') return '3/2';
  if (bucket === 'square') return '1/1';
  return '4/5';
}