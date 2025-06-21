'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Navigation from '@/components/common/Navigation';
import styles from './AdminLayout.module.css';
import { AdminNavTabs } from '@/components/admin/AdminNavTabs';
import { useTag } from '@/components/providers/TagProvider';
import TagTree from '@/components/common/TagTree';
import { buildTagTree } from '@/lib/utils/tagUtils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { tags, loading: tagsLoading } = useTag();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State for checkboxes, updated instantly
  const [stagedSelection, setStagedSelection] = useState<string[]>([]);

  const tagTree = useMemo(() => {
    if (!tags || tags.length === 0) return [];
    return buildTagTree(tags);
  }, [tags]);

  // On initial load, sync state from URL
  useEffect(() => {
    const tagsFromUrl = searchParams.get('tags')?.split(',') || [];
    const uniqueTags = Array.from(new Set(tagsFromUrl.filter(t => t)));
    setStagedSelection(uniqueTags);
  }, [searchParams]);

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
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (stagedSelection.length > 0) {
      current.set('tags', stagedSelection.join(','));
    } else {
      current.delete('tags');
    }
    // Reset pagination when filters change
    current.delete('lastDocId'); 
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`);
  };

  const handleClearFilters = () => {
    setStagedSelection([]);
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.delete('tags');
    // Reset pagination when filters change
    current.delete('lastDocId');
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.layout}>
      <Navigation sidebarOpen={sidebarOpen} />
      <div className={styles.contentWrapper}>
        <button
          className={`${styles.menuToggle} ${sidebarOpen ? styles.open : styles.closed}`}
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? '←' : '→'}
        </button>

        <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
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

        <main className={styles.mainContent}>
          <div className={styles.topNavContainer}>
            <AdminNavTabs />
          </div>
          <div className={styles.pageContent}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 