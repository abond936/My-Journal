'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { TagAdminList } from '@/components/admin/studio/tags/TagAdminList';
import { WhoRelationshipModal } from '@/components/admin/studio/tags/WhoRelationshipModal';
import { TagMergeModal } from '@/components/admin/studio/tags/TagMergeModal';
import { TagSplitModal } from '@/components/admin/studio/tags/TagSplitModal';
import { useTagManagement } from '@/components/admin/studio/tags/useTagManagement';
import { useTag } from '@/components/providers/TagProvider';
import type { Tag } from '@/lib/types/tag';
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
  onInspectCards,
  onInspectMedia,
}: {
  embeddedColumn?: boolean;
  highlightTagIds?: string[];
  onInspectCards?: (tag: Tag) => void;
  onInspectMedia?: (tag: Tag) => void;
}) {
  const [relationshipTag, setRelationshipTag] = useState<Tag | null>(null);
  const [mergeTag, setMergeTag] = useState<Tag | null>(null);
  const [splitTag, setSplitTag] = useState<Tag | null>(null);
  const { tags } = useTag();
  const {
    tagTree,
    loading,
    error,
    isSaving,
    handleCreateTag,
    handleUpdateTag,
    handleDeleteTag,
    handleMergeTag,
    refreshTags,
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
        {embeddedColumn ? null : <h2 className={studioStyles.tagPaneTitle}>Tags</h2>}
      </div>
      <div className={studioStyles.tagPaneScroll}>
      {loading && <p className={studioStyles.tagPaneBody}>Loading tags…</p>}
      {error && <p className={tagAdminStyles.error}>{error.toString()}</p>}
      {!loading && (
        <div aria-busy={isSaving}>
          <TagAdminList
            tagTree={tagTree}
            stackDimensionColumns
            showDimensionNavigation
        highlightTagIds={highlightTagIds}
            onReorder={handleReorder}
            onReparent={handleReparent}
            onCreateTag={handleCreateTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
            onEditRelationships={setRelationshipTag}
            onMergeTag={setMergeTag}
            onSplitTag={setSplitTag}
            onInspectCards={onInspectCards}
            onInspectMedia={onInspectMedia}
          />
        </div>
      )}
      </div>
      <WhoRelationshipModal
        tag={relationshipTag}
        whoTags={tags.filter((tag) => tag.docId && tag.dimension === 'who')}
        onClose={() => setRelationshipTag(null)}
        onUpdateTag={handleUpdateTag}
      />
      <TagMergeModal
        source={mergeTag}
        tags={tags}
        onClose={() => setMergeTag(null)}
        onMerge={handleMergeTag}
      />
      <TagSplitModal
        source={splitTag}
        onClose={() => setSplitTag(null)}
        onComplete={async () => { await refreshTags(); }}
      />
    </div>
  );
}
