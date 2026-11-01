import { z } from 'zod';

export const mediaPresentationRotationSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);

export type MediaPresentationRotation = z.infer<typeof mediaPresentationRotationSchema>;

export function normalizeMediaPresentationRotation(value: unknown): MediaPresentationRotation {
  return value === 90 || value === 180 || value === 270 ? value : 0;
}

export function turnMediaPresentation(
  current: unknown,
  direction: 'left' | 'right'
): MediaPresentationRotation {
  const normalized = normalizeMediaPresentationRotation(current);
  return ((normalized + (direction === 'right' ? 90 : 270)) % 360) as MediaPresentationRotation;
}
