import React from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import ViewLayout from '@/components/view/ViewLayout';
import { FilterProvider } from '@/components/providers/FilterProvider';

export default async function ViewSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/?callbackUrl=/view');
  }

  return (
    <FilterProvider>
      <ViewLayout>
        {children}
      </ViewLayout>
    </FilterProvider>
  );
} 