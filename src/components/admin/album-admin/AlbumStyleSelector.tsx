'use client';

import { useState, useEffect } from 'react';
import { AlbumStyle } from '@/lib/types/album';
import styles from './AlbumStyleSelector.module.css';

interface AlbumStyleSelectorProps {
  selectedStyleId?: string;
  onStyleSelect: (styleId: string) => void;
}

const mockStyles: AlbumStyle[] = [
  { id: 'default', name: 'Default', backgroundColor: '#FFFFFF', textColor: '#000000' },
  { id: 'dark', name: 'Dark', backgroundColor: '#1a1a1a', textColor: '#FFFFFF' },
  { id: 'sepia', name: 'Sepia', backgroundColor: '#f4eada', textColor: '#5b4636' },
  { id: 'scrapbook', name: 'Scrapbook', backgroundImage: 'url("/patterns/scrapbook.png")', fontFamily: "'Caveat', cursive" }
];

export default function AlbumStyleSelector({ selectedStyleId, onStyleSelect }: AlbumStyleSelectorProps) {
  const [styles, setStyles] = useState<AlbumStyle[]>(mockStyles);
  // In a real app, you would fetch these from a database:
  // useEffect(() => {
  //   fetch('/api/album-styles').then(res => res.json()).then(setStyles);
  // }, []);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Album Style</h3>
      <div className={styles.styleGrid}>
        {styles.map(style => (
          <div 
            key={style.id}
            className={`${styles.styleCard} ${selectedStyleId === style.id ? styles.selected : ''}`}
            onClick={() => onStyleSelect(style.id)}
            style={{ 
              backgroundColor: style.backgroundColor, 
              color: style.textColor,
              fontFamily: style.fontFamily,
              backgroundImage: style.backgroundImage,
            }}
          >
            {style.name}
          </div>
        ))}
      </div>
    </div>
  );
} 