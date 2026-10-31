'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Card } from '@/lib/types/card';
import type { Collection, CollectionPlacement, CollectionPlacementStructureInput } from '@/lib/types/collection';
import styles from './StoryCollectionPlacementControl.module.css';

type StructureResponse = {
  ok: true;
  collection: Collection;
  placements: CollectionPlacement[];
  cards: Card[];
};

function structureInput(placement: CollectionPlacement): CollectionPlacementStructureInput {
  return {
    docId: placement.docId,
    cardId: placement.cardId,
    parentPlacementId: placement.parentPlacementId ?? null,
    role: placement.role,
    order: placement.order,
  };
}

export default function StoryCollectionPlacementControl({ cardId }: { cardId?: string | null }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState('');
  const [structure, setStructure] = useState<StructureResponse | null>(null);
  const [destinationId, setDestinationId] = useState('');
  const [loading, setLoading] = useState(Boolean(cardId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/admin/collections');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Collections could not be loaded.');
        if (cancelled) return;
        const items = Array.isArray(data.collections) ? data.collections as Collection[] : [];
        setCollections(items);
        setCollectionId(items[0]?.docId ?? '');
        if (!items.length) setLoading(false);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Collections could not be loaded.');
          setLoading(false);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [cardId]);

  const loadStructure = useCallback(async (selectedCollectionId: string) => {
    if (!selectedCollectionId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/collections/${encodeURIComponent(selectedCollectionId)}/structure`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Collection structure could not be loaded.');
      setStructure(data as StructureResponse);
      setDestinationId('');
    } catch (loadError) {
      setStructure(null);
      setError(loadError instanceof Error ? loadError.message : 'Collection structure could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (collectionId) void loadStructure(collectionId);
  }, [collectionId, loadStructure]);

  const cardsById = useMemo(
    () => new Map((structure?.cards ?? []).map((card) => [card.docId, card])),
    [structure?.cards]
  );
  const destinations = useMemo(
    () => (structure?.placements ?? []).filter((placement) => placement.role !== 'card'),
    [structure?.placements]
  );
  const currentPlacements = useMemo(
    () => (structure?.placements ?? []).filter((placement) => placement.cardId === cardId),
    [cardId, structure?.placements]
  );
  const alreadyAtDestination = currentPlacements.some(
    (placement) => (placement.parentPlacementId ?? '') === destinationId
  );

  const save = useCallback(async (placements: CollectionPlacement[], successMessage: string) => {
    if (!structure || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/collections/${encodeURIComponent(structure.collection.docId)}/structure`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedStructureRevision: structure.collection.structureRevision,
          placements: placements.map(structureInput),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Collection placement could not be saved.');
      setStructure({
        ...structure,
        collection: { ...structure.collection, structureRevision: data.structureRevision },
        placements,
      });
      setMessage(successMessage);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Collection placement could not be saved.');
      await loadStructure(structure.collection.docId);
    } finally {
      setSaving(false);
    }
  }, [loadStructure, saving, structure]);

  if (!cardId) {
    return <p className={styles.note}>Save this draft before adding it to a Collection.</p>;
  }

  if (loading && !structure) return <p className={styles.note}>Loading Collections…</p>;
  if (!collections.length && !error) return <p className={styles.note}>No active Collections are available yet.</p>;

  const locked = structure?.collection.lifecycle === 'published';
  const addPlacement = () => {
    if (!structure || !cardId || locked) return;
    const parentPlacementId = destinationId || null;
    const siblings = structure.placements.filter(
      (placement) => (placement.parentPlacementId ?? null) === parentPlacementId
    );
    const order = siblings.length ? Math.max(...siblings.map((placement) => placement.order)) + 10 : 10;
    const now = Date.now();
    const placement: CollectionPlacement = {
      docId: `pl-${structure.collection.docId}-${globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`}`,
      collectionId: structure.collection.docId,
      cardId,
      parentPlacementId,
      role: 'card',
      order,
      createdAt: now,
      updatedAt: now,
    };
    void save([...structure.placements, placement], `Story added to ${structure.collection.title}.`);
  };

  return (
    <section className={styles.control} aria-labelledby="story-collection-placement-heading">
      <h4 id="story-collection-placement-heading">Collections</h4>
      <label>
        Collection
        <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} disabled={saving}>
          {collections.map((collection) => (
            <option key={collection.docId} value={collection.docId}>{collection.title}</option>
          ))}
        </select>
      </label>
      {structure ? (
        <>
          <label>
            Place at
            <select value={destinationId} onChange={(event) => setDestinationId(event.target.value)} disabled={saving || locked}>
              <option value="">Top level of {structure.collection.title}</option>
              {destinations.map((placement) => (
                <option key={placement.docId} value={placement.docId}>
                  {cardsById.get(placement.cardId)?.title || 'Untitled destination'}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={addPlacement} disabled={saving || locked || alreadyAtDestination}>
            {saving ? 'Saving…' : alreadyAtDestination ? 'Already placed here' : 'Add to Collection'}
          </button>
          {locked ? <p className={styles.note}>Published Collection structure is locked. Return it to Draft before changing placement.</p> : null}
          {currentPlacements.length ? (
            <ul className={styles.placements}>
              {currentPlacements.map((placement) => {
                const parent = placement.parentPlacementId
                  ? structure.placements.find((candidate) => candidate.docId === placement.parentPlacementId)
                  : null;
                const label = parent
                  ? cardsById.get(parent.cardId)?.title || 'Untitled destination'
                  : `Top level of ${structure.collection.title}`;
                return (
                  <li key={placement.docId}>
                    <span>{label}</span>
                    <button
                      type="button"
                      disabled={saving || locked}
                      onClick={() => void save(
                        structure.placements.filter((candidate) => candidate.docId !== placement.docId),
                        `Story removed from ${structure.collection.title}.`
                      )}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <p className={styles.note}>This Story is not placed in the selected Collection.</p>}
        </>
      ) : null}
      {message ? <p className={styles.message} role="status">{message}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
