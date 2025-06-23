import React from 'react';
import CardAdminClientPage from '../CardAdminClientPage';

// This page is for editing an existing card.
// It extracts the cardId from the URL params and passes it to the client page component.
export default function EditCardPage({ params }: { params: { id: string } }) {
  return <CardAdminClientPage cardId={params.id} />;
} 