'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { DND_POINTER_IGNORE_ATTR } from '@/lib/hooks/useDefaultDndSensors';
import styles from '@/app/admin/card-admin/card-admin.module.css';

interface ResizableHeaderProps {
  width: number;
  minWidth?: number;
  onResize: (width: number) => void;
  children: React.ReactNode;
  /** Extra class on `<th>` (e.g. tighter padding for cover column). */
  thClassName?: string;
  /**
   * `fixed` — `th` has `width: {width}px` (default).
   * `minWidth` — `th` has `minWidth: {width}px` and `width: auto` so the column can grow in a `table-layout: fixed` + full-width table.
   */
  widthMode?: 'fixed' | 'minWidth';
}

export default function ResizableHeader({ 
  width, 
  minWidth = 50, 
  onResize, 
  children,
  thClassName,
  widthMode = 'fixed',
}: ResizableHeaderProps) {
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

  const thStyle: React.CSSProperties =
    widthMode === 'minWidth'
      ? { minWidth: Math.max(minWidth, width), width: 'auto' }
      : { width: `${width}px` };

  return (
    <th 
      className={`${styles.resizableHeader} ${isResizing ? styles.resizing : ''} ${thClassName ?? ''}`.trim()}
      style={thStyle}
    >
      {children}
      <div
        className={styles.resizeHandle}
        {...{ [DND_POINTER_IGNORE_ATTR]: '' }}
        onMouseDown={handleMouseDown}
      />
    </th>
  );
} 