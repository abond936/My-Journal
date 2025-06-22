'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';

const navItems = [
  { href: '/admin/card-admin', label: 'Cards' },
  { href: '/admin/tag-admin', label: 'Tags' },
  { href: '/admin/image-local', label: 'Local Images' },
  { href: '/admin/image-onedrive', label: 'OneDrive' },
  // Add other admin links here
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className={styles.sidebar}>
      <h3>Admin Menu</h3>
      <ul>
        {navItems.map(link => (
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