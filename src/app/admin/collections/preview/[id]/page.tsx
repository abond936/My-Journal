import { notFound } from 'next/navigation';
import CollectionShadowPreview from '@/components/admin/collections/CollectionShadowPreview';
import { getCollectionProjectionReadModel } from '@/lib/services/collections/collectionProjectionReadService';

export const dynamic = 'force-dynamic';

export default async function CollectionShadowPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const readModel = await getCollectionProjectionReadModel(id);
  if (!readModel || readModel.projection.collection.recordState !== 'shadow') notFound();
  return <CollectionShadowPreview projection={readModel.projection} readiness={readModel.readiness} />;
}
