'use client';

// Navigation.tsx - Main navigation component
// It includes a responsive design that collapses into a hamburger menu on mobile

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import styles from './Navigation.module.css';

interface NavigationProps {
  className?: string;
  sidebarOpen?: boolean;
}

function useReaderBackTarget(pathname: string | null): { showBack: boolean; backHref: string } {
  return useMemo(() => {
    if (!pathname || pathname === '/') {
      return { showBack: false, backHref: '/view' };
    }
    if (pathname.startsWith('/admin')) {
      return { showBack: false, backHref: '/view' };
    }
    const onMainReaderFeed = pathname === '/view';
    if (onMainReaderFeed) {
      return { showBack: false, backHref: '/view' };
    }
    if (pathname.startsWith('/view/')) {
      return { showBack: true, backHref: '/view' };
    }
    if (pathname === '/search') {
      return { showBack: true, backHref: '/view' };
    }
    return { showBack: true, backHref: '/view' };
  }, [pathname]);
}

const Navigation: React.FC<NavigationProps> = ({ className, sidebarOpen }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { theme, isThemeAdminOpen, openThemeAdmin } = useTheme();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const { showBack, backHref } = useReaderBackTarget(pathname);
  const isThemeAdminRoute = (pathname?.startsWith('/admin/theme-admin') ?? false) || isThemeAdminOpen;
  const isGeneralAdminRoute = Boolean(pathname?.startsWith('/admin') && !isThemeAdminRoute);

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
        <div className={styles.leftSlot}>
          {showBack ? (
            <Link href={backHref} className={styles.backLink}>
              ← Back
            </Link>
          ) : (
            <span className={styles.edgeSpacer} aria-hidden />
          )}
        </div>

        <div className={styles.centerSlot}>
          <Link href="/view" className={styles.logo}>
            <Image
              src={`/images/uploads/Title-${theme === 'dark' ? 'dark' : 'light'}.png`}
              alt="My Stories - Michael Alan Bond"
              className={styles.logoImage}
              width={225}
              height={113}
              sizes="(max-width: 768px) 160px, 225px"
              priority={true}
            />
            <span className={styles.logoIcon} aria-hidden="true">
              📖
            </span>
          </Link>
        </div>

        <div className={styles.rightSlot}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={toggleMenu}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span className={`${styles.hamburger} ${isMenuOpen ? styles.open : ''}`} />
          </button>
        </div>

        <div className={`${styles.navLinks} ${isMenuOpen ? styles.open : ''}`}>
          <Link
            href="/view"
            className={`${styles.navLink} ${pathname === '/view' ? styles.active : ''}`}
          >
            Content
          </Link>
          {isAdmin && (
            <span className={styles.adminLinksDesktopOnly}>
              <Link
                href="/admin/studio"
                className={`${styles.navLink} ${isGeneralAdminRoute ? styles.active : ''}`}
              >
                Admin
              </Link>
              <Link
                href="/admin/theme-admin"
                className={`${styles.navLink} ${isThemeAdminRoute ? styles.active : ''}`}
                onClick={(event) => {
                  event.preventDefault();
                  openThemeAdmin();
                  router.replace(pathname || '/view');
                }}
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
