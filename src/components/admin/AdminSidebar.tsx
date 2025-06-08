'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';

const adminLinks = [
  { href: '/admin/entry-admin', label: 'Entries' },
  { href: '/admin/album-admin', label: 'Albums' },
  { href: '/admin/tag-admin', label: 'Tags' },
  // Add other admin links here
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className={styles.sidebar}>
      <h3>Admin Menu</h3>
      <ul>
        {adminLinks.map(link => (
          <li key={link.href}>
            <Link href={link.href} className={pathname === link.href ? styles.active : ''}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
} 