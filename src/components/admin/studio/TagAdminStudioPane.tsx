'use client';

import React, { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { TagAdminList } from '@/components/admin/tag-admin/TagAdminList';
import { useTagManagement } from '@/components/admin/tag-admin/useTagManagement';
import tagAdminStyles from '@/app/admin/tag-admin/tag-admin.module.css';
import studioStyles from './StudioWorkspace.module.css';

/**
 * Same drag-and-drop tag tree as Tag admin, embedded in Admin Studio.
 */
export default function TagAdminStudioPane() {
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
  }, []);

  return (
    <div className={studioStyles.tagPane}>
      <div className={`${tagAdminStyles.stickyTop} ${studioStyles.tagPaneHeader}`} ref={stickyTopRef}>
        <h2 className={studioStyles.tagPaneTitle}>Tags</h2>
        <p className={studioStyles.tagPaneIntro}>
          Reorder and reparent here, or open the{' '}
          <Link href="/admin/tag-admin">full Tag Management</Link> page.
        </p>
      </div>
      {loading && <p className={studioStyles.tagPaneBody}>Loading tags…</p>}
      {error && <p className={tagAdminStyles.error}>{error.toString()}</p>}
      {isSaving && <p className={studioStyles.tagPaneBody}>Saving…</p>}
      {!loading && !error && (
        <div className={studioStyles.tagPaneScroll}>
          <TagAdminList
            tagTree={tagTree}
            stackDimensionColumns
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
