'use client';

import React, { useCallback, useMemo } from 'react';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCardForm } from '@/components/providers/CardFormProvider';
import { useChildCards } from '@/lib/hooks/useChildCards';
import {
  StudioChildSortableRow,
  StudioChildrenEndDropZone,
  StudioParentAttachZone,
} from '@/components/admin/studio/studioRelationshipDndPrimitives';
import styles from './StudioWorkspace.module.css';

function cardLabel(title: string | undefined, subtitle: string | null | undefined): string {
  return title || subtitle || 'Untitled';
}

export default function StudioCardFormChildren({ disabled }: { disabled: boolean }) {
  const { formState, setField } = useCardForm();
  const docId = formState.cardData.docId;
  const orderedChildIds = useMemo(() => formState.cardData.childrenIds || [], [formState.cardData.childrenIds]);
  const {
    childCards,
    isLoading: areChildrenLoading,
    error: childrenError,
  } = useChildCards(orderedChildIds);

  const childById = useMemo(() => {
    const m = new Map<string, (typeof childCards)[0]>();
    for (const c of childCards) {
      if (c.docId) m.set(c.docId, c);
    }
    return m;
  }, [childCards]);

  const studioChildSortableIds = useMemo(
    () => orderedChildIds.map((id) => `studioChild:${id}`),
    [orderedChildIds]
  );

  const moveChild = useCallback(
    (childId: string, direction: 'up' | 'down') => {
      const ids = [...orderedChildIds];
      const i = ids.indexOf(childId);
      if (i < 0) return;
      const j = direction === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= ids.length) return;
      setField('childrenIds', arrayMove(ids, i, j));
    },
    [orderedChildIds, setField]
  );

  return (
    <div>
      <h4 className={styles.studioFormSectionTitle}>Children</h4>
      {childrenError ? <p className={styles.metaError}>{childrenError}</p> : null}
      {areChildrenLoading ? <p className={styles.metaMuted}>Loading child cards…</p> : null}
      {!areChildrenLoading && !childrenError && docId ? (
        <StudioParentAttachZone parentId={docId}>
          {orderedChildIds.length ? (
            <SortableContext items={studioChildSortableIds} strategy={verticalListSortingStrategy}>
              <ul className={styles.childList}>
                {orderedChildIds.map((childId, index) => {
                  const child = childById.get(childId);
                  const childTitle = child ? cardLabel(child.title, child.subtitle) : childId;
                  return (
                    <li key={childId} className={styles.childListItem}>
                      <StudioChildSortableRow id={`studioChild:${childId}`}>
                        <div className={styles.childRowInner}>
                          <div>
                            {child ? (
                              <span className={styles.childEditLink}>
                                {cardLabel(child.title, child.subtitle)}
                              </span>
                            ) : (
                              <span className={styles.metaMuted}>{childId}</span>
                            )}
                          </div>
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              className={styles.inlineActionButton}
                              disabled={disabled || index === 0}
                              onClick={() => moveChild(childId, 'up')}
                              aria-label={`Move child up: ${childTitle}`}
                            >
                              Move up
                            </button>
                            <button
                              type="button"
                              className={styles.inlineActionButton}
                              disabled={disabled || index >= orderedChildIds.length - 1}
                              onClick={() => moveChild(childId, 'down')}
                              aria-label={`Move child down: ${childTitle}`}
                            >
                              Move down
                            </button>
                            <button
                              type="button"
                              className={styles.inlineActionButton}
                              disabled={disabled}
                              onClick={() =>
                                setField(
                                  'childrenIds',
                                  orderedChildIds.filter((id) => id !== childId)
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
          ) : (
            <p className={styles.metaMuted}>No child cards assigned.</p>
          )}
          {orderedChildIds.length > 0 && docId ? <StudioChildrenEndDropZone parentId={docId} /> : null}
        </StudioParentAttachZone>
      ) : null}
    </div>
  );
}
