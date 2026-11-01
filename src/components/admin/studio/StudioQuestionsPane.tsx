'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, FilterX, FolderOpen, Link2Off, ListPlus, Plus, Save, Tag, Trash2, X } from 'lucide-react';
import EditModal from '@/components/admin/studio/cards/EditModal';
import MacroTagSelector from '@/components/admin/studio/cards/MacroTagSelector';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import DimensionalTagVerticalChips from '@/components/admin/common/DimensionalTagVerticalChips';
import DebouncedSearchInput from '@/components/admin/common/DebouncedSearchInput';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
import type { StudioSelectedDetail, StudioSelectedPreview } from '@/components/admin/studio/studioCardTypes';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { useTag, type TagWithChildren } from '@/components/providers/TagProvider';
import type { PromptLibraryKind, Question, UpdateQuestionInput } from '@/lib/types/question';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import { groupSelectedTagIdsByDimension } from '@/lib/utils/tagUtils';
import { DIMENSION_ORDER } from '@/lib/utils/tagDisplay';
import {
  getPromptOrderSiblings,
  orderPromptLibraryQuestions,
  PROMPT_NEEDS_ORGANIZATION_FILTER,
  promptNeedsOrganization,
} from '@/lib/utils/promptLibrary';
import styles from './StudioWorkspace.module.css';

type QuestionsResponse = { questions?: Question[]; message?: string; error?: string };
type QuestionResponse = { question?: Question; card?: { docId?: string }; message?: string; error?: string };
type IncludedFilter = 'all' | 'included' | 'notIncluded';
const UNTAGGED_FILTER_ID = '__untagged_questions__';

function isIncluded(question: Question): boolean {
  return question.usedByCardIds.length > 0;
}

function tagMatchesSelection(
  question: Question,
  tagId: string | null,
  descendantIds: Set<string>,
  includeChildren: boolean
): boolean {
  if (!tagId) return true;
  if (tagId === UNTAGGED_FILTER_ID) return question.tagIds.length === 0;
  return question.tagIds.some(id => id === tagId || (includeChildren && descendantIds.has(id)));
}

function countQuestionsForTag(tag: TagWithChildren, questions: Question[], includeChildren: boolean): number {
  if (!tag.docId) return 0;
  if (!includeChildren) {
    return questions.filter(q => q.tagIds.includes(tag.docId!)).length;
  }
  const ids = new Set<string>();
  const collect = (node: TagWithChildren) => {
    if (node.docId) ids.add(node.docId);
    node.children.forEach(collect);
  };
  collect(tag);
  return questions.filter(q => q.tagIds.some(id => ids.has(id))).length;
}

function collectDescendantIds(root: TagWithChildren | undefined): Set<string> {
  const ids = new Set<string>();
  if (!root) return ids;
  const walk = (node: TagWithChildren) => {
    node.children.forEach(child => {
      if (child.docId) ids.add(child.docId);
      walk(child);
    });
  };
  walk(root);
  return ids;
}

function findTagNode(nodes: TagWithChildren[], tagId: string | null): TagWithChildren | undefined {
  if (!tagId || tagId === UNTAGGED_FILTER_ID) return undefined;
  for (const node of nodes) {
    if (node.docId === tagId) return node;
    const child = findTagNode(node.children, tagId);
    if (child) return child;
  }
  return undefined;
}

function toUnlinkedStoryCard<T extends StudioSelectedPreview | StudioSelectedDetail>(card: T): T {
  return {
    ...card,
    type: 'story',
    status: 'draft',
    questionId: undefined,
    updatedAt: Date.now(),
  } as T;
}

function buildQuestionCardPreview(question: Question, cardId: string): StudioSelectedPreview {
  return {
    docId: cardId,
    title: question.prompt,
    title_lowercase: question.prompt.toLowerCase(),
    content: '',
    type: 'qa',
    status: 'draft',
    displayMode: 'navigate',
    tags: question.tagIds,
    subjectTagId: question.subjectTagId,
    subjectTagIds: question.subjectTagIds,
    subjectFilterTags: question.subjectFilterTags,
    galleryMedia: [],
    contentMedia: [],
    childrenIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as StudioSelectedPreview;
}

function QuestionTagTree({
  nodes,
  questions,
  selectedTagId,
  includeChildren,
  onSelect,
  depth = 0,
}: {
  nodes: TagWithChildren[];
  questions: Question[];
  selectedTagId: string | null;
  includeChildren: boolean;
  onSelect: (tagId: string) => void;
  depth?: number;
}) {
  return (
    <ul className={depth === 0 ? styles.studioQuestionTreeRoot : styles.studioQuestionTreeNested}>
      {nodes.map(node => {
        if (!node.docId) return null;
        const count = countQuestionsForTag(node, questions, includeChildren);
        if (count === 0 && depth > 0) return null;
        return (
          <li key={node.docId}>
            <button
              type="button"
              className={`${styles.studioQuestionTreeButton} ${selectedTagId === node.docId ? styles.studioQuestionTreeButtonActive : ''}`}
              onClick={() => onSelect(node.docId!)}
            >
              <span>{node.name}</span>
              <span className={styles.studioQuestionTreeCount}>{count}</span>
            </button>
            {node.children.length > 0 ? (
              <QuestionTagTree
                nodes={node.children}
                questions={questions}
                selectedTagId={selectedTagId}
                includeChildren={includeChildren}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function StudioQuestionsPane() {
  const router = useRouter();
  const feedback = useAppFeedback();
  const {
    selectCard,
    requestSelectCard,
    getKnownCardPreview,
    selectedCardId,
    selectedPreview,
    selectedDetail,
    setSelectedPreview,
    setSelectedDetail,
    upsertCollectionsCardList,
    registerQuestionCardDeleteSync,
    selectedLoadState,
    insertPromptText,
  } = useStudioShell();
  const { tags: allTags, dimensionTree } = useTag();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const [pendingQuestionCardId, setPendingQuestionCardId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includedFilter, setIncludedFilter] = useState<IncludedFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [includeChildren, setIncludeChildren] = useState(true);
  const [treeOpen, setTreeOpen] = useState(false);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [tagFilterModalOpen, setTagFilterModalOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newPromptKind, setNewPromptKind] = useState<PromptLibraryKind>('primary');
  const [newParentQuestionId, setNewParentQuestionId] = useState('');
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [newSubjectTagIds, setNewSubjectTagIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createAdvancedTagEditorOpen, setCreateAdvancedTagEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editPromptKind, setEditPromptKind] = useState<PromptLibraryKind>('primary');
  const [editParentQuestionId, setEditParentQuestionId] = useState('');
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [editSubjectTagIds, setEditSubjectTagIds] = useState<string[]>([]);
  const [advancedTagEditorId, setAdvancedTagEditorId] = useState<string | null>(null);
  const [editSaveState, setEditSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const editSaveTimerRef = useRef<number | null>(null);
  const [unlinkConfirmQuestion, setUnlinkConfirmQuestion] = useState<Question | null>(null);
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] = useState<Question | null>(null);

  const allDimensionNodes = useMemo(
    () => [
      ...dimensionTree.who,
      ...dimensionTree.what,
      ...dimensionTree.when,
      ...dimensionTree.where,
    ],
    [dimensionTree]
  );

  const selectedTagNode = useMemo(
    () => findTagNode(allDimensionNodes, selectedTagId),
    [allDimensionNodes, selectedTagId]
  );

  const selectedDescendantIds = useMemo(
    () => collectDescendantIds(selectedTagNode),
    [selectedTagNode]
  );

  const selectedEditTags = useMemo(
    () => allTags.filter(tag => tag.docId && editTagIds.includes(tag.docId)),
    [allTags, editTagIds]
  );
  const questionsLoadInFlightRef = useRef(false);

  const loadQuestions = useCallback(async () => {
    if (questionsLoadInFlightRef.current) return;
    questionsLoadInFlightRef.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/questions', { cache: 'no-store', credentials: 'same-origin' });
      const data = (await res.json().catch(() => ({}))) as QuestionsResponse;
      throwIfJsonApiFailed(res, data, 'Prompts could not be loaded. Try again.');
      setQuestions(data.questions || []);
    } catch (e) {
      feedback.showError(e instanceof Error ? e.message : 'Failed to load prompts', 'Could not load prompts');
    } finally {
      questionsLoadInFlightRef.current = false;
      setLoading(false);
    }
  }, [feedback]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (!pendingQuestionId || !pendingQuestionCardId) return;
    if (selectedLoadState === 'loading') return;
    const selectedMatchesPendingCard =
      selectedCardId === pendingQuestionCardId &&
      (selectedDetail?.docId === pendingQuestionCardId || selectedPreview?.docId === pendingQuestionCardId);
    if (!selectedMatchesPendingCard) return;
    setPendingQuestionId(null);
    setPendingQuestionCardId(null);
  }, [
    pendingQuestionCardId,
    pendingQuestionId,
    selectedCardId,
    selectedDetail?.docId,
    selectedLoadState,
    selectedPreview?.docId,
  ]);

  useEffect(() => {
    registerQuestionCardDeleteSync((deletedCardId, questionId) => {
      setQuestions(prev =>
        prev.map((question) => {
          if (questionId) {
            if (question.docId !== questionId) return question;
          } else if (!question.usedByCardIds.includes(deletedCardId)) {
            return question;
          }
          const nextUsedByCardIds = question.usedByCardIds.filter((id) => id !== deletedCardId);
          return {
            ...question,
            usedByCardIds: nextUsedByCardIds,
            usageCount: nextUsedByCardIds.length,
            updatedAt: Date.now(),
          };
        })
      );
    });
    return () => registerQuestionCardDeleteSync(null);
  }, [registerQuestionCardDeleteSync]);

  const groupedTagFilters = useMemo(
    () => groupSelectedTagIdsByDimension(filterTagIds, allTags),
    [allTags, filterTagIds]
  );

  const categoryOptions = useMemo(
    () => Array.from(new Set(questions.map((question) => question.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [questions]
  );
  const topicOptions = useMemo(
    () => Array.from(new Set(questions
      .filter((question) =>
        !selectedCategory ||
        (selectedCategory !== PROMPT_NEEDS_ORGANIZATION_FILTER && question.category === selectedCategory)
      )
      .map((question) => question.topic)
      .filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [questions, selectedCategory]
  );

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter(question => {
      if (pendingQuestionId === question.docId) return true;
      const included = isIncluded(question);
      if (includedFilter === 'included' && !included) return false;
      if (includedFilter === 'notIncluded' && included) return false;
      if (selectedCategory === PROMPT_NEEDS_ORGANIZATION_FILTER && !promptNeedsOrganization(question)) return false;
      if (
        selectedCategory &&
        selectedCategory !== PROMPT_NEEDS_ORGANIZATION_FILTER &&
        question.category !== selectedCategory
      ) return false;
      if (selectedTopic && question.topic !== selectedTopic) return false;
      if (q && !question.prompt_lowercase.includes(q)) return false;
      if (!tagMatchesSelection(question, selectedTagId, selectedDescendantIds, includeChildren)) return false;
      for (const ids of Object.values(groupedTagFilters)) {
        if (ids?.length && !ids.some((id) => question.tagIds.includes(id))) return false;
      }
      return true;
    });
  }, [
    groupedTagFilters,
    includeChildren,
    includedFilter,
    pendingQuestionId,
    questions,
    search,
    selectedCategory,
    selectedDescendantIds,
    selectedTagId,
    selectedTopic,
  ]);

  const orderedFilteredQuestions = useMemo(() => {
    const visibleIds = new Set(filteredQuestions.map(question => question.docId));
    return orderPromptLibraryQuestions(questions).filter(question => visibleIds.has(question.docId));
  }, [filteredQuestions, questions]);

  const saveQuestion = useCallback(async (questionId: string, body: UpdateQuestionInput) => {
    setBusyId(questionId);
    setBusyLabel('Saving question...');
    if (body.prompt !== undefined) setEditSaveState('saving');
    try {
      const res = await fetch(`/api/admin/questions/${encodeURIComponent(questionId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as QuestionResponse;
      throwIfJsonApiFailed(res, data, 'This question could not be saved. Your changes are still here. Try again.');
      if (data.question) {
        setQuestions(prev => prev.map(q => q.docId === questionId ? data.question! : q));
      }
      if (body.prompt !== undefined) setEditSaveState('saved');
      return true;
    } catch (e) {
      if (body.prompt !== undefined) setEditSaveState('error');
      feedback.showError(e instanceof Error ? e.message : 'Failed to update question', 'Could not save question');
      return false;
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [feedback]);

  const insertQuestionIntoCard = useCallback((question: Question) => {
    if (!selectedCardId || !insertPromptText(question.prompt)) {
      feedback.showError('Open a Card in Compose beside Prompts before adding writing guidance.', 'Open a Card first');
      return;
    }
    feedback.showSuccess('Prompt copied into the open Card. Library edits will not change the Card.');
  }, [feedback, insertPromptText, selectedCardId]);

  const insertSelectedTopicIntoCard = useCallback(() => {
    if (!selectedTopic || !selectedCardId) return;
    const topicPrompts = orderPromptLibraryQuestions(questions)
      .filter((question) => question.topic === selectedTopic && (!selectedCategory || question.category === selectedCategory));
    if (topicPrompts.length === 0 || topicPrompts.some((question) => !insertPromptText(question.prompt))) {
      feedback.showError('Keep the Card open in Compose while adding Topic prompts.', 'Could not add Topic');
      return;
    }
    feedback.showSuccess(`${topicPrompts.length} Topic prompt${topicPrompts.length === 1 ? '' : 's'} copied into the open Card.`);
  }, [feedback, insertPromptText, questions, selectedCardId, selectedCategory, selectedTopic]);

  const clearEditSaveTimer = useCallback(() => {
    if (editSaveTimerRef.current !== null) {
      window.clearTimeout(editSaveTimerRef.current);
      editSaveTimerRef.current = null;
    }
  }, []);

  const flushPromptSave = useCallback(async () => {
    clearEditSaveTimer();
    if (!editingId) return;
    const current = questions.find((question) => question.docId === editingId);
    const nextPrompt = editPrompt.trim();
    if (!current || !nextPrompt || nextPrompt === current.prompt) return;
    await saveQuestion(editingId, { prompt: nextPrompt });
  }, [clearEditSaveTimer, editPrompt, editingId, questions, saveQuestion]);

  useEffect(() => {
    clearEditSaveTimer();
    if (!editingId) return;
    const current = questions.find((question) => question.docId === editingId);
    const nextPrompt = editPrompt.trim();
    if (!current || !nextPrompt || nextPrompt === current.prompt) return;
    setEditSaveState('idle');
    editSaveTimerRef.current = window.setTimeout(() => {
      editSaveTimerRef.current = null;
      void saveQuestion(editingId, { prompt: nextPrompt });
    }, 700);
    return clearEditSaveTimer;
  }, [clearEditSaveTimer, editPrompt, editingId, questions, saveQuestion]);

  const openQuestionCard = useCallback(async (question: Question) => {
    const existingCardId = question.usedByCardIds[0];
    if (!existingCardId) return;
    setBusyId(question.docId);
    setBusyLabel('Opening Compose...');
    setPendingQuestionId(question.docId);
    try {
      setPendingQuestionCardId(existingCardId);
      const previewCard = getKnownCardPreview(existingCardId) ?? buildQuestionCardPreview(question, existingCardId);
      const switched = await requestSelectCard(existingCardId, previewCard);
      if (!switched) {
        setPendingQuestionId(null);
        setPendingQuestionCardId(null);
        return;
      }
      router.replace(`/admin/studio?card=${encodeURIComponent(existingCardId)}`);
    } catch (e) {
      setPendingQuestionId(null);
      setPendingQuestionCardId(null);
      feedback.showError(e instanceof Error ? e.message : 'Failed to open question', 'Could not open question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [feedback, getKnownCardPreview, requestSelectCard, router]);

  const startDraftCard = useCallback(() => {
    router.replace('/admin/studio?destination=cards&new=1');
  }, [router]);

  const unlinkQuestionCard = useCallback(async (question: Question) => {
    const cardId = question.usedByCardIds[0];
    if (!cardId) return;
    setBusyId(question.docId);
    setBusyLabel('Unlinking question...');
    try {
      const res = await fetch(`/api/admin/questions/${encodeURIComponent(question.docId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId }),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as QuestionResponse;
      throwIfJsonApiFailed(res, data, 'This question could not be unlinked from its card. Try again.');
      if (data.question) {
        setQuestions(prev => prev.map(q => q.docId === question.docId ? data.question! : q));
      }
      if (selectedCardId === cardId) {
        if (selectedDetail?.docId === cardId) {
          const nextDetail = toUnlinkedStoryCard(selectedDetail);
          setSelectedDetail(nextDetail);
          upsertCollectionsCardList(nextDetail);
        }
        if (selectedPreview?.docId === cardId) {
          const nextPreview = toUnlinkedStoryCard(selectedPreview);
          setSelectedPreview(nextPreview);
          upsertCollectionsCardList(nextPreview);
          selectCard(cardId, nextPreview);
        }
      } else {
        const knownPreview = getKnownCardPreview(cardId);
        if (knownPreview) {
          upsertCollectionsCardList(toUnlinkedStoryCard(knownPreview));
        }
      }
      feedback.showSuccess('Unlinked the question and converted its card to a draft Story.');
    } catch (e) {
      feedback.showError(e instanceof Error ? e.message : 'Failed to unlink question', 'Could not unlink question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [
    feedback,
    getKnownCardPreview,
    selectCard,
    selectedCardId,
    selectedDetail,
    selectedPreview,
    setSelectedDetail,
    setSelectedPreview,
    upsertCollectionsCardList,
  ]);

  const createQuestion = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = newPrompt.trim();
    if (!prompt) return;
    setBusyId('new');
    setBusyLabel('Adding question...');
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          tagIds: newTagIds,
          subjectTagIds: newSubjectTagIds,
          category: newCategory,
          topic: newTopic,
          promptKind: newPromptKind,
          parentQuestionId: newPromptKind === 'followup' ? newParentQuestionId || null : null,
          promptOrder: 0,
        }),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as QuestionResponse;
      throwIfJsonApiFailed(res, data, 'This question could not be added. Your text is still here. Try again.');
      if (data.question) {
        setQuestions(prev => [data.question!, ...prev]);
      }
      setNewPrompt('');
      setNewCategory('');
      setNewTopic('');
      setNewPromptKind('primary');
      setNewParentQuestionId('');
      setNewTagIds([]);
      setNewSubjectTagIds([]);
      setCreateOpen(false);
      setCreateAdvancedTagEditorOpen(false);
      feedback.showSuccess('Question added.');
    } catch (e) {
      feedback.showError(e instanceof Error ? e.message : 'Failed to create question', 'Could not add question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [feedback, newCategory, newParentQuestionId, newPrompt, newPromptKind, newSubjectTagIds, newTagIds, newTopic]);

  const deleteQuestion = useCallback(async (question: Question) => {
    setBusyId(question.docId);
    setBusyLabel('Deleting question...');
    try {
      const res = await fetch(`/api/admin/questions/${encodeURIComponent(question.docId)}`, {
        method: 'DELETE',
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as QuestionResponse;
      throwIfJsonApiFailed(res, data, 'This question could not be deleted. Try again.');
      setQuestions(prev => prev.filter(q => q.docId !== question.docId));
      if (editingId === question.docId) {
        setEditingId(null);
        setAdvancedTagEditorId(null);
      }
      feedback.showSuccess('Question deleted.');
    } catch (e) {
      feedback.showError(e instanceof Error ? e.message : 'Failed to delete question', 'Could not delete question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [editingId, feedback]);

  const moveQuestion = useCallback(async (question: Question, direction: 'up' | 'down') => {
    setBusyId(question.docId);
    setBusyLabel('Saving prompt order...');
    try {
      const res = await fetch('/api/admin/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.docId, direction }),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as QuestionsResponse;
      throwIfJsonApiFailed(res, data, 'The prompt order could not be saved. Try again.');
      if (data.questions) {
        const replacements = new Map(data.questions.map(item => [item.docId, item]));
        setQuestions(prev => prev.map(item => replacements.get(item.docId) ?? item));
      }
      feedback.showSuccess('Prompt order saved.');
    } catch (e) {
      feedback.showError(e instanceof Error ? e.message : 'Failed to reorder prompt', 'Could not save prompt order');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [feedback]);

  const cancelCreate = useCallback(() => {
    setCreateOpen(false);
    setCreateAdvancedTagEditorOpen(false);
    setNewPrompt('');
    setNewCategory('');
    setNewTopic('');
    setNewPromptKind('primary');
    setNewParentQuestionId('');
    setNewTagIds([]);
    setNewSubjectTagIds([]);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setIncludedFilter('all');
    setSelectedCategory('');
    setSelectedTopic('');
    setSelectedTagId(null);
    setFilterTagIds([]);
    setTagFilterModalOpen(false);
  }, []);

  return (
    <aside className={styles.studioQuestionsPane} aria-label="Prompts">
      <div className={styles.studioQuestionsHeader}>
        <h2 className={styles.studioComposeTitle}>Prompts</h2>
        <button
          type="button"
          className={`${styles.studioQuestionPrimaryButton} ${styles.studioQuestionAddButton}`}
          onClick={() => setCreateOpen(open => !open)}
          aria-label={createOpen ? 'Close question form' : 'Add question'}
          title={createOpen ? 'Close question form' : 'Add question'}
        >
          {createOpen ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
        </button>
      </div>

      {createOpen ? (
        <form className={styles.studioQuestionCreate} onSubmit={createQuestion}>
          <textarea
            className={styles.studioQuestionTextarea}
            value={newPrompt}
            onChange={e => setNewPrompt(e.target.value)}
            placeholder="Question prompt"
            rows={3}
          />
          <div className={styles.studioPromptLibraryFields}>
            <input
              className={styles.studioQuestionInput}
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Category"
              aria-label="Prompt category"
            />
            <input
              className={styles.studioQuestionInput}
              value={newTopic}
              onChange={(event) => setNewTopic(event.target.value)}
              placeholder="Topic"
              aria-label="Prompt topic"
            />
            <select
              className={styles.studioQuestionSelect}
              value={newPromptKind}
              onChange={(event) => {
                const kind = event.target.value as PromptLibraryKind;
                setNewPromptKind(kind);
                if (kind === 'primary') setNewParentQuestionId('');
              }}
              aria-label="Prompt kind"
            >
              <option value="primary">Primary question</option>
              <option value="followup">Follow-up question</option>
            </select>
            {newPromptKind === 'followup' ? (
              <select
                className={styles.studioQuestionSelect}
                value={newParentQuestionId}
                onChange={(event) => setNewParentQuestionId(event.target.value)}
                aria-label="Primary question"
                required
              >
                <option value="">Choose primary question</option>
                {questions
                  .filter((question) => question.promptKind === 'primary' && question.category === newCategory.trim() && question.topic === newTopic.trim())
                  .map((question) => <option key={question.docId} value={question.docId}>{question.prompt}</option>)}
              </select>
            ) : null}
          </div>
          <div className={styles.studioQuestionTagSummaryRow}>
            <DimensionalTagVerticalChips
              tagIds={newTagIds}
              allTags={allTags}
              subjectTagIds={newSubjectTagIds}
              onUpdateTags={setNewTagIds}
              onUpdateSubjectTagIds={setNewSubjectTagIds}
              onOpenAssignment={() => setCreateAdvancedTagEditorOpen(true)}
              variant="inline"
            />
            <button
              type="button"
              className={styles.studioQuestionTagActionButton}
              onClick={() => setCreateAdvancedTagEditorOpen(true)}
              aria-label="Open Question Tags"
              title="Question Tags"
            >
              <Tag size={16} aria-hidden="true" />
            </button>
          </div>
          {createAdvancedTagEditorOpen ? (
            <MacroTagSelector
              selectedTags={allTags.filter(tag => tag.docId && newTagIds.includes(tag.docId))}
              allTags={allTags}
              onChange={setNewTagIds}
              subjectTagIds={newSubjectTagIds}
              onSubjectTagIdsChange={setNewSubjectTagIds}
              onSaveAssignment={async (tagIds, subjectTagIds) => {
                setNewTagIds(tagIds);
                setNewSubjectTagIds(subjectTagIds);
              }}
              expanded
              onExpandedChange={setCreateAdvancedTagEditorOpen}
              visibleDimensions={[...DIMENSION_ORDER]}
              pickerTitle="Question Tags"
              searchPlaceholder="Search tags..."
              unifiedAssignmentLayout
              includeAllTags
              collapsedSummary="none"
            />
          ) : null}
          {busyId === 'new' ? (
            <p className={styles.studioQuestionInlineStatus} role="status" aria-live="polite">
              {busyLabel ?? 'Adding question...'}
            </p>
          ) : null}
          <div className={styles.studioQuestionActions}>
            <button
              type="submit"
              className={styles.studioQuestionPrimaryButton}
              disabled={busyId === 'new' || !newPrompt.trim() || (newPromptKind === 'followup' && !newParentQuestionId)}
              aria-label="Save question"
              title="Save question"
            >
              <Save size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.studioQuestionSmallButton}
              disabled={busyId === 'new'}
              onClick={cancelCreate}
              aria-label="Cancel question"
              title="Cancel question"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
      ) : null}

      <div className={styles.studioQuestionFilters}>
        <div className={styles.studioQuestionFilterRow}>
          <DebouncedSearchInput
            className={styles.studioQuestionInput}
            value={search}
            onCommit={setSearch}
            placeholder="Search"
            ariaLabel="Search questions"
          />
          <select
            className={styles.studioQuestionSelect}
            value={includedFilter}
            onChange={e => setIncludedFilter(e.target.value as IncludedFilter)}
          >
            <option value="all">All prompts</option>
            <option value="included">Assigned</option>
            <option value="notIncluded">Unassigned</option>
          </select>
          <select
            className={styles.studioQuestionSelect}
            value={selectedCategory}
            onChange={(event) => {
              setSelectedCategory(event.target.value);
              setSelectedTopic('');
            }}
            aria-label="Prompt category filter"
          >
            <option value="">All categories</option>
            <option value={PROMPT_NEEDS_ORGANIZATION_FILTER}>
              Needs organization ({questions.filter(promptNeedsOrganization).length})
            </option>
            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select
            className={styles.studioQuestionSelect}
            value={selectedTopic}
            onChange={(event) => setSelectedTopic(event.target.value)}
            aria-label="Prompt topic filter"
            disabled={selectedCategory === PROMPT_NEEDS_ORGANIZATION_FILTER}
          >
            <option value="">All topics</option>
            {topicOptions.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
          </select>
          <button
            type="button"
            className={styles.studioQuestionSmallButton}
            disabled={!selectedTopic || !selectedCardId}
            onClick={insertSelectedTopicIntoCard}
            aria-label="Add selected Topic prompts to open Card"
            title={selectedCardId ? 'Copy this Topic into the open Card' : 'Open a Card in Compose first'}
          >
            <ListPlus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.studioQuestionClearButton}
            onClick={clearFilters}
            aria-label="Clear question filters"
            title="Clear question filters"
          >
            <FilterX size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.studioQuestionTagFilterBlock}>
        <CardDimensionalTagCommandBar
          className={styles.studioQuestionTagFilterBar}
          card={{ tags: filterTagIds }}
          allTags={allTags}
          onUpdateTags={setFilterTagIds}
          variant="compact"
          hideSearch
          showDimensionIcons
          trailingSlot={
            <button
              type="button"
              className={styles.studioQuestionTagActionButton}
              onClick={() => setTagFilterModalOpen(true)}
            >
              <Tag size={16} aria-hidden="true" />
            </button>
          }
        />
        <EditModal
          isOpen={tagFilterModalOpen}
          onClose={() => setTagFilterModalOpen(false)}
          title="Question tag filters"
          size="wide"
        >
          <MacroTagSelector
            selectedTags={allTags.filter(tag => tag.docId && filterTagIds.includes(tag.docId))}
            allTags={allTags}
            onChange={setFilterTagIds}
            expanded={tagFilterModalOpen}
            onExpandedChange={setTagFilterModalOpen}
            collapsedSummary="none"
            suppressOverlay
          />
        </EditModal>
      </div>

      <div className={styles.studioQuestionTreeSection}>
        <button
          type="button"
          className={styles.studioQuestionSectionToggle}
          aria-expanded={treeOpen}
          onClick={() => setTreeOpen(open => !open)}
        >
          <span>All prompts</span>
          <span>{treeOpen ? 'Hide' : 'Show'}</span>
        </button>
        <label className={styles.studioQuestionToggleLabel}>
          <input
            type="checkbox"
            className={styles.studioQuestionToggleInput}
            checked={includeChildren}
            onChange={event => setIncludeChildren(event.target.checked)}
          />
          <span>Include children</span>
        </label>
        {treeOpen ? (
          <div className={styles.studioQuestionTreePanel}>
            <button
              type="button"
              className={`${styles.studioQuestionTreeButton} ${selectedTagId === null ? styles.studioQuestionTreeButtonActive : ''}`}
              onClick={() => setSelectedTagId(null)}
            >
              <span>All prompts</span>
              <span className={styles.studioQuestionTreeCount}>{questions.length}</span>
            </button>
            <button
              type="button"
              className={`${styles.studioQuestionTreeButton} ${selectedTagId === UNTAGGED_FILTER_ID ? styles.studioQuestionTreeButtonActive : ''}`}
              onClick={() => setSelectedTagId(UNTAGGED_FILTER_ID)}
            >
              <span>Untagged</span>
              <span className={styles.studioQuestionTreeCount}>{questions.filter(q => q.tagIds.length === 0).length}</span>
            </button>
            <QuestionTagTree
              nodes={allDimensionNodes}
              questions={questions}
              selectedTagId={selectedTagId}
              includeChildren={includeChildren}
              onSelect={setSelectedTagId}
            />
          </div>
        ) : null}
      </div>

      <div className={styles.studioQuestionsList}>
        {loading ? <p className={styles.metaMuted}>Loading prompts...</p> : null}
        {!loading && filteredQuestions.length === 0 ? (
          <p className={styles.metaMuted}>No prompts match this view.</p>
        ) : null}
        {orderedFilteredQuestions.map(question => {
          const included = isIncluded(question);
          const busy = busyId === question.docId;
          const editing = editingId === question.docId;
          const pendingOpen = pendingQuestionId === question.docId;
          const pendingRow = pendingOpen || (busy && !editing);
          const pendingLabel =
            pendingOpen
              ? busyLabel ?? 'Opening Compose...'
              : busy
                ? busyLabel ?? 'Updating question...'
                : null;
          const tagEditorOpen = advancedTagEditorId === question.docId;
          const activeTagIdsForDisplay = tagEditorOpen ? editTagIds : question.tagIds;
          const activeSubjectTagIds = tagEditorOpen ? editSubjectTagIds : question.subjectTagIds;
          const orderSiblings = getPromptOrderSiblings(question, questions);
          const orderIndex = orderSiblings.findIndex(candidate => candidate.docId === question.docId);
          const orderLabel = question.promptKind === 'primary' ? 'primary question' : 'follow-up question';
          return (
            <article
              key={question.docId}
              className={`${styles.studioQuestionRow} ${pendingRow ? styles.studioQuestionRowPending : ''}`}
            >
              {pendingRow ? (
                <div className={styles.studioQuestionRowPendingOverlay} aria-hidden="true">
                  <div className={styles.studioQuestionRowPendingSpinner} />
                  <span className={styles.studioQuestionRowPendingLabel}>{pendingLabel}</span>
                </div>
              ) : null}
              {editing ? (
                <>
                  <textarea
                    className={styles.studioQuestionTextarea}
                    value={editPrompt}
                    onChange={e => {
                      setEditPrompt(e.target.value);
                      setEditSaveState('idle');
                    }}
                    onBlur={() => void flushPromptSave()}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        clearEditSaveTimer();
                        setEditPrompt(question.prompt);
                        setEditSaveState('idle');
                        setEditingId(null);
                      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        void flushPromptSave();
                        event.currentTarget.blur();
                      }
                    }}
                    rows={3}
                    autoFocus
                  />
                  <div className={styles.studioPromptLibraryFields}>
                    <input
                      className={styles.studioQuestionInput}
                      value={editCategory}
                      onChange={(event) => setEditCategory(event.target.value)}
                      placeholder="Category"
                      aria-label="Prompt category"
                    />
                    <input
                      className={styles.studioQuestionInput}
                      value={editTopic}
                      onChange={(event) => setEditTopic(event.target.value)}
                      placeholder="Topic"
                      aria-label="Prompt topic"
                    />
                    <select
                      className={styles.studioQuestionSelect}
                      value={editPromptKind}
                      onChange={(event) => {
                        const kind = event.target.value as PromptLibraryKind;
                        setEditPromptKind(kind);
                        if (kind === 'primary') setEditParentQuestionId('');
                      }}
                      aria-label="Prompt kind"
                    >
                      <option value="primary">Primary question</option>
                      <option value="followup">Follow-up question</option>
                    </select>
                    {editPromptKind === 'followup' ? (
                      <select
                        className={styles.studioQuestionSelect}
                        value={editParentQuestionId}
                        onChange={(event) => setEditParentQuestionId(event.target.value)}
                        aria-label="Primary question"
                      >
                        <option value="">Choose primary question</option>
                        {questions
                          .filter((candidate) => candidate.docId !== question.docId && candidate.promptKind === 'primary' && candidate.category === editCategory.trim() && candidate.topic === editTopic.trim())
                          .map((candidate) => <option key={candidate.docId} value={candidate.docId}>{candidate.prompt}</option>)}
                      </select>
                    ) : null}
                    <button
                      type="button"
                      className={styles.studioQuestionSmallButton}
                      disabled={busy || (editPromptKind === 'followup' && !editParentQuestionId)}
                      onClick={() => void saveQuestion(question.docId, {
                        category: editCategory,
                        topic: editTopic,
                        promptKind: editPromptKind,
                        parentQuestionId: editPromptKind === 'followup' ? editParentQuestionId || null : null,
                        promptOrder: question.promptOrder,
                      })}
                    >
                      Save organization
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.studioQuestionPromptButton}
                  onClick={() => {
                    setEditingId(question.docId);
                    setEditPrompt(question.prompt);
                    setEditCategory(question.category);
                    setEditTopic(question.topic);
                    setEditPromptKind(question.promptKind);
                    setEditParentQuestionId(question.parentQuestionId ?? '');
                    setEditSaveState('idle');
                  }}
                  aria-label={`Edit question: ${question.prompt}`}
                >
                  <span className={styles.studioQuestionPrompt}>{question.prompt}</span>
                </button>
              )}
              {!editing ? (
                <p className={styles.studioPromptLibraryPath}>
                  {question.category || 'Unorganized'}
                  {' / '}
                  {question.topic || 'No topic'}
                  {' · '}
                  {question.promptKind === 'followup' ? 'Follow-up' : 'Primary'}
                </p>
              ) : null}
              {editing ? (
                <div className={styles.studioQuestionAutosaveStatus} role="status" aria-live="polite">
                  {editSaveState === 'saving'
                    ? 'Saving…'
                    : editSaveState === 'saved'
                      ? 'Saved'
                      : editSaveState === 'error'
                        ? 'Retry'
                        : ''}
                </div>
              ) : null}
              <div
                className={styles.studioQuestionTagEditor}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <div className={styles.studioQuestionTagSummaryRow}>
                  <DimensionalTagVerticalChips
                  tagIds={activeTagIdsForDisplay}
                  allTags={allTags}
                  subjectTagId={question.subjectTagId}
                  subjectTagIds={activeSubjectTagIds}
                  onUpdateTags={async (nextTagIds) => {
                    if (tagEditorOpen) {
                      setEditTagIds(nextTagIds);
                      return;
                    }
                    await saveQuestion(question.docId, { tagIds: nextTagIds });
                  }}
                  onUpdateSubjectTagIds={async (nextSubjectTagIds) => {
                    if (tagEditorOpen) {
                      setEditSubjectTagIds(nextSubjectTagIds);
                      return;
                    }
                    await saveQuestion(question.docId, { subjectTagIds: nextSubjectTagIds });
                  }}
                  disabled={busy}
                  variant="inline"
                  onOpenAssignment={() => {
                    setEditTagIds(question.tagIds);
                    setEditSubjectTagIds(question.subjectTagIds);
                    setAdvancedTagEditorId(question.docId);
                  }}
                />
                    <button
                      type="button"
                      className={styles.studioQuestionTagGhostButton}
                      disabled={busy}
                      onClick={() => {
                        setEditTagIds(question.tagIds);
                        setEditSubjectTagIds(question.subjectTagIds);
                        setAdvancedTagEditorId(question.docId);
                      }}
                      aria-label="Open Question Tags"
                      title="Question Tags"
                    >
                      <Tag size={16} aria-hidden="true" />
                    </button>
                </div>
                {tagEditorOpen ? (
                  <MacroTagSelector
                    selectedTags={selectedEditTags}
                    allTags={allTags}
                    onChange={setEditTagIds}
                    subjectTagIds={editSubjectTagIds}
                    onSubjectTagIdsChange={setEditSubjectTagIds}
                    onSaveAssignment={async (tagIds, subjectTagIds) => {
                      setEditTagIds(tagIds);
                      setEditSubjectTagIds(subjectTagIds);
                      await saveQuestion(question.docId, { tagIds, subjectTagIds });
                    }}
                    expanded
                    onExpandedChange={(open) => setAdvancedTagEditorId(open ? question.docId : null)}
                    visibleDimensions={[...DIMENSION_ORDER]}
                    pickerTitle="Question Tags"
                    searchPlaceholder="Search tags..."
                    unifiedAssignmentLayout
                    includeAllTags
                    collapsedSummary="none"
                  />
                ) : null}
              </div>
              <div
                className={styles.studioQuestionActions}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <>
                    <button
                      type="button"
                      className={styles.studioQuestionSmallButton}
                      disabled={busy || orderIndex <= 0}
                      onClick={() => void moveQuestion(question, 'up')}
                      aria-label={`Move ${orderLabel} up`}
                      title={`Move ${orderLabel} up`}
                    >
                      <ArrowUp size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.studioQuestionSmallButton}
                      disabled={busy || orderIndex < 0 || orderIndex >= orderSiblings.length - 1}
                      onClick={() => void moveQuestion(question, 'down')}
                      aria-label={`Move ${orderLabel} down`}
                      title={`Move ${orderLabel} down`}
                    >
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.studioQuestionSmallButton}
                      disabled={busy || !selectedCardId}
                      onClick={() => insertQuestionIntoCard(question)}
                      aria-label="Add prompt to open Card"
                      title={selectedCardId ? 'Copy prompt into the open Card' : 'Open a Card in Compose first'}
                    >
                      <ListPlus size={16} aria-hidden="true" />
                    </button>
                    {included ? (
                      <button
                        type="button"
                        className={styles.studioQuestionSmallButton}
                        disabled={busy}
                        onClick={() => void openQuestionCard(question)}
                        aria-label="Open linked Question Card in Compose"
                        title="Open the existing linked Question Card"
                      >
                        <FolderOpen size={16} aria-hidden="true" />
                      </button>
                    ) : !selectedCardId ? (
                      <button
                        type="button"
                        className={styles.studioQuestionSmallButton}
                        disabled={busy}
                        onClick={startDraftCard}
                        aria-label="Start a Card before adding prompts"
                        title="Start a Card, save it, then add writing prompts"
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={styles.studioQuestionDeleteButton}
                      disabled={busy}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteConfirmQuestion(question);
                      }}
                      aria-label="Delete question"
                      title="Delete question"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                    {included ? (
                      <button
                        type="button"
                        className={styles.studioQuestionSmallButton}
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation();
                          setUnlinkConfirmQuestion(question);
                        }}
                        aria-label="Unlink question from card"
                        title="Unlink question from card"
                      >
                        <Link2Off size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                  </>
              </div>
            </article>
          );
        })}
      </div>
      <EditModal
        isOpen={Boolean(unlinkConfirmQuestion)}
        onClose={() => setUnlinkConfirmQuestion(null)}
        title="Unlink question"
      >
        {unlinkConfirmQuestion ? (
          <div className={styles.studioQuestionConfirmBody}>
            <p className={styles.studioQuestionConfirmText}>
              Unlink this question? The linked Question card will be converted to a draft Story.
            </p>
            <p className={styles.studioQuestionConfirmPrompt}>{unlinkConfirmQuestion.prompt}</p>
            <div className={styles.studioQuestionConfirmActions}>
              <button
                type="button"
                className={styles.studioQuestionPrimaryButton}
                onClick={() => {
                  const question = unlinkConfirmQuestion;
                  setUnlinkConfirmQuestion(null);
                  if (question) {
                    void unlinkQuestionCard(question);
                  }
                }}
              >
                Unlink
              </button>
              <button
                type="button"
                className={styles.studioQuestionSmallButton}
                onClick={() => setUnlinkConfirmQuestion(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </EditModal>
      <EditModal
        isOpen={Boolean(deleteConfirmQuestion)}
        onClose={() => setDeleteConfirmQuestion(null)}
        title="Delete question"
      >
        {deleteConfirmQuestion ? (
          <div className={styles.studioQuestionConfirmBody}>
            <p className={styles.studioQuestionConfirmText}>
              Delete this question?
            </p>
            <p className={styles.studioQuestionConfirmPrompt}>{deleteConfirmQuestion.prompt}</p>
            <div className={styles.studioQuestionConfirmActions}>
              <button
                type="button"
                className={styles.studioQuestionDeleteButton}
                onClick={() => {
                  const question = deleteConfirmQuestion;
                  setDeleteConfirmQuestion(null);
                  if (question) {
                    void deleteQuestion(question);
                  }
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className={styles.studioQuestionSmallButton}
                onClick={() => setDeleteConfirmQuestion(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </EditModal>
    </aside>
  );
}
