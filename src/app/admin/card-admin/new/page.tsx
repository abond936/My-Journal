import React from 'react';
import CardAdminClientPage from '../[id]/CardAdminClientPage';

// This page is for creating a new card.
// It renders the same client component as the edit page, but passes a null card.
export default function NewCardPage() {
  return <CardAdminClientPage card={null} />;
} 