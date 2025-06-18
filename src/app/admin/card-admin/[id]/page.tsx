'use client';

import React, { use } from 'react';
import CardAdminClientPage from './CardAdminClientPage';

interface EditCardPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditCardPage({ params }: EditCardPageProps) {
  const { id } = use(params);
  const isNew = id === 'new';
  return <CardAdminClientPage cardId={isNew ? null : id} />;
} 