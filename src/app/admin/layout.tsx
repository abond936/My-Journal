import React from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import AdminLayout from '@/components/admin/AdminLayout';
import { TagProvider } from '@/components/providers/TagProvider';
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
    <TagProvider>
      <AdminLayout>
        <AdminPageWrapper>
          {children}
        </AdminPageWrapper>
      </AdminLayout>
    </TagProvider>
  );
} 