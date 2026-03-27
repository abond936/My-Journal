'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminNavTabs.module.css';

const tabs = [
  { name: 'Cards', href: '/admin/card-admin' },
  { name: 'Media', href: '/admin/media-admin' },
  { name: 'Collections', href: '/admin/collections' },
  { name: 'Tags', href: '/admin/tag-admin' },
  { name: 'Questions', href: '/admin/question-admin' },
  { name: 'Theme', href: '/admin/theme-admin' },
  { name: 'Users', href: '/admin/journal-users' },
];

export default function AdminNavTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {tabs.map(link => {
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
    </nav>
  );
} 

