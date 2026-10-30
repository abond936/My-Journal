import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import AuthorDashboard from '@/components/admin/dashboard/AuthorDashboard';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { getAuthorDashboardSummary } from '@/lib/services/authorDashboardService';
import { buildLoginRedirectPath } from '@/lib/utils/marketingRoutes';

export const dynamic = 'force-dynamic';

export default async function AdminIndexPage() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    redirect(buildLoginRedirectPath('/admin'));
  }

  const summary = await getAuthorDashboardSummary();
  return <AuthorDashboard summary={summary} />;
}
