'use client';

import React from 'react';
import Link from 'next/link';
import { TagAdminList } from '@/components/admin/tag-admin/TagAdminList';
import { useTagManagement } from '@/components/admin/tag-admin/useTagManagement';
import tagAdminStyles from '@/app/admin/tag-admin/tag-admin.module.css';
import styles from './ViewTagLibrarySidebarPane.module.css';

/**
 * Full tag-library editing on `/view` (admin only). Same hook + list as `/admin/tag-admin` / Studio rail;
 * `/admin/tag-admin` remains the canonical full-page fallback.
 */
export default function ViewTagLibrarySidebarPane() {
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

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Drag by the handle to reorder; hold <strong>Shift</strong> to reparent. Use <code>+</code> to add a child. Same
        data as <Link href="/admin/tag-admin">Tag Management</Link>—open there for the dedicated page.
      </p>
      {loading ? <p className={styles.statusLine}>Loading tags…</p> : null}
      {error ? <p className={tagAdminStyles.error}>{error.toString()}</p> : null}
      {isSaving ? <p className={styles.statusLine}>Saving…</p> : null}
      {!loading && !error ? (
        <div className={styles.scroll}>
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
      ) : null}
    </div>
  );
}
