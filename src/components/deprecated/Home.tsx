'use client';

// Home.tsx - Main landing page component
// This component will serve as the entry point for our digital memoir
// It will eventually display featured stories and navigation options

import React from 'react';
import styles from '../styles/themes/Home.module.css';

const Home: React.FC = () => {
  return (
    <div className={styles.pageWrapper}>
      {/* Top corner graphic */}
      <div className={styles.topCorner}>
        <img src="/images/top-corner.png" alt="" />
      </div>

      {/* Main content area */}
      <div className={styles.contentWrapper}>
        {/* Title section */}
        <div className={styles.titleSection}>
          <img 
            src="/images/Title.jpg" 
            alt="My Stories - Michael Alan Bond" 
            className={styles.titleImage}
          />
        </div>

        {/* Welcome message */}
        <section className={styles.welcomeSection}>
          <p className={styles.welcomeText}>
            Welcome to my digital memoir.<br />
            Stories about the people, places, and events of my life.
          </p>
        </section>
      </div>

      {/* Bottom corner graphic */}
      <div className={styles.bottomCorner}>
        <img src="/images/bottom-corner.png" alt="" />
      </div>
    </div>
  );
};

export default Home;