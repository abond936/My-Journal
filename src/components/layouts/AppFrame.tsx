'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/navigation/Navigation';
import LifeStagesSidebar from '@/components/navigation/LifeStagesSidebar';
import styles from '@/lib/styles/components/layouts/AppFrame.module.css';

interface AppFrameProps {
  children: React.ReactNode;
  onTagSelect?: (tagId: string | null) => void;
}

export default function AppFrame({ children, onTagSelect }: AppFrameProps) {
  const pathname = usePathname();
  const isEditPage = pathname?.startsWith('/edit');
  const isHomePage = pathname === '/';
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <div className={styles.frame}>
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