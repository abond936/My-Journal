'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useTheme } from '@/components/providers/ThemeProvider';
import { getTitleLogoSrc } from '@/lib/utils/titleLogo';
import styles from './Navigation.module.css';

interface NavigationProps {
  className?: string;
  sidebarOpen?: boolean;
}

function useReaderBackTarget(pathname: string | null): { showBack: boolean; backHref: string } {
  return useMemo(() => {
    if (!pathname || pathname === '/' || pathname === '/view' || pathname.startsWith('/admin')) {
      return { showBack: false, backHref: '/view' };
    }
    if (pathname.startsWith('/view/') || pathname === '/search') {
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
  const { data: session } = useSession();
  const { theme, isThemeAdminOpen, openThemeAdmin } = useTheme();
  const isAdmin = session?.user?.role === 'admin';
  const { showBack, backHref } = useReaderBackTarget(pathname);
  const isThemeAdminRoute = (pathname?.startsWith('/admin/theme-admin') ?? false) || isThemeAdminOpen;
  const isStudioRoute = Boolean(pathname?.startsWith('/admin/studio'));
  const isUsersRoute = Boolean(pathname?.startsWith('/admin/journal-users'));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const element = navRef.current;
      if (element && !element.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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

  if (!mounted) {
    return null;
  }

  return (
    <nav ref={navRef} className={`${styles.navigation} ${className || ''}`}>
      <div className={`${styles.navContainer} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.leftSlot}>
          {showBack ? (
            <Link
              href={backHref}
              className={`${styles.backLink} ${sidebarOpen ? styles.backLinkSidebarOpen : styles.backLinkSidebarClosed}`}
            >
              Back
            </Link>
          ) : (
            <span className={styles.edgeSpacer} aria-hidden />
          )}
        </div>

        <div className={styles.centerSlot}>
          <Link href="/view" className={styles.logo}>
            <Image
              src={getTitleLogoSrc(theme === 'dark' ? 'dark' : 'light')}
              alt="My Stories"
              className={`${styles.logoImage} ${theme === 'dark' ? styles.logoImageDark : styles.logoImageLight}`}
              width={225}
              height={113}
              sizes="(max-width: 768px) 160px, 225px"
              priority
            />
          </Link>
        </div>

        <div className={styles.rightSlot}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span className={`${styles.hamburger} ${isMenuOpen ? styles.open : ''}`} />
          </button>
        </div>

        <div className={`${styles.navLinks} ${isMenuOpen ? styles.open : ''}`}>
          <Link href="/view" className={`${styles.navLink} ${pathname === '/view' ? styles.active : ''}`}>
            Content
          </Link>
          <Link
            href="/my-stories/1"
            className={`${styles.navLink} ${pathname === '/my-stories/1' ? styles.active : ''}`}
          >
            Landing Page 1
          </Link>
          <Link
            href="/my-stories/2"
            className={`${styles.navLink} ${pathname === '/my-stories/2' ? styles.active : ''}`}
          >
            Landing Page 2
          </Link>
          <Link
            href="/my-stories/3"
            className={`${styles.navLink} ${pathname === '/my-stories/3' ? styles.active : ''}`}
          >
            Landing Page 3
          </Link>
          {isAdmin ? (
            <>
              <Link
                href="/admin/studio"
                className={`${styles.navLink} ${isStudioRoute ? styles.active : ''}`}
              >
                Studio
              </Link>
              <Link
                href="/admin/journal-users"
                className={`${styles.navLink} ${isUsersRoute ? styles.active : ''}`}
              >
                Users
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
                Theme
              </Link>
            </>
          ) : null}
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
