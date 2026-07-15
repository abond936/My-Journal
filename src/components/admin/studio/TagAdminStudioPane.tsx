'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TagAdminList } from '@/components/admin/studio/tags/TagAdminList';
import PeopleAdminPanel from '@/components/admin/studio/people/PeopleAdminPanel';
import { useTagManagement } from '@/components/admin/studio/tags/useTagManagement';
import { useStudioShellOptional } from '@/components/admin/studio/StudioShellContext';
import tagAdminStyles from '@/components/admin/studio/tags/tagAdminShell.module.css';
import studioStyles from './StudioWorkspace.module.css';

/**
 * Studio tag rail: same `useTagManagement` + `TagAdminList` as `/admin/tag-admin`.
 * The full page remains the canonical fallback—do not change its behavior when editing shared code;
 * use optional props / Studio-only wrappers so defaults match the standalone route.
 */
export default function TagAdminStudioPane({
  embeddedColumn = false,
  highlightTagIds,
}: {
  embeddedColumn?: boolean;
  highlightTagIds?: string[];
}) {
  const [section, setSection] = useState<'tags' | 'people'>('tags');
  const studioShell = useStudioShellOptional();
  const shellHighlightId = studioShell?.organizeReconcileTargetTagId ?? null;
  const mergedHighlightTagIds = useMemo(() => {
    const ids = new Set(highlightTagIds ?? []);
    if (shellHighlightId) ids.add(shellHighlightId);
    return Array.from(ids);
  }, [highlightTagIds, shellHighlightId]);
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
        {embeddedColumn ? null : <h2 className={studioStyles.tagPaneTitle}>{section === 'tags' ? 'Tags' : 'People'}</h2>}
        <div role="tablist" aria-label="Tag administration sections" style={{ display: 'flex', gap: '0.35rem', padding: '0.4rem' }}>
          <button type="button" role="tab" aria-selected={section === 'tags'} onClick={() => setSection('tags')}>Tags</button>
          <button type="button" role="tab" aria-selected={section === 'people'} onClick={() => setSection('people')}>People</button>
        </div>
      </div>
      {section === 'people' ? <PeopleAdminPanel /> : <div className={studioStyles.tagPaneScroll}>
      {loading && <p className={studioStyles.tagPaneBody}>Loading tags…</p>}
      {error && <p className={tagAdminStyles.error}>{error.toString()}</p>}
      {isSaving && <p className={studioStyles.tagPaneBody}>Saving…</p>}
      {!loading && !error && (
        <div>
          <TagAdminList
            tagTree={tagTree}
            stackDimensionColumns
            hideDimensionColumnHeadings
            highlightTagIds={mergedHighlightTagIds}
            onReorder={handleReorder}
            onReparent={handleReparent}
            onCreateTag={handleCreateTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
          />
        </div>
      )}
      </div>}
    </div>
  );
}
