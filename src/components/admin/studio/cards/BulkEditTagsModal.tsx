'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Square, User } from 'lucide-react';
import type { Card } from '@/lib/types/card';
import type { GalleryTagInheritanceToggles } from '@/lib/types/authorSettings';
import { useTag } from '@/components/providers/TagProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  createUITreeFromDimensions,
  filterTreesBySearch,
  normalizeTagDimensionKey,
} from '@/lib/utils/tagUtils';
import { DIMENSION_LABEL, DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import type { TagWithChildren } from '@/components/providers/TagProvider';
import TagPickerDimensionColumn from '@/components/admin/studio/cards/TagPickerDimensionColumn';
import styles from './BulkEditTagsModal.module.css';

type SourceDecision = 'keep' | 'inherit' | 'override';
type SelectionState = 'checked' | 'unchecked' | 'mixed';

interface BulkEditTagsModalProps {
  cardIds: string[];
  selectedCards: Card[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    cardIds: string[];
    addTagIds: string[];
    removeTagIds: string[];
    cards: Card[];
  }) => Promise<void>;
}

const DIMENSION_ICON = {
  who: User,
  what: Square,
  when: Calendar,
  where: MapPin,
} satisfies Record<TagDimension, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>>;

const PROTECTED: GalleryTagInheritanceToggles = {
  who: true,
  what: true,
  when: true,
  where: true,
};

function StateExample({ state, label }: { state: SelectionState; label: string }) {
  const ref = React.useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'mixed';
  }, [state]);
  return (
    <span className={styles.stateExample}>
      <input ref={ref} type="checkbox" checked={state === 'checked'} readOnly tabIndex={-1} />
      <span>{label}</span>
    </span>
  );
}

export default function BulkEditTagsModal({
  cardIds,
  selectedCards: cards = [],
  isOpen,
  onClose,
  onSave,
}: BulkEditTagsModalProps) {
  const { tags: allTags, loading: tagsLoading } = useTag();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagDecisions, setTagDecisions] = useState<Map<string, boolean>>(new Map());
  const [subjectDecisions, setSubjectDecisions] = useState<Map<string, boolean>>(new Map());
  const [sourceDecisions, setSourceDecisions] = useState<Record<TagDimension, SourceDecision>>({
    who: 'keep',
    what: 'keep',
    when: 'keep',
    where: 'keep',
  });
  const [inheritanceAvailable, setInheritanceAvailable] =
    useState<GalleryTagInheritanceToggles | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setTagDecisions(new Map());
      setSubjectDecisions(new Map());
      setSourceDecisions({ who: 'keep', what: 'keep', when: 'keep', where: 'keep' });
      setSearchTerm('');
      return;
    }
    setIsLoading(true);
    setError(null);
    void fetch('/api/admin/author-settings')
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = (await response.json()) as {
          settings?: { galleryTagInheritance?: GalleryTagInheritanceToggles };
        };
        return payload.settings?.galleryTagInheritance ?? null;
      })
      .then((settings) => setInheritanceAvailable(settings))
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : 'Could not load inheritance settings.');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const tagDimensionById = useMemo(() => {
    const map = new Map<string, TagDimension>();
    for (const tag of allTags ?? []) {
      const dimension = normalizeTagDimensionKey(tag.dimension as string | undefined);
      if (dimension) map.set(tag.docId, dimension);
    }
    return map;
  }, [allTags]);

  const dimensionalTree = useMemo(
    () => createUITreeFromDimensions(allTags ?? []),
    [allTags]
  );
  const filteredDimensionalTree = useMemo(() => {
    const search = searchTerm.trim();
    if (!search) return dimensionalTree;
    return dimensionalTree.map((dimension) => ({
      ...dimension,
      children: filterTreesBySearch(dimension.children, search),
    }));
  }, [dimensionalTree, searchTerm]);

  const tagPresenceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      for (const id of card.tags ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [cards]);

  const subjectPresenceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      const ids = card.subjectTagIds?.length
        ? card.subjectTagIds
        : card.subjectTagId
          ? [card.subjectTagId]
          : [];
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [cards]);

  const selectionState = React.useCallback(
    (id: string, decisions: Map<string, boolean>, counts: Map<string, number>): SelectionState => {
      const explicit = decisions.get(id);
      if (explicit !== undefined) return explicit ? 'checked' : 'unchecked';
      const count = counts.get(id) ?? 0;
      if (count === 0) return 'unchecked';
      if (count === cards.length) return 'checked';
      return 'mixed';
    },
    [cards.length]
  );

  const getTagState = React.useCallback(
    (id: string) => selectionState(id, tagDecisions, tagPresenceCounts),
    [selectionState, tagDecisions, tagPresenceCounts]
  );
  const getSubjectState = React.useCallback(
    (id: string) => selectionState(id, subjectDecisions, subjectPresenceCounts),
    [selectionState, subjectDecisions, subjectPresenceCounts]
  );

  const checkedSelection = useMemo(() => {
    const selected = new Set<string>();
    for (const tag of allTags ?? []) {
      if (getTagState(tag.docId) === 'checked') selected.add(tag.docId);
    }
    return selected;
  }, [allTags, getTagState]);

  const expandedNodeIds = useMemo(() => {
    const expanded = new Set<string>();
    const walk = (node: TagWithChildren): boolean => {
      const state = getTagState(node.docId);
      const selected = state === 'checked' || state === 'mixed';
      let selectedChild = false;
      for (const child of node.children ?? []) {
        if (walk(child)) selectedChild = true;
      }
      if (selectedChild) expanded.add(node.docId);
      return selected || selectedChild;
    };
    for (const dimension of dimensionalTree) {
      for (const child of dimension.children ?? []) walk(child);
    }
    return expanded;
  }, [dimensionalTree, getTagState]);

  const sourceSummary = useMemo(() => {
    return Object.fromEntries(
      DIMENSION_ORDER.map((dimension) => {
        let inherited = 0;
        let overridden = 0;
        let noGallery = 0;
        let unreviewed = 0;
        for (const card of cards) {
          const overrides = card.galleryTagInheritanceOverrides ?? PROTECTED;
          if (overrides[dimension]) overridden += 1;
          else inherited += 1;
          if ((card.galleryMedia ?? []).length === 0) noGallery += 1;
          if (card.galleryTagRollupStatuses?.[dimension] === 'unreviewed') unreviewed += 1;
        }
        return [dimension, { inherited, overridden, noGallery, unreviewed }];
      })
    ) as Record<
      TagDimension,
      { inherited: number; overridden: number; noGallery: number; unreviewed: number }
    >;
  }, [cards]);

  const subjectCandidatesByDimension = useMemo(() => {
    return Object.fromEntries(
      DIMENSION_ORDER.map((dimension) => [
        dimension,
        (allTags ?? []).filter((tag) => {
          if (tagDimensionById.get(tag.docId) !== dimension) return false;
          return (tagPresenceCounts.get(tag.docId) ?? 0) > 0 || tagDecisions.get(tag.docId) === true;
        }),
      ])
    ) as Record<TagDimension, NonNullable<typeof allTags>>;
  }, [allTags, tagDecisions, tagDimensionById, tagPresenceCounts]);

  const setDimensionSource = (dimension: TagDimension, decision: SourceDecision) => {
    setSourceDecisions((current) => ({ ...current, [dimension]: decision }));
    if (decision !== 'override') {
      setTagDecisions((current) => {
        const next = new Map(current);
        for (const id of next.keys()) {
          if (tagDimensionById.get(id) === dimension) next.delete(id);
        }
        return next;
      });
      setSubjectDecisions((current) => {
        const next = new Map(current);
        for (const id of next.keys()) {
          if (tagDimensionById.get(id) === dimension) next.delete(id);
        }
        return next;
      });
    }
  };

  const applyDecision = (
    current: Map<string, boolean>,
    id: string,
    state: SelectionState
  ) => {
    const next = new Map(current);
    next.set(id, state !== 'checked');
    return next;
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedCards = await Promise.all(
        cards.map(async (card) => {
          const overrides = { ...(card.galleryTagInheritanceOverrides ?? PROTECTED) };
          for (const dimension of DIMENSION_ORDER) {
            if (sourceDecisions[dimension] === 'inherit') overrides[dimension] = false;
            if (sourceDecisions[dimension] === 'override') overrides[dimension] = true;
          }

          const nextTags = new Set(card.tags ?? []);
          for (const [id, selected] of tagDecisions) {
            const dimension = tagDimensionById.get(id);
            if (dimension && sourceDecisions[dimension] === 'override') {
              if (selected) nextTags.add(id);
              else nextTags.delete(id);
            }
          }

          const existingSubjects = card.subjectTagIds?.length
            ? card.subjectTagIds
            : card.subjectTagId
              ? [card.subjectTagId]
              : [];
          const nextSubjects = new Set(existingSubjects);
          for (const [id, selected] of subjectDecisions) {
            const dimension = tagDimensionById.get(id);
            if (dimension && sourceDecisions[dimension] === 'override') {
              if (selected && nextTags.has(id)) nextSubjects.add(id);
              else nextSubjects.delete(id);
            }
          }

          const response = await fetch(`/api/cards/${card.docId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tags: [...nextTags],
              subjectTagIds: [...nextSubjects],
              galleryTagInheritanceOverrides: overrides,
            }),
          });
          if (!response.ok) throw new Error(`Could not update ${card.title || 'a selected Card'}.`);
          return response.json() as Promise<Card>;
        })
      );

      const addTagIds = [...tagDecisions].filter(([, value]) => value).map(([id]) => id);
      const removeTagIds = [...tagDecisions].filter(([, value]) => !value).map(([id]) => id);
      await onSave({ cardIds, addTagIds, removeTagIds, cards: updatedCards });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the selected Cards.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContainer}>
        <h2 className={styles.modalHeader}>Card Tags</h2>

        {isLoading || tagsLoading ? (
          <LoadingSpinner />
        ) : error && cards.length === 0 ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.mediaTagWorkspace}>
            <div className={styles.dimensionHeadings}>
              {DIMENSION_ORDER.map((dimension) => {
                const Icon = DIMENSION_ICON[dimension];
                return (
                  <h4 key={dimension} className={styles.dimensionHeading}>
                    <Icon size={16} aria-hidden />
                    <span>{DIMENSION_LABEL[dimension]}</span>
                  </h4>
                );
              })}
            </div>

            <div className={styles.galleryTagBand}>
              <div className={styles.assignmentBandLabel}>Current source</div>
              <div className={styles.subjectColumns}>
                {DIMENSION_ORDER.map((dimension) => {
                  const summary = sourceSummary[dimension];
                  return (
                    <div key={dimension} className={styles.bulkSourceSummary}>
                      <span>{summary.inherited} inherited · {summary.overridden} overridden</span>
                      {summary.noGallery > 0 ? <span>{summary.noGallery} without Gallery media</span> : null}
                      {summary.unreviewed > 0 ? <span>{summary.unreviewed} unreviewed</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.inheritanceBand}>
              <div className={styles.assignmentBandLabel}>Change source</div>
              <div className={styles.subjectColumns}>
                {DIMENSION_ORDER.map((dimension) => (
                  <div key={dimension} className={styles.bulkSourceChoices}>
                    {(['keep', 'inherit', 'override'] as const).map((choice) => (
                      <label key={choice}>
                        <input
                          type="radio"
                          name={`bulk-source-${dimension}`}
                          value={choice}
                          checked={sourceDecisions[dimension] === choice}
                          disabled={choice === 'inherit' && inheritanceAvailable?.[dimension] !== true}
                          onChange={() => setDimensionSource(dimension, choice)}
                        />
                        <span>{choice === 'keep' ? 'Keep' : choice === 'inherit' ? 'Inherit' : 'Override'}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Search tags..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className={styles.searchInput}
                autoFocus
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className={styles.searchClear}
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </div>

            <div className={styles.subjectBand}>
              <div className={styles.dimensionSubjectLabel}>
                Subjects <span>(Choose tags to make subjects on every selected Card.)</span>
              </div>
              <div className={styles.subjectColumns}>
                {DIMENSION_ORDER.map((dimension) => (
                  <div key={dimension} className={styles.dimensionSubjectOptions}>
                    {subjectCandidatesByDimension[dimension].map((tag) => {
                      const state = getSubjectState(tag.docId);
                      return (
                        <label key={tag.docId} className={styles.subjectOption}>
                          <input
                            type="checkbox"
                            checked={state === 'checked'}
                            ref={(node) => {
                              if (node) node.indeterminate = state === 'mixed';
                            }}
                            disabled={sourceDecisions[dimension] !== 'override'}
                            onChange={() =>
                              setSubjectDecisions((current) =>
                                applyDecision(current, tag.docId, state)
                              )
                            }
                          />
                          <span className={styles.subjectOptionCopy}>{tag.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.mediaInteractiveColumns}>
              {filteredDimensionalTree.map((dimension, index) => {
                const dimensionKey = DIMENSION_ORDER[index];
                return (
                  <TagPickerDimensionColumn
                    key={dimension.docId}
                    dimension={dimension}
                    selection={checkedSelection}
                    onSelectionChange={(id, selected) =>
                      setTagDecisions((current) => new Map(current).set(id, selected))
                    }
                    getSelectionState={getTagState}
                    onToggleTag={(id, state) =>
                      setTagDecisions((current) => applyDecision(current, id, state))
                    }
                    expandedNodeIds={expandedNodeIds}
                    checkboxIdPrefix="bulk-card-tag"
                    forceExpandAll
                    showManagementControls
                    hideHeader
                    disabled={sourceDecisions[dimensionKey] !== 'override'}
                  />
                );
              })}
            </div>
          </div>
        )}

        {error && cards.length > 0 ? <div className={styles.error}>{error}</div> : null}
        <div className={styles.mediaFooter}>
          <div className={styles.stateLegend}>
            <span className={styles.legendLabel}>Legend:</span>
            <StateExample state="unchecked" label="Empty" />
            <StateExample state="mixed" label="Some" />
            <StateExample state="checked" label="All" />
          </div>
          <div className={styles.mediaActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isLoading}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              className={styles.saveButton}
              disabled={isLoading || tagsLoading || cards.length === 0}
            >
              {isLoading ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
