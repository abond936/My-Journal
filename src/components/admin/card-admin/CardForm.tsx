'use client';

import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import { Card, HydratedGalleryMediaItem } from '@/lib/types/card';
import { Media } from '@/lib/types/photo';
import { dehydrateCardForSave, extractMediaFromContent, generateExcerpt } from '@/lib/utils/cardUtils';
import CoverPhotoContainer from '@/components/admin/card-admin/CoverPhotoContainer';
import GalleryManager from '@/components/admin/card-admin/GalleryManager';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import macroTagStyles from '@/components/admin/card-admin/MacroTagSelector.module.css';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import ChildCardManager from '@/components/admin/card-admin/ChildCardManager';
import RichTextEditor, { RichTextEditorRef } from '@/components/common/RichTextEditor';
import styles from './CardForm.module.css';
import { useCardForm } from '@/components/providers/CardFormProvider';
import clsx from 'clsx';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';
import LoadingOverlay from '@/components/admin/card-admin/LoadingOverlay';
import { getAllowedDisplayModes, normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';
import { arrayMove } from '@dnd-kit/sortable';
import { useStudioCardFormStudioOptional } from '@/components/admin/studio/studioCardFormStudioContext';
import { useStudioShellOptional } from '@/components/admin/studio/StudioShellContext';
import { StudioDropZone } from '@/components/admin/studio/studioRelationshipDndPrimitives';
import StudioCardFormGallery from '@/components/admin/studio/StudioCardFormGallery';
import StudioCardFormChildren from '@/components/admin/studio/StudioCardFormChildren';

type CardDraftOption = {
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  rationale?: string;
};

function textToBasicHtml(text: string): string {
  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return safe
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function normalizeGalleryOrders(items: HydratedGalleryMediaItem[]): HydratedGalleryMediaItem[] {
  return items.map((item, index) => ({
    ...item,
    order:
      typeof item.order === 'number' && !Number.isNaN(item.order) ? item.order : index,
  }));
}

function formatCardApiError(data: Record<string, unknown>): string {
  if (typeof data.message === 'string' && data.message) return data.message;
  if (typeof data.error === 'string' && data.error) return data.error;
  const d = data.details as { issues?: Array<{ message?: string; path?: unknown }> } | undefined;
  if (d?.issues?.length) {
    return d.issues.map((i) => i.message || JSON.stringify(i.path)).join('; ');
  }
  return 'Could not save gallery to the card.';
}

const CardForm: React.FC = () => {
  const {
    formState: { cardData, isSaving, errors, formRevision, lastSavedState },
    allTags,
    setField,
    updateCoverImage,
    handleSave,
    persistFieldPatch,
    updateContentMedia,
    registerEditorContentGetter,
    commitGalleryMediaPersisted,
  } = useCardForm();

  const studioFormCtx = useStudioCardFormStudioOptional();
  const studioShellForm = Boolean(studioFormCtx?.studioShellCardForm);
  const studioShellDnd = Boolean(studioFormCtx?.enableStudioShellDnd);
  const studioShell = useStudioShellOptional();

  const editorRef = useRef<RichTextEditorRef>(null);

  useEffect(() => {
    if (!studioShellDnd || !studioShell?.bodyMediaInsertRef) return;
    const r = studioShell.bodyMediaInsertRef;
    r.current = (media: Media) => {
      editorRef.current?.insertImage(media);
    };
    return () => {
      r.current = null;
    };
  }, [studioShellDnd, studioShell]);

  useEffect(() => {
    return registerEditorContentGetter(
      () => editorRef.current?.getContent() ?? (cardData.content ?? '')
    );
  }, [registerEditorContentGetter, cardData.content]);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [isSuggestingDrafts, setIsSuggestingDrafts] = useState(false);
  const [includeHistoricalContext, setIncludeHistoricalContext] = useState(false);
  const [draftOptions, setDraftOptions] = useState<CardDraftOption[]>([]);
  const [draftSuggestionError, setDraftSuggestionError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tagMacroExpanded, setTagMacroExpanded] = useState(false);

  useEffect(() => {
    setTagMacroExpanded(false);
  }, [cardData.docId]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setField('title', e.target.value), [setField]);
  const handleSubtitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setField('subtitle', e.target.value), [setField]);
  const handleExcerptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setField('excerpt', e.target.value), [setField]);
  const isExcerptAuto = cardData.excerptAuto !== false;
  const autoExcerptPreview = useMemo(() => generateExcerpt(cardData.content), [cardData.content]);
  const autoExcerptDisplay = autoExcerptPreview || cardData.excerpt || 'Excerpt will be generated from content when saved.';
  const handleExcerptAutoToggle = useCallback(() => {
    const newAuto = !isExcerptAuto;
    setField('excerptAuto', newAuto);
    if (newAuto) setField('excerpt', null);
    if (
      lastSavedState.cardData.excerptAuto === newAuto &&
      (!newAuto || (lastSavedState.cardData.excerpt ?? null) === null)
    ) {
      return;
    }
    void persistFieldPatch({
      excerptAuto: newAuto,
      ...(newAuto ? { excerpt: null } : {}),
    });
  }, [isExcerptAuto, lastSavedState.cardData, persistFieldPatch, setField]);
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as Card['status'];
    setField('status', nextStatus);
    if (lastSavedState.cardData.status === nextStatus) return;
    void persistFieldPatch({ status: nextStatus });
  }, [lastSavedState.cardData.status, persistFieldPatch, setField]);
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextType = e.target.value as Card['type'];
      const nextDisplayMode = normalizeDisplayModeForType(nextType, cardData.displayMode);
      setField('type', nextType);
      setField('displayMode', nextDisplayMode);
      if (
        lastSavedState.cardData.type === nextType &&
        lastSavedState.cardData.displayMode === nextDisplayMode
      ) {
        return;
      }
      void persistFieldPatch({ type: nextType, displayMode: nextDisplayMode });
    },
    [persistFieldPatch, setField, cardData.displayMode, lastSavedState.cardData.displayMode, lastSavedState.cardData.type]
  );
  const handleDisplayModeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextDisplayMode = e.target.value as Card['displayMode'];
    setField('displayMode', nextDisplayMode);
    if (lastSavedState.cardData.displayMode === nextDisplayMode) return;
    void persistFieldPatch({ displayMode: nextDisplayMode });
  }, [lastSavedState.cardData.displayMode, persistFieldPatch, setField]);
  const handleContentChange = useCallback((content: string) => {
    setField('content', content);
    updateContentMedia(extractMediaFromContent(content));
  }, [setField, updateContentMedia]);
  
  const handleTagsChange = useCallback((newTagIds: string[]) => {
    setField('tags', newTagIds);
    const savedTags = lastSavedState.cardData.tags || [];
    if (
      savedTags.length === newTagIds.length &&
      savedTags.every((tagId, index) => tagId === newTagIds[index])
    ) {
      return;
    }
    void persistFieldPatch({ tags: newTagIds });
  }, [lastSavedState.cardData.tags, persistFieldPatch, setField]);

  const handleCoverImageChange = useCallback((newCoverImage: Media | null, newPosition?: string) => {
    if (newCoverImage && newPosition !== undefined) {
      const parts = newPosition.trim().split(/\s+/);
      const xPercent = parseFloat(parts[0] ?? '50') || 50;
      const yPercent = parseFloat(parts[1] ?? '50') || 50;
      const focalPoint = {
        x: (xPercent / 100) * newCoverImage.width,
        y: (yPercent / 100) * newCoverImage.height,
      };
      updateCoverImage(newCoverImage, focalPoint);
    } else {
      updateCoverImage(newCoverImage);
    }
  }, [updateCoverImage]);

  const handleGalleryUpdate = useCallback((newGallery: HydratedGalleryMediaItem[]) => {
    setField('galleryMedia', newGallery);
  }, [setField]);

  /**
   * Persist gallery slot overrides on the card (PATCH galleryMedia only).
   * Uses a direct PATCH so full-card client validation cannot block the save; then syncs dirty baseline.
   */
  const persistGalleryAfterSlotSave = useCallback(
    async (nextGallery: HydratedGalleryMediaItem[]): Promise<boolean> => {
      const docId = cardData.docId?.trim();
      if (!docId) {
        window.alert('Save the card once before editing gallery metadata.');
        return false;
      }

      const normalized = normalizeGalleryOrders(nextGallery);
      const dehydrated = dehydrateCardForSave({
        ...cardData,
        galleryMedia: normalized,
      });
      if (!Array.isArray(dehydrated.galleryMedia)) return false;

      const body = { galleryMedia: dehydrated.galleryMedia };

      try {
        const res = await fetch(`/api/cards/${docId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          window.alert(formatCardApiError(payload));
          return false;
        }
        commitGalleryMediaPersisted(normalized);
        return true;
      } catch (e) {
        console.error('[persistGalleryAfterSlotSave]', e);
        window.alert(e instanceof Error ? e.message : 'Network error saving gallery.');
        return false;
      }
    },
    [cardData, commitGalleryMediaPersisted]
  );

  const handleSetGalleryItemAsCover = useCallback(
    (item: HydratedGalleryMediaItem) => {
      if (!item.media) return;
      // Promote selected gallery item to cover and move it to first slot for predictable ordering.
      const current = [...((cardData.galleryMedia || []) as HydratedGalleryMediaItem[])];
      const idx = current.findIndex((g) => g.mediaId === item.mediaId);
      if (idx > 0) {
        const reordered = arrayMove(current, idx, 0).map((g, order) => ({ ...g, order }));
        setField('galleryMedia', reordered);
      }
      const coverPos = item.objectPosition || item.media.objectPosition || '50% 50%';
      handleCoverImageChange(item.media, coverPos);
    },
    [cardData.galleryMedia, handleCoverImageChange, setField]
  );

  const handleChildCardsChange = useCallback((newChildIds: string[]) => {
    setField('childrenIds', newChildIds);
  }, [setField]);

  const selectedTagObjects = React.useMemo(() => {
    const tagIds = new Set(cardData.tags || []);
    return allTags.filter(tag => tagIds.has(tag.docId));
  }, [cardData.tags, allTags]);

  const persistTitleOnBlur = useCallback(() => {
    const nextTitle = (cardData.title || '').trim();
    if (!cardData.docId || !nextTitle) return;
    if ((lastSavedState.cardData.title || '') === nextTitle) return;
    void persistFieldPatch({ title: nextTitle });
  }, [cardData.docId, cardData.title, lastSavedState.cardData.title, persistFieldPatch]);

  const persistSubtitleOnBlur = useCallback(() => {
    if (!cardData.docId) return;
    const nextSubtitle = cardData.subtitle || null;
    if ((lastSavedState.cardData.subtitle || null) === nextSubtitle) return;
    void persistFieldPatch({ subtitle: nextSubtitle });
  }, [cardData.docId, cardData.subtitle, lastSavedState.cardData.subtitle, persistFieldPatch]);

  const persistExcerptOnBlur = useCallback(() => {
    if (!cardData.docId || isExcerptAuto) return;
    const nextExcerpt = cardData.excerpt || null;
    if ((lastSavedState.cardData.excerpt || null) === nextExcerpt) return;
    void persistFieldPatch({ excerpt: nextExcerpt });
  }, [cardData.docId, cardData.excerpt, isExcerptAuto, lastSavedState.cardData.excerpt, persistFieldPatch]);

  const handleSingleLineFieldEnter = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
  }, []);

  const allowedDisplayModes = useMemo(
    () => getAllowedDisplayModes(cardData.type ?? 'story'),
    [cardData.type]
  );

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const editorContent = editorRef.current?.getContent();
    const overrides = editorContent !== undefined ? { content: editorContent } : undefined;
    const saved = await handleSave(overrides);
    setSaveNotice(
      saved
        ? { type: 'success', message: 'Card saved.' }
        : { type: 'error', message: 'Could not save card. Please review any errors and try again.' }
    );
  }, [handleSave]);

  useEffect(() => {
    if (!saveNotice || saveNotice.type !== 'success') return;
    const timer = window.setTimeout(() => setSaveNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

  const handleAddImageToContent = useCallback(() => {
    setIsPhotoPickerOpen(true);
  }, []);

  const handlePhotoSelectForContent = useCallback((media: Media) => {
    if (editorRef.current && media) {
      editorRef.current.insertImage(media);
    }
    setIsPhotoPickerOpen(false);
  }, []);

  const requestDraftSuggestions = useCallback(async (preserveExisting = false) => {
    setIsSuggestingDrafts(true);
    setDraftSuggestionError(null);
    if (!preserveExisting) setDraftOptions([]);
    try {
      const currentContent = editorRef.current?.getContent() ?? (cardData.content || '');
      const res = await fetch('/api/ai/suggest-card-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: cardData.title || '',
          subtitle: cardData.subtitle || '',
          excerpt: cardData.excerpt || '',
          content: currentContent || '',
          includeHistoricalContext,
        }),
      });
      const payload = await res.json().catch(() => ({})) as {
        message?: string;
        error?: string;
        options?: CardDraftOption[];
      };
      if (!res.ok) {
        throw new Error(payload.error || payload.message || `Request failed (${res.status})`);
      }
      if (!Array.isArray(payload.options) || payload.options.length === 0) {
        throw new Error('No draft options returned.');
      }
      setDraftOptions(payload.options.slice(0, 1));
    } catch (e) {
      setDraftSuggestionError(e instanceof Error ? e.message : 'Failed to get suggestions');
    } finally {
      setIsSuggestingDrafts(false);
    }
  }, [cardData.title, cardData.subtitle, cardData.excerpt, cardData.content, includeHistoricalContext]);

  const clearDraftSuggestions = useCallback(() => {
    setDraftOptions([]);
    setDraftSuggestionError(null);
  }, []);

  const applyDraftOption = useCallback(
    (option: CardDraftOption, scope: 'all' | 'title' | 'subtitle' | 'content') => {
      if (scope === 'all' || scope === 'title') {
        setField('title', option.title || '');
      }
      if (scope === 'all' || scope === 'subtitle') {
        setField('subtitle', option.subtitle || '');
      }
      if (scope === 'all') {
        setField('excerptAuto', false);
        setField('excerpt', option.excerpt || '');
      }
      if (scope === 'all' || scope === 'content') {
        const html = textToBasicHtml(option.content || '');
        setField('content', html);
        updateContentMedia(extractMediaFromContent(html));
      }
      setDraftOptions([]);
    },
    [setField, updateContentMedia]
  );

  const bodyRichTextEditor = (
    <RichTextEditor
      key={formRevision}
      currentCardId={cardData.docId}
      ref={editorRef}
      initialContent={cardData.content}
      onChange={handleContentChange}
      onAddImage={handleAddImageToContent}
      error={errors.content}
      className={clsx(errors.content && styles.inputError)}
      chainWheelToScrollParent={studioShellForm}
    />
  );

  return (
    <>
      <LoadingOverlay
        isVisible={isSaving}
        title="Saving card..."
        message="Updating card details and synchronizing feed data."
      />
      {isPhotoPickerOpen && (
        <PhotoPicker
          isOpen={isPhotoPickerOpen}
          onSelect={handlePhotoSelectForContent}
          onClose={() => setIsPhotoPickerOpen(false)}
          initialMode="single"
          filterTagIds={cardData.tags ?? []}
        />
      )}
      {studioShellForm && !studioShellDnd ? (
        <DndContext onDragEnd={() => undefined}>
          <form id="card-form" onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.mainContent}>
              {saveNotice ? (
                <div
                  className={clsx(
                    styles.saveNotice,
                    saveNotice.type === 'success' ? styles.saveNoticeSuccess : styles.saveNoticeError
                  )}
                  role={saveNotice.type === 'error' ? 'alert' : 'status'}
                  aria-live="polite"
                >
                  {saveNotice.message}
                </div>
              ) : null}
              <div className={styles.header}>
                <input
                  type="text"
                  value={cardData.title}
                  onChange={handleTitleChange}
                  onBlur={persistTitleOnBlur}
                  onKeyDown={handleSingleLineFieldEnter}
                  placeholder="Card Title"
                  className={clsx(styles.titleInput, errors.title && styles.inputError)}
                />
                <input
                  type="text"
                  value={cardData.subtitle || ''}
                  onChange={handleSubtitleChange}
                  onBlur={persistSubtitleOnBlur}
                  onKeyDown={handleSingleLineFieldEnter}
                  placeholder="Subtitle"
                  className={styles.subtitleInput}
                />
                <div
                  className={clsx(styles.excerptSection, studioShellForm && styles.excerptSectionStudio)}
                >
                  {studioShellForm ? (
                    <>
                      <label className={styles.excerptToggle}>
                        <input
                          type="checkbox"
                          checked={isExcerptAuto}
                          onChange={handleExcerptAutoToggle}
                        />
                        <span className={styles.excerptToggleLabel}>Auto-generate from content</span>
                      </label>
                      {isExcerptAuto ? (
                        <div className={styles.excerptPreview}>
                          {autoExcerptDisplay}
                        </div>
                      ) : (
                        <textarea
                          value={cardData.excerpt || ''}
                          onChange={handleExcerptChange}
                          onBlur={persistExcerptOnBlur}
                          placeholder="Write a custom excerpt…"
                          className={styles.excerptInput}
                          rows={2}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {isExcerptAuto ? (
                        <div className={styles.excerptPreview}>
                          {autoExcerptDisplay}
                        </div>
                      ) : (
                        <textarea
                          value={cardData.excerpt || ''}
                          onChange={handleExcerptChange}
                          onBlur={persistExcerptOnBlur}
                          placeholder="Write a custom excerpt…"
                          className={styles.excerptInput}
                          rows={2}
                        />
                      )}
                      <label className={styles.excerptToggle}>
                        <input
                          type="checkbox"
                          checked={isExcerptAuto}
                          onChange={handleExcerptAutoToggle}
                        />
                        <span className={styles.excerptToggleLabel}>Auto-generate from content</span>
                      </label>
                    </>
                  )}
                </div>
                <div className={styles.statusSection}>
                  <div className={styles.selectGroup}>
                    <label htmlFor="status-select" className={styles.selectLabel}>Status</label>
                    <select
                      id="status-select"
                      value={cardData.status}
                      onChange={handleStatusChange}
                      className={clsx(styles.statusSelect, errors.status && styles.inputError)}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <div className={styles.selectGroup}>
                    <label htmlFor="type-select" className={styles.selectLabel}>Type</label>
                    <select
                      id="type-select"
                      value={cardData.type}
                      onChange={handleTypeChange}
                      className={clsx(styles.statusSelect, errors.type && styles.inputError)}
                    >
                      <option value="story">Story</option>
                      {cardData.type === 'qa' && <option value="qa">Q&A</option>}
                      <option value="quote">Quote</option>
                      <option value="callout">Callout</option>
                      <option value="gallery">Gallery</option>
                    </select>
                  </div>
                  <div className={styles.selectGroup}>
                    <label htmlFor="display-mode-select" className={styles.selectLabel}>Display Mode</label>
                    <select
                      id="display-mode-select"
                      value={normalizeDisplayModeForType(cardData.type ?? 'story', cardData.displayMode)}
                      onChange={handleDisplayModeChange}
                      className={clsx(styles.statusSelect, errors.displayMode && styles.inputError)}
                    >
                      {allowedDisplayModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode === 'inline' ? 'Inline' : mode === 'navigate' ? 'Navigate' : 'Static'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.coverPhotoSection}>
                <CoverPhotoContainer
                  coverImage={cardData.coverImage}
                  objectPosition={
                    cardData.coverImageFocalPoint
                      ? `${(cardData.coverImageFocalPoint.x / (cardData.coverImage?.width || 1)) * 100}% ${(cardData.coverImageFocalPoint.y / (cardData.coverImage?.height || 1)) * 100}%`
                      : '50% 50%'
                  }
                  onChange={handleCoverImageChange}
                  isSaving={isSaving}
                  showSavingOverlay={false}
                  error={errors.coverImage}
                  filterTagIds={cardData.tags ?? []}
                />
              </div>

              <div className={styles.tagsSection}>
                <CardDimensionalTagCommandBar
                  card={cardData}
                  allTags={allTags}
                  disabled={isSaving}
                  variant={studioShellForm ? 'compact' : 'default'}
                  onUpdateTags={handleTagsChange}
                  tagError={errors.tags}
                  className={styles.tagCommandBar}
                  trailingSlot={null}
                />
              </div>

              <div className={styles.editorSection}>
                <h4 className={styles.sectionTitle}>Content</h4>
                {bodyRichTextEditor}
              </div>

              <div className={styles.aiAssistSection}>
                <h4 className={styles.sectionTitle}>AI Assist</h4>
                <div className={styles.aiAssistTopRow}>
                  <div className={styles.aiAssistActionGroup}>
                    <button
                      type="button"
                      className={styles.aiAssistButton}
                      onClick={() => void requestDraftSuggestions(false)}
                      disabled={isSuggestingDrafts || isSaving}
                    >
                      {isSuggestingDrafts ? 'Generating…' : 'Draft'}
                    </button>
                    <button
                      type="button"
                      className={styles.aiAssistButton}
                      onClick={() => void requestDraftSuggestions(true)}
                      disabled={isSuggestingDrafts || draftOptions.length === 0}
                    >
                      Revision
                    </button>
                    <button
                      type="button"
                      className={styles.aiAssistClearButton}
                      onClick={clearDraftSuggestions}
                      disabled={isSuggestingDrafts || (draftOptions.length === 0 && !draftSuggestionError)}
                    >
                      Clear
                    </button>
                  </div>
                  <label className={styles.aiAssistToggle}>
                    <input
                      type="checkbox"
                      checked={includeHistoricalContext}
                      onChange={(e) => setIncludeHistoricalContext(e.target.checked)}
                      disabled={isSuggestingDrafts}
                    />
                    Include historical context
                  </label>
                </div>
                {draftSuggestionError && (
                  <p className={styles.aiAssistError}>{draftSuggestionError}</p>
                )}
                {draftOptions.length > 0 && (
                  <div className={styles.aiDraftOptions}>
                    {draftOptions.map((opt, idx) => (
                      <div key={`draft-${idx}`} className={styles.aiDraftCard}>
                        <div className={styles.aiDraftHeading}>
                          {opt.rationale ? <span>{opt.rationale}</span> : null}
                        </div>
                        <div className={styles.aiDraftPreview}>
                          <p><strong>Title:</strong> {opt.title || '(empty)'}</p>
                          <p><strong>Subtitle:</strong> {opt.subtitle || '(empty)'}</p>
                          <p><strong>Content:</strong> {opt.content || '(empty)'}</p>
                        </div>
                        <div className={styles.aiDraftActions}>
                          <button type="button" onClick={() => applyDraftOption(opt, 'all')}>Apply Full</button>
                          <button type="button" onClick={() => applyDraftOption(opt, 'title')}>Apply Title</button>
                          <button type="button" onClick={() => applyDraftOption(opt, 'subtitle')}>Apply Subtitle</button>
                          <button type="button" onClick={() => applyDraftOption(opt, 'content')}>Apply Content</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.gallerySection}>
                <StudioCardFormGallery
                  disabled={isSaving}
                  onSetAsCover={handleSetGalleryItemAsCover}
                  currentCoverMediaId={cardData.coverImageId || null}
                />
              </div>

              <div className={styles.childrenSection}>
                <StudioCardFormChildren disabled={isSaving} />
              </div>
            </div>
          </form>
        </DndContext>
      ) : (
      <form id="card-form" onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.mainContent}>
          {saveNotice ? (
            <div
              className={clsx(
                styles.saveNotice,
                saveNotice.type === 'success' ? styles.saveNoticeSuccess : styles.saveNoticeError
              )}
              role={saveNotice.type === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {saveNotice.message}
            </div>
          ) : null}
          <div className={styles.header}>
            <input
              type="text"
              value={cardData.title}
              onChange={handleTitleChange}
              onBlur={persistTitleOnBlur}
              onKeyDown={handleSingleLineFieldEnter}
              placeholder="Card Title"
              className={clsx(styles.titleInput, errors.title && styles.inputError)}
            />
            <input
              type="text"
              value={cardData.subtitle || ''}
              onChange={handleSubtitleChange}
              onBlur={persistSubtitleOnBlur}
              onKeyDown={handleSingleLineFieldEnter}
              placeholder="Subtitle"
              className={styles.subtitleInput}
            />
            <div
              className={clsx(styles.excerptSection, studioShellForm && styles.excerptSectionStudio)}
            >
              {studioShellForm ? (
                <>
                  <label className={styles.excerptToggle}>
                    <input
                      type="checkbox"
                      checked={isExcerptAuto}
                      onChange={handleExcerptAutoToggle}
                    />
                    <span className={styles.excerptToggleLabel}>Auto-generate from content</span>
                  </label>
                  {isExcerptAuto ? (
                    <div className={styles.excerptPreview}>
                      {autoExcerptDisplay}
                    </div>
                  ) : (
                    <textarea
                      value={cardData.excerpt || ''}
                      onChange={handleExcerptChange}
                      onBlur={persistExcerptOnBlur}
                      placeholder="Write a custom excerpt…"
                      className={styles.excerptInput}
                      rows={2}
                    />
                  )}
                </>
              ) : (
                <>
                  {isExcerptAuto ? (
                    <div className={styles.excerptPreview}>
                      {autoExcerptDisplay}
                    </div>
                  ) : (
                    <textarea
                      value={cardData.excerpt || ''}
                      onChange={handleExcerptChange}
                      onBlur={persistExcerptOnBlur}
                      placeholder="Write a custom excerpt…"
                      className={styles.excerptInput}
                      rows={2}
                    />
                  )}
                  <label className={styles.excerptToggle}>
                    <input
                      type="checkbox"
                      checked={isExcerptAuto}
                      onChange={handleExcerptAutoToggle}
                    />
                    <span className={styles.excerptToggleLabel}>Auto-generate from content</span>
                  </label>
                </>
              )}
            </div>
            <div className={styles.statusSection}>
              <div className={styles.selectGroup}>
                <label htmlFor="status-select" className={styles.selectLabel}>Status</label>
                <select
                  id="status-select"
                  value={cardData.status}
                  onChange={handleStatusChange}
                  className={clsx(styles.statusSelect, errors.status && styles.inputError)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div className={styles.selectGroup}>
                <label htmlFor="type-select" className={styles.selectLabel}>Type</label>
                <select
                  id="type-select"
                  value={cardData.type}
                  onChange={handleTypeChange}
                  className={clsx(styles.statusSelect, errors.type && styles.inputError)}
                >
                  <option value="story">Story</option>
                  {cardData.type === 'qa' && <option value="qa">Q&A</option>}
                  <option value="quote">Quote</option>
                  <option value="callout">Callout</option>
                  <option value="gallery">Gallery</option>
                </select>
              </div>
              <div className={styles.selectGroup}>
                <label htmlFor="display-mode-select" className={styles.selectLabel}>Display Mode</label>
                <select
                  id="display-mode-select"
                  value={normalizeDisplayModeForType(cardData.type ?? 'story', cardData.displayMode)}
                  onChange={handleDisplayModeChange}
                  className={clsx(styles.statusSelect, errors.displayMode && styles.inputError)}
                >
                  {allowedDisplayModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode === 'inline' ? 'Inline' : mode === 'navigate' ? 'Navigate' : 'Static'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={styles.coverPhotoSection}>
            {studioShellDnd ? (
              <StudioDropZone
                id="drop:cover"
                accepts={['source', 'gallery']}
                ariaLabel="Cover drop target: drop source or gallery media here to set cover"
                className={styles.studioCoverDropZone}
                eligibleHint="Release here to make this the cover"
              >
                <CoverPhotoContainer
                  coverImage={cardData.coverImage}
                  objectPosition={
                    cardData.coverImageFocalPoint
                      ? `${(cardData.coverImageFocalPoint.x / (cardData.coverImage?.width || 1)) * 100}% ${(cardData.coverImageFocalPoint.y / (cardData.coverImage?.height || 1)) * 100}%`
                      : '50% 50%'
                  }
                  onChange={handleCoverImageChange}
                  isSaving={isSaving}
                  showSavingOverlay={false}
                  error={errors.coverImage}
                  filterTagIds={cardData.tags ?? []}
                />
              </StudioDropZone>
            ) : (
              <CoverPhotoContainer
                coverImage={cardData.coverImage}
                objectPosition={
                  cardData.coverImageFocalPoint
                    ? `${(cardData.coverImageFocalPoint.x / (cardData.coverImage?.width || 1)) * 100}% ${(cardData.coverImageFocalPoint.y / (cardData.coverImage?.height || 1)) * 100}%`
                    : '50% 50%'
                }
                onChange={handleCoverImageChange}
                isSaving={isSaving}
                showSavingOverlay={false}
                error={errors.coverImage}
                filterTagIds={cardData.tags ?? []}
              />
            )}
          </div>

          <div className={styles.tagsSection}>
            <CardDimensionalTagCommandBar
              card={cardData}
              allTags={allTags}
              disabled={isSaving}
              variant={studioShellForm ? 'compact' : 'default'}
              onUpdateTags={handleTagsChange}
              tagError={errors.tags}
              className={styles.tagCommandBar}
              trailingSlot={
                studioShellForm ? null : (
                  <button
                    type="button"
                    className={macroTagStyles.editButton}
                    disabled={isSaving}
                    onClick={() => setTagMacroExpanded(true)}
                  >
                    Edit tags
                  </button>
                )
              }
            />
            {!studioShellForm ? (
              <MacroTagSelector
                selectedTags={selectedTagObjects}
                allTags={allTags}
                onChange={handleTagsChange}
                expanded={tagMacroExpanded}
                onExpandedChange={setTagMacroExpanded}
                collapsedSummary="none"
                className={clsx(styles.tagSelector, errors.tags && styles.inputError)}
              />
            ) : null}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.sectionTitle}>Content</h4>
            {studioShellDnd ? (
              <StudioDropZone
                id="drop:body"
                accepts={['source']}
                ariaLabel="Drop media from bank into body"
                className={styles.studioBodyDropZone}
                alwaysRegister
                eligibleHint="Release here to insert into the story"
              >
                {bodyRichTextEditor}
              </StudioDropZone>
            ) : (
              bodyRichTextEditor
            )}
          </div>

          <div className={styles.aiAssistSection}>
            <h4 className={styles.sectionTitle}>AI Assist</h4>
            <div className={styles.aiAssistTopRow}>
              <div className={styles.aiAssistActionGroup}>
                <button
                  type="button"
                  className={styles.aiAssistButton}
                  onClick={() => void requestDraftSuggestions(false)}
                  disabled={isSuggestingDrafts || isSaving}
                >
                  {isSuggestingDrafts ? 'Generating…' : 'Draft'}
                </button>
                <button
                  type="button"
                  className={styles.aiAssistButton}
                  onClick={() => void requestDraftSuggestions(true)}
                  disabled={isSuggestingDrafts || draftOptions.length === 0}
                >
                  Revision
                </button>
                <button
                  type="button"
                  className={styles.aiAssistClearButton}
                  onClick={clearDraftSuggestions}
                  disabled={isSuggestingDrafts || (draftOptions.length === 0 && !draftSuggestionError)}
                >
                  Clear
                </button>
              </div>
              <label className={styles.aiAssistToggle}>
                <input
                  type="checkbox"
                  checked={includeHistoricalContext}
                  onChange={(e) => setIncludeHistoricalContext(e.target.checked)}
                  disabled={isSuggestingDrafts}
                />
                Include historical context
              </label>
            </div>
            {draftSuggestionError && (
              <p className={styles.aiAssistError}>{draftSuggestionError}</p>
            )}
            {draftOptions.length > 0 && (
              <div className={styles.aiDraftOptions}>
                {draftOptions.map((opt, idx) => (
                  <div key={`draft-${idx}`} className={styles.aiDraftCard}>
                    <div className={styles.aiDraftHeading}>
                      {opt.rationale ? <span>{opt.rationale}</span> : null}
                    </div>
                    <div className={styles.aiDraftPreview}>
                      <p><strong>Title:</strong> {opt.title || '(empty)'}</p>
                      <p><strong>Subtitle:</strong> {opt.subtitle || '(empty)'}</p>
                      <p><strong>Content:</strong> {opt.content || '(empty)'}</p>
                    </div>
                    <div className={styles.aiDraftActions}>
                      <button type="button" onClick={() => applyDraftOption(opt, 'all')}>Apply Full</button>
                      <button type="button" onClick={() => applyDraftOption(opt, 'title')}>Apply Title</button>
                      <button type="button" onClick={() => applyDraftOption(opt, 'subtitle')}>Apply Subtitle</button>
                      <button type="button" onClick={() => applyDraftOption(opt, 'content')}>Apply Content</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.gallerySection}>
            {studioShellForm ? (
              <StudioCardFormGallery
                disabled={isSaving}
                onSetAsCover={handleSetGalleryItemAsCover}
                currentCoverMediaId={cardData.coverImageId || null}
              />
            ) : (
              <GalleryManager
                galleryMedia={(cardData.galleryMedia || []) as HydratedGalleryMediaItem[]}
                onUpdate={handleGalleryUpdate}
                onPersistGalleryAfterSlotSave={persistGalleryAfterSlotSave}
                onSetAsCover={handleSetGalleryItemAsCover}
                currentCoverMediaId={cardData.coverImageId || null}
                error={errors.galleryMedia}
                filterTagIds={cardData.tags ?? []}
              />
            )}
          </div>

          <div className={styles.childrenSection}>
            {studioShellForm ? (
              <StudioCardFormChildren disabled={isSaving} />
            ) : (
              <ChildCardManager
                cardId={cardData.docId}
                childrenIds={cardData.childrenIds || []}
                onUpdate={handleChildCardsChange}
                error={errors.childrenIds}
              />
            )}
          </div>
        </div>
      </form>
      )}
    </>
  );
};

export default CardForm;
