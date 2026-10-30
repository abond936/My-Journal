'use client';

import React, { createContext, useContext } from 'react';
import type { ActiveDimension } from '@/components/providers/CardProvider';

type FeedDimension = Extract<ActiveDimension, 'who' | 'what' | 'when' | 'where'>;

interface ReaderSidebarContextValue {
  openFeedDimension: (dimension: FeedDimension) => void;
}

const ReaderSidebarContext = createContext<ReaderSidebarContextValue | null>(null);

export function ReaderSidebarProvider({
  children,
  openFeedDimension,
}: {
  children: React.ReactNode;
  openFeedDimension: ReaderSidebarContextValue['openFeedDimension'];
}) {
  return (
    <ReaderSidebarContext.Provider value={{ openFeedDimension }}>
      {children}
    </ReaderSidebarContext.Provider>
  );
}

export function useReaderSidebar(): ReaderSidebarContextValue {
  const context = useContext(ReaderSidebarContext);
  if (!context) {
    throw new Error('useReaderSidebar must be used within ReaderSidebarProvider');
  }
  return context;
}
