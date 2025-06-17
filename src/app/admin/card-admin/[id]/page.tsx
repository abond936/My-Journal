'use client';

import React from 'react';
import CardAdminClientPage from './CardAdminClientPage';

interface EditCardPageProps {
  params: {
    id: string;
  };
}

export default function EditCardPage({ params }: EditCardPageProps) {
  const isNew = params.id === 'new';
  return <CardAdminClientPage cardId={isNew ? null : params.id} />;
} 