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

/**
 * Calculate object-position percentage for a given focal point and container
 * @param focalPoint - Pixel coordinates of the focal point relative to original image
 * @param originalImage - Dimensions of the original image
 * @param targetContainer - Dimensions of the target container
 * @returns CSS object-position string (e.g., "25% 75%")
 */
export function calculateObjectPosition(
  focalPoint: FocalPoint,
  originalImage: ImageDimensions,
  targetContainer: ContainerDimensions
): string {
  // Convert focal point to percentages of original image
  const focalXPercent = (focalPoint.x / originalImage.width) * 100;
  const focalYPercent = (focalPoint.y / originalImage.height) * 100;
  
  // Calculate how much the image needs to be scaled to fit the container
  const scaleX = targetContainer.width / originalImage.width;
  const scaleY = targetContainer.height / originalImage.height;
  const scale = Math.max(scaleX, scaleY); // object-fit: cover uses the larger scale
  
  // Calculate the scaled image dimensions
  const scaledImageWidth = originalImage.width * scale;
  const scaledImageHeight = originalImage.height * scale;
  
  // Calculate how much the scaled image extends beyond the container
  const overflowX = scaledImageWidth - targetContainer.width;
  const overflowY = scaledImageHeight - targetContainer.height;
  
  // Calculate the object-position percentages
  const objectX = (focalXPercent * scale - (overflowX / 2)) / targetContainer.width * 100;
  const objectY = (focalYPercent * scale - (overflowY / 2)) / targetContainer.height * 100;
  
  // Clamp values to valid range
  const clampedX = Math.max(0, Math.min(100, objectX));
  const clampedY = Math.max(0, Math.min(100, objectY));
  
  return `${clampedX}% ${clampedY}%`;
}

/**
 * Get object-position for common aspect ratios
 * @param focalPoint - Focal point coordinates
 * @param originalImage - Original image dimensions
 * @param aspectRatio - Target aspect ratio (e.g., "16/9", "4/3", "1/1")
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