import type { MutableRefObject } from 'react';
import type { Media } from '@/lib/types/photo';

/** Imperative Studio shell callbacks registered by Compose / Questions / DnD owners. */
export type StudioShellImperativeHandlers = {
  bodyMediaInsert: (media: Media) => void;
  composeLeaveGuard: () => Promise<boolean>;
  questionCardDeleteSync: (cardId: string, questionId?: string | null) => void;
};

export type StudioShellImperativeSlot = keyof StudioShellImperativeHandlers;

export type StudioShellImperativeRegistry = {
  register: <K extends StudioShellImperativeSlot>(
    slot: K,
    handler: StudioShellImperativeHandlers[K] | null
  ) => void;
  get: <K extends StudioShellImperativeSlot>(
    slot: K
  ) => StudioShellImperativeHandlers[K] | null;
  /** Bridge for legacy DnD callers that still read `.current`. */
  bodyMediaInsertRef: MutableRefObject<StudioShellImperativeHandlers['bodyMediaInsert'] | null>;
};

export function createStudioShellImperativeRegistry(): StudioShellImperativeRegistry {
  const handlers: Partial<StudioShellImperativeHandlers> = {};

  const bodyMediaInsertRef: MutableRefObject<StudioShellImperativeHandlers['bodyMediaInsert'] | null> = {
    get current() {
      return handlers.bodyMediaInsert ?? null;
    },
    set current(fn) {
      handlers.bodyMediaInsert = fn;
    },
  };

  return {
    register<K extends StudioShellImperativeSlot>(
      slot: K,
      handler: StudioShellImperativeHandlers[K] | null
    ) {
      if (handler) {
        handlers[slot] = handler;
      } else {
        delete handlers[slot];
      }
    },
    get<K extends StudioShellImperativeSlot>(slot: K): StudioShellImperativeHandlers[K] | null {
      const handler = handlers[slot] as StudioShellImperativeHandlers[K] | undefined;
      return handler ?? null;
    },
    bodyMediaInsertRef,
  };
}
