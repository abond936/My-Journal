'use client';

import React from 'react';
import styles from '@/styles/storyTemplates/about.module.css';
import Image from 'next/image';
import { JournalPage } from '@/lib/journal';

interface AboutTemplateProps {
  story: JournalPage;
}

export default function AboutTemplate({ story }: AboutTemplateProps) {
  return (
    <div className={styles.aboutContainer}>
      {/* Top corner graphic */}
      <div className={styles.topCorner}>
        <Image 
          src="/images/top-corner.png" 
          alt="" 
          width={720}
          height={720}
          style={{ width: '100%', height: 'auto' }}
        />
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>{story.heading.title}</h1>
      </header>
      
      <div className={styles.content}>
        {story.content.split('\n\n').map((paragraph, index) => (
          <p key={index} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}
      </div>

      {/* Bottom corner graphic */}
      <div className={styles.bottomCorner}>
        <Image 
          src="/images/bottom-corner.png" 
          alt="" 
          width={720}
          height={720}
          style={{ width: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
} 