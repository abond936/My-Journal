'use client';

import React, { createContext, useContext } from 'react';

export type StudioCardFormStudioContextValue = {
  /** When true, CardForm uses Studio shell DnD targets and compact inline tags. */
  studioShellCardForm: boolean;
};

const StudioCardFormStudioContext = createContext<StudioCardFormStudioContextValue | null>(null);

export function StudioCardFormStudioProvider({
  value,
  children,
}: {
  value: StudioCardFormStudioContextValue;
  children: React.ReactNode;
}) {
  return <StudioCardFormStudioContext.Provider value={value}>{children}</StudioCardFormStudioContext.Provider>;
}

export function useStudioCardFormStudioOptional(): StudioCardFormStudioContextValue | null {
  return useContext(StudioCardFormStudioContext);
}
