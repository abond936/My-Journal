'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTag } from '@/components/providers/TagProvider';
import TagTree from '@/components/common/TagTree';
import { buildTagTree } from '@/lib/utils/tagUtils';
import styles from './GlobalSidebar.module.css';

interface GlobalSidebarProps {
  isOpen: boolean;
}

export default function GlobalSidebar({ isOpen }: GlobalSidebarProps) {
  const { 
    tags, 
    loading: tagsLoading, 
    selectedFilterTagIds, 
    setFilterTags 
  } = useTag();

  const [stagedSelection, setStagedSelection] = useState<string[]>(selectedFilterTagIds);

  const tagTree = useMemo(() => {
    if (!tags || tags.length === 0) return [];
    return buildTagTree(tags);
  }, [tags]);

  useEffect(() => {
    setStagedSelection(selectedFilterTagIds);
  }, [selectedFilterTagIds]);

  const handleSelectionChange = (tagId: string, isSelected: boolean) => {
    setStagedSelection(prev => {
      const newSelection = new Set(prev);
      if (isSelected) {
        newSelection.add(tagId);
      } else {
        newSelection.delete(tagId);
      }
      return Array.from(newSelection);
    });
  };

  const handleApplyFilters = () => {
    setFilterTags(stagedSelection);
  };

  const handleClearFilters = () => {
    setStagedSelection([]);
    setFilterTags([]);
  };

  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
      <h2 className={styles.title}>Explore</h2>
      <nav className={styles.navigation}>
        <TagTree
          tree={tagTree}
          selectedTags={stagedSelection}
          onSelectionChange={handleSelectionChange}
          loading={tagsLoading}
        />
      </nav>
      <div className={styles.filterControls}>
        <button onClick={handleApplyFilters} className={styles.applyButton}>Apply</button>
        <button onClick={handleClearFilters} className={styles.clearButton}>Clear</button>
      </div>
    </div>
  );
} 