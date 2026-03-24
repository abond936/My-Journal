'use client';

// Navigation.tsx - Main navigation component
// This component provides the primary navigation for the application
// It includes a responsive design that collapses into a hamburger menu on mobile

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import styles from './Navigation.module.css';

interface NavigationProps {
  className?: string;
  sidebarOpen?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ className, sidebarOpen }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const pathname = usePathname();
  const { theme } = useTheme();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = navRef.current;
      if (el && !el.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (!mounted) {
    return null;
  }

  return (
    <nav ref={navRef} className={`${styles.navigation} ${className || ''}`}>
      <div className={`${styles.navContainer} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <Link href="/view" className={styles.logo}>
          <Image 
            src={`/images/uploads/Title-${theme === 'dark' ? 'dark' : 'light'}.png`}
            alt="My Stories - Michael Alan Bond" 
            className={styles.logoImage}
            width={225}
            height={113}
            sizes="(max-width: 768px) 40px, 225px"
            priority={true}
          />
          <span className={styles.logoIcon} aria-hidden="true">📖</span>
        </Link>

        <button 
          className={styles.menuButton}
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <span className={`${styles.hamburger} ${isMenuOpen ? styles.open : ''}`}></span>
        </button>

        <div className={`${styles.navLinks} ${isMenuOpen ? styles.open : ''}`}>
          <Link
            href="/view"
            className={`${styles.navLink} ${
              pathname === '/view'
                ? styles.active
                : ''
            }`}
          >
            Content
          </Link>
          {isAdmin && (
            <span className={styles.adminLinksDesktopOnly}>
              <Link
                href="/admin/card-admin"
                className={`${styles.navLink} ${
                  pathname?.startsWith('/admin') ? styles.active : ''
                }`}
              >
                Admin
              </Link>
              <Link
                href="/admin/theme-admin"
                className={`${styles.navLink} ${
                  pathname?.startsWith('/admin/theme-admin') ? styles.active : ''
                }`}
              >
                Theme Settings
              </Link>
            </span>
          )}
          <div className={styles.themeRow}>
            <span>Theme</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            className={styles.signOutButton}
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 