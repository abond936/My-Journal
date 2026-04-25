'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminNavTabs.module.css';

/** Primary admin IA: Studio plus remaining dedicated admin pages. */
const primaryTabs = [
  { name: 'Studio', href: '/admin/studio' },
  { name: 'Questions', href: '/admin/question-admin' },
  { name: 'Theme', href: '/admin/theme-admin' },
  { name: 'Users', href: '/admin/journal-users' },
];

export default function AdminNavTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Admin sections">
      <div className={styles.navPrimary}>
        {primaryTabs.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
