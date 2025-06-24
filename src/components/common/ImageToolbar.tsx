'use client';

import React from 'react';
import { Editor } from '@tiptap/core';
import styles from './ImageToolbar.module.css';

interface ImageToolbarProps {
  editor: Editor;
  onAction: (action: 'setSize' | 'setAlignment' | 'setAspectRatio' | 'delete', value?: string) => void;
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
        <div className={styles.buttonGroup}>
            <button
                type="button"
                className={`${styles.toolbarButton} ${styles.dangerButton}`}
                onClick={() => onAction('delete')}
            >
                Remove
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImageToolbar; 