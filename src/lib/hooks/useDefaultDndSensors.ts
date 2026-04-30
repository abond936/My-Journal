'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type PointerSensorOptions,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Mark column / pane resize handles with this attribute so they do not compete with @dnd-kit’s
 * document-level pointer listeners (which prevented Studio Compose↔Media drag from working).
 */
export const DND_POINTER_IGNORE_ATTR = 'data-dnd-pointer-ignore';

const DND_POINTER_IGNORE_SELECTOR = `[${DND_POINTER_IGNORE_ATTR}]`;

/**
 * Same as `PointerSensor`, but never activates from a primary-button down on resize UI
 * (see `DND_POINTER_IGNORE_ATTR`).
 */
class ResizeSafePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (
        { nativeEvent: event }: ReactPointerEvent<Element>,
        { onActivation }: PointerSensorOptions,
      ): boolean => {
        if (!event.isPrimary || event.button !== 0) return false;
        const t = event.target as HTMLElement | null;
        if (t?.closest(DND_POINTER_IGNORE_SELECTOR)) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

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
    useSensor(ResizeSafePointerSensor, { activationConstraint: { distance: d } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}
