import { redirect } from 'next/navigation';

export default async function CardAdminLegacyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/studio?card=${encodeURIComponent(id)}`);
}
