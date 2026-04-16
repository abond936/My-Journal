'use client';

import React, { createContext, useContext } from 'react';

/** Which curated-tree gesture is active (mutually exclusive collision targets). */
export type CuratedTreeDragKind = null | 'reparent';

const CuratedTreeDragContext = createContext<CuratedTreeDragKind>(null);

export function CuratedTreeDragProvider({
  value,
  children,
}: {
  value: CuratedTreeDragKind;
  children: React.ReactNode;
}) {
  return <CuratedTreeDragContext.Provider value={value}>{children}</CuratedTreeDragContext.Provider>;
}

export function useCuratedTreeDragKind(): CuratedTreeDragKind {
  return useContext(CuratedTreeDragContext);
}
