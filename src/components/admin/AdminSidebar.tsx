'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';

export default function AdminSidebar() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <nav className={styles.adminNav}>
      <div className={styles.section}>
        <h3>Content Management</h3>
        <ul>
          <li>
            <Link 
              href="/admin/entry-admin" 
              className={isActive('/admin/entry-admin') ? styles.active : ''}
            >
              Entries
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/album-admin" 
              className={isActive('/admin/album-admin') ? styles.active : ''}
            >
              Albums
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/tag-admin" 
              className={isActive('/admin/tag-admin') ? styles.active : ''}
            >
              Tags
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
} 