'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import EditModal from '@/components/admin/card-admin/EditModal';
import styles from './MediaEditModal.module.css';

type CardSummary = {
  docId?: string;
  title?: string;
  subtitle?: string;
};

type RelatedCardSummary = {
  id: string;
  title: string;
};

export default function MediaLinkedCardsModal({
  isOpen,
  mediaTitle,
  cardIds,
  onClose,
}: {
  isOpen: boolean;
  mediaTitle: string;
  cardIds: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [relatedCards, setRelatedCards] = useState<RelatedCardSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const normalizedIds = useMemo(
    () => Array.from(new Set(cardIds.filter((id) => typeof id === 'string' && id.trim().length > 0))),
    [cardIds]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (normalizedIds.length === 0) {
      setRelatedCards([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void (async () => {
      try {
        const params = new URLSearchParams();
        normalizedIds.forEach((id) => params.append('id', id));
        const response = await fetch(`/api/cards/by-ids?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (!response.ok) {
          setRelatedCards(normalizedIds.map((id) => ({ id, title: id })));
          return;
        }
        const cards = (await response.json().catch(() => ([]))) as CardSummary[];
        const cardMap = new Map(
          cards
            .filter((card): card is CardSummary & { docId: string } => typeof card.docId === 'string')
            .map((card) => [
              card.docId,
              card.title?.trim() || card.subtitle?.trim() || card.docId,
            ] as const)
        );
        setRelatedCards(
          normalizedIds.map((id) => ({
            id,
            title: cardMap.get(id) ?? id,
          }))
        );
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setRelatedCards(normalizedIds.map((id) => ({ id, title: id })));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, [isOpen, normalizedIds]);

  return (
    <EditModal isOpen={isOpen} onClose={onClose} title={`Cards using ${mediaTitle}`}>
      <div className={styles.relationshipCard}>
        <div className={styles.fieldLabel}>Used on cards</div>
        {loading ? (
          <div className={styles.emptyState}>Loading card references...</div>
        ) : relatedCards.length > 0 ? (
          <div className={styles.relationshipList}>
            {relatedCards.map((card) => (
              <button
                key={card.id}
                type="button"
                className={styles.relationshipButton}
                onClick={() => {
                  onClose();
                  router.push(`/admin/studio?card=${encodeURIComponent(card.id)}`);
                }}
              >
                {card.title}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>This image is not assigned to any cards.</div>
        )}
      </div>
    </EditModal>
  );
}
