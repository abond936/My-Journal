'use client';

import React, { useMemo } from 'react';
import JournalImage from '@/components/common/JournalImage';
import { Media } from '@/lib/types/photo';
import { DirectDimensionChipsRow } from '@/components/admin/common/DirectDimensionChips';
import EditModal from '@/components/admin/card-admin/EditModal';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import { useMedia } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { getCoreTagsByDimension } from '@/lib/utils/tagDisplay';
import styles from './MediaAdminGrid.module.css';

interface MediaAdminGridCellProps {
  media: Media;
  tagNameMap: Map<string, string>;
  allTags: ReturnType<typeof useTag>['tags'];
  onSaveTags: (mediaId: string, nextTags: string[]) => Promise<void>;
  isSelected: boolean;
  onToggleSelection: () => void;
}
type DimensionKey = 'who' | 'what' | 'when' | 'where';
type DimensionFilterMode = 'any' | 'hasAny' | 'isEmpty' | 'matches';
type DimensionFilters = Record<
  DimensionKey,
  {
    mode: DimensionFilterMode;
    tagId: string;
  }
>;

function MediaAdminGridCell({
  media,
  tagNameMap,
  allTags,
  onSaveTags,
  isSelected,
  onToggleSelection,
}: MediaAdminGridCellProps) {
  const core = getCoreTagsByDimension(media);
  const [tagModalOpen, setTagModalOpen] = React.useState(false);
  const [pendingTags, setPendingTags] = React.useState<string[]>(media.tags ?? []);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveNotice, setSaveNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPendingTags(media.tags ?? []);
  }, [media.docId, media.tags]);

  React.useEffect(() => {
    if (!saveNotice) return;
    const id = window.setTimeout(() => setSaveNotice(null), 2500);
    return () => window.clearTimeout(id);
  }, [saveNotice]);

  const selectedTags = React.useMemo(
    () => allTags.filter((tag) => tag.docId && pendingTags.includes(tag.docId)),
    [allTags, pendingTags]
  );

  return (
    <>
      <div
        className={`${styles.cell} ${isSelected ? styles.selected : ''}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest(`.${styles.checkboxWrap}`)) return;
          onToggleSelection();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleSelection();
          }
        }}
      >
        <div className={styles.checkboxWrap} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelection}
            aria-label={`Select ${media.filename}`}
          />
        </div>
        <div className={styles.thumbnailWrap}>
          <JournalImage
            src={getDisplayUrl(media)}
            alt={media.filename}
            fill
            className={styles.thumbnail}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 200px"
          />
          {media.caption && (
            <div className={styles.captionOverlay} title={media.caption}>
              {media.caption}
            </div>
          )}
        </div>
        <div className={styles.filename} title={media.filename}>
          {media.filename}
        </div>
        <div className={styles.identityBlock}>
          <div className={styles.identityLine} title={media.docId}>
            id: {media.docId}
          </div>
          <div className={styles.identityLine} title={media.sourcePath}>
            src: {media.sourcePath || '-'}
          </div>
        </div>
        <DirectDimensionChipsRow core={core} tagNameMap={tagNameMap} />
        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.inlineActionButton}
            onClick={(e) => {
              e.stopPropagation();
              setSaveError(null);
              setTagModalOpen(true);
            }}
          >
            Edit tags…
          </button>
        </div>
        {saveNotice ? <div className={styles.saveNotice}>{saveNotice}</div> : null}
      </div>
      <EditModal
        isOpen={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        title={`Tags: ${media.filename}`}
        size="wide"
      >
        <MacroTagSelector
          startExpanded
          selectedTags={selectedTags}
          allTags={allTags}
          onChange={setPendingTags}
          error={saveError ?? undefined}
          onSaveSelection={async (nextSelection) => {
            setSaveError(null);
            try {
              await onSaveTags(media.docId, nextSelection);
              setSaveNotice('Tags saved');
              setTagModalOpen(false);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to save tags.';
              setSaveError(message);
            }
          }}
          onRequestClose={() => setTagModalOpen(false)}
        />
      </EditModal>
    </>
  );
}

export default function MediaAdminGrid({
  sourcePathFirst = false,
  dimensionFilters,
}: {
  sourcePathFirst?: boolean;
  dimensionFilters: DimensionFilters;
}) {
  const { media, selectedMediaIds, toggleMediaSelection, selectAll, selectNone, updateMedia } = useMedia();
  const { tags } = useTag();
  const tagNameMap = new Map(tags.filter(t => t.docId).map(tag => [tag.docId as string, tag.name]));
  const sortedMedia = useMemo(() => {
    const normalize = (value: string | undefined) => (value ?? '').trim().toLowerCase();
    const modeFiltered = media.filter((item) => {
      return (['who', 'what', 'when', 'where'] as DimensionKey[]).every((dimension) => {
        const state = dimensionFilters[dimension];
        const ids = Array.isArray(item[dimension]) ? (item[dimension] as string[]) : [];
        if (state.mode === 'any') return true;
        if (state.mode === 'hasAny') return ids.length > 0;
        if (state.mode === 'isEmpty') return ids.length === 0;
        if (state.mode === 'matches') return state.tagId ? ids.includes(state.tagId) : true;
        return true;
      });
    });
    if (!sourcePathFirst) return modeFiltered;
    return [...modeFiltered].sort((a, b) => {
      const sourcePathCompare = normalize(a.sourcePath).localeCompare(normalize(b.sourcePath));
      if (sourcePathCompare !== 0) return sourcePathCompare;
      const fileCompare = normalize(a.filename).localeCompare(normalize(b.filename));
      if (fileCompare !== 0) return fileCompare;
      return normalize(a.docId).localeCompare(normalize(b.docId));
    });
  }, [media, sourcePathFirst, dimensionFilters]);

  return (
    <div className={styles.container}>
      {sortedMedia.length > 0 && (
        <div className={styles.selectAllRow}>
          <input
            type="checkbox"
            checked={selectedMediaIds.length === sortedMedia.length}
            onChange={(e) => (e.target.checked ? selectAll() : selectNone())}
            aria-label="Select all on page"
          />
          <span className={styles.selectAllLabel}>Select all on page</span>
        </div>
      )}
      <div className={styles.grid}>
        {sortedMedia.map((item) => (
          <MediaAdminGridCell
            key={item.docId}
            media={item}
            tagNameMap={tagNameMap}
            allTags={tags}
            onSaveTags={async (mediaId, nextTags) => {
              const updated = await updateMedia(mediaId, { tags: nextTags });
              if (!updated) {
                throw new Error('Tag update failed. Please retry.');
              }
            }}
            isSelected={selectedMediaIds.includes(item.docId)}
            onToggleSelection={() => toggleMediaSelection(item.docId)}
          />
        ))}
      </div>
      {sortedMedia.length === 0 && (
        <div className={styles.emptyState}>
          <p>No media found matching the current filters.</p>
        </div>
      )}
    </div>
  );
}
