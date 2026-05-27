'use client';

import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { Card, HydratedGalleryMediaItem } from '@/lib/types/card';
import { Media } from '@/lib/types/photo';
import { dehydrateCardForSave, extractMediaFromContent, generateExcerpt } from '@/lib/utils/cardUtils';
import CoverPhotoContainer from '@/components/admin/card-admin/CoverPhotoContainer';
import GalleryManager from '@/components/admin/card-admin/GalleryManager';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
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
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';

type CardDraftOption = {
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  rationale?: string;
};

type StoryAssistGuide = 'bob' | 'sandra';
type StoryAssistMode =
  | 'draftFromNotes'
  | 'tightenWording'
  | 'expandMemory'
  | 'retitleStory'
  | 'makeStoryStronger';
type StoryCoachSuggestion = {
  category: string;
  suggestion: string;
  prompt?: string;
  example?: string;
};

const STORY_ASSIST_GUIDE_STORAGE_KEY = 'myjournal-ai-story-guide';
const STORY_ASSIST_GUIDE_LABEL: Record<StoryAssistGuide, string> = {
  bob: 'Bob',
  sandra: 'Sandra',
};
const STORY_ASSIST_GUIDE_HINT: Record<StoryAssistGuide, string> = {
  bob: 'Direct, grounded, and plainspoken.',
  sandra: 'Warm, reflective, and conversational.',
};
const STORY_ASSIST_WRITE_MODES: StoryAssistMode[] = [
  'draftFromNotes',
  'tightenWording',
  'expandMemory',
  'retitleStory',
];
const STORY_ASSIST_MODE_LABEL: Record<StoryAssistMode, string> = {
  draftFromNotes: 'Draft from notes',
  tightenWording: 'Tighten wording',
  expandMemory: 'Expand this memory',
  retitleStory: 'Retitle this story',
  makeStoryStronger: 'Make this story stronger',
};
const STORY_ASSIST_MODE_HINT: Record<StoryAssistMode, string> = {
  draftFromNotes: 'Turn rough notes into a readable story draft.',
  tightenWording: 'Clean up flow, repetition, and clarity.',
  expandMemory: 'Draw out meaning and scene without inventing facts.',
  retitleStory: 'Improve the title and subtitle while keeping the story aligned.',
  makeStoryStronger: 'Return coaching suggestions that deepen the story.',
};

function isCoachMode(mode: StoryAssistMode | null): mode is 'makeStoryStronger' {
  return mode === 'makeStoryStronger';
}

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

