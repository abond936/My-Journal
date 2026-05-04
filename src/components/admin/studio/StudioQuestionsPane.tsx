'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import EditModal from '@/components/admin/card-admin/EditModal';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import DimensionalTagVerticalChips from '@/components/admin/common/DimensionalTagVerticalChips';
import PanelActivityOverlay from '@/components/admin/studio/PanelActivityOverlay';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
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

function tagMatchesSelection(question: Question, tagId: string | null, descendantIds: Set<string>): boolean {
  if (!tagId) return true;
  if (tagId === UNTAGGED_FILTER_ID) return question.tagIds.length === 0;
  return question.tagIds.some(id => id === tagId || descendantIds.has(id));
}

function countQuestionsForTag(tag: TagWithChildren, questions: Question[]): number {
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

function QuestionTagTree({
  nodes,
  questions,
  selectedTagId,
  onSelect,
  depth = 0,
}: {
  nodes: TagWithChildren[];
  questions: Question[];
  selectedTagId: string | null;
  onSelect: (tagId: string) => void;
  depth?: number;
}) {
  return (
    <ul className={depth === 0 ? styles.studioQuestionTreeRoot : styles.studioQuestionTreeNested}>
      {nodes.map(node => {
        if (!node.docId) return null;
        const count = countQuestionsForTag(node, questions);
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
  const {
    selectCard,
    getKnownCardPreview,
    refreshCollectionsCardList,
    selectedLoadState,
  } = useStudioShell();
  const { tags: allTags, dimensionTree } = useTag();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includedFilter, setIncludedFilter] = useState<IncludedFilter>('all');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [treeOpen, setTreeOpen] = useState(true);
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
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/questions', { cache: 'no-store', credentials: 'same-origin' });
      const data = (await res.json().catch(() => ({}))) as QuestionsResponse;
      throwIfJsonApiFailed(res, data, 'Failed to load questions');
      setQuestions(data.questions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (!info) return;
    const timeoutId = window.setTimeout(() => {
      setInfo(null);
    }, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [info]);

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
      if (!tagMatchesSelection(question, selectedTagId, selectedDescendantIds)) return false;
      for (const ids of Object.values(groupedTagFilters)) {
        if (ids?.length && !ids.some((id) => question.tagIds.includes(id))) return false;
      }
      return true;
    });
  }, [groupedTagFilters, includedFilter, questions, search, selectedDescendantIds, selectedTagId]);

  const saveQuestion = useCallback(async (questionId: string, body: { prompt?: string; tagIds?: string[] }) => {
    setBusyId(questionId);
    setBusyLabel('Saving question...');
    setError(null);
    setInfo(null);
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
      setError(e instanceof Error ? e.message : 'Failed to update question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, []);

  const openQuestionCard = useCallback(async (question: Question) => {
    setBusyId(question.docId);
    setBusyLabel(question.usedByCardIds[0] ? 'Opening Compose...' : 'Creating Question card...');
    setPendingQuestionId(question.docId);
    setError(null);
    setInfo(null);
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
        setInfo('Created draft Question card.');
      }
    } catch (e) {
      setPendingQuestionId(null);
      setError(e instanceof Error ? e.message : 'Failed to open question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [getKnownCardPreview, refreshCollectionsCardList, router, selectCard]);

  const unlinkQuestionCard = useCallback(async (question: Question) => {
    const cardId = question.usedByCardIds[0];
    if (!cardId) return;
    setBusyId(question.docId);
    setBusyLabel('Unlinking question...');
    setError(null);
    setInfo(null);
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
      refreshCollectionsCardList();
      setInfo('Unlinked question and converted card to draft Story.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unlink question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [refreshCollectionsCardList]);

  const createQuestion = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = newPrompt.trim();
    if (!prompt) return;
    setBusyId('new');
    setBusyLabel('Adding question...');
    setError(null);
    setInfo(null);
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
      setInfo('Question added.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [newPrompt, newTagIds]);

  const deleteQuestion = useCallback(async (question: Question) => {
    setBusyId(question.docId);
    setBusyLabel('Deleting question...');
    setError(null);
    setInfo(null);
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
      setInfo('Question deleted.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete question');
    } finally {
      setBusyId(null);
      setBusyLabel(null);
    }
  }, [editingId]);

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
          className={styles.studioQuestionSmallButton}
          onClick={() => setCreateOpen(open => !open)}
        >
          Add
        </button>
      </div>

      {error ? <p className={styles.metaError} role="alert">{error}</p> : null}
      {info ? <p className={styles.metaInfo} role="status">{info}</p> : null}

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
                className={styles.studioQuestionSmallButton}
                onClick={() => setCreateAdvancedTagEditorOpen(open => !open)}
              >
                Edit
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
            >
              Save
            </button>
            <button
              type="button"
              className={styles.studioQuestionSmallButton}
              disabled={busyId === 'new'}
              onClick={cancelCreate}
            >
              Cancel
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
            placeholder="Search questions"
          />
          <select
            className={styles.studioQuestionSelect}
            value={includedFilter}
            onChange={e => setIncludedFilter(e.target.value as IncludedFilter)}
          >
            <option value="all">All questions</option>
            <option value="included">Included</option>
            <option value="notIncluded">Not included</option>
          </select>
        </div>
        <div className={styles.studioQuestionFilterActions}>
          <button type="button" className={styles.studioQuestionSmallButton} onClick={clearFilters}>
            Clear
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
              className={styles.studioQuestionSmallButton}
              onClick={() => setTagFilterModalOpen(true)}
            >
              Edit
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
              <div className={styles.studioQuestionTagEditor}>
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
                />
                {editing ? (
                  <button
                    type="button"
                    className={styles.studioQuestionSmallButton}
                    disabled={busy}
                    onClick={() => setAdvancedTagEditorId(current => current === question.docId ? null : question.docId)}
                  >
                    {advancedTagEditorId === question.docId ? 'Close tag editor' : 'Edit'}
                  </button>
                ) : null}
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
              <div className={styles.studioQuestionActions}>
                {editing ? (
                  <>
                    <button
                      type="button"
                      className={styles.studioQuestionPrimaryButton}
                      disabled={busy || !editPrompt.trim()}
                      onClick={() => void saveQuestion(question.docId, { prompt: editPrompt, tagIds: editTagIds })}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className={styles.studioQuestionSmallButton}
                      disabled={busy}
                      onClick={() => {
                        setEditingId(null);
                        setAdvancedTagEditorId(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.studioQuestionDeleteButton}
                      disabled={busy}
                      onClick={() => setDeleteConfirmQuestion(question)}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.studioQuestionPrimaryButton}
                      disabled={busy}
                      onClick={() => void openQuestionCard(question)}
                    >
                      {included ? 'Open' : 'Answer'}
                    </button>
                    <button
                      type="button"
                      className={styles.studioQuestionSmallButton}
                      disabled={busy}
                      onClick={() => {
                        setEditingId(question.docId);
                        setAdvancedTagEditorId(null);
                        setEditPrompt(question.prompt);
                        setEditTagIds(question.tagIds);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.studioQuestionDeleteButton}
                      disabled={busy}
                      onClick={() => setDeleteConfirmQuestion(question)}
                    >
                      Delete
                    </button>
                    {included ? (
                      <button
                        type="button"
                        className={styles.studioQuestionSmallButton}
                        disabled={busy}
                        onClick={() => setUnlinkConfirmQuestion(question)}
                      >
                        Unlink
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
