'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, FlaskConical, Search } from 'lucide-react';
import JournalImage from '@/components/common/JournalImage';
import { useMedia } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import type { Media } from '@/lib/types/photo';
import type { Tag } from '@/lib/types/tag';
import { getStudioDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './AuthoringWorkflowLab.module.css';

const DIMENSIONS = ['who', 'what', 'when', 'where'] as const;
type Dimension = (typeof DIMENSIONS)[number];
type Step = 'review' | 'describe' | 'organize' | 'card' | 'complete';

const STEP_LABELS: Array<{ id: Step; label: string }> = [
  { id: 'review', label: 'Review' },
  { id: 'describe', label: 'Describe' },
  { id: 'organize', label: 'Organize' },
  { id: 'card', label: 'Card' },
  { id: 'complete', label: 'Complete' },
];

function mediaNeedsWork(item: Media): boolean {
  return !item.hasWho || !item.hasWhat || !item.hasWhen || !item.hasWhere || !item.caption?.trim();
}

function dimensionLabel(dimension: Dimension): string {
  return dimension.charAt(0).toUpperCase() + dimension.slice(1);
}

function tagLabel(tag: Tag): string {
  return tag.name.trim() || 'Untitled tag';
}

export default function AuthoringWorkflowLab() {
  const {
    media,
    loading,
    loadingMore,
    hasMore,
    fetchMedia,
    loadMore,
  } = useMedia();
  const { tags } = useTag();
  const [activeStep, setActiveStep] = useState<Step>('review');
  const [population, setPopulation] = useState<'incomplete' | 'all'>('incomplete');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedDimension, setExpandedDimension] = useState<Dimension | null>('who');
  const [tagSearch, setTagSearch] = useState('');
  const [draftTags, setDraftTags] = useState<Record<Dimension, string[]>>({
    who: [],
    what: [],
    when: [],
    where: [],
  });
  const [draftSubjects, setDraftSubjects] = useState<string[]>([]);
  const [captionDraft, setCaptionDraft] = useState('');

  useEffect(() => {
    void fetchMedia(1, { codification: population });
  }, [fetchMedia, population]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedMedia = useMemo(
    () => media.filter((item) => selectedSet.has(item.docId)),
    [media, selectedSet]
  );
  const firstSelected = selectedMedia[0] ?? null;

  useEffect(() => {
    setCaptionDraft(firstSelected?.caption ?? '');
  }, [firstSelected?.caption, firstSelected?.docId]);

  const tagsByDimension = useMemo(() => {
    const normalizedSearch = tagSearch.trim().toLowerCase();
    return Object.fromEntries(
      DIMENSIONS.map((dimension) => [
        dimension,
        tags
          .filter(
            (tag) =>
              tag.dimension === dimension &&
              tag.assignable !== false &&
              (!normalizedSearch || tag.name.toLowerCase().includes(normalizedSearch))
          )
          .sort((a, b) => tagLabel(a).localeCompare(tagLabel(b)))
          .slice(0, 24),
      ])
    ) as Record<Dimension, Tag[]>;
  }, [tagSearch, tags]);

  const tagById = useMemo(
    () => new Map(tags.flatMap((tag) => (tag.docId ? [[tag.docId, tag] as const] : []))),
    [tags]
  );

  const toggleSelection = (mediaId: string) => {
    setSelectedIds((current) =>
      current.includes(mediaId)
        ? current.filter((id) => id !== mediaId)
        : [...current, mediaId]
    );
  };

  const toggleDraftTag = (dimension: Dimension, tagId: string) => {
    setDraftTags((current) => {
      const exists = current[dimension].includes(tagId);
      return {
        ...current,
        [dimension]: exists
          ? current[dimension].filter((id) => id !== tagId)
          : [...current[dimension], tagId],
      };
    });
    setDraftSubjects((current) => current.filter((id) => id !== tagId));
  };

  const selectedCount = selectedMedia.length;
  const needsWorkCount = media.filter(mediaNeedsWork).length;

  return (
    <main className={styles.lab}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            <FlaskConical size={15} aria-hidden="true" />
            Read-only workflow prototype
          </div>
          <h1>Authoring Flow Lab</h1>
          <p>
            Test the path from imported media to a completed Card without changing saved content.
          </p>
        </div>
        <a className={styles.returnLink} href="/admin/studio">
          Return to current Studio
        </a>
      </header>

      <nav className={styles.steps} aria-label="Authoring workflow">
        {STEP_LABELS.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              type="button"
              className={activeStep === step.id ? styles.stepActive : styles.step}
              onClick={() => setActiveStep(step.id)}
            >
              <span>{index + 1}</span>
              {step.label}
            </button>
            {index < STEP_LABELS.length - 1 ? <ArrowRight size={16} aria-hidden="true" /> : null}
          </React.Fragment>
        ))}
      </nav>

      <section className={styles.toolbar} aria-label="Media working set">
        <div className={styles.populationToggle}>
          <button
            type="button"
            className={population === 'incomplete' ? styles.toggleActive : undefined}
            onClick={() => setPopulation('incomplete')}
          >
            Needs work
          </button>
          <button
            type="button"
            className={population === 'all' ? styles.toggleActive : undefined}
            onClick={() => setPopulation('all')}
          >
            All media
          </button>
        </div>
        <div className={styles.workingSummary}>
          <strong>{selectedCount}</strong> selected
          <span aria-hidden="true">·</span>
          <strong>{needsWorkCount}</strong> visible items need attention
        </div>
        {selectedCount > 0 ? (
          <button type="button" className={styles.clearButton} onClick={() => setSelectedIds([])}>
            Clear selection
          </button>
        ) : null}
      </section>

      <div className={styles.workspace}>
        <section className={styles.mediaPanel} aria-label="Media review">
          {loading && media.length === 0 ? <p className={styles.state}>Loading media…</p> : null}
          {!loading && media.length === 0 ? (
            <p className={styles.state}>No media match this working set.</p>
          ) : null}
          <div className={styles.mediaGrid}>
            {media.map((item) => {
              const selected = selectedSet.has(item.docId);
              return (
                <button
                  type="button"
                  key={item.docId}
                  className={selected ? styles.mediaTileSelected : styles.mediaTile}
                  onClick={() => toggleSelection(item.docId)}
                  aria-pressed={selected}
                >
                  <span className={styles.imageWrap}>
                    <JournalImage
                      src={getStudioDisplayUrl(item)}
                      alt={item.caption?.trim() || item.filename}
                      fill
                      sizes="(max-width: 900px) 45vw, 220px"
                      className={styles.image}
                    />
                    <span className={styles.selectionMark}>
                      {selected ? <Check size={15} aria-hidden="true" /> : null}
                    </span>
                  </span>
                  <span className={styles.tileCopy}>
                    <strong>{item.caption?.trim() || 'Caption needed'}</strong>
                    <small>{mediaNeedsWork(item) ? 'Needs review' : 'Ready'}</small>
                  </span>
                </button>
              );
            })}
          </div>
          {hasMore ? (
            <button
              type="button"
              className={styles.loadMore}
              onClick={() => void loadMore()}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Load more filtered media'}
            </button>
          ) : null}
        </section>

        <aside className={styles.inspector} aria-label="Persistent authoring inspector">
          <div className={styles.inspectorHeader}>
            <div>
              <span>Persistent inspector</span>
              <h2>{selectedCount > 0 ? `${selectedCount} selected` : 'Select media to begin'}</h2>
            </div>
            <span className={styles.readOnlyBadge}>Local preview</span>
          </div>

          <section className={styles.inspectorSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span>Describe</span>
                <h3>Caption</h3>
              </div>
              {selectedCount > 1 ? <small>First selected item</small> : null}
            </div>
            <textarea
              aria-label="Caption draft"
              value={captionDraft}
              onChange={(event) => setCaptionDraft(event.target.value)}
              placeholder={selectedCount > 0 ? 'Write the useful caption here…' : 'Select media first'}
              disabled={selectedCount === 0}
              rows={4}
            />
          </section>

          <section className={styles.inspectorSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span>Organize</span>
                <h3>Tags and subjects</h3>
              </div>
            </div>
            <label className={styles.tagSearch}>
              <Search size={15} aria-hidden="true" />
              <input
                aria-label="Find a tag"
                value={tagSearch}
                onChange={(event) => setTagSearch(event.target.value)}
                placeholder="Find a tag"
                disabled={selectedCount === 0}
              />
            </label>

            <div className={styles.dimensions}>
              {DIMENSIONS.map((dimension) => {
                const selectedTagIds = draftTags[dimension];
                const expanded = expandedDimension === dimension;
                return (
                  <div className={styles.dimension} key={dimension}>
                    <button
                      type="button"
                      className={styles.dimensionHeader}
                      onClick={() => setExpandedDimension(expanded ? null : dimension)}
                      disabled={selectedCount === 0}
                      aria-expanded={expanded}
                    >
                      <span>
                        <strong>{dimensionLabel(dimension)}</strong>
                        <small>
                          {selectedTagIds.length === 0
                            ? 'None selected'
                            : `${selectedTagIds.length} selected`}
                        </small>
                      </span>
                      <ChevronDown
                        size={17}
                        className={expanded ? styles.chevronOpen : undefined}
                        aria-hidden="true"
                      />
                    </button>

                    {selectedTagIds.length > 0 ? (
                      <div className={styles.selectedTags}>
                        {selectedTagIds.map((tagId) => {
                          const tag = tagById.get(tagId);
                          if (!tag) return null;
                          const subject = draftSubjects.includes(tagId);
                          return (
                            <div className={styles.selectedTag} key={tagId}>
                              <button type="button" onClick={() => toggleDraftTag(dimension, tagId)}>
                                {tagLabel(tag)}
                              </button>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={subject}
                                  onChange={() =>
                                    setDraftSubjects((current) =>
                                      subject
                                        ? current.filter((id) => id !== tagId)
                                        : [...current, tagId]
                                    )
                                  }
                                />
                                Subject
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {expanded ? (
                      <div className={styles.tagChoices}>
                        {tagsByDimension[dimension].map((tag) => {
                          if (!tag.docId) return null;
                          const selected = selectedTagIds.includes(tag.docId);
                          return (
                            <button
                              type="button"
                              key={tag.docId}
                              className={selected ? styles.tagChoiceSelected : styles.tagChoice}
                              onClick={() => toggleDraftTag(dimension, tag.docId!)}
                              disabled={selectedCount === 0}
                            >
                              {selected ? <Check size={13} aria-hidden="true" /> : null}
                              {tagLabel(tag)}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.cardPreview}>
            <div>
              <span>Next</span>
              <h3>Create or open a Card</h3>
              <p>Selection, captions, tags, and subjects stay visible during the handoff.</p>
            </div>
            <button type="button" disabled>
              Preview only
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}
