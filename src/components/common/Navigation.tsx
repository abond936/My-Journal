'use client';

// Navigation.tsx - Main navigation component
// This component provides the primary navigation for the application
// It includes a responsive design that collapses into a hamburger menu on mobile

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import styles from './Navigation.module.css';

interface NavigationProps {
  className?: string;
  sidebarOpen?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ className, sidebarOpen }) => {
  // State to track if mobile menu is open
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (!mounted) {
    return null;
  }

  return (
    <nav className={`${styles.navigation} ${className || ''}`}>
      <div className={`${styles.navContainer} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo/Home link */}
        <Link href="/" className={styles.logo}>
          <img 
            src="/images/uploads/Title.jpg" 
            alt="My Stories - Michael Alan Bond" 
            className={styles.logoImage}
          />
        </Link>

        {/* Mobile menu button */}
        <button 
          className={styles.menuButton}
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <span className={`${styles.hamburger} ${isMenuOpen ? styles.open : ''}`}></span>
        </button>

        {/* Navigation links */}
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
          <Link
            href="/admin/entry-admin"
            className={`${styles.navLink} ${
              pathname?.startsWith('/admin')
                ? styles.active
                : ''
            }`}
          >
            Admin
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 