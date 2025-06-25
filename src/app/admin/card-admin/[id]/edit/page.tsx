import React from 'react';
import CardAdminClientPage from '../CardAdminClientPage';

export default async function EditCardPage({
  params,
}: {
  params: { id: string };
}) {
  // Explicitly awaiting params because Next.js is passing a promise in this environment.
  const { id } = await params;
  return <CardAdminClientPage cardId={id} />;
}