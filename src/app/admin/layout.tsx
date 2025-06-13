import React from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import ViewLayout from '@/components/view/ViewLayout';
import AdminFAB from '@/components/admin/AdminFAB';

export default async function AdminLayout({
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
    <ViewLayout>
      {children}
      <AdminFAB />
    </ViewLayout>
  );
} 