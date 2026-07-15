'use client';

import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { closestCenter, DndContext, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { Card, HydratedGalleryMediaItem } from '@/lib/types/card';
import { Media } from '@/lib/types/photo';
import { dehydrateCardForSave, extractMediaFromContent, generateExcerpt } from '@/lib/utils/cardUtils';
import CoverPhotoContainer from '@/components/admin/studio/cards/CoverPhotoContainer';
import GalleryManager from '@/components/admin/studio/cards/GalleryManager';
import MacroTagSelector from '@/components/admin/studio/cards/MacroTagSelector';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import ChildCardManager from '@/components/admin/studio/cards/ChildCardManager';
import RichTextEditor, { RichTextEditorRef } from '@/components/common/RichTextEditor';
import styles from './CardForm.module.css';
import { useCardForm } from '@/components/providers/CardFormProvider';
import clsx from 'clsx';
import PhotoPicker from '@/components/admin/studio/cards/PhotoPicker';
import LoadingOverlay from '@/components/admin/studio/cards/LoadingOverlay';
import { getAllowedDisplayModes, normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';
import { arrayMove } from '@dnd-kit/sortable';
import { useStudioCardFormStudioOptional } from '@/components/admin/studio/studioCardFormStudioContext';
import { useStudioShellOptional } from '@/components/admin/studio/StudioShellContext';
import {
  reorderGalleryMediaFromDragIds,
  reorderChildrenIdsFromDragIds,
  StudioDropZone,
} from '@/components/admin/studio/studioRelationshipDndPrimitives';
import {
  isLocalGalleryReorderDropId,
  resolveStudioShellExternalDropId,
} from '@/lib/dnd/studioShellDragRouter';
import { classifyStudioRightColumnDragId } from '@/lib/dnd/studioRightColumnDragContract';
import StudioCardFormGallery from '@/components/admin/studio/StudioCardFormGallery';
import StudioCardFormChildren from '@/components/admin/studio/StudioCardFormChildren';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { useDefaultDndSensors } from '@/lib/hooks/useDefaultDndSensors';
import type { GalleryTagInheritanceToggles } from '@/lib/types/authorSettings';
import { protectExistingCardInheritance } from '@/lib/utils/galleryTagInheritance';
import { DIMENSION_LABEL, DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';

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
    commitChildrenIdsPersisted,
  } = useCardForm();

  const studioFormCtx = useStudioCardFormStudioOptional();
  const studioShellForm = Boolean(studioFormCtx?.studioShellCardForm);
  const studioShellDnd = Boolean(studioFormCtx?.enableStudioShellDnd);
  const studioShell = useStudioShellOptional();
  const feedback = useAppFeedback();
  const [galleryInheritanceSettings, setGalleryInheritanceSettings] = useState<GalleryTagInheritanceToggles | null>(null);

  const editorRef = useRef<RichTextEditorRef>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/admin/author-settings')
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ settings?: { galleryTagInheritance?: GalleryTagInheritanceToggles } }>;
      })
      .then((data) => {
        if (!cancelled) setGalleryInheritanceSettings(data?.settings?.galleryTagInheritance ?? null);
      })
      .catch(() => {
        if (!cancelled) setGalleryInheritanceSettings(null);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!studioShellDnd || !studioShell) return;
    const register = studioShell.registerBodyMediaInsert;
    register((media: Media) => {
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
    });
    return () => {
      register(null);
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
  const [titleDraft, setTitleDraft] = useState(cardData.title || '');
  const [subtitleDraft, setSubtitleDraft] = useState(cardData.subtitle || '');
  const [excerptDraft, setExcerptDraft] = useState(cardData.excerpt || '');

  useEffect(() => {
    setTagMacroExpanded(false);
  }, [cardData.docId]);

  useEffect(() => {
    setTitleDraft(cardData.title || '');
  }, [cardData.docId, cardData.title]);

  useEffect(() => {
    setSubtitleDraft(cardData.subtitle || '');
  }, [cardData.docId, cardData.subtitle]);

  useEffect(() => {
    setExcerptDraft(cardData.excerpt || '');
  }, [cardData.docId, cardData.excerpt]);

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

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitleDraft(e.target.value), []);
  const handleSubtitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSubtitleDraft(e.target.value), []);
  const handleExcerptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setExcerptDraft(e.target.value), []);
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
  const persistStatusChange = useCallback((nextStatus: Card['status']) => {
    setField('status', nextStatus);
    if (lastSavedState.cardData.status === nextStatus) return;
    void persistFieldPatch({ status: nextStatus });
  }, [lastSavedState.cardData.status, persistFieldPatch, setField]);
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    persistStatusChange(e.target.value as Card['status']);
  }, [persistStatusChange]);
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
  }, [setField]);
  
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

  const handleSubjectTagChange = useCallback((nextSubjectTagId: string | null) => {
    setField('subjectTagId', nextSubjectTagId);
    const savedSubjectTagId = lastSavedState.cardData.subjectTagId ?? null;
    if (savedSubjectTagId === nextSubjectTagId) {
      return;
    }
    void persistFieldPatch({ subjectTagId: nextSubjectTagId });
  }, [lastSavedState.cardData.subjectTagId, persistFieldPatch, setField]);

  const handleGalleryInheritanceChange = useCallback((dimension: TagDimension, inherit: boolean) => {
    const current = cardData.galleryTagInheritanceOverrides ?? protectExistingCardInheritance();
    const next = { ...current, [dimension]: !inherit };
    setField('galleryTagInheritanceOverrides', next);
    void persistFieldPatch({ galleryTagInheritanceOverrides: next });
  }, [cardData.galleryTagInheritanceOverrides, persistFieldPatch, setField]);

  const galleryInheritanceControls = useMemo(() => {
    const overrides = cardData.galleryTagInheritanceOverrides ?? protectExistingCardInheritance();
    return (
      <fieldset className={styles.galleryInheritanceControls}>
        <legend>Gallery inheritance</legend>
        <div className={styles.galleryInheritanceOptions}>
          {DIMENSION_ORDER.map((dimension) => {
            const available = galleryInheritanceSettings?.[dimension] === true;
            return (
              <label
                key={dimension}
                className={styles.galleryInheritanceOption}
                title={available ? `Inherit ${DIMENSION_LABEL[dimension]} from Gallery items` : `Enable ${DIMENSION_LABEL[dimension]} Gallery inheritance in Settings first`}
              >
                <input
                  type="checkbox"
                  checked={available && !overrides[dimension]}
                  disabled={isSaving || !available}
                  onChange={(event) => handleGalleryInheritanceChange(dimension, event.target.checked)}
                />
                {DIMENSION_LABEL[dimension]}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }, [cardData.galleryTagInheritanceOverrides, galleryInheritanceSettings, handleGalleryInheritanceChange, isSaving]);

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
        if (studioShell?.selectedCardId === docId) {
          void studioShell.loadSelectedCard(docId, { quiet: true });
        }
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
    [cardData, commitGalleryMediaPersisted, feedback, studioShell]
  );

  /**
   * Persist children order on the card (PATCH childrenIds only).
   * Mirrors gallery slot save: narrow PATCH + local baseline sync without full-card persist.
   */
  const persistChildrenAfterReorder = useCallback(
    async (nextChildrenIds: string[]): Promise<boolean> => {
      const docId = cardData.docId?.trim();
      if (!docId) {
        await feedback.alert({
          title: 'Save card first',
          message: 'Save the card once before reordering children.',
        });
        return false;
      }

      const body = { childrenIds: nextChildrenIds };

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
            title: 'Could not save child order',
            message: formatCardApiError(payload),
          });
          return false;
        }
        commitChildrenIdsPersisted(nextChildrenIds);
        if (studioShell?.selectedCardId === docId) {
          void studioShell.loadSelectedCard(docId, { quiet: true });
        }
        return true;
      } catch (e) {
        console.error('[persistChildrenAfterReorder]', e);
        await feedback.alert({
          title: 'Could not save child order',
          message: e instanceof Error ? e.message : 'Network error saving child order.',
        });
        return false;
      }
    },
    [cardData.docId, commitChildrenIdsPersisted, feedback, studioShell]
  );

  const localShellFormSensors = useDefaultDndSensors();
  const lastLocalShellOverRef = useRef<string | null>(null);

  const handleLocalShellFormDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id != null ? String(event.over.id) : null;
    if (!overId) return;
    const activeId = String(event.active.id);
    const domain = classifyStudioRightColumnDragId(activeId);
    if (domain === 'gallery' && isLocalGalleryReorderDropId(overId)) {
      lastLocalShellOverRef.current = overId;
      return;
    }
    if (
      domain === 'studioChild' &&
      (overId.startsWith('studioChild:') || overId.startsWith('studioChildAfter:'))
    ) {
      lastLocalShellOverRef.current = overId;
    }
  }, []);

  const handleLocalShellFormDragCancel = useCallback(() => {
    lastLocalShellOverRef.current = null;
  }, []);

  /** Reader Compose modal (and other non-shell Studio form hosts): commit gallery/children reorder locally. */
  const handleLocalShellFormDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const activeId = String(event.active.id);
      const rawOverId = event.over?.id != null ? String(event.over.id) : null;
      const overId = resolveStudioShellExternalDropId({
        activeId,
        rawOverId,
        lastValidOverId: lastLocalShellOverRef.current,
      });
      lastLocalShellOverRef.current = null;
      if (!overId) return;

      const gallery = (cardData.galleryMedia || []) as HydratedGalleryMediaItem[];
      const reorderedGallery = reorderGalleryMediaFromDragIds(gallery, activeId, overId);
      if (reorderedGallery) {
        const previousGallery = gallery;
        setField('galleryMedia', reorderedGallery);
        const ok = await persistGalleryAfterSlotSave(reorderedGallery);
        if (!ok) {
          setField('galleryMedia', previousGallery);
        }
        return;
      }

      const childrenIds = cardData.childrenIds || [];
      const reorderedChildren = reorderChildrenIdsFromDragIds(
        childrenIds,
        activeId,
        overId,
        cardData.docId
      );
      if (!reorderedChildren) return;

      const previousChildren = childrenIds;
      setField('childrenIds', reorderedChildren);
      const ok = await persistChildrenAfterReorder(reorderedChildren);
      if (!ok) {
        setField('childrenIds', previousChildren);
      }
    },
    [
      cardData.childrenIds,
      cardData.docId,
      cardData.galleryMedia,
      persistChildrenAfterReorder,
      persistGalleryAfterSlotSave,
      setField,
    ]
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
    setField('title', titleDraft);
    const nextTitle = titleDraft.trim();
    if (!cardData.docId || !nextTitle) return;
    if ((lastSavedState.cardData.title || '') === nextTitle) return;
    void persistFieldPatch({ title: nextTitle });
  }, [cardData.docId, lastSavedState.cardData.title, persistFieldPatch, setField, titleDraft]);

  const persistSubtitleOnBlur = useCallback(() => {
    setField('subtitle', subtitleDraft || null);
    if (!cardData.docId) return;
    const nextSubtitle = subtitleDraft || null;
    if ((lastSavedState.cardData.subtitle || null) === nextSubtitle) return;
    void persistFieldPatch({ subtitle: nextSubtitle });
  }, [cardData.docId, lastSavedState.cardData.subtitle, persistFieldPatch, setField, subtitleDraft]);

  const persistExcerptOnBlur = useCallback(() => {
    setField('excerpt', excerptDraft || null);
    if (!cardData.docId || isExcerptAuto) return;
    const nextExcerpt = excerptDraft || null;
    if ((lastSavedState.cardData.excerpt || null) === nextExcerpt) return;
    void persistFieldPatch({ excerpt: nextExcerpt });
  }, [cardData.docId, excerptDraft, isExcerptAuto, lastSavedState.cardData.excerpt, persistFieldPatch, setField]);

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
    const overrides = {
      ...(editorContent !== undefined ? { content: editorContent } : {}),
      title: titleDraft,
      subtitle: subtitleDraft || null,
      excerpt: isExcerptAuto ? null : excerptDraft || null,
    };
    const saved = await handleSave(overrides);
    if (saved) {
      feedback.showSuccess('Card saved.', 'Saved');
      return;
    }
    feedback.showError('Could not save card. Please review any errors and try again.', 'Could not save');
  }, [excerptDraft, feedback, handleSave, isExcerptAuto, subtitleDraft, titleDraft]);

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
      onContentMediaChange={updateContentMedia}
      onAddImage={handleAddImageToContent}
      error={errors.content}
      className={clsx(errors.content && styles.inputError)}
      chainWheelToScrollParent={studioShellForm}
    />
  );

  const studioStatusToggle = (
    <div className={styles.selectGroup}>
      <span className={styles.selectLabel}>Status</span>
      <div className={clsx(styles.statusToggleGroup, errors.status && styles.inputError)} role="radiogroup" aria-label="Status">
        <label
          className={clsx(
            styles.statusToggleOption,
            cardData.status === 'draft' && styles.statusToggleOptionActive
          )}
        >
          <input
            type="radio"
            name="status-toggle"
            value="draft"
            checked={cardData.status === 'draft'}
            onChange={() => persistStatusChange('draft')}
            className={styles.statusToggleInput}
          />
          <span className={styles.statusToggleLabel}>Draft</span>
        </label>
        <label
          className={clsx(
            styles.statusToggleOption,
            cardData.status === 'published' && styles.statusToggleOptionActive
          )}
        >
          <input
            type="radio"
            name="status-toggle"
            value="published"
            checked={cardData.status === 'published'}
            onChange={() => persistStatusChange('published')}
            className={styles.statusToggleInput}
          />
          <span className={styles.statusToggleLabel}>Published</span>
        </label>
      </div>
    </div>
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
        <DndContext
          sensors={localShellFormSensors}
          collisionDetection={closestCenter}
          onDragOver={handleLocalShellFormDragOver}
          onDragCancel={handleLocalShellFormDragCancel}
          onDragEnd={(event) => {
            void handleLocalShellFormDragEnd(event);
          }}
        >
          <form id="card-form" onSubmit={handleSubmit} className={clsx(styles.form, styles.compactShellForm)}>
            <div className={styles.mainContent}>
              <div className={styles.header}>
                <input
                  type="text"
                  value={titleDraft}
                  onChange={handleTitleChange}
                  onBlur={persistTitleOnBlur}
                  onKeyDown={handleSingleLineFieldEnter}
                  placeholder="Card Title"
                  className={clsx(styles.titleInput, errors.title && styles.inputError)}
                />
                <input
                  type="text"
                  value={subtitleDraft}
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
                          value={excerptDraft}
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
                          value={excerptDraft}
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
                  {studioShellForm ? studioStatusToggle : (
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
                  )}
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
                  feedPreviewCard={cardData}
                  feedPreviewTags={allTags}
                />
              </div>

              <div className={styles.tagsSection}>
                <CardDimensionalTagCommandBar
                  card={cardData}
                  allTags={allTags}
                  disabled={isSaving}
                  variant={studioShellForm ? 'compact' : 'default'}
                  stackTagsWithinDimension
                  onUpdateTags={handleTagsChange}
                  onUpdateSubjectTagId={handleSubjectTagChange}
                  tagError={errors.tags}
                  className={styles.tagCommandBar}
                  trailingSlot={null}
                  footerContent={galleryInheritanceControls}
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
                  filterTagIds={cardData.tags ?? []}
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
              value={titleDraft}
              onChange={handleTitleChange}
              onBlur={persistTitleOnBlur}
              onKeyDown={handleSingleLineFieldEnter}
              placeholder="Card Title"
              className={clsx(styles.titleInput, errors.title && styles.inputError)}
            />
            <input
              type="text"
              value={subtitleDraft}
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
                      value={excerptDraft}
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
                      value={excerptDraft}
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
              {studioShellForm ? studioStatusToggle : (
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
              )}
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
                  feedPreviewCard={cardData}
                  feedPreviewTags={allTags}
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
                feedPreviewCard={cardData}
                feedPreviewTags={allTags}
              />
            )}
          </div>

          <div className={styles.tagsSection}>
            <CardDimensionalTagCommandBar
              card={cardData}
              allTags={allTags}
              disabled={isSaving}
              variant={studioShellForm ? 'compact' : 'default'}
              stackTagsWithinDimension
              onUpdateTags={handleTagsChange}
              onUpdateSubjectTagId={handleSubjectTagChange}
              footerContent={galleryInheritanceControls}
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
              subjectTagId={cardData.subjectTagId ?? null}
              onSubjectTagIdChange={handleSubjectTagChange}
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
                onPersistGalleryAfterSlotSave={persistGalleryAfterSlotSave}
                filterTagIds={cardData.tags ?? []}
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
