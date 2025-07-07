'use client';

import React, { useState, useEffect } from 'react';
import { Media } from '@/lib/types/photo';
import { useMedia } from '@/components/providers/MediaProvider';
import MediaAdminRow from './MediaAdminRow';
import styles from './MediaAdminList.module.css';

interface ColumnConfig {
  key: string;
  label: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  sortable?: boolean;
}

const defaultColumns: ColumnConfig[] = [
  { key: 'status', label: 'Status', width: 80, minWidth: 60, maxWidth: 120 },
  { key: 'thumbnail', label: 'Icon', width: 80, minWidth: 80, maxWidth: 80 },
  { key: 'filename', label: 'Filename', width: 200, minWidth: 150, maxWidth: 400, sortable: true },
  { key: 'caption', label: 'Caption', width: 250, minWidth: 150, maxWidth: 500, sortable: true },
  { key: 'width', label: 'Width', width: 80, minWidth: 60, maxWidth: 100 },
  { key: 'height', label: 'Height', width: 80, minWidth: 60, maxWidth: 100 },
  { key: 'objectPosition', label: 'Object Position', width: 120, minWidth: 100, maxWidth: 150 },
  { key: 'source', label: 'Source', width: 80, minWidth: 60, maxWidth: 120 },
  { key: 'sourcePath', label: 'Source Path', width: 300, minWidth: 200, maxWidth: 600, sortable: true },
  { key: 'actions', label: 'Actions', width: 100, minWidth: 80, maxWidth: 120 },
];

export default function MediaAdminList() {
  const { 
    media, 
    selectedMediaIds, 
    toggleMediaSelection, 
    selectAll, 
    selectNone,
    deleteMultipleMedia 
  } = useMedia();

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('media-admin-columns');
      return saved ? JSON.parse(saved) : defaultColumns;
    }
    return defaultColumns;
  });

  const [resizing, setResizing] = useState<{ columnIndex: number; startX: number; startWidth: number } | null>(null);

  // Save column configuration to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('media-admin-columns', JSON.stringify(columns));
    }
  }, [columns]);

  const handleMouseDown = (e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault();
    setResizing({
      columnIndex,
      startX: e.clientX,
      startWidth: columns[columnIndex].width,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing) return;

    const deltaX = e.clientX - resizing.startX;
    const newWidth = Math.max(
      columns[resizing.columnIndex].minWidth,
      Math.min(columns[resizing.columnIndex].maxWidth, resizing.startWidth + deltaX)
    );

    setColumns(prev => prev.map((col, index) => 
      index === resizing.columnIndex ? { ...col, width: newWidth } : col
    ));
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizing]);

  const handleBulkDelete = async () => {
    if (selectedMediaIds.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedMediaIds.length} media item(s)?`)) {
      await deleteMultipleMedia(selectedMediaIds);
    }
  };

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  return (
    <div className={styles.container}>
      {/* Bulk Actions */}
      <div className={styles.bulkActions}>
        {selectedMediaIds.length > 0 ? (
          <>
            <span>{selectedMediaIds.length} item(s) selected</span>
            <button onClick={selectNone} className={styles.bulkButton}>
              Clear Selection
            </button>
            <button onClick={handleBulkDelete} className={`${styles.bulkButton} ${styles.deleteButton}`}>
              Delete Selected
            </button>
          </>
        ) : (
          <span>No items selected</span>
        )}
      </div>

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
              {columns.map((column, index) => (
                <th 
                  key={column.key}
                  className={styles.headerCell}
                  style={{ width: column.width }}
                >
                  <div className={styles.headerContent}>
                    <span>{column.label}</span>
                    {index < columns.length - 1 && (
                      <div
                        className={styles.resizeHandle}
                        onMouseDown={(e) => handleMouseDown(e, index)}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {media.map((item) => (
              <MediaAdminRow
                key={item.id}
                media={item}
                columns={columns}
                isSelected={selectedMediaIds.includes(item.id)}
                onToggleSelection={() => toggleMediaSelection(item.id)}
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