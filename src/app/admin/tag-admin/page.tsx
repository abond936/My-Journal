'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { TagAdminList } from '@/components/admin/tag-admin/TagAdminList';
import { useTagManagement } from '@/components/admin/tag-admin/useTagManagement';
import styles from './tag-admin.module.css';

function AdminTagsPageContent() {
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
    <div className={styles.container}>
      <div className={styles.stickyTop} ref={stickyTopRef}>
        <h1 className={styles.pageHeading}>Tag Management</h1>
        <p className={styles.intro}>
          Drag tags by the handle to <strong>reorder</strong> within the same parent. Hold{' '}
          <strong>Shift</strong> while dragging to <strong>reparent</strong> (drop onto the new parent). Use the{' '}
          <code>+</code> button to add a child tag.
        </p>
      </div>

      {loading && <p>Loading tags...</p>}
      {error && <p className={styles.error}>{error.toString()}</p>}
      {isSaving && <p>Saving changes...</p>}

      {!loading && !error && (
        <TagAdminList
          tagTree={tagTree}
          onReorder={handleReorder}
          onReparent={handleReparent}
          onCreateTag={handleCreateTag}
          onUpdateTag={handleUpdateTag}
          onDeleteTag={handleDeleteTag}
        />
      )}
    </div>
  );
}

export default function AdminTagsPage() {
  return <AdminTagsPageContent />;
}
