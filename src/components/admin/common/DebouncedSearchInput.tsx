'use client';

import React, { startTransition, useEffect, useState } from 'react';

type DebouncedSearchInputProps = {
  value: string;
  onCommit: (value: string) => void;
  delayMs?: number;
  id?: string;
  type?: 'search' | 'text';
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  ariaLabel?: string;
};

export default function DebouncedSearchInput({
  value,
  onCommit,
  delayMs = 200,
  id,
  type = 'search',
  placeholder,
  className,
  autoComplete,
  ariaLabel,
}: DebouncedSearchInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        onCommit(draft);
      });
    }, delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, draft, onCommit, value]);

  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      className={className}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
    />
  );
}
