import React from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminFAB from '@/components/admin/AdminFAB';
import { TagProvider } from '@/components/providers/TagProvider';

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
        {children}
        <AdminFAB />
      </AdminLayout>
    </TagProvider>
  );
} 