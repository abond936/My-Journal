'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
import { useTag, type TagWithChildren } from '@/components/providers/TagProvider';
import type { Question } from '@/lib/types/question';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
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
  const { setSelectedCardId, refreshCollectionsCardList } = useStudioShell();
  const { tags: allTags, dimensionTree } = useTag();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includedFilter, setIncludedFilter] = useState<IncludedFilter>('all');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState('');
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [tagEditingId, setTagEditingId] = useState<string | null>(null);

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

  const selectedNewTags = useMemo(
    () => allTags.filter(tag => tag.docId && newTagIds.includes(tag.docId)),
    [allTags, newTagIds]
  );

  const selectedEditTags = useMemo(
    () => allTags.filter(tag => tag.docId && editTagIds.includes(tag.docId)),
    [allTags, editTagIds]
  );

  const tagById = useMemo(
    () => new Map(allTags.filter(tag => tag.docId).map(tag => [tag.docId!, tag])),
    [allTags]
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

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter(question => {
      const included = isIncluded(question);
      if (includedFilter === 'included' && !included) return false;
      if (includedFilter === 'notIncluded' && included) return false;
      if (q && !question.prompt_lowercase.includes(q)) return false;
      if (!tagMatchesSelection(question, selectedTagId, selectedDescendantIds)) return false;
      return true;
    });
  }, [includedFilter, questions, search, selectedDescendantIds, selectedTagId]);

  const saveQuestion = useCallback(async (questionId: string, body: { prompt?: string; tagIds?: string[] }) => {
    setBusyId(questionId);
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
      setTagEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update question');
    } finally {
      setBusyId(null);
    }
  }, []);

  const removeQuestionTag = useCallback(async (question: Question, tagId: string) => {
    const nextTagIds = question.tagIds.filter(id => id !== tagId);
    await saveQuestion(question.docId, { tagIds: nextTagIds });
  }, [saveQuestion]);

  const openQuestionCard = useCallback(async (question: Question) => {
    setBusyId(question.docId);
    setError(null);
    setInfo(null);
    try {
      const existingCardId = question.usedByCardIds[0];
      if (existingCardId) {
        setSelectedCardId(existingCardId);
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
      throwIfJsonApiFailed(res, data, 'Failed to create Q&A card');
      if (data.question) {
        setQuestions(prev => prev.map(q => q.docId === question.docId ? data.question! : q));
      }
      const cardId = data.card?.docId;
      if (cardId) {
        refreshCollectionsCardList();
        setSelectedCardId(cardId);
        router.replace(`/admin/studio?card=${encodeURIComponent(cardId)}`);
        setInfo('Created draft Q&A card.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open question');
    } finally {
      setBusyId(null);
    }
  }, [refreshCollectionsCardList, router, setSelectedCardId]);

  const unlinkQuestionCard = useCallback(async (question: Question) => {
    const cardId = question.usedByCardIds[0];
    if (!cardId) return;
    const ok = window.confirm('Unlink this question? The linked Q&A card will be converted to a draft Story.');
    if (!ok) return;
    setBusyId(question.docId);
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
    }
  }, [refreshCollectionsCardList]);

  const createQuestion = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = newPrompt.trim();
    if (!prompt) return;
    setBusyId('new');
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
      setInfo('Question added.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create question');
    } finally {
      setBusyId(null);
    }
  }, [newPrompt, newTagIds]);

  return (
    <aside className={styles.studioQuestionsPane} aria-label="Questions">
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
          <MacroTagSelector
            selectedTags={selectedNewTags}
            allTags={allTags}
            onChange={setNewTagIds}
            collapsedSummary="sparseTrees"
          />
          <button
            type="submit"
            className={styles.studioQuestionPrimaryButton}
            disabled={busyId === 'new' || !newPrompt.trim()}
          >
            Add question
          </button>
        </form>
      ) : null}

      <div className={styles.studioQuestionFilters}>
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

      <div className={styles.studioQuestionsList}>
        {loading ? <p className={styles.metaMuted}>Loading questions...</p> : null}
        {!loading && filteredQuestions.length === 0 ? (
          <p className={styles.metaMuted}>No questions match this view.</p>
        ) : null}
        {filteredQuestions.map(question => {
          const included = isIncluded(question);
          const busy = busyId === question.docId;
          const editing = editingId === question.docId;
          const tagEditing = tagEditingId === question.docId;
          const questionTags = question.tagIds
            .map(tagId => tagById.get(tagId))
            .filter(Boolean);
          return (
            <article key={question.docId} className={styles.studioQuestionRow}>
              {editing ? (
                <>
                  <textarea
                    className={styles.studioQuestionTextarea}
                    value={editPrompt}
                    onChange={e => setEditPrompt(e.target.value)}
                    rows={3}
                  />
                  <MacroTagSelector
                    selectedTags={selectedEditTags}
                    allTags={allTags}
                    onChange={setEditTagIds}
                    collapsedSummary="sparseTrees"
                  />
                </>
              ) : (
                <div className={styles.studioQuestionPrompt}>{question.prompt}</div>
              )}
              {tagEditing ? (
                <MacroTagSelector
                  selectedTags={selectedEditTags}
                  allTags={allTags}
                  onChange={setEditTagIds}
                  onSaveSelection={(nextIds) => saveQuestion(question.docId, { tagIds: nextIds })}
                  onRequestClose={() => setTagEditingId(null)}
                  startExpanded
                  collapsedSummary="none"
                />
              ) : (
                <div className={styles.studioQuestionTagChips} aria-label="Question tags">
                  {questionTags.length === 0 ? (
                    <span className={styles.studioQuestionNoTags}>Untagged</span>
                  ) : null}
                  {questionTags.map(tag => (
                    <span key={tag!.docId} className={styles.studioQuestionTagChip}>
                      <span className={styles.studioQuestionTagName}>{tag!.name}</span>
                      <button
                        type="button"
                        className={styles.studioQuestionTagRemove}
                        disabled={busy}
                        onClick={() => void removeQuestionTag(question, tag!.docId!)}
                        aria-label={`Remove ${tag!.name}`}
                        title={`Remove ${tag!.name}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className={styles.studioQuestionEditTagsChip}
                    disabled={busy}
                    onClick={() => {
                      setTagEditingId(question.docId);
                      setEditingId(null);
                      setEditTagIds(question.tagIds);
                    }}
                  >
                    Edit tags...
                  </button>
                </div>
              )}
              <div className={styles.studioQuestionMeta}>
                <span>{included ? 'Included' : 'Not included'}</span>
                <span>{question.usedByCardIds.length} card{question.usedByCardIds.length === 1 ? '' : 's'}</span>
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
                        setTagEditingId(null);
                      }}
                    >
                      Cancel
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
                        setTagEditingId(null);
                        setEditPrompt(question.prompt);
                        setEditTagIds(question.tagIds);
                      }}
                    >
                      Edit
                    </button>
                    {included ? (
                      <button
                        type="button"
                        className={styles.studioQuestionSmallButton}
                        disabled={busy}
                        onClick={() => void unlinkQuestionCard(question)}
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
    </aside>
  );
}
