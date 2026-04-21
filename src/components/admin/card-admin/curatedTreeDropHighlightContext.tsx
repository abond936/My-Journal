'use client';

import React, { createContext, useContext } from 'react';
import { useDndContext } from '@dnd-kit/core';

/** Current collision target id — same as `DndContext`’s `over` while dragging (insert bar, nest tint, zones). */
const CuratedTreeDropHighlightContext = createContext<string | null>(null);

export function CuratedTreeDropHighlightProvider({
  overId,
  children,
}: {
  overId: string | null;
  children: React.ReactNode;
}) {
  return (
    <CuratedTreeDropHighlightContext.Provider value={overId}>{children}</CuratedTreeDropHighlightContext.Provider>
  );
}

/**
 * Subscribes to live `over` from `DndContext` each render so highlights stay aligned with collision
 * after the tree DOM changes between drags (mirroring only `onDragOver` in parent state could lag).
 */
export function CuratedTreeDropHighlightSync({ children }: { children: React.ReactNode }) {
  const { over } = useDndContext();
  const overId = over?.id != null ? String(over.id) : null;
  return <CuratedTreeDropHighlightProvider overId={overId}>{children}</CuratedTreeDropHighlightProvider>;
}

export function useCuratedTreeDropHighlight(): string | null {
  return useContext(CuratedTreeDropHighlightContext);
}
