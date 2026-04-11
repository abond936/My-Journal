'use client';

import React, { useState, useEffect } from 'react';
import { Media } from '@/lib/types/photo';
import { useMedia } from '@/components/providers/MediaProvider';
import MediaAdminRow from './MediaAdminRow';
import MediaResizableHeader from './MediaResizableHeader';
import styles from './MediaAdminList.module.css';

interface ColumnConfig {
  key: string;
  label: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  sortable?: boolean;
}

const MEDIA_COLUMN_WIDTHS_KEY = 'media-admin-column-widths';

const defaultColumns: ColumnConfig[] = [
  { key: 'assignment', label: 'On cards', width: 120, minWidth: 90, maxWidth: 160 },
  { key: 'thumbnail', label: 'Icon', width: 160, minWidth: 130, maxWidth: 240 },
  { key: 'filename', label: 'Filename', width: 250, minWidth: 200, maxWidth: 500, sortable: true },
  { key: 'caption', label: 'Caption', width: 300, minWidth: 200, maxWidth: 600, sortable: true },
  { key: 'width', label: 'Width', width: 100, minWidth: 80, maxWidth: 120 },
  { key: 'height', label: 'Height', width: 100, minWidth: 80, maxWidth: 120 },
  { key: 'size', label: 'Size', width: 120, minWidth: 100, maxWidth: 150, sortable: true },
  { key: 'contentType', label: 'Type', width: 120, minWidth: 100, maxWidth: 150 },
  { key: 'objectPosition', label: 'Object Position', width: 150, minWidth: 120, maxWidth: 200 },
  { key: 'source', label: 'Source', width: 100, minWidth: 80, maxWidth: 120 },
  { key: 'who', label: 'Who', width: 150, minWidth: 100, maxWidth: 280 },
  { key: 'what', label: 'What', width: 150, minWidth: 100, maxWidth: 280 },
  { key: 'when', label: 'When', width: 150, minWidth: 100, maxWidth: 280 },
  { key: 'where', label: 'Where', width: 150, minWidth: 100, maxWidth: 280 },
  { key: 'sourcePath', label: 'Source Path', width: 400, minWidth: 300, maxWidth: 800, sortable: true },
  { key: 'actions', label: 'Actions', width: 120, minWidth: 100, maxWidth: 150 },
];

export default function MediaAdminList() {
  const { 
    media, 
    selectedMediaIds, 
    toggleMediaSelection, 
    selectAll, 
    selectNone 
  } = useMedia();

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(MEDIA_COLUMN_WIDTHS_KEY);
      if (saved) {
        const savedWidths = JSON.parse(saved);
        return defaultColumns.map(col => ({
          ...col,
          width: savedWidths[col.key] || col.width
        }));
      }
    }
    return defaultColumns;
  });

  // Save column configuration to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const widths = columns.reduce((acc, col) => {
        acc[col.key] = col.width;
        return acc;
      }, {} as Record<string, number>);
      localStorage.setItem(MEDIA_COLUMN_WIDTHS_KEY, JSON.stringify(widths));
    }
  }, [columns]);

  const handleColumnResize = (columnKey: string, newWidth: number) => {
    setColumns(prev => prev.map(col => 
      col.key === columnKey ? { ...col, width: newWidth } : col
    ));
  };

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0) + 40; // +40 for checkbox column

  return (
    <div className={styles.container}>
      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table} style={{ width: totalWidth }}>
          <thead>
            <tr>
              <th className={styles.checkboxCell} style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={selectedMediaIds.length === media.length && media.length > 0}
                  onChange={(e) => e.target.checked ? selectAll() : selectNone()}
                />
              </th>
              {columns.map((column) => (
                <MediaResizableHeader
                  key={column.key}
                  width={column.width}
                  minWidth={column.minWidth}
                  maxWidth={column.maxWidth}
                  onResize={(width) => handleColumnResize(column.key, width)}
                >
                  {column.label}
                </MediaResizableHeader>
              ))}
            </tr>
          </thead>
          <tbody>
            {media.map((item) => (
              <MediaAdminRow
                key={item.docId}
                media={item}
                columns={columns}
                isSelected={selectedMediaIds.includes(item.docId)}
                onToggleSelection={() => toggleMediaSelection(item.docId)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {media.length === 0 && (
        <div className={styles.emptyState}>
          <p>No media found matching the current filters.</p>
        </div>
      )}
    </div>
  );
} 