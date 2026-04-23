'use client';

import React from 'react';
import Link from 'next/link';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import styles from './ChildCardManager.module.css';
import { SortableItem } from './SortableItem';
import { useChildCards } from '@/lib/hooks/useChildCards';
import { useDefaultDndSensors } from '@/lib/hooks/useDefaultDndSensors';
import clsx from 'clsx';

interface ChildCardManagerProps {
  cardId: string | undefined;
  childrenIds: string[];
  onUpdate: (newChildIds: string[]) => void;
  error?: string;
  className?: string;
}

export default function ChildCardManager({
  cardId: _cardId,
  childrenIds,
  onUpdate,
  error,
  className,
}: ChildCardManagerProps) {
  const {
    childCards,
    isLoading: areChildrenLoading,
    error: childrenError,
  } = useChildCards(childrenIds);

  const handleRemove = (idToRemove: string) => {
    onUpdate(childrenIds.filter(id => id !== idToRemove));
  };

  const sensors = useDefaultDndSensors();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = childrenIds.indexOf(active.id as string);
      const newIndex = childrenIds.indexOf(over.id as string);
      const newOrder = arrayMove(childrenIds, oldIndex, newIndex);
      onUpdate(newOrder);
    }
  };

  return (
    <div className={clsx(styles.container, className)}>
      <h4 className={styles.sectionTitle}>Child Cards</h4>
      <p className={styles.hint}>
        Reorder or remove children. Add or reparent in{' '}
        <Link href="/admin/studio" className={styles.collectionsLink}>
          Studio
        </Link>{' '}
        (Tree tab).
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.childList}>
        {areChildrenLoading && <p>Loading child cards...</p>}
        {childrenError && <p className={styles.error}>{childrenError}</p>}
        {!areChildrenLoading && !childrenError && childCards.length === 0 && (
          <p>No child cards. Use Studio (Tree tab) to attach children.</p>
        )}
        {!areChildrenLoading && !childrenError && childCards.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={childrenIds} strategy={verticalListSortingStrategy}>
              <ul>
                {childCards.map(child => (
                  <SortableItem key={child.docId} id={child.docId}>
                    <div className={styles.childItem}>
                      <span className={styles.childTitleRow}>
                        <Link
                          href={`/admin/card-admin/${child.docId}/edit`}
                          className={styles.childEditLink}
                        >
                          {child.title || '(Untitled)'}
                        </Link>
                        <span className={styles.childInfo}>
                          ({child.type} — {child.docId})
                        </span>
                      </span>
                      <button
                        type="button"
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => handleRemove(child.docId)}
                        className={styles.removeButton}
                      >
                        Remove
                      </button>
                    </div>
                  </SortableItem>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