function objectPositionToFocalPoint(
  media: Media,
  position: string | undefined
): { x: number; y: number } {
  const parts = (position ?? '50% 50%').trim().split(/\s+/);
  const xPercent = parseFloat(parts[0] ?? '50') || 50;
  const yPercent = parseFloat(parts[1] ?? '50') || 50;
  return {
    x: (xPercent / 100) * media.width,
    y: (yPercent / 100) * media.height,
  };
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
  const feedback = useAppFeedback();

  const editorRef = useRef<RichTextEditorRef>(null);

  useEffect(() => {
    if (!studioShellDnd || !studioShell?.bodyMediaInsertRef) return;
    const r = studioShell.bodyMediaInsertRef;
    r.current = (media: Media) => {
      const tryInsert = (remainingFrames: number) => {
        const editor = editorRef.current;
        if (editor) {
          editor.insertImage(media);
          return;
        }
        if (remainingFrames <= 0) return;
        window.requestAnimationFrame(() => {
          tryInsert(remainingFrames - 1);
        });
      };
      tryInsert(8);
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
  const [storyAssistGuide, setStoryAssistGuide] = useState<StoryAssistGuide>('bob');
  const [activeStoryAssistMode, setActiveStoryAssistMode] = useState<StoryAssistMode | null>(null);
  const [storyAssistSummary, setStoryAssistSummary] = useState('');
  const [draftOptions, setDraftOptions] = useState<CardDraftOption[]>([]);
  const [storyCoachSuggestions, setStoryCoachSuggestions] = useState<StoryCoachSuggestion[]>([]);
  const [draftSuggestionError, setDraftSuggestionError] = useState<string | null>(null);
  const [storyAssistOpen, setStoryAssistOpen] = useState(false);
  const [tagMacroExpanded, setTagMacroExpanded] = useState(false);

  useEffect(() => {
    setTagMacroExpanded(false);
  }, [cardData.docId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORY_ASSIST_GUIDE_STORAGE_KEY);
    if (stored === 'bob' || stored === 'sandra') {
      setStoryAssistGuide(stored);
    }
  }, []);

  const handleStoryAssistGuideChange = useCallback((nextGuide: StoryAssistGuide) => {
    setStoryAssistGuide(nextGuide);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORY_ASSIST_GUIDE_STORAGE_KEY, nextGuide);
    }
  }, []);

  useEffect(() => {
    if (
      isSuggestingDrafts ||
      draftOptions.length > 0 ||
      storyCoachSuggestions.length > 0 ||
      Boolean(draftSuggestionError) ||
      Boolean(storyAssistSummary)
    ) {
      setStoryAssistOpen(true);
    }
  }, [draftOptions.length, draftSuggestionError, isSuggestingDrafts, storyAssistSummary, storyCoachSuggestions.length]);

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

  const handleCoverImageCommit = useCallback(async (newCoverImage: Media | null, newPosition?: string) => {
    if (!newCoverImage) {
      await persistFieldPatch({
        coverImageId: null,
        coverImageFocalPoint: null,
      });
      return;
    }
    const focalPoint = objectPositionToFocalPoint(newCoverImage, newPosition);

    await persistFieldPatch({
      coverImageId: newCoverImage.docId,
      coverImageFocalPoint: focalPoint,
    });
  }, [persistFieldPatch]);

  const handleCoverImageModeChange = useCallback((mode: 'fill' | 'fit') => {
    setField('coverImageMode', mode);
  }, [setField]);

  const handleCoverImageModeCommit = useCallback(async (mode: 'fill' | 'fit') => {
    if (lastSavedState.cardData.coverImageMode === mode) return;
    await persistFieldPatch({ coverImageMode: mode });
  }, [lastSavedState.cardData.coverImageMode, persistFieldPatch]);

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
        await feedback.alert({
          title: 'Save card first',
          message: 'Save the card once before editing gallery metadata.',
        });
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
          await feedback.alert({
            title: 'Could not save gallery',
            message: formatCardApiError(payload),
          });
          return false;
        }
        commitGalleryMediaPersisted(normalized);
        return true;
      } catch (e) {
        console.error('[persistGalleryAfterSlotSave]', e);
        await feedback.alert({
          title: 'Could not save gallery',
          message: e instanceof Error ? e.message : 'Network error saving gallery.',
        });
        return false;
      }
    },
    [cardData, commitGalleryMediaPersisted, feedback]
  );

  const handleSetGalleryItemAsCover = useCallback(
    async (item: HydratedGalleryMediaItem) => {
      if (!item.media) return;

      // Promote selected gallery item to cover and move it to first slot for predictable ordering.
      const current = [...((cardData.galleryMedia || []) as HydratedGalleryMediaItem[])];
      const idx = current.findIndex((g) => g.mediaId === item.mediaId);
      const nextGallery =
        idx > 0
          ? arrayMove(current, idx, 0).map((g, order) => ({ ...g, order }))
          : current;

      if (idx > 0) {
        setField('galleryMedia', nextGallery);
      }

      const coverPos = item.objectPosition || item.media.objectPosition || '50% 50%';
      handleCoverImageChange(item.media, coverPos);

      if (!cardData.docId) {
        return;
      }

      if (idx > 0) {
        const gallerySaved = await persistGalleryAfterSlotSave(nextGallery);
        if (!gallerySaved) {
          return;
        }
      }

      await persistFieldPatch({
        coverImageId: item.media.docId,
        coverImageFocalPoint: objectPositionToFocalPoint(item.media, coverPos),
      });
    },
    [
      cardData.docId,
      cardData.galleryMedia,
      handleCoverImageChange,
      persistFieldPatch,
      persistGalleryAfterSlotSave,
      setField,
    ]
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
  const coverImageMode = cardData.coverImageMode ?? 'fill';
  const canUseQuestionType = Boolean(cardData.questionId) || cardData.type === 'qa';

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const editorContent = editorRef.current?.getContent();
    const overrides = editorContent !== undefined ? { content: editorContent } : undefined;
    const saved = await handleSave(overrides);
    if (saved) {
      feedback.showSuccess('Card saved.', 'Saved');
      return;
    }
    feedback.showError('Could not save card. Please review any errors and try again.', 'Could not save');
  }, [feedback, handleSave]);

  const handleAddImageToContent = useCallback(() => {
    setIsPhotoPickerOpen(true);
  }, []);

  const handlePhotoSelectForContent = useCallback((media: Media) => {
    if (editorRef.current && media) {
      editorRef.current.insertImage(media);
    }
    setIsPhotoPickerOpen(false);
  }, []);

  const requestDraftSuggestions = useCallback(async (mode: StoryAssistMode) => {
    setIsSuggestingDrafts(true);
    setActiveStoryAssistMode(mode);
    setDraftSuggestionError(null);
    setStoryAssistSummary('');
    setDraftOptions([]);
    setStoryCoachSuggestions([]);
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
          guide: storyAssistGuide,
          mode,
        }),
      });
      const payload = await res.json().catch(() => ({})) as {
        message?: string;
        error?: string;
        mode?: StoryAssistMode;
        summary?: string;
        options?: CardDraftOption[];
        coaching?: StoryCoachSuggestion[];
      };
      if (!res.ok) {
        throw new Error(payload.error || payload.message || `Request failed (${res.status})`);
      }
      setStoryAssistSummary(typeof payload.summary === 'string' ? payload.summary : '');
      if (mode === 'makeStoryStronger') {
        if (!Array.isArray(payload.coaching) || payload.coaching.length === 0) {
          throw new Error('No coaching suggestions returned.');
        }
        setStoryCoachSuggestions(payload.coaching);
        return;
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
  }, [cardData.title, cardData.subtitle, cardData.excerpt, cardData.content, includeHistoricalContext, storyAssistGuide]);

  const clearDraftSuggestions = useCallback(() => {
    setActiveStoryAssistMode(null);
    setStoryAssistSummary('');
    setDraftOptions([]);
    setStoryCoachSuggestions([]);
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
      clearDraftSuggestions();
    },
    [clearDraftSuggestions, setField, updateContentMedia]
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

  const storyAssistSection = (
    <div className={styles.aiAssistSection}>
      <div className={styles.aiAssistSectionHeader}>
        <h4 className={styles.sectionTitle}>Story Assist</h4>
        <button
          type="button"
          className={styles.aiAssistCollapseButton}
          onClick={() => setStoryAssistOpen((open) => !open)}
          aria-expanded={storyAssistOpen}
          aria-controls="story-assist-panel"
        >
          {storyAssistOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
        </button>
      </div>
      {storyAssistOpen ? (
        <div id="story-assist-panel">
          <div className={styles.aiAssistHeaderBlock}>
            <div className={styles.aiAssistGuideGroup} role="radiogroup" aria-label="Story guide">
              {(['bob', 'sandra'] as StoryAssistGuide[]).map((guide) => (
                <button
                  key={guide}
                  type="button"
                  className={`${styles.aiAssistGuideButton} ${
                    storyAssistGuide === guide ? styles.aiAssistGuideButtonActive : ''
                  }`}
                  aria-pressed={storyAssistGuide === guide}
                  onClick={() => handleStoryAssistGuideChange(guide)}
                  disabled={isSuggestingDrafts}
                >
                  {STORY_ASSIST_GUIDE_LABEL[guide]}
                </button>
              ))}
            </div>
            <p className={styles.aiAssistGuideHint}>
              {STORY_ASSIST_GUIDE_HINT[storyAssistGuide]}
            </p>
          </div>
          <div className={styles.aiAssistTopRow}>
            <div className={styles.aiAssistActionGroup}>
              {STORY_ASSIST_WRITE_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={styles.aiAssistButton}
                  onClick={() => void requestDraftSuggestions(mode)}
                  disabled={isSuggestingDrafts || isSaving}
                  title={STORY_ASSIST_MODE_HINT[mode]}
                >
                  {isSuggestingDrafts && activeStoryAssistMode === mode
                    ? 'Working...'
                    : STORY_ASSIST_MODE_LABEL[mode]}
                </button>
              ))}
              <button
                type="button"
                className={styles.aiAssistButton}
                onClick={() => void requestDraftSuggestions('makeStoryStronger')}
                disabled={isSuggestingDrafts || isSaving}
                title={STORY_ASSIST_MODE_HINT.makeStoryStronger}
              >
                {isSuggestingDrafts && activeStoryAssistMode === 'makeStoryStronger'
                  ? 'Working...'
                  : STORY_ASSIST_MODE_LABEL.makeStoryStronger}
              </button>
              <button
                type="button"
                className={styles.aiAssistClearButton}
                onClick={clearDraftSuggestions}
                disabled={
                  isSuggestingDrafts
                    ? true
                    : draftOptions.length === 0 &&
                      storyCoachSuggestions.length === 0 &&
                      !draftSuggestionError &&
                      !storyAssistSummary
                }
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

          {draftSuggestionError ? <p className={styles.aiAssistError}>{draftSuggestionError}</p> : null}
          {storyAssistSummary && !draftSuggestionError && (
            <p className={styles.aiAssistSummary}>{storyAssistSummary}</p>
          )}
          {storyCoachSuggestions.length > 0 && isCoachMode(activeStoryAssistMode) && (
            <div className={styles.aiAssistCoachList}>
              {storyCoachSuggestions.map((item, idx) => (
                <article key={`${item.category}-${idx}`} className={styles.aiAssistCoachCard}>
                  <p className={styles.aiAssistCoachCategory}>{item.category}</p>
                  <p className={styles.aiAssistCoachSuggestion}>{item.suggestion}</p>
                  {item.prompt ? <p className={styles.aiAssistCoachPrompt}>Prompt: {item.prompt}</p> : null}
                  {item.example ? <p className={styles.aiAssistCoachExample}>Example: {item.example}</p> : null}
                </article>
              ))}
            </div>
          )}
          {draftOptions.length > 0 && (
            <div className={styles.aiAssistSuggestions}>
              {draftOptions.map((opt, idx) => (
                <button
                  key={`${opt.title || 'draft'}-${idx}`}
                  type="button"
                  className={styles.aiAssistSuggestionButton}
                  onClick={() => applyDraftOption(opt, 'all')}
                >
                  <span className={styles.aiAssistSuggestionTitle}>{opt.title || `Suggestion ${idx + 1}`}</span>
                  {opt.rationale ? <span className={styles.aiAssistSuggestionHint}>{opt.rationale}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );


  return (
    <>
      <LoadingOverlay
        isVisible={isSaving && !studioShellForm}
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
          <form id="card-form" onSubmit={handleSubmit} className={clsx(styles.form, styles.compactShellForm)}>
            <div className={styles.mainContent}>
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
                      {canUseQuestionType && <option value="qa">Question</option>}
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
                  coverImageMode={coverImageMode}
                  layoutMode="studioCompact"
                  objectPosition={
                    cardData.coverImageFocalPoint
                      ? `${(cardData.coverImageFocalPoint.x / (cardData.coverImage?.width || 1)) * 100}% ${(cardData.coverImageFocalPoint.y / (cardData.coverImage?.height || 1)) * 100}%`
                      : '50% 50%'
                  }
                  onChange={handleCoverImageChange}
                  onCommit={handleCoverImageCommit}
                  onCoverModeChange={handleCoverImageModeChange}
                  onCoverModeCommit={handleCoverImageModeCommit}
                  isSaving={isSaving}
                  showSavingOverlay={false}
                  error={errors.coverImage}
                  filterTagIds={cardData.tags ?? []}
                  onOpenMediaEditor={studioShell?.openSelectedCardMediaEditor}
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

              {storyAssistSection}

              <div className={styles.gallerySection}>
                <StudioCardFormGallery
                  disabled={isSaving}
                  onSetAsCover={handleSetGalleryItemAsCover}
                  currentCoverMediaId={cardData.coverImageId || null}
                  onOpenMediaEditor={studioShell?.openSelectedCardMediaEditor}
                />
              </div>

              <div className={styles.childrenSection}>
                <StudioCardFormChildren disabled={isSaving} />
              </div>
            </div>
          </form>
        </DndContext>
      ) : (
      <form
        id="card-form"
        onSubmit={handleSubmit}
        className={clsx(styles.form, studioShellForm && styles.compactShellForm)}
      >
        <div className={styles.mainContent}>
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
                  {canUseQuestionType && <option value="qa">Question</option>}
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
                  coverImageMode={coverImageMode}
                  layoutMode={studioShellForm ? 'studioCompact' : 'default'}
                  objectPosition={
                    cardData.coverImageFocalPoint
                      ? `${(cardData.coverImageFocalPoint.x / (cardData.coverImage?.width || 1)) * 100}% ${(cardData.coverImageFocalPoint.y / (cardData.coverImage?.height || 1)) * 100}%`
                      : '50% 50%'
                  }
                  onChange={handleCoverImageChange}
                  onCommit={handleCoverImageCommit}
                  onCoverModeChange={handleCoverImageModeChange}
                  onCoverModeCommit={handleCoverImageModeCommit}
                  isSaving={isSaving}
                  showSavingOverlay={false}
                  error={errors.coverImage}
                  filterTagIds={cardData.tags ?? []}
                  onOpenMediaEditor={studioShell?.openSelectedCardMediaEditor}
                />
              </StudioDropZone>
            ) : (
              <CoverPhotoContainer
                coverImage={cardData.coverImage}
                coverImageMode={coverImageMode}
                layoutMode={studioShellForm ? 'studioCompact' : 'default'}
                objectPosition={
                  cardData.coverImageFocalPoint
                    ? `${(cardData.coverImageFocalPoint.x / (cardData.coverImage?.width || 1)) * 100}% ${(cardData.coverImageFocalPoint.y / (cardData.coverImage?.height || 1)) * 100}%`
                    : '50% 50%'
                }
                onChange={handleCoverImageChange}
                onCommit={handleCoverImageCommit}
                onCoverModeChange={handleCoverImageModeChange}
                onCoverModeCommit={handleCoverImageModeCommit}
                isSaving={isSaving}
                showSavingOverlay={false}
                error={errors.coverImage}
                filterTagIds={cardData.tags ?? []}
                onOpenMediaEditor={studioShell?.openSelectedCardMediaEditor}
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
                <button
                  type="button"
                  className={styles.compactTagEditButton}
                  disabled={isSaving}
                  onClick={() => setTagMacroExpanded(true)}
                  aria-label="Edit tags"
                  title="Edit tags"
                >
                  <Pencil size={16} aria-hidden="true" />
                </button>
              }
            />
            <MacroTagSelector
              selectedTags={selectedTagObjects}
              allTags={allTags}
              onChange={handleTagsChange}
              expanded={tagMacroExpanded}
              onExpandedChange={setTagMacroExpanded}
              collapsedSummary="none"
              className={clsx(styles.tagSelector, errors.tags && styles.inputError)}
            />
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
                <div className={styles.studioBodyDropHeader}>
                  <span className={styles.studioBodyDropTitle}>Append media to Content</span>
                  <span className={styles.studioBodyDropHint}>Drop anywhere in this panel to add the image at the end.</span>
                </div>
                {bodyRichTextEditor}
              </StudioDropZone>
            ) : (
              bodyRichTextEditor
            )}
          </div>

          {storyAssistSection}

          <div className={styles.gallerySection}>
            {studioShellForm ? (
              <StudioCardFormGallery
                disabled={isSaving}
                onSetAsCover={handleSetGalleryItemAsCover}
                currentCoverMediaId={cardData.coverImageId || null}
                onOpenMediaEditor={studioShell?.openSelectedCardMediaEditor}
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
