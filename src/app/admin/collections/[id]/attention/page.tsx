import { notFound } from 'next/navigation';
import CollectionAttentionReview from '@/components/admin/dashboard/CollectionAttentionReview';
import { getCollectionPublicationAttentionDetails } from '@/lib/services/publicationReadinessService';

export const dynamic = 'force-dynamic';

export default async function CollectionAttentionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getCollectionPublicationAttentionDetails(id);
  if (!details) notFound();
  return <CollectionAttentionReview details={details} />;
}
