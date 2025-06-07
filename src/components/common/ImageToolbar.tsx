'use client';

import React from 'react';
import { Editor } from '@tiptap/core';
import styles from './ImageToolbar.module.css';

interface ImageToolbarProps {
  editor: Editor;
  onAction: (type: string, value: string) => void;
}

const ImageToolbar = ({ editor, onAction }: ImageToolbarProps) => {
  const size = editor.getAttributes('figureWithImage')['data-size'] || 'medium';
  const alignment = editor.getAttributes('figureWithImage')['data-alignment'] || 'left';
  const aspectRatio = editor.getAttributes('figureWithImage')['data-aspect-ratio'] || '4:3';

  return (
    <div className={styles.imageToolbar}>
      <div className={styles.toolbarSection}>
        <label>Size:</label>
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={`${styles.toolbarButton} ${size === 'small' ? styles.active : ''}`}
            onClick={() => onAction('setSize', 'small')}
          >
            Small
          </button>
          <button
            type="button"
            className={`${styles.toolbarButton} ${size === 'medium' ? styles.active : ''}`}
            onClick={() => onAction('setSize', 'medium')}
          >
            Medium
          </button>
          <button
            type="button"
            className={`${styles.toolbarButton} ${size === 'large' ? styles.active : ''}`}
            onClick={() => onAction('setSize', 'large')}
          >
            Large
          </button>
        </div>
      </div>
      <div className={styles.toolbarSection}>
        <label>Alignment:</label>
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={`${styles.toolbarButton} ${alignment === 'left' ? styles.active : ''}`}
            onClick={() => onAction('setAlignment', 'left')}
          >
            Left
          </button>
          <button
            type="button"
            className={`${styles.toolbarButton} ${alignment === 'center' ? styles.active : ''}`}
            onClick={() => onAction('setAlignment', 'center')}
          >
            Center
          </button>
          <button
            type="button"
            className={`${styles.toolbarButton} ${alignment === 'right' ? styles.active : ''}`}
            onClick={() => onAction('setAlignment', 'right')}
          >
            Right
          </button>
        </div>
      </div>
      <div className={styles.toolbarSection}>
        <label>Aspect Ratio:</label>
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={`${styles.toolbarButton} ${aspectRatio === '1:1' ? styles.active : ''}`}
            onClick={() => onAction('setAspectRatio', '1:1')}
          >
            1:1
          </button>
          <button
            type="button"
            className={`${styles.toolbarButton} ${aspectRatio === '4:3' ? styles.active : ''}`}
            onClick={() => onAction('setAspectRatio', '4:3')}
          >
            4:3
          </button>
          <button
            type="button"
            className={`${styles.toolbarButton} ${aspectRatio === '16:9' ? styles.active : ''}`}
            onClick={() => onAction('setAspectRatio', '16:9')}
          >
            16:9
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageToolbar; 