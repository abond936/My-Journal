'use client';

import React, { createContext, useContext } from 'react';
import type { Media } from '@/lib/types/photo';

export type CardFormSurfaceContextValue = {
  /** Compact authoring presentation used by bounded modal and Studio surfaces. */
  compact: boolean;
  /** Enables Studio-only bank/tree relationship drag targets. */
  enableStudioRelationshipDnd?: boolean;
  activeCardId?: string | null;
  reloadCard?: (cardId: string) => void;
  openMediaEditor?: (mediaId: string) => void;
  registerBodyMediaInsert?: (handler: ((media: Media) => void) | null) => void;
};

const CardFormSurfaceContext = createContext<CardFormSurfaceContextValue | null>(null);

export function CardFormSurfaceProvider({ value, children }: {
  value: CardFormSurfaceContextValue;
  children: React.ReactNode;
}) {
  return <CardFormSurfaceContext.Provider value={value}>{children}</CardFormSurfaceContext.Provider>;
}

export function useCardFormSurfaceOptional(): CardFormSurfaceContextValue | null {
  return useContext(CardFormSurfaceContext);
}
