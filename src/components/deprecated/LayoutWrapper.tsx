'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import LifeStagesSidebar from '@/components/deprecated/LifeStagesSidebar';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditPage = pathname?.startsWith('/edit');

  return (
    <>
      {!isEditPage && <Navigation />}
      <div className={`flex ${isEditPage ? 'h-screen' : 'h-[calc(100vh-64px)]'}`}>
        {!isEditPage && <LifeStagesSidebar />}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </>
  );
} 