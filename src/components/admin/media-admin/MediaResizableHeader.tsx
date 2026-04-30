'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { DND_POINTER_IGNORE_ATTR } from '@/lib/hooks/useDefaultDndSensors';
import styles from './MediaAdminList.module.css';

interface MediaResizableHeaderProps {
  width: number;
  minWidth?: number;
  maxWidth?: number;
  onResize: (width: number) => void;
  children: React.ReactNode;
}

export default function MediaResizableHeader({ 
  width, 
  minWidth = 60, 
  maxWidth = 800,
  onResize, 
  children 
}: MediaResizableHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(width);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const diff = e.clientX - startX;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + diff));
    onResize(newWidth);
  }, [isResizing, startX, startWidth, minWidth, maxWidth, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <th
      className={`${styles.headerCell} ${styles.resizableHeader} ${isResizing ? styles.resizing : ''}`}
      style={{ width: `${width}px` }}
    >
      <div className={styles.headerContent}>{children}</div>
      <div
        className={styles.resizeHandle}
        {...{ [DND_POINTER_IGNORE_ATTR]: '' }}
        onMouseDown={handleMouseDown}
      />
    </th>
  );
} 