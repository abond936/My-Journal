'use client';

import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import { useCuratedTreeDropHighlight } from '@/components/admin/card-admin/curatedTreeDropHighlightContext';
import JournalImage from '@/components/common/JournalImage';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './StudioWorkspace.module.css';

export type StudioCardContext = Card & { children?: Card[] };

function cardLabel(card: Card): string {
  return card.title || card.subtitle || 'Untitled';
}

function StudioGallerySortableRow({
  id,
  galleryFocusMediaId,
  children,
}: {
  id: string;
  /** Stable id for returning focus after reorder (sortable id includes `order`). */
  galleryFocusMediaId: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={styles.gallerySortableRow}>
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={styles.dragHandle}
        aria-label="Drag to reorder gallery item. Space to pick up, arrows to move, Space to drop."
        title="Drag to reorder. Keyboard: Space to pick up, arrows to move, Space to drop."
        data-studio-dnd-return-focus={id}
        data-studio-gallery-focus={galleryFocusMediaId}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className={styles.gallerySortableContent}>{children}</div>
    </div>
  );
}

function StudioDropZone({
  id,
  accepts,
  ariaLabel,
  children,
}: {
  id: string;
  accepts: Array<'source' | 'gallery'>;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const { active } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const activeDragKind = activeStr.startsWith('source:')
    ? 'source'
    : activeStr.startsWith('gallery:')
      ? 'gallery'
      : null;
  const { setNodeRef, isOver } = useDroppable({ id });
  const isEligible = activeDragKind !== null && accepts.includes(activeDragKind);
  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={ariaLabel}
      className={[styles.dropZone, isEligible ? styles.dropZoneEligible : '', isOver ? styles.dropZoneActive : '']
        .join(' ')
        .trim()}
    >
      {children}
    </div>
  );
}

function StudioChildSortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={styles.childSortableRow}>
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={styles.dragHandle}
        aria-label="Drag to reorder child card. Space to pick up, arrows to move, Space to drop."
        title="Drag to reorder. Keyboard: Space to pick up, arrows to move, Space to drop."
        data-studio-dnd-return-focus={id}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className={styles.childSortableMain}>{children}</div>
    </div>
  );
}

/** Drop zone matching CuratedTreeNode `parent:*` so tree card drags can attach as last child. */
function StudioParentAttachZone({ parentId, children }: { parentId: string; children: React.ReactNode }) {
  const { active } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const reparentFromCard = activeStr.startsWith('card:');
  const highlightId = useCuratedTreeDropHighlight();
  const parentDropId = `parent:${parentId}`;
  const { setNodeRef } = useDroppable({
    id: parentDropId,
    disabled: !reparentFromCard,
  });
  const nestActive = highlightId === parentDropId;
  return (
    <div
      ref={setNodeRef}
      className={[styles.parentAttachZone, nestActive ? styles.parentAttachZoneNestActive : ''].join(' ').trim()}
    >
      {children}
    </div>
  );
}

/** Drop target below last child so reorder can move an item to the end of the list. */
function StudioChildrenEndDropZone({ parentId }: { parentId: string }) {
  const { active } = useDndContext();
  const activeStr = active?.id != null ? String(active.id) : '';
  const enabled = activeStr.startsWith('studioChild:');
  const highlightId = useCuratedTreeDropHighlight();
  const endId = `studioChildAfter:${parentId}`;
  const { setNodeRef, isOver } = useDroppable({
    id: endId,
    disabled: !enabled,
  });
  const showLine = highlightId === endId || isOver;
  return (
    <div
      ref={setNodeRef}
      className={[styles.studioChildAfterZone, showLine ? styles.studioChildAfterZoneActive : ''].join(' ').trim()}
      aria-hidden={!enabled}
    />
  );
}

export async function handleStudioRelationshipDragEnd(
  event: { active: { id: unknown }; over: { id: unknown } | null },
  ctx: {
    actionBusy: boolean;
    selectedCard: StudioCardContext | null;
    selectedCardId: string | null;
    patchSelectedCard: (payload: Partial<Card>, msg?: string) => Promise<void>;
    setActionInfo: (s: string | null) => void;
  }
): Promise<boolean> {
  const { active, over } = event;
  if (ctx.actionBusy || !ctx.selectedCard || !ctx.selectedCardId) return false;
  if (!over || active.id === over.id) return false;

  const activeId = String(active.id);
  const overId = String(over.id);

  const afterId = ctx.selectedCardId ? `studioChildAfter:${ctx.selectedCardId}` : null;
  if (activeId.startsWith('studioChild:') && afterId && overId === afterId) {
    const ids = [...(ctx.selectedCard.childrenIds || [])];
    const childId = activeId.slice('studioChild:'.length);
    const oldIndex = ids.indexOf(childId);
    if (oldIndex < 0) return true;
    if (oldIndex === ids.length - 1) return true;
    const reordered = arrayMove(ids, oldIndex, ids.length - 1);
    await ctx.patchSelectedCard({ childrenIds: reordered }, 'Child order updated.');
    return true;
  }

  if (activeId.startsWith('studioChild:') && overId.startsWith('studioChild:')) {
    const ids = ctx.selectedCard.childrenIds || [];
    const itemIds = ids.map((cid) => `studioChild:${cid}`);
    const oldIndex = itemIds.indexOf(activeId);
    const newIndex = itemIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return true;
    const reordered = arrayMove(ids, oldIndex, newIndex);
    await ctx.patchSelectedCard({ childrenIds: reordered }, 'Child order updated.');
    return true;
  }

  if (activeId.startsWith('gallery:') && overId.startsWith('gallery:')) {
    const items = ctx.selectedCard.galleryMedia || [];
    const itemIds = items.map((item) => `gallery:${item.mediaId}:${item.order}`);
    const oldIndex = itemIds.indexOf(activeId);
    const newIndex = itemIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return true;
    const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      order: index,
    }));
    await ctx.patchSelectedCard({ galleryMedia: reordered }, 'Gallery order updated.');
    return true;
  }

  if (activeId.startsWith('gallery:') && overId === 'drop:cover') {
    const mediaId = activeId.split(':')[1];
    if (!mediaId) return true;
    await ctx.patchSelectedCard({ coverImageId: mediaId }, 'Cover assigned from gallery by drag/drop.');
    return true;
  }

  if (activeId.startsWith('source:')) {
    const mediaId = activeId.slice('source:'.length);
    if (!mediaId) return true;

    if (overId === 'drop:cover') {
      await ctx.patchSelectedCard({ coverImageId: mediaId }, 'Cover assigned by drag/drop.');
      return true;
    }

    if (overId === 'drop:gallery') {
      const gallery = ctx.selectedCard.galleryMedia || [];
      const exists = gallery.some((g) => g.mediaId === mediaId);
      if (exists) {
        ctx.setActionInfo('Media is already in gallery.');
        return true;
      }
      const nextOrder = gallery.length;
      await ctx.patchSelectedCard(
        { galleryMedia: [...gallery, { mediaId, order: nextOrder }] },
        'Media added to gallery by drag/drop.'
      );
      return true;
    }
  }

  return false;
}

export default function StudioCardRelationshipPanel({
  cardLoading,
  cardError,
  selectedCard,
  tags,
  actionBusy,
  actionInfo,
  actionError,
  expandedPanels,
  togglePanel,
  patchSelectedCard,
}: {
  cardLoading: boolean;
  cardError: string | null;
  selectedCard: StudioCardContext | null;
  tags: Tag[];
  actionBusy: boolean;
  actionInfo: string | null;
  actionError: string | null;
  expandedPanels: Record<'cover' | 'gallery' | 'children' | 'content', boolean>;
  togglePanel: (panel: 'cover' | 'gallery' | 'children' | 'content') => void;
  patchSelectedCard: (payload: Partial<Card>, successMessage?: string) => Promise<void>;
}) {
  const orderedChildIds = useMemo(() => selectedCard?.childrenIds || [], [selectedCard]);
  const childById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of selectedCard?.children || []) {
      if (c.docId) m.set(c.docId, c);
    }
    return m;
  }, [selectedCard?.children]);

  const studioChildSortableIds = useMemo(
    () => orderedChildIds.map((id) => `studioChild:${id}`),
    [orderedChildIds]
  );

  const moveGalleryItem = useCallback(
    (index: number, direction: 'up' | 'down') => {
      if (!selectedCard?.galleryMedia?.length) return;
      const items = [...selectedCard.galleryMedia];
      const j = direction === 'up' ? index - 1 : index + 1;
      if (j < 0 || j >= items.length) return;
      const reordered = arrayMove(items, index, j).map((item, idx) => ({ ...item, order: idx }));
      void patchSelectedCard({ galleryMedia: reordered }, 'Gallery order updated.');
    },
    [patchSelectedCard, selectedCard]
  );

  const moveChild = useCallback(
    (childId: string, direction: 'up' | 'down') => {
      const ids = [...orderedChildIds];
      const i = ids.indexOf(childId);
      if (i < 0) return;
      const j = direction === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= ids.length) return;
      const reordered = arrayMove(ids, i, j);
      void patchSelectedCard({ childrenIds: reordered }, 'Child order updated.');
    },
    [orderedChildIds, patchSelectedCard]
  );

  return (
    <section className={styles.studioRelationshipSection} aria-label="Selected card relationships">
      <h2 className={styles.studioRelationshipTitle}>Selected card context</h2>
      {cardLoading ? <p className={styles.metaMuted}>Loading selected card…</p> : null}
      {cardError ? <p className={styles.metaError}>{cardError}</p> : null}
      {!cardLoading && !cardError && !selectedCard ? (
        <p className={styles.metaMuted}>Select a card in Curated Tree or Unparented Cards to inspect relationships.</p>
      ) : null}
      {selectedCard ? (
        <div className={styles.relationshipShell}>
          <div className={styles.cardHeader}>
            <h3>{cardLabel(selectedCard)}</h3>
            <p className={styles.metaMuted}>
              {selectedCard.type} · {selectedCard.status} · {selectedCard.displayMode}
            </p>
          </div>

          <div className={styles.tagChipRow}>
            <CardDimensionalTagCommandBar
              card={selectedCard}
              allTags={tags}
              variant="compact"
              disabled={actionBusy}
              onUpdateTags={async (next) => {
                await patchSelectedCard({ tags: next }, 'Card tags updated.');
              }}
            />
          </div>
          {actionInfo ? (
            <p className={styles.metaInfo} role="status" aria-live="polite">
              {actionInfo}
            </p>
          ) : null}
          {actionError ? (
            <p className={styles.metaError} role="alert">
              {actionError}
            </p>
          ) : null}

          <section className={styles.panelBlock}>
            <button type="button" className={styles.panelToggle} onClick={() => togglePanel('cover')}>
              {expandedPanels.cover ? '▼' : '►'} Cover
            </button>
            {expandedPanels.cover ? (
              <StudioDropZone
                id="drop:cover"
                accepts={['source', 'gallery']}
                ariaLabel="Cover drop target: drop source or gallery media here to set cover"
              >
                <div className={styles.dropHint}>Drop from the Media bank (or a gallery row) here to assign cover.</div>
                {selectedCard.coverImage ? (
                  <div className={styles.mediaRow}>
                    <JournalImage
                      src={getDisplayUrl(selectedCard.coverImage)}
                      alt={selectedCard.coverImage.caption || selectedCard.coverImage.filename || 'Cover'}
                      width={84}
                      height={84}
                      className={styles.mediaThumb}
                    />
                    <div>
                      <div className={styles.mediaLabel}>
                        {selectedCard.coverImage.caption || selectedCard.coverImage.filename || 'Cover image'}
                      </div>
                      <div className={styles.metaMuted}>{selectedCard.coverImage.docId}</div>
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          className={styles.inlineActionButton}
                          disabled={actionBusy}
                          onClick={() =>
                            void patchSelectedCard(
                              { coverImageId: null, coverImageFocalPoint: undefined },
                              'Cover removed.'
                            )
                          }
                        >
                          Remove cover
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className={styles.metaMuted}>No cover assigned.</p>
                )}
              </StudioDropZone>
            ) : null}
          </section>

          <section className={styles.panelBlock}>
            <button type="button" className={styles.panelToggle} onClick={() => togglePanel('gallery')}>
              {expandedPanels.gallery ? '▼' : '►'} Gallery ({selectedCard.galleryMedia?.length || 0})
            </button>
            {expandedPanels.gallery ? (
              selectedCard.galleryMedia?.length ? (
                <StudioDropZone
                  id="drop:gallery"
                  accepts={['source']}
                  ariaLabel="Gallery drop target: drop source media here to append"
                >
                  <div className={styles.dropHint}>Drop from the Media bank here to append to gallery.</div>
                  <SortableContext
                    items={selectedCard.galleryMedia.map((item) => `gallery:${item.mediaId}:${item.order}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className={styles.mediaList}>
                      {selectedCard.galleryMedia.map((item, index) => (
                        <StudioGallerySortableRow
                          key={`${item.mediaId}-${item.order}`}
                          id={`gallery:${item.mediaId}:${item.order}`}
                          galleryFocusMediaId={item.mediaId}
                        >
                          <div className={styles.mediaRow}>
                            {item.media ? (
                              <JournalImage
                                src={getDisplayUrl(item.media)}
                                alt={item.caption || item.media.filename || 'Gallery image'}
                                width={68}
                                height={68}
                                className={styles.mediaThumb}
                              />
                            ) : (
                              <div className={styles.mediaThumbFallback}>No thumb</div>
                            )}
                            <div>
                              <div className={styles.mediaLabel}>{item.caption || item.media?.filename || 'Gallery item'}</div>
                              <div className={styles.metaMuted}>{item.mediaId}</div>
                              <div className={styles.inlineActions}>
                                <button
                                  type="button"
                                  className={styles.inlineActionButton}
                                  disabled={actionBusy || index === 0}
                                  onClick={() => moveGalleryItem(index, 'up')}
                                  aria-label="Move gallery item up"
                                >
                                  Move up
                                </button>
                                <button
                                  type="button"
                                  className={styles.inlineActionButton}
                                  disabled={actionBusy || index >= selectedCard.galleryMedia!.length - 1}
                                  onClick={() => moveGalleryItem(index, 'down')}
                                  aria-label="Move gallery item down"
                                >
                                  Move down
                                </button>
                                <button
                                  type="button"
                                  className={styles.inlineActionButton}
                                  disabled={actionBusy}
                                  onClick={() =>
                                    void patchSelectedCard({ coverImageId: item.mediaId }, 'Cover updated from gallery.')
                                  }
                                >
                                  Set as cover
                                </button>
                                <button
                                  type="button"
                                  className={styles.inlineActionButton}
                                  disabled={actionBusy}
                                  onClick={() =>
                                    void patchSelectedCard(
                                      {
                                        galleryMedia: (selectedCard.galleryMedia || []).filter(
                                          (g) => !(g.mediaId === item.mediaId && g.order === item.order)
                                        ),
                                      },
                                      'Gallery item removed.'
                                    )
                                  }
                                >
                                  Remove from gallery
                                </button>
                              </div>
                            </div>
                          </div>
                        </StudioGallerySortableRow>
                      ))}
                      <p className={styles.metaMuted}>
                        Reorder with drag handles (keyboard: Space, arrows, Space) or Move up / Move down. Drag onto Cover
                        to assign cover.
                      </p>
                    </div>
                  </SortableContext>
                </StudioDropZone>
              ) : (
                <StudioDropZone
                  id="drop:gallery"
                  accepts={['source']}
                  ariaLabel="Gallery drop target: drop source media here to add first gallery item"
                >
                  <div className={styles.dropHint}>Drop from the Media bank here to append to gallery.</div>
                  <p className={styles.metaMuted}>No gallery media assigned.</p>
                </StudioDropZone>
              )
            ) : null}
          </section>

          <section className={styles.panelBlock}>
            <button type="button" className={styles.panelToggle} onClick={() => togglePanel('children')}>
              {expandedPanels.children ? '▼' : '►'} Children ({orderedChildIds.length})
            </button>
            {expandedPanels.children ? (
              <StudioParentAttachZone parentId={selectedCard.docId!}>
                <p className={styles.dropHint}>
                  Drag a card from the tree or unparented list onto this block to add as the last child. Reorder with
                  handles (keyboard: Space, arrows, Space) or Move up / Move down.
                </p>
                {orderedChildIds.length ? (
                  <SortableContext items={studioChildSortableIds} strategy={verticalListSortingStrategy}>
                    <ul className={styles.childList}>
                      {orderedChildIds.map((childId, index) => {
                        const child = childById.get(childId);
                        const childTitle = child ? cardLabel(child) : childId;
                        return (
                          <li key={childId} className={styles.childListItem}>
                            <StudioChildSortableRow id={`studioChild:${childId}`}>
                              <div className={styles.childRowInner}>
                                <div>
                                  {child ? (
                                    <Link href={`/admin/card-admin/${child.docId}/edit`} className={styles.childEditLink}>
                                      {cardLabel(child)}
                                    </Link>
                                  ) : (
                                    <span className={styles.metaMuted}>{childId}</span>
                                  )}
                                  <div className={styles.metaMuted}>{childId}</div>
                                </div>
                                <div className={styles.inlineActions}>
                                  <button
                                    type="button"
                                    className={styles.inlineActionButton}
                                    disabled={actionBusy || index === 0}
                                    onClick={() => moveChild(childId, 'up')}
                                    aria-label={`Move child up: ${childTitle}`}
                                  >
                                    Move up
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.inlineActionButton}
                                    disabled={actionBusy || index >= orderedChildIds.length - 1}
                                    onClick={() => moveChild(childId, 'down')}
                                    aria-label={`Move child down: ${childTitle}`}
                                  >
                                    Move down
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.inlineActionButton}
                                    disabled={actionBusy}
                                    onClick={() =>
                                      void patchSelectedCard(
                                        { childrenIds: orderedChildIds.filter((id) => id !== childId) },
                                        'Child removed.'
                                      )
                                    }
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </StudioChildSortableRow>
                          </li>
                        );
                      })}
                    </ul>
                  </SortableContext>
                ) : null}
                {orderedChildIds.length > 0 && selectedCard.docId ? (
                  <StudioChildrenEndDropZone parentId={selectedCard.docId} />
                ) : null}
                {orderedChildIds.length ? null : (
                  <p className={styles.metaMuted}>No child cards assigned.</p>
                )}
              </StudioParentAttachZone>
            ) : null}
          </section>

          <section className={styles.panelBlock}>
            <button type="button" className={styles.panelToggle} onClick={() => togglePanel('content')}>
              {expandedPanels.content ? '▼' : '►'} Content media signal
            </button>
            {expandedPanels.content ? (
              <p className={styles.metaMuted}>
                {selectedCard.contentMedia?.length
                  ? `Content contains ${selectedCard.contentMedia.length} media reference(s).`
                  : 'No content-media references.'}
              </p>
            ) : null}
          </section>

          <p className={styles.metaMuted} style={{ marginTop: 'var(--spacing-xs)' }}>
            Assign media from the <strong>Media</strong> bank below (same as Collections): drag a row’s ⋮⋮ handle to
            Cover or Gallery, or use filters and pagination there.
          </p>
        </div>
      ) : null}
    </section>
  );
}
