'use client';

import React, { useState, useCallback } from 'react';
import { useTag, TagProvider } from '@/components/providers/TagProvider';
import { Tag } from '@/lib/types/tag';
import { TagAdminList } from '@/components/admin/tag-admin/TagAdminList';
import styles from './tag-admin.module.css';

function useTagManagement() {
  const { dimensionalTree, loading, error, createTag, updateTag, deleteTag } = useTag();

  const handleReorder = useCallback(async (activeId: string, overId: string | null) => {
    console.log("Reordering (Not Implemented)", { activeId, overId });
  }, []);

  const handleReparent = useCallback(async (activeId: string, overId: string | null) => {
    console.log("Reparenting (Not Implemented)", { activeId, overId });
  }, []);

  return { 
    tagTree: dimensionalTree,
    loading, 
    error,
    handleCreateTag: createTag, 
    handleUpdateTag: updateTag, 
    handleDeleteTag: deleteTag,
    handleReorder, 
    handleReparent 
  };
}

function AdminTagsPageContent() {
  const {
    tagTree,
    loading,
    error,
    handleCreateTag,
    handleUpdateTag,
    handleDeleteTag,
    handleReorder,
    handleReparent,
  } = useTagManagement();

  return (
    <div className={styles.container}>
      <h1>Tag Management</h1>
      <p>Drag and drop to reorder or reparent tags. Use the `+` button to add a child tag.</p>

      {loading && <p>Loading tags...</p>}
      {error && <p style={{ color: 'red' }}>{error.message}</p>}

      {!loading && !error && (
        <TagAdminList
          tags={tagTree}
          onUpdateTag={handleUpdateTag}
          onDeleteTag={handleDeleteTag}
          onCreateTag={handleCreateTag}
          onReorder={handleReorder}
          onReparent={handleReparent}
        />
      )}
    </div>
  );
}

export default function AdminTagsPage() {
  return (
    <TagProvider>
      <AdminTagsPageContent />
    </TagProvider>
  )
} 