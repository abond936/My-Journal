'use client';

import React from 'react';
import { Editor } from '@tiptap/core';
import styles from './ImageToolbar.module.css';
import type { FigureImageSize } from '@/lib/tiptap/extensions/FigureWithImage';

interface ImageToolbarProps {
  editor: Editor;
  onAction: (action: 'setSize' | 'setAlignment' | 'setWrap' | 'delete', value?: string) => void;
  targetLabel?: string;
  canRemove?: boolean;
  currentSize?: FigureImageSize;
  currentAlignment?: 'left' | 'center' | 'right';
  currentWrap?: 'on' | 'off';
}

const ImageToolbar = ({
  editor,
  onAction,
  targetLabel,
  canRemove = true,
  currentSize,
  currentAlignment,
  currentWrap,
}: ImageToolbarProps) => {
  const size = currentSize ?? editor.getAttributes('figureWithImage')['data-size'];
  const alignment = currentAlignment ?? editor.getAttributes('figureWithImage')['data-alignment'];
  const wrap = currentWrap ?? editor.getAttributes('figureWithImage')['data-wrap'];

  const handlePress = (e: React.MouseEvent<HTMLButtonElement>, action: 'setSize' | 'setAlignment' | 'setWrap' | 'delete', value?: string) => {
    e.preventDefault();
    onAction(action, value);
  };

  return (
    <div className={styles.imageToolbar}>
      {targetLabel ? <div className={styles.targetInfo}>Selected: {targetLabel}</div> : null}
      <div className={styles.toolbarSection}>
        <label className={styles.toolbarLabel}>Size:</label>
        <div className={styles.buttonGroup}>
          <button onMouseDown={(e) => handlePress(e, 'setSize', 'xsmall')} type="button" className={`${styles.toolbarButton} ${size === 'xsmall' ? styles.active : ''}`} title="Extra small">xs</button>
          <button onMouseDown={(e) => handlePress(e, 'setSize', 'small')} type="button" className={`${styles.toolbarButton} ${size === 'small' ? styles.active : ''}`}>sm</button>
          <button onMouseDown={(e) => handlePress(e, 'setSize', 'medium')} type="button" className={`${styles.toolbarButton} ${size === 'medium' ? styles.active : ''}`}>md</button>
          <button onMouseDown={(e) => handlePress(e, 'setSize', 'large')} type="button" className={`${styles.toolbarButton} ${size === 'large' ? styles.active : ''}`}>lg</button>
        </div>
      </div>
      <div className={styles.toolbarSection}>
        <label className={styles.toolbarLabel}>Align:</label>
        <div className={styles.buttonGroup}>
          <button onMouseDown={(e) => handlePress(e, 'setAlignment', 'left')} type="button" className={`${styles.toolbarButton} ${alignment === 'left' ? styles.active : ''}`}>L</button>
          <button onMouseDown={(e) => handlePress(e, 'setAlignment', 'center')} type="button" className={`${styles.toolbarButton} ${alignment === 'center' ? styles.active : ''}`}>C</button>
          <button onMouseDown={(e) => handlePress(e, 'setAlignment', 'right')} type="button" className={`${styles.toolbarButton} ${alignment === 'right' ? styles.active : ''}`}>R</button>
        </div>
      </div>
      <div className={styles.toolbarSection}>
        <label className={styles.toolbarLabel}>Wrap:</label>
        <div className={styles.buttonGroup}>
          <button onMouseDown={(e) => handlePress(e, 'setWrap', 'on')} type="button" className={`${styles.toolbarButton} ${wrap === 'on' ? styles.active : ''}`}>On</button>
          <button onMouseDown={(e) => handlePress(e, 'setWrap', 'off')} type="button" className={`${styles.toolbarButton} ${wrap === 'off' ? styles.active : ''}`}>Off</button>
        </div>
      </div>
      <div className={styles.toolbarSection}>
        <button
          onMouseDown={(e) => handlePress(e, 'delete')}
          type="button"
          className={`${styles.toolbarButton} ${styles.dangerButton}`}
          disabled={!canRemove}
          title={targetLabel ? `Remove ${targetLabel}` : 'Remove selected image'}
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default ImageToolbar;