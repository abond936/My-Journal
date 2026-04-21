'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminNavTabs.module.css';

/** Primary admin IA: Studio track plus full Card / Media / Tag pages as fallbacks while Studio matures. */
const primaryTabs = [
  { name: 'Studio', href: '/admin/studio' },
  { name: 'Cards', href: '/admin/card-admin' },
  { name: 'Media', href: '/admin/media-admin' },
  { name: 'Tags', href: '/admin/tag-admin' },
  { name: 'Questions', href: '/admin/question-admin' },
  { name: 'Theme', href: '/admin/theme-admin' },
  { name: 'Users', href: '/admin/journal-users' },
];

/** Demoted per Studio IA — still linked for operators who need them before Studio replaces those workflows. */
const supplementaryTabs = [
  { name: 'Collections', href: '/admin/collections' },
  { name: 'Triage', href: '/admin/media-triage' },
];

export default function AdminNavTabs() {
  const pathname = usePathname();

  const renderTab = (link: (typeof primaryTabs)[0], tabClass: string) => {
    const isActive = pathname.startsWith(link.href);
    return (
      <Link
        key={link.name}
        href={link.href}
        className={`${tabClass} ${isActive ? styles.active : ''}`}
      >
        {link.name}
      </Link>
    );
  };

  return (
    <nav className={styles.nav} aria-label="Admin sections">
      <div className={styles.navPrimary}>
        {primaryTabs.map((link) => renderTab(link, styles.tab))}
      </div>
      <div
        className={styles.navSupplementary}
        title="Supplementary routes; prefer Studio when it covers your workflow."
      >
        <span className={styles.navSupplementaryLabel}>Also</span>
        {supplementaryTabs.map((link) => renderTab(link, `${styles.tab} ${styles.tabSupplementary}`))}
      </div>
    </nav>
  );
}

