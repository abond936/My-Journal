import React from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import ViewLayout from '@/components/view/ViewLayout';
import { TagProvider } from '@/components/providers/TagProvider';
import { ContentProvider } from '@/components/providers/ContentProvider';

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
    <ContentProvider>
      <TagProvider>
        <ViewLayout>{children}</ViewLayout>
      </TagProvider>
    </ContentProvider>
  );
} 