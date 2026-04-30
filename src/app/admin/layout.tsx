import React from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/authOptions';
import AdminLayout from '@/components/admin/AdminLayout';
import { MediaProvider } from '@/components/providers/MediaProvider';
import AdminPageWrapper from '@/components/admin/AdminPageWrapper';

export default async function RootAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    // Redirect to the custom sign-in page on the homepage
    redirect('/?callbackUrl=/admin');
  }

  return (
    <MediaProvider>
      <div className="themeDraftAdminScope">
        <AdminLayout>
          <AdminPageWrapper>
            {children}
          </AdminPageWrapper>
        </AdminLayout>
      </div>
    </MediaProvider>
  );
} 
