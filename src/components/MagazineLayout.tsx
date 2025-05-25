'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './MagazineLayout.module.css';

interface MagazineLayoutProps {
  children: React.ReactNode;
  title: string;
  date: string;
  category: string;
  featuredImage?: string;
}

const MagazineLayout: React.FC<MagazineLayoutProps> = ({
  children,
  title,
  date,
  category,
  featuredImage
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <motion.section 
        className={styles.hero}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {featuredImage && (
          <div className={styles.heroImage}>
            <img src={featuredImage} alt={title} />
          </div>
        )}
        <div className={styles.heroContent}>
          <motion.span 
            className={styles.category}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {category}
          </motion.span>
          <motion.h1 
            className={styles.title}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {title}
          </motion.h1>
          <motion.time 
            className={styles.date}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {date}
          </motion.time>
        </div>
      </motion.section>

      {/* Floating Navigation */}
      <motion.nav 
        className={`${styles.navigation} ${isScrolled ? styles.scrolled : ''}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.navContent}>
          <div className={styles.navLeft}>
            <span className={styles.navCategory}>{category}</span>
          </div>
          <div className={styles.navRight}>
            <button className={styles.navButton}>Share</button>
            <button className={styles.navButton}>Bookmark</button>
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarContent}>
            <h3 className={styles.sidebarTitle}>Related Stories</h3>
            {/* Add related stories here */}
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLeft}>
            <h3 className={styles.footerTitle}>Explore More</h3>
            {/* Add navigation links here */}
          </div>
          <div className={styles.footerRight}>
            <p className={styles.footerText}>
              A journey through time, preserved in stories and memories.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MagazineLayout; 