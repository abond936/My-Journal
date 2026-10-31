'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Card } from '@/lib/types/card';
import type {
  Collection,
  CollectionLifecycle,
  CollectionPlacement,
  CollectionPlacementRole,
  CollectionPlacementStructureInput,
} from '@/lib/types/collection';
import type { AudienceSelection } from '@/lib/types/audience';
import AudienceSelector from '@/components/admin/audience/AudienceSelector';
import CreateCollectionControl from '@/components/admin/collections/CreateCollectionControl';
import type { CollectionAudienceImpact } from '@/lib/services/audienceImpactService';
import styles from './DurableCollectionStudioPane.module.css';

type Availability = 'loading' | 'active' | 'none' | 'error';
type StructureResponse = {
  ok: true;
  collection: Collection;
  placements: CollectionPlacement[];
  cards: Card[];
};

const roles: CollectionPlacementRole[] = ['part', 'chapter', 'section', 'card'];

function structureInput(placement: CollectionPlacement): CollectionPlacementStructureInput {
  return {
    docId: placement.docId,
    cardId: placement.cardId,
    parentPlacementId: placement.parentPlacementId ?? null,
    role: placement.role,
    order: placement.order,
  };
}

export default function DurableCollectionStudioPane({
  initialCollectionId,
  onAvailabilityChange,
  onSelectCard,
}: {
  initialCollectionId?: string | null;
  onAvailabilityChange: (availability: Availability) => void;
  onSelectCard?: (cardId: string, card?: Card | null) => void | Promise<boolean>;
}) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [structure, setStructure] = useState<StructureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cardSearch, setCardSearch] = useState('');
  const [cardSearchResults, setCardSearchResults] = useState<Card[]>([]);
  const [searchingCards, setSearchingCards] = useState(false);
  const structureLocked = structure?.collection.lifecycle === 'published';

  useEffect(() => {
    let cancelled = false;
    const loadCollections = async () => {
      onAvailabilityChange('loading');
      try {
        const response = await fetch('/api/admin/collections');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Active Collections could not be loaded.');
        if (cancelled) return;
        const items = Array.isArray(data.collections) ? data.collections as Collection[] : [];
        setCollections(items);
        if (!items.length) {
          setLoading(false);
          onAvailabilityChange('none');
          return;
        }
        const requestedCollection = initialCollectionId
          ? items.find((item) => item.docId === initialCollectionId)
          : null;
        setSelectedCollectionId(requestedCollection?.docId ?? items[0].docId);
        onAvailabilityChange('active');
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Active Collections could not be loaded.');
        setLoading(false);
        onAvailabilityChange('error');
      }
    };
    void loadCollections();
    return () => { cancelled = true; };
  }, [initialCollectionId, onAvailabilityChange]);

  const loadStructure = useCallback(async (collectionId: string) => {
    if (!collectionId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/collections/${encodeURIComponent(collectionId)}/structure`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Collection structure could not be loaded.');
      setStructure(data as StructureResponse);
    } catch (loadError) {
      setStructure(null);
      setError(loadError instanceof Error ? loadError.message : 'Collection structure could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCollectionId) void loadStructure(selectedCollectionId);
  }, [loadStructure, selectedCollectionId]);

  const cardsById = useMemo(
    () => new Map((structure?.cards ?? []).filter((card) => card.docId).map((card) => [card.docId!, card])),
    [structure?.cards]
  );
  const childrenByParent = useMemo(() => {
    const groups = new Map<string | null, CollectionPlacement[]>();
    (structure?.placements ?? []).forEach((placement) => {
      const parentId = placement.parentPlacementId ?? null;
      const children = groups.get(parentId) ?? [];
      children.push(placement);
      groups.set(parentId, children);
    });
    groups.forEach((children) => children.sort((a, b) => a.order - b.order || a.docId.localeCompare(b.docId)));
    return groups;
  }, [structure?.placements]);

  const savePlacements = useCallback(async (
    nextPlacements: CollectionPlacement[],
    successMessage: string,
    nextCards: Card[] = structure?.cards ?? []
  ): Promise<boolean> => {
    if (!structure || saving) return false;
    if (structure.collection.lifecycle === 'published') {
      setError('Return the Collection to Draft before changing its structure.');
      return false;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/collections/${encodeURIComponent(structure.collection.docId)}/structure`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedStructureRevision: structure.collection.structureRevision,
          placements: nextPlacements.map(structureInput),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Collection structure could not be saved.');
      setStructure({
        ...structure,
        collection: { ...structure.collection, structureRevision: data.structureRevision },
        placements: nextPlacements,
        cards: nextCards,
      });
      setMessage(successMessage);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Collection structure could not be saved.');
      await loadStructure(structure.collection.docId);
      return false;
    } finally {
      setSaving(false);
    }
  }, [loadStructure, saving, structure]);

  const updateLifecycle = useCallback(async (lifecycle: CollectionLifecycle) => {
    if (!structure || saving) return;
    const verb = lifecycle === 'published' ? 'publish' : 'return to Draft';
    const consequence = lifecycle === 'published'
      ? 'Publishing makes this Collection and its placed Cards available to the confirmed Collection audience.'
      : 'Returning to Draft removes this Collection route from Reader access; Cards may remain available through Feed or other Collections.';
    if (!window.confirm(`${consequence}\n\nContinue to ${verb} ${structure.collection.title}?`)) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/collections/${encodeURIComponent(structure.collection.docId)}/lifecycle`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lifecycle }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Collection lifecycle could not be saved.');
      const collection = data.collection as Collection;
      setStructure((current) => current ? { ...current, collection } : current);
      setCollections((current) => current.map((item) => item.docId === collection.docId ? collection : item));
      setMessage(lifecycle === 'published'
        ? 'Collection published to its confirmed audience.'
        : 'Collection returned to Draft. Its structure can now be edited privately.');
    } catch (lifecycleError) {
      setError(lifecycleError instanceof Error ? lifecycleError.message : 'Collection lifecycle could not be saved.');
    } finally {
      setSaving(false);
    }
  }, [saving, structure]);

  const saveAudience = useCallback(async (audience: AudienceSelection): Promise<boolean> => {
    if (!structure || saving) return false;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/collections/${encodeURIComponent(structure.collection.docId)}/audience`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audience),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Collection audience could not be saved.');
      setStructure((current) => current ? {
        ...current,
        collection: { ...current.collection, audience: data.audience as AudienceSelection },
      } : current);
      setMessage('Collection audience saved. Access changes take effect on the next Reader request.');
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Collection audience could not be saved.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [saving, structure]);

  const getCollectionAudienceImpact = useCallback(async (
    audience: AudienceSelection
  ): Promise<CollectionAudienceImpact> => {
    if (!structure) throw new Error('Collection structure is not loaded.');
    const response = await fetch(
      `/api/admin/collections/${encodeURIComponent(structure.collection.docId)}/audience-impact`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audience),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Collection audience impact could not be calculated.');
    if (!data.impact) throw new Error('Collection audience impact could not be calculated.');
    return data.impact as CollectionAudienceImpact;
  }, [structure]);

  const searchCards = useCallback(async () => {
    const query = cardSearch.trim();
    if (!query) return;
    setSearchingCards(true);
    setError(null);
    try {
      const response = await fetch(`/api/cards/search?q=${encodeURIComponent(query)}&limit=20`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Cards could not be searched.');
      setCardSearchResults(Array.isArray(data.items) ? data.items : []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Cards could not be searched.');
    } finally {
      setSearchingCards(false);
    }
  }, [cardSearch]);

  const addCard = useCallback(async (card: Card) => {
    if (!structure || !card.docId) return;
    const rootOrders = structure.placements
      .filter((placement) => !placement.parentPlacementId)
      .map((placement) => placement.order);
    const placementId = `pl-${structure.collection.docId}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    const nextPlacement: CollectionPlacement = {
      docId: placementId,
      collectionId: structure.collection.docId,
      cardId: card.docId,
      parentPlacementId: null,
      role: 'card',
      order: rootOrders.length ? Math.max(...rootOrders) + 10 : 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const nextCards = cardsById.has(card.docId) ? structure.cards : [...structure.cards, card];
    const saved = await savePlacements(
      [...structure.placements, nextPlacement],
      `Added ${card.title || 'Untitled Card'} to the Collection.`,
      nextCards
    );
    if (saved) {
      setCardSearch('');
      setCardSearchResults([]);
    }
  }, [cardsById, savePlacements, structure]);

  const movePlacement = useCallback((placementId: string, direction: -1 | 1) => {
    if (!structure) return;
    const current = structure.placements.find((placement) => placement.docId === placementId);
    if (!current) return;
    const siblings = childrenByParent.get(current.parentPlacementId ?? null) ?? [];
    const index = siblings.findIndex((placement) => placement.docId === placementId);
    const other = siblings[index + direction];
    if (!other) return;
    const next = structure.placements.map((placement) => {
      if (placement.docId === current.docId) return { ...placement, order: other.order };
      if (placement.docId === other.docId) return { ...placement, order: current.order };
      return placement;
    });
    void savePlacements(next, 'Collection order updated.');
  }, [childrenByParent, savePlacements, structure]);

  const descendantIds = useCallback((placementId: string) => {
    const descendants = new Set<string>();
    const visit = (parentId: string) => {
      (childrenByParent.get(parentId) ?? []).forEach((child) => {
        if (descendants.has(child.docId)) return;
        descendants.add(child.docId);
        visit(child.docId);
      });
    };
    visit(placementId);
    return descendants;
  }, [childrenByParent]);

  const allowedParents = useCallback((placement: CollectionPlacement) => {
    if (!structure || placement.role === 'part') return [];
    const allowedParentRoles: CollectionPlacementRole[] = placement.role === 'chapter'
      ? ['part']
      : placement.role === 'section'
        ? ['chapter']
        : ['part', 'chapter', 'section'];
    const descendants = descendantIds(placement.docId);
    return structure.placements.filter((candidate) =>
      candidate.docId !== placement.docId
      && !descendants.has(candidate.docId)
      && allowedParentRoles.includes(candidate.role)
    );
  }, [descendantIds, structure]);

  const changeParent = useCallback((placementId: string, parentPlacementId: string | null) => {
    if (!structure) return;
    const siblings = structure.placements.filter((placement) =>
      (placement.parentPlacementId ?? null) === parentPlacementId && placement.docId !== placementId
    );
    const nextOrder = siblings.length ? Math.max(...siblings.map((placement) => placement.order)) + 10 : 10;
    const next = structure.placements.map((placement) =>
      placement.docId === placementId ? { ...placement, parentPlacementId, order: nextOrder } : placement
    );
    void savePlacements(next, 'Placement parent updated.');
  }, [savePlacements, structure]);

  const changeRole = useCallback((placementId: string, role: CollectionPlacementRole) => {
    if (!structure) return;
    const next = structure.placements.map((placement) =>
      placement.docId === placementId ? { ...placement, role } : placement
    );
    void savePlacements(next, 'Placement role updated.');
  }, [savePlacements, structure]);

  const removeLeafPlacement = useCallback((placement: CollectionPlacement) => {
    if (!structure || (childrenByParent.get(placement.docId) ?? []).length > 0) return;
    const card = cardsById.get(placement.cardId);
    const next = structure.placements.filter((candidate) => candidate.docId !== placement.docId);
    void savePlacements(next, `Removed ${card?.title || 'Untitled Card'} from this Collection.`);
  }, [cardsById, childrenByParent, savePlacements, structure]);

  const renderPlacement = (placement: CollectionPlacement) => {
    const card = cardsById.get(placement.cardId);
    const children = childrenByParent.get(placement.docId) ?? [];
    const siblings = childrenByParent.get(placement.parentPlacementId ?? null) ?? [];
    const parentOptions = allowedParents(placement);
    const siblingIndex = siblings.findIndex((sibling) => sibling.docId === placement.docId);
    const row = (
      <div className={styles.row}>
        <button
          type="button"
          className={styles.titleButton}
          onClick={() => void onSelectCard?.(placement.cardId, card)}
        >
          {card?.title || 'Untitled Card'}
        </button>
        <select
          aria-label={`Role for ${card?.title || 'Untitled Card'}`}
          value={placement.role}
          disabled={structureLocked || saving}
          onChange={(event) => changeRole(placement.docId, event.target.value as CollectionPlacementRole)}
        >
          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <select
          aria-label={`Parent for ${card?.title || 'Untitled Card'}`}
          value={placement.parentPlacementId ?? ''}
          disabled={structureLocked || saving || placement.role === 'part'}
          onChange={(event) => changeParent(placement.docId, event.target.value || null)}
        >
          <option value="">Collection level</option>
          {parentOptions.map((candidate) => (
            <option key={candidate.docId} value={candidate.docId}>
              {cardsById.get(candidate.cardId)?.title || 'Untitled Card'}
            </option>
          ))}
        </select>
        <button type="button" disabled={structureLocked || saving || siblingIndex <= 0} onClick={() => movePlacement(placement.docId, -1)} aria-label={`Move ${card?.title || 'Card'} up`}>↑</button>
        <button type="button" disabled={structureLocked || saving || siblingIndex < 0 || siblingIndex >= siblings.length - 1} onClick={() => movePlacement(placement.docId, 1)} aria-label={`Move ${card?.title || 'Card'} down`}>↓</button>
        <button
          type="button"
          disabled={structureLocked || saving || children.length > 0}
          onClick={() => removeLeafPlacement(placement)}
          aria-label={`Remove ${card?.title || 'Card'} from Collection`}
          title={children.length ? 'Move or remove child placements first.' : 'Remove this placement; the Card is preserved.'}
        >
          Remove
        </button>
      </div>
    );
    return (
      <li key={placement.docId} className={styles.node}>
        {children.length ? (
          <details open>
            <summary>{row}</summary>
            <ol>{children.map(renderPlacement)}</ol>
          </details>
        ) : row}
      </li>
    );
  };

  return (
    <div className={styles.pane}>
      <CreateCollectionControl onCreated={(collection) => {
        setCollections((current) => [...current, collection]);
        setSelectedCollectionId(collection.docId);
        setMessage(`${collection.title} created as a private draft.`);
        onAvailabilityChange('active');
      }} />
      {!collections.length && !loading && !error ? (
        <p className={styles.note}>No active Collections yet. Create one when you are ready to shape a Reader path.</p>
      ) : null}
      {collections.length > 1 ? (
        <select aria-label="Active Collection" value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)}>
          {collections.map((collection) => <option key={collection.docId} value={collection.docId}>{collection.title}</option>)}
        </select>
      ) : null}
      {structure ? (
        <div className={styles.heading}>
          <strong>{structure.collection.title}</strong>
          <div className={styles.headingActions}>
            <span>{structure.collection.lifecycle === 'published' ? 'Published' : 'Draft'} · Revision {structure.collection.structureRevision}</span>
            <button
              type="button"
              disabled={saving}
              onClick={() => void updateLifecycle(
                structure.collection.lifecycle === 'published' ? 'draft' : 'published'
              )}
            >
              {structure.collection.lifecycle === 'published' ? 'Return to Draft' : 'Publish Collection'}
            </button>
          </div>
        </div>
      ) : null}
      {structure ? (
        <p className={styles.note}>Placement-native Studio: Cards remain canonical while this Collection owns role, parent, and order.</p>
      ) : null}
      {structureLocked ? (
        <p className={styles.note}>Published structure is locked. Return the Collection to Draft before adding, removing, moving, or changing placement roles.</p>
      ) : null}
      {structure ? (
        <AudienceSelector
          value={structure.collection.audience}
          scopeLabel="Collection"
          consequence="Every published Story placed here is available to this audience through the Collection. A Story may also be available through its standalone route or another Collection."
          disabled={saving}
          onSave={saveAudience}
          getCollectionImpact={getCollectionAudienceImpact}
        />
      ) : null}
      {structure ? <div className={styles.addCard}>
        <input
          type="search"
          aria-label="Find a Card to add"
          placeholder="Find a Card to add..."
          value={cardSearch}
          disabled={structureLocked}
          onChange={(event) => setCardSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void searchCards();
            }
          }}
        />
        <button type="button" disabled={structureLocked || searchingCards || !cardSearch.trim()} onClick={() => void searchCards()}>
          {searchingCards ? 'Searching...' : 'Search'}
        </button>
      </div> : null}
      {cardSearchResults.length ? (
        <ul className={styles.searchResults} aria-label="Card search results">
          {cardSearchResults.map((card) => (
            <li key={card.docId}>
              <span>{card.title || 'Untitled Card'}</span>
              <button type="button" disabled={structureLocked || saving} onClick={() => void addCard(card)}>
                Add
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {message ? <p className={styles.message} role="status">{message}</p> : null}
      {loading ? <p aria-busy="true">Loading Collection structure...</p> : null}
      {!loading && structure ? <ol className={styles.tree}>{(childrenByParent.get(null) ?? []).map(renderPlacement)}</ol> : null}
    </div>
  );
}
