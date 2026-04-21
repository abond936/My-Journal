'use client';

import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

export type DefaultDndSensorsOptions = {
  /**
   * Minimum pointer movement before a drag starts.
   * Default 8 matches Collections / Studio admin surfaces.
   */
  pointerActivationDistance?: number;
};

/**
 * Pointer + keyboard sensors with @dnd-kit/sortable keyboard coordinates, used everywhere we mount `DndContext`
 * so reorder UIs behave consistently (Space to pick up, arrows, Space to drop).
 */
export function useDefaultDndSensors(options?: DefaultDndSensorsOptions) {
  const d = options?.pointerActivationDistance ?? 8;
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: d } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}
