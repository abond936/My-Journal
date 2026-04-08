'use client';

import React from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import styles from './ChildCardManager.module.css';
import { SortableItem } from './SortableItem';
import { useChildCards } from '@/lib/hooks/useChildCards';
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

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
      <h4>Child Cards</h4>
      <p className={styles.hint}>
        Add or reparent children in{' '}
        <Link href="/admin/collections" className={styles.collectionsLink}>
          Collections
        </Link>
        . Here you can reorder or remove children for this card.
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.childList}>
        <h5>Current Children</h5>
        {areChildrenLoading && <p>Loading child cards...</p>}
        {childrenError && <p className={styles.error}>{childrenError}</p>}
        {!areChildrenLoading && !childrenError && childCards.length === 0 && (
          <p>No child cards. Use Collections to attach children.</p>
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
