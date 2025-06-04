'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/common/Navigation';
import TagTree from '@/components/common/TagTree';
import styles from './AppFrame.module.css';

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
        {!isHomePage && !isEditPage && !isAdminPage && <TagTree onTagSelect={onTagSelect} />}
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
} 