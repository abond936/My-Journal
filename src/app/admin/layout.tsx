'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/styles/app/admin/layout.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <nav>
          <div className={styles.section}>
            <h3>Content Management</h3>
            <ul>
              <li>
                <Link 
                  href="/admin/entries" 
                  className={isActive('/admin/entries') ? styles.active : ''}
                >
                  Entries
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/albums" 
                  className={isActive('/admin/albums') ? styles.active : ''}
                >
                  Albums
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/tags" 
                  className={isActive('/admin/tags') ? styles.active : ''}
                >
                  Tags
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
} 