import React from 'react';
import CardAdminClientPage from '../CardAdminClientPage';

// This is a server component that handles fetching the initial card data.
// It extracts the cardId from the URL params and passes it to the client page component.
export default function EditCardPage({ params }: { params: { id: string } }) {
  return <CardAdminClientPage cardId={params.id} />;
} 