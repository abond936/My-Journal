'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { TagAdminList } from '@/components/admin/tag-admin/TagAdminList';
import { useTagManagement } from '@/components/admin/tag-admin/useTagManagement';
import tagAdminStyles from '@/app/admin/tag-admin/tag-admin.module.css';
import studioStyles from './StudioWorkspace.module.css';

/**
 * Studio tag rail: same `useTagManagement` + `TagAdminList` as `/admin/tag-admin`.
 * The full page remains the canonical fallback—do not change its behavior when editing shared code;
 * use optional props / Studio-only wrappers so defaults match the standalone route.
 */
export default function TagAdminStudioPane({ embeddedColumn = false }: { embeddedColumn?: boolean }) {
  const {
    tagTree,
    loading,
    error,
    isSaving,
    handleCreateTag,
    handleUpdateTag,
    handleDeleteTag,
    handleReorder,
    handleReparent,
  } = useTagManagement();

  const stickyTopRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (embeddedColumn) return;
    const measure = () => {
      const tabsEl = document.getElementById('admin-tabs-bar');
      const stickyEl = stickyTopRef.current;
      if (!tabsEl || !stickyEl) return;
      const tabsHeight = tabsEl.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--admin-tabs-height', `${tabsHeight}px`);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [embeddedColumn]);

  return (
    <div className={embeddedColumn ? studioStyles.tagPaneEmbeddedColumn : studioStyles.tagPane}>
      <div
        className={`${embeddedColumn ? '' : tagAdminStyles.stickyTop} ${studioStyles.tagPaneHeader}`}
        ref={stickyTopRef}
      >
        <h2 className={studioStyles.tagPaneTitle}>Tags</h2>
      </div>
      {loading && <p className={studioStyles.tagPaneBody}>Loading tags…</p>}
      {error && <p className={tagAdminStyles.error}>{error.toString()}</p>}
      {isSaving && <p className={studioStyles.tagPaneBody}>Saving…</p>}
      {!loading && !error && (
        <div className={studioStyles.tagPaneScroll}>
          <TagAdminList
            tagTree={tagTree}
            stackDimensionColumns
            hideDimensionColumnHeadings
            onReorder={handleReorder}
            onReparent={handleReparent}
            onCreateTag={handleCreateTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
          />
        </div>
      )}
    </div>
  );
}
