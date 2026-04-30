'use client';

import React from 'react';
import { TagAdminList } from '@/components/admin/tag-admin/TagAdminList';
import { useTagManagement } from '@/components/admin/tag-admin/useTagManagement';
import tagAdminStyles from '@/app/admin/tag-admin/tag-admin.module.css';
import styles from './ViewTagLibrarySidebarPane.module.css';

/**
 * Full tag-library editing on `/view` (admin only). Same hook + list as the Studio rail.
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
      {loading ? <p className={styles.statusLine}>Loading tags…</p> : null}
      {error ? <p className={tagAdminStyles.error}>{error.toString()}</p> : null}
      {isSaving ? <p className={styles.statusLine}>Saving…</p> : null}
      {!loading && !error ? (
        <div className={styles.scroll}>
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
      ) : null}
    </div>
  );
}
