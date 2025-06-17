'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminNavTabs.module.css';

const adminLinks = [
  { name: 'Cards', href: '/admin/card-admin' },
  { name: 'Entries', href: '/admin/entry-admin' },
  { name: 'Albums', href: '/admin/album-admin' },
  { name: 'Tags', href: '/admin/tag-admin' },
];

export function AdminNavTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {adminLinks.map(link => {
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