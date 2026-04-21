'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useMedia } from '@/components/providers/MediaProvider';
import MediaAdminRow from './MediaAdminRow';
import { MediaAdminRowStudioSource } from './MediaAdminRowStudioSource';
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

type DimensionKey = 'who' | 'what' | 'when' | 'where';
type DimensionFilterMode = 'any' | 'hasAny' | 'isEmpty' | 'matches';
type DimensionFilters = Record<
  DimensionKey,
  {
    mode: DimensionFilterMode;
    tagId: string;
  }
>;

const DEFAULT_DIMENSION_FILTERS: DimensionFilters = {
  who: { mode: 'any', tagId: '' },
  what: { mode: 'any', tagId: '' },
  when: { mode: 'any', tagId: '' },
  where: { mode: 'any', tagId: '' },
};

const MEDIA_COLUMN_WIDTHS_KEY = 'media-admin-column-widths';
/** Persisted widths when embedded in Collections / Studio (fewer columns). */
const MEDIA_COLUMN_WIDTHS_KEY_COMPACT = 'media-admin-column-widths-collections-embed';

const COMPACT_HIDDEN_COLUMN_KEYS = new Set([
  'filename',
  'docId',
  'width',
  'height',
  'size',
  'contentType',
  'objectPosition',
  'source',
  'sourcePath',
]);

const defaultColumns: ColumnConfig[] = [
  { key: 'assignment', label: 'On cards', width: 120, minWidth: 90, maxWidth: 160 },
  { key: 'thumbnail', label: 'Icon', width: 160, minWidth: 130, maxWidth: 240 },
  { key: 'filename', label: 'Filename', width: 250, minWidth: 200, maxWidth: 500, sortable: true },
  { key: 'docId', label: 'Media ID', width: 220, minWidth: 180, maxWidth: 420, sortable: true },
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

function getColumnsForVariant(variant: 'full' | 'compact'): ColumnConfig[] {
  if (variant === 'full') return defaultColumns;
  return defaultColumns
    .filter((col) => !COMPACT_HIDDEN_COLUMN_KEYS.has(col.key))
    .map((col) =>
      col.key === 'actions'
        ? { ...col, width: 176, minWidth: 150, maxWidth: 260 }
        : col
    );
}

function loadInitialColumns(variant: 'full' | 'compact'): ColumnConfig[] {
  const base = getColumnsForVariant(variant);
  const key = variant === 'compact' ? MEDIA_COLUMN_WIDTHS_KEY_COMPACT : MEDIA_COLUMN_WIDTHS_KEY;
  if (typeof window === 'undefined') return base;
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return base;
    const savedWidths = JSON.parse(saved) as Record<string, number>;
    return base.map((col) => ({
      ...col,
      width: typeof savedWidths[col.key] === 'number' ? savedWidths[col.key] : col.width,
    }));
  } catch {
    return base;
  }
}

export default function MediaAdminList({
  variant = 'full',
  sourcePathFirst = false,
  dimensionFilters = DEFAULT_DIMENSION_FILTERS,
  /** Admin Studio only: rows register as `source:*` drags (requires parent `DndContext`). */
  studioSourceDraggable = false,
  clientSort = 'none',
}: {
  variant?: 'full' | 'compact';
  sourcePathFirst?: boolean;
  dimensionFilters?: DimensionFilters;
  studioSourceDraggable?: boolean;
  clientSort?: 'none' | 'filenameAsc' | 'filenameDesc';
}) {
  const { 
    media, 
    selectedMediaIds, 
    toggleMediaSelection, 
    selectAll, 
    selectNone 
  } = useMedia();

  const storageKey = variant === 'compact' ? MEDIA_COLUMN_WIDTHS_KEY_COMPACT : MEDIA_COLUMN_WIDTHS_KEY;

  const [columns, setColumns] = useState<ColumnConfig[]>(() => loadInitialColumns(variant));
  const visibleMedia = useMemo(() => {
    const normalize = (value: string | undefined) => (value ?? '').trim().toLowerCase();
    const modeFiltered = media.filter((item) => {
      return (['who', 'what', 'when', 'where'] as DimensionKey[]).every((dimension) => {
        const state = dimensionFilters[dimension];
        const ids = Array.isArray(item[dimension]) ? (item[dimension] as string[]) : [];
        if (state.mode === 'any') return true;
        if (state.mode === 'hasAny') return ids.length > 0;
        if (state.mode === 'isEmpty') return ids.length === 0;
        if (state.mode === 'matches') return state.tagId ? ids.includes(state.tagId) : true;
        return true;
      });
    });
    const applyClientSort = (rows: typeof media) => {
      if (clientSort === 'filenameAsc') {
        return [...rows].sort((a, b) => normalize(a.filename).localeCompare(normalize(b.filename)));
      }
      if (clientSort === 'filenameDesc') {
        return [...rows].sort((a, b) => normalize(b.filename).localeCompare(normalize(a.filename)));
      }
      return rows;
    };

    const afterDim = applyClientSort(modeFiltered);

    if (!sourcePathFirst) return afterDim;
    return [...afterDim].sort((a, b) => {
      const sourcePathCompare = normalize(a.sourcePath).localeCompare(normalize(b.sourcePath));
      if (sourcePathCompare !== 0) return sourcePathCompare;
      const fileCompare = normalize(a.filename).localeCompare(normalize(b.filename));
      if (fileCompare !== 0) return fileCompare;
      return normalize(a.docId).localeCompare(normalize(b.docId));
    });
  }, [media, sourcePathFirst, dimensionFilters, clientSort]);

  useEffect(() => {
    setColumns(loadInitialColumns(variant));
  }, [variant]);

  // Save column configuration to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const widths = columns.reduce((acc, col) => {
        acc[col.key] = col.width;
        return acc;
      }, {} as Record<string, number>);
      localStorage.setItem(storageKey, JSON.stringify(widths));
    }
  }, [columns, storageKey]);

  const handleColumnResize = (columnKey: string, newWidth: number) => {
    setColumns(prev => prev.map(col => 
      col.key === columnKey ? { ...col, width: newWidth } : col
    ));
  };

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0) + 40; // +40 for checkbox column

  return (
    <div className={variant === 'compact' ? `${styles.container} ${styles.containerCompact}` : styles.container}>
      {/* Table */}
      <div
        className={
          variant === 'compact'
            ? `${styles.tableContainer} ${styles.tableContainerCompact}`
            : `${styles.tableContainer} ${styles.tableContainerFull}`
        }
      >
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
            {visibleMedia.map((item) =>
              studioSourceDraggable ? (
                <MediaAdminRowStudioSource
                  key={item.docId}
                  media={item}
                  columns={columns}
                  isSelected={selectedMediaIds.includes(item.docId)}
                  onToggleSelection={() => toggleMediaSelection(item.docId)}
                />
              ) : (
                <MediaAdminRow
                  key={item.docId}
                  media={item}
                  columns={columns}
                  isSelected={selectedMediaIds.includes(item.docId)}
                  onToggleSelection={() => toggleMediaSelection(item.docId)}
                />
              )
            )}
          </tbody>
        </table>
      </div>

      {visibleMedia.length === 0 && (
        <div className={styles.emptyState}>
          <p>No media found matching the current filters.</p>
        </div>
      )}
    </div>
  );
} 