import { redirect } from 'next/navigation';

export default async function CardAdminLegacyCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/studio?card=${encodeURIComponent(id)}`);
}
