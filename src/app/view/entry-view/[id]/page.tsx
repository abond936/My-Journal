'use client';

import { use } from 'react';
import { useEntry } from '@/lib/hooks/useEntry';
import EntryLayout from '@/components/view/entry-view/EntryLayout';

interface EntryViewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EntryViewPage({ params }: EntryViewPageProps) {
  const { id } = use(params);
  const { entry, loading, error } = useEntry(id);

  const loadingOrErrorStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.2rem',
  };

  if (loading) {
    return <div style={loadingOrErrorStyle}>Loading entry...</div>;
  }

  if (error) {
    return <div style={{ ...loadingOrErrorStyle, color: 'red' }}>{error.message}</div>;
  }

  if (!entry) {
    return <div style={loadingOrErrorStyle}>Entry not found.</div>;
  }

  return <EntryLayout entry={entry} />;
} 