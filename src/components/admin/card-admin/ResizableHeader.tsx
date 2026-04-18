'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styles from '@/app/admin/card-admin/card-admin.module.css';

interface ResizableHeaderProps {
  width: number;
  minWidth?: number;
  onResize: (width: number) => void;
  children: React.ReactNode;
  /** Extra class on `<th>` (e.g. tighter padding for cover column). */
  thClassName?: string;
}

export default function ResizableHeader({ 
  width, 
  minWidth = 50, 
  onResize, 
  children,
  thClassName,
}: ResizableHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(width);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const diff = e.clientX - startX;
    const newWidth = Math.max(minWidth, startWidth + diff);
    onResize(newWidth);
  }, [isResizing, startX, startWidth, minWidth, onResize]);

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
      className={`${styles.resizableHeader} ${isResizing ? styles.resizing : ''} ${thClassName ?? ''}`.trim()}
      style={{ width: `${width}px` }}
    >
      {children}
      <div 
        className={styles.resizeHandle}
        onMouseDown={handleMouseDown}
      />
    </th>
  );
} 