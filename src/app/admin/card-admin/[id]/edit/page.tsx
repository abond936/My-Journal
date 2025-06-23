import React from 'react';
import CardAdminClientPage from '../CardAdminClientPage';

// This is the server component page for editing a specific card.
// It extracts the cardId from the URL params and passes it to the client page component.
export default async function EditCardPage({ params: { id } }: { params: { id: string } }) {
  return <CardAdminClientPage cardId={id} />;
} 