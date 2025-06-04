'use client';

// Home.tsx - Main landing page component

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/components/view/Home.module.css';

const Home: React.FC = () => {
  const router = useRouter();

  const handleEnter = () => {
    router.push('/view/entry-view');
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Top corner graphic */}
      <div className={styles.topCorner}>
        <img src="/images/uploads/top-corner.png" alt="" />
      </div>

      {/* Main content area */}
      <div className={styles.contentWrapper}>
        {/* Title section */}
        <div className={styles.titleSection}>
          <img 
            src="/images/uploads/Title.jpg" 
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
          <button 
            onClick={handleEnter}
            className={styles.enterButton}
          >
            Enter
          </button>
        </section>
      </div>

      {/* Bottom corner graphic */}
      <div className={styles.bottomCorner}>
        <img src="/images/uploads/bottom-corner.png" alt="" />
      </div>
    </div>
  );
};

export default Home;