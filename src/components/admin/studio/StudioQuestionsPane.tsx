'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterX, FolderOpen, Link2Off, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import EditModal from '@/components/admin/card-admin/EditModal';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import DimensionalTagVerticalChips from '@/components/admin/common/DimensionalTagVerticalChips';
import PanelActivityOverlay from '@/components/admin/studio/PanelActivityOverlay';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
import type { StudioSelectedDetail, StudioSelectedPreview } from '@/components/admin/studio/studioCardTypes';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { useTag, type TagWithChildren } from '@/components/providers/TagProvider';
import type { Question } from '@/lib/types/question';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import { groupSelectedTagIdsByDimension } from '@/lib/utils/tagUtils';
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
    getKnownCardPreview,
    selectedCardId,
    selectedPreview,
    selectedDetail,
    setSelectedPreview,
    setSelectedDetail,
    upsertCollectionsCardList,
    refreshCollectionsCardList,
    selectedLoadState,
  } = useStudioShell();
  const { tags: allTags, dimensionTree } = useTag();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includedFilter, setIncludedFilter] = useState<IncludedFilter>('all');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [includeChildren, setIncludeChildren] = useState(true);
  const [treeOpen, setTreeOpen] = useState(false);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [tagFilterModalOpen, setTagFilterModalOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createAdvancedTagEditorOpen, setCreateAdvancedTagEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [advancedTagEditorId, setAdvancedTagEditorId] = useState<string | null>(null);
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

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/questions', { cache: 'no-store', credentials: 'same-origin' });
      const data = (await res.json().catch(() => ({}))) as QuestionsResponse;
      throwIfJsonApiFailed(res, data, 'Failed to load questions');
      setQuestions(data.questions || []);
    } catch (e) {
      feedback.showError(e instanceof Error ? e.message : 'Failed to load questions', 'Could not load questions');
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (selectedLoadState === 'loading') return;
    setPendingQuestionId(null);
  }, [selectedLoadState]);

  const groupedTagFilters = useMemo(
    () => groupSelectedTagIdsByDimension(filterTagIds, allTags),
    [allTags, filterTagIds]
  );

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter(question => {
      const included = isIncluded(question);
      if (includedFilter === 'included' && !included) return false;
      if (includedFilter === 'notIncluded' && included) return false;
      if (q && !question.prompt_lowercase.includes(q)) return false;
      if (!tagMatchesSelection(question, selectedTagId, selectedDescendantIds, includeChildren)) return false;
      for (const ids of Object.values(groupedTagFilters)) {
        if (ids?.length && !ids.some((id) => question.tagIds.includes(id))) return false;
      }
      return true;
    });
  }, [groupedTagFilters, includeChildren, includedFilter, questions, search, selectedDescendantIds, selectedTagId]);

  const saveQuestion = useCallback(async (questionId: string, body: { prompt?: string; tagIds?: string[] }) => {
    setBusyId(questionId);
    setBusyLabel('Saving question...');
    try {
      const res = await fetch(`/api/admin/questions/${encodeURIComponent(questionId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as QuestionResponse;
      throwIfJsonApiFailed(res, data, 'Failed to update question');
      if (data.question) {
        setQuestions(prev => prev.map(q => q.docId === questionId ? data.question! : q));
      }
      setEditingId(null);
      setAdvancedTagEditorId(null);
    } catch (e) {
      feedback.showError(e instanceof Error ? e.message : 'Failed to update question', 'Could not save question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [feedback]);

  const openQuestionCard = useCallback(async (question: Question) => {
    setBusyId(question.docId);
    setBusyLabel(question.usedByCardIds[0] ? 'Opening Compose...' : 'Creating Question card...');
    setPendingQuestionId(question.docId);
    try {
      const existingCardId = question.usedByCardIds[0];
      if (existingCardId) {
        const previewCard = getKnownCardPreview(existingCardId);
        selectCard(existingCardId, previewCard);
        router.replace(`/admin/studio?card=${encodeURIComponent(existingCardId)}`);
        return;
      }

      const res = await fetch(`/api/admin/questions/${encodeURIComponent(question.docId)}/create-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as QuestionResponse;
      throwIfJsonApiFailed(res, data, 'Failed to create Question card');
      if (data.question) {
        setQuestions(prev => prev.map(q => q.docId === question.docId ? data.question! : q));
      }
      const cardId = data.card?.docId;
      if (cardId) {
        refreshCollectionsCardList();
        selectCard(cardId, data.card ?? null);
        router.replace(`/admin/studio?card=${encodeURIComponent(cardId)}`);
        feedback.showSuccess('Created draft Question card.', 'Question ready');
      }
    } catch (e) {
      setPendingQuestionId(null);
      feedback.showError(e instanceof Error ? e.message : 'Failed to open question', 'Could not open question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [feedback, getKnownCardPreview, refreshCollectionsCardList, router, selectCard]);

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
      throwIfJsonApiFailed(res, data, 'Failed to unlink question');
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
      refreshCollectionsCardList();
      feedback.showSuccess('Unlinked question and converted card to draft Story.', 'Question updated');
    } catch (e) {
      feedback.showError(e instanceof Error ? e.message : 'Failed to unlink question', 'Could not unlink question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [
    feedback,
    getKnownCardPreview,
    refreshCollectionsCardList,
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
        body: JSON.stringify({ prompt, tagIds: newTagIds }),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as QuestionResponse;
      throwIfJsonApiFailed(res, data, 'Failed to create question');
      if (data.question) {
        setQuestions(prev => [data.question!, ...prev]);
      }
      setNewPrompt('');
      setNewTagIds([]);
      setCreateOpen(false);
      setCreateAdvancedTagEditorOpen(false);
      feedback.showSuccess('Question added.', 'Saved');
    } catch (e) {
      feedback.showError(e instanceof Error ? e.message : 'Failed to create question', 'Could not add question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [feedback, newPrompt, newTagIds]);

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
      throwIfJsonApiFailed(res, data, 'Failed to delete question');
      setQuestions(prev => prev.filter(q => q.docId !== question.docId));
      if (editingId === question.docId) {
        setEditingId(null);
        setAdvancedTagEditorId(null);
      }
      feedback.showSuccess('Question deleted.', 'Deleted');
    } catch (e) {
      feedback.showError(e instanceof Error ? e.message : 'Failed to delete question', 'Could not delete question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [editingId, feedback]);

  const cancelCreate = useCallback(() => {
    setCreateOpen(false);
    setCreateAdvancedTagEditorOpen(false);
    setNewPrompt('');
    setNewTagIds([]);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setIncludedFilter('all');
    setSelectedTagId(null);
    setFilterTagIds([]);
    setTagFilterModalOpen(false);
  }, []);

  return (
    <aside className={styles.studioQuestionsPane} aria-label="Questions">
      <PanelActivityOverlay
        active={Boolean(busyId)}
        blocking
        title={busyLabel ?? 'Updating questions...'}
        message="Working in the Questions panel."
      />
      <div className={styles.studioQuestionsHeader}>
        <h2 className={styles.studioComposeTitle}>Questions</h2>
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
          <CardDimensionalTagCommandBar
            card={{ tags: newTagIds }}
            allTags={allTags}
            onUpdateTags={setNewTagIds}
            variant="compact"
            searchPlaceholder="Edit tags..."
            trailingSlot={
              <button
                type="button"
                className={styles.studioQuestionTagActionButton}
                onClick={() => setCreateAdvancedTagEditorOpen(open => !open)}
                aria-label={createAdvancedTagEditorOpen ? 'Close tag editor' : 'Edit tags'}
                title={createAdvancedTagEditorOpen ? 'Close tag editor' : 'Edit tags'}
              >
                {createAdvancedTagEditorOpen ? <X size={16} aria-hidden="true" /> : <Pencil size={16} aria-hidden="true" />}
              </button>
            }
          />
          {createAdvancedTagEditorOpen ? (
            <MacroTagSelector
              selectedTags={allTags.filter(tag => tag.docId && newTagIds.includes(tag.docId))}
              allTags={allTags}
              onChange={setNewTagIds}
              expanded
              onExpandedChange={setCreateAdvancedTagEditorOpen}
              collapsedSummary="none"
            />
          ) : null}
          <div className={styles.studioQuestionActions}>
            <button
              type="submit"
              className={styles.studioQuestionPrimaryButton}
              disabled={busyId === 'new' || !newPrompt.trim()}
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
          <input
            className={styles.studioQuestionInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
          />
          <select
            className={styles.studioQuestionSelect}
            value={includedFilter}
            onChange={e => setIncludedFilter(e.target.value as IncludedFilter)}
          >
            <option value="all">All questions</option>
            <option value="included">Assigned</option>
            <option value="notIncluded">Unassigned</option>
          </select>
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
          searchPlaceholder="Edit tags..."
          trailingSlot={
            <button
              type="button"
              className={styles.studioQuestionTagActionButton}
              onClick={() => setTagFilterModalOpen(true)}
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
          }
        />
        {tagFilterModalOpen ? (
          <MacroTagSelector
            selectedTags={allTags.filter(tag => tag.docId && filterTagIds.includes(tag.docId))}
            allTags={allTags}
            onChange={setFilterTagIds}
            expanded
            onExpandedChange={setTagFilterModalOpen}
            collapsedSummary="none"
          />
        ) : null}
      </div>

      <div className={styles.studioQuestionTreeSection}>
        <button
          type="button"
          className={styles.studioQuestionSectionToggle}
          aria-expanded={treeOpen}
          onClick={() => setTreeOpen(open => !open)}
        >
          <span>All questions</span>
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
              <span>All questions</span>
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
        {loading ? <p className={styles.metaMuted}>Loading questions...</p> : null}
        {!loading && filteredQuestions.length === 0 ? (
          <p className={styles.metaMuted}>No questions match this view.</p>
        ) : null}
        {filteredQuestions.map(question => {
          const included = isIncluded(question);
          const busy = busyId === question.docId;
          const editing = editingId === question.docId;
          const pendingOpen = pendingQuestionId === question.docId;
          const activeTagIds = editing ? editTagIds : question.tagIds;
          return (
            <article
              key={question.docId}
              className={`${styles.studioQuestionRow} ${pendingOpen ? styles.studioQuestionRowPending : ''}`}
            >
              {pendingOpen ? (
                <div className={styles.studioQuestionRowPendingOverlay} aria-hidden="true">
                  <div className={styles.studioQuestionRowPendingSpinner} />
                  <span className={styles.studioQuestionRowPendingLabel}>Opening Compose...</span>
                </div>
              ) : null}
              {editing ? (
                <>
                  <textarea
                    className={styles.studioQuestionTextarea}
                    value={editPrompt}
                    onChange={e => setEditPrompt(e.target.value)}
                    rows={3}
                  />
                </>
              ) : (
                <div className={styles.studioQuestionPrompt}>{question.prompt}</div>
              )}
              <div
                className={styles.studioQuestionTagEditor}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <DimensionalTagVerticalChips
                  tagIds={activeTagIds}
                  allTags={allTags}
                  onUpdateTags={(nextTagIds) => {
                    if (editing) {
                      setEditTagIds(nextTagIds);
                      return;
                    }
                    return saveQuestion(question.docId, { tagIds: nextTagIds });
                  }}
                  disabled={busy}
                  variant="inline"
                />
                <CardDimensionalTagCommandBar
                  card={{ tags: activeTagIds }}
                  allTags={allTags}
                  onUpdateTags={(nextTagIds) => {
                    if (editing) {
                      setEditTagIds(nextTagIds);
                      return;
                    }
                    return saveQuestion(question.docId, { tagIds: nextTagIds });
                  }}
                  disabled={busy}
                  variant="searchOnly"
                  searchPlaceholder="Edit tags..."
                  trailingSlot={
                    <button
                      type="button"
                      className={styles.studioQuestionTagGhostButton}
                      disabled={busy}
                      onClick={() => {
                        if (editing) {
                          setAdvancedTagEditorId(current => current === question.docId ? null : question.docId);
                          return;
                        }
                        setEditingId(question.docId);
                        setEditPrompt(question.prompt);
                        setEditTagIds(question.tagIds);
                        setAdvancedTagEditorId(question.docId);
                      }}
                      aria-label={editing && advancedTagEditorId === question.docId ? 'Close tag editor' : 'Edit tags'}
                      title={editing && advancedTagEditorId === question.docId ? 'Close tag editor' : 'Edit tags'}
                    >
                      {editing && advancedTagEditorId === question.docId ? <X size={16} aria-hidden="true" /> : <Pencil size={16} aria-hidden="true" />}
                    </button>
                  }
                />
                {editing && advancedTagEditorId === question.docId ? (
                  <MacroTagSelector
                    selectedTags={selectedEditTags}
                    allTags={allTags}
                    onChange={setEditTagIds}
                    expanded
                    onExpandedChange={(open) => setAdvancedTagEditorId(open ? question.docId : null)}
                    collapsedSummary="none"
                  />
                ) : null}
              </div>
              <div
                className={styles.studioQuestionActions}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {editing ? (
                  <>
                    <button
                      type="button"
                      className={styles.studioQuestionPrimaryButton}
                      disabled={busy || !editPrompt.trim()}
                      onClick={() => void saveQuestion(question.docId, { prompt: editPrompt, tagIds: editTagIds })}
                      aria-label="Save question"
                      title="Save question"
                    >
                      <Save size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.studioQuestionSmallButton}
                      disabled={busy}
                      onClick={() => {
                        setEditingId(null);
                        setAdvancedTagEditorId(null);
                      }}
                      aria-label="Cancel editing"
                      title="Cancel editing"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.studioQuestionDeleteButton}
                      disabled={busy}
                      onClick={() => setDeleteConfirmQuestion(question)}
                      aria-label="Delete question"
                      title="Delete question"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.studioQuestionSmallButton}
                      disabled={busy}
                      onClick={() => void openQuestionCard(question)}
                      aria-label={included ? 'Open question card in Compose' : 'Create answer card in Compose'}
                      title={included ? 'Open question card in Compose' : 'Create answer card in Compose'}
                    >
                      <FolderOpen size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.studioQuestionPrimaryButton}
                      disabled={busy}
                      onClick={() => {
                        setEditingId(question.docId);
                        setAdvancedTagEditorId(null);
                        setEditPrompt(question.prompt);
                        setEditTagIds(question.tagIds);
                      }}
                      aria-label="Edit question"
                      title="Edit question"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
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
                )}
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
