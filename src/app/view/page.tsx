'use client';

import React from 'react';
import Link from 'next/link';
import styles from './ViewChoice.module.css';

export default function ViewChoicePage() {
  return (
    <div className={styles.container}>
      <div className={styles.choiceBox}>
        <h1 className={styles.title}>Choose Your Experience</h1>
        <p className={styles.description}>
          Select which version of the journal you would like to view.
        </p>
        <div className={styles.buttonGroup}>
          <Link href="/view/legacy-feed" className={styles.button}>
            Legacy View
          </Link>
          <Link href="/cards" className={`${styles.button} ${styles.modern}`}>
            Modern View
          </Link>
        </div>
      </div>
    </div>
  );
}