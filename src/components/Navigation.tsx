'use client';

// Navigation.tsx - Main navigation component
// This component provides the primary navigation for the application
// It includes a responsive design that collapses into a hamburger menu on mobile

import React, { useState } from 'react';
import Link from 'next/link';
import styles from '../styles/components/navigation/Navigation.module.css';

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className }) => {
  // State to track if mobile menu is open
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className={`${styles.navigation} ${className || ''}`}>
      <div className={styles.navContainer}>
        {/* Logo/Home link */}
        <Link href="/" className={styles.logo}>
          My Journal
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
          <Link href="/" className={styles.navLink}>
            Home
          </Link>
          <Link href="/stories" className={styles.navLink}>
            Stories
          </Link>
          <Link href="/albums" className={styles.navLink}>
            Albums
          </Link>
          <Link href="/timeline" className={styles.navLink}>
            Timeline
          </Link>
          <Link href="/stories/about" className={styles.navLink}>
            About
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 