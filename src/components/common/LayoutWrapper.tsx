'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/navigation/Navigation';
import LifeStagesSidebar from '@/components/navigation/LifeStagesSidebar';
import styles from '@/styles/components/common/LayoutWrapper.module.css';

interface LayoutWrapperProps {
  children: React.ReactNode;
  onTagSelect?: (tagId: string | null) => void;
}

export default function LayoutWrapper({ children, onTagSelect }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isEditPage = pathname?.startsWith('/edit');
  const isHomePage = pathname === '/';
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <div className={styles.layout}>
      {!isHomePage && !isEditPage && <Navigation />}
      <div className={`${styles.content} ${isEditPage ? styles.editPage : ''}`}>
        {!isHomePage && !isEditPage && !isAdminPage && <LifeStagesSidebar onTagSelect={onTagSelect} />}
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
} 