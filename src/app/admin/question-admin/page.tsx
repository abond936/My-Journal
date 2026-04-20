'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Question } from '@/lib/types/question';
import styles from './question-admin.module.css';

type QuestionsResponse = { questions: Question[]; message?: string };
type ApiErrorResponse = {
  message?: string;
  code?: string;
  severity?: 'error' | 'warning';
  retryable?: boolean;
  error?: string;
};

async function fetchQuestions(): Promise<Question[]> {
  const res = await fetch('/api/admin/questions');
  const data = (await res.json()) as QuestionsResponse;
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load questions');
  }
  return data.questions;
}

function normalizeTags(raw: string): string[] {
  return Array.from(
    new Set(raw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))
  );
}

export default function QuestionAdminPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [usedFilter, setUsedFilter] = useState<'all' | 'used' | 'unused'>('all');

  const [newPrompt, setNewPrompt] = useState('');
  const [newTags, setNewTags] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editTags, setEditTags] = useState('');
  const [linkCardIdByQuestion, setLinkCardIdByQuestion] = useState<Record<string, string>>({});
  const [cardTypeByQuestion, setCardTypeByQuestion] = useState<Record<string, 'qa' | 'story'>>({});

  useLayoutEffect(() => {
    const measure = () => {
      const tabsEl = document.getElementById('admin-tabs-bar');
      if (!tabsEl) return;
      const tabsHeight = tabsEl.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--admin-tabs-height', `${tabsHeight}px`);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const load = useCallback(async () => {
    setListError(null);
    setLoading(true);
    try {
      setQuestions(await fetchQuestions());
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredQuestions = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    const tag = tagFilter.trim().toLowerCase();

    return questions.filter(q => {
      const textOk = !text || q.prompt_lowercase.includes(text);
      const tagOk = !tag || q.tags.some(t => t.includes(tag));
      const used = q.usedByCardIds.length > 0;
      const usageOk = usedFilter === 'all' || (usedFilter === 'used' ? used : !used);
      return textOk && tagOk && usageOk;
    });
  }, [questions, searchText, tagFilter, usedFilter]);

  const createQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateBusy(true);
    setCreateMessage(null);
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: newPrompt,
          tags: normalizeTags(newTags),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data as ApiErrorResponse;
        throw new Error(err.message || err.error || 'Failed to create question');
      }
      setCreateMessage('Question created');
      setNewPrompt('');
      setNewTags('');
      await load();
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : 'Failed to create question');
    } finally {
      setCreateBusy(false);
    }
  };

  const runRowAction = async (questionId: string, fn: () => Promise<void>) => {
    setRowError(null);
    setRowBusy(questionId);
    try {
      await fn();
      await load();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.stickyTop}>
        <h1 className={styles.pageHeading}>Question management</h1>
        <p className={styles.intro}>
          Maintain a reusable question bank and link each question to one or more cards. Use this to track what has
          already been used.
        </p>
      </div>

      {listError && <div className={styles.error}>{listError}</div>}

      <section className={styles.section}>
        <h2>Add question</h2>
        <form onSubmit={createQuestion}>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="q-prompt">Prompt</label>
              <textarea
                id="q-prompt"
                className={styles.textarea}
                value={newPrompt}
                onChange={e => setNewPrompt(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="q-tags">Tags (comma separated)</label>
              <input
                id="q-tags"
                className={styles.input}
                value={newTags}
                onChange={e => setNewTags(e.target.value)}
                placeholder="family, childhood"
              />
            </div>
            <button className={styles.button} type="submit" disabled={createBusy}>
              {createBusy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
        {createMessage && <div className={styles.success}>{createMessage}</div>}
      </section>

      <section className={styles.section}>
        <h2>Filter</h2>
        <div className={styles.formRow}>
          <div className={styles.inputGroup}>
            <label htmlFor="q-search">Search text</label>
            <input id="q-search" className={styles.input} value={searchText} onChange={e => setSearchText(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="q-tag-filter">Tag contains</label>
            <input id="q-tag-filter" className={styles.input} value={tagFilter} onChange={e => setTagFilter(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="q-used">Usage</label>
            <select id="q-used" className={styles.select} value={usedFilter} onChange={e => setUsedFilter(e.target.value as 'all' | 'used' | 'unused')}>
              <option value="all">All</option>
              <option value="used">Used</option>
              <option value="unused">Unused</option>
            </select>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Questions</h2>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            {rowError && <div className={styles.error}>{rowError}</div>}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Prompt</th>
                    <th>Tags</th>
                    <th>Used</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map(q => (
                    <tr key={q.docId}>
                      <td>
                        {editingId === q.docId ? (
                          <textarea className={styles.textarea} value={editPrompt} onChange={e => setEditPrompt(e.target.value)} />
                        ) : (
                          <>{q.prompt}</>
                        )}
                        <div className={styles.meta}>updated {new Date(q.updatedAt).toLocaleString()}</div>
                      </td>
                      <td>
                        {editingId === q.docId ? (
                          <input className={styles.input} value={editTags} onChange={e => setEditTags(e.target.value)} />
                        ) : (
                          <>{q.tags.join(', ') || '—'}</>
                        )}
                      </td>
                      <td>{q.usageCount}</td>
                      <td>
                        <div className={styles.actions}>
                          {editingId === q.docId ? (
                            <>
                              <button
                                className={styles.button}
                                type="button"
                                disabled={rowBusy === q.docId}
                                onClick={() =>
                                  runRowAction(q.docId, async () => {
                                    const res = await fetch(`/api/admin/questions/${q.docId}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ prompt: editPrompt, tags: normalizeTags(editTags) }),
                                    });
                                    const data = (await res.json()) as ApiErrorResponse;
                                    if (!res.ok) throw new Error(data.message || data.error || 'Update failed');
                                    setEditingId(null);
                                  })
                                }
                              >
                                Save
                              </button>
                              <button className={styles.buttonSecondary} type="button" onClick={() => setEditingId(null)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className={styles.buttonSecondary}
                              type="button"
                              onClick={() => {
                                setEditingId(q.docId);
                                setEditPrompt(q.prompt);
                                setEditTags(q.tags.join(', '));
                              }}
                            >
                              Edit
                            </button>
                          )}

                          <button
                            className={styles.buttonDanger}
                            type="button"
                            disabled={rowBusy === q.docId}
                            onClick={() =>
                              runRowAction(q.docId, async () => {
                                const res = await fetch(`/api/admin/questions/${q.docId}`, { method: 'DELETE' });
                                const data = (await res.json()) as ApiErrorResponse;
                                if (!res.ok) throw new Error(data.message || data.error || 'Delete failed');
                              })
                            }
                          >
                            Delete
                          </button>

                          <input
                            className={styles.input}
                            placeholder="Link cardId"
                            value={linkCardIdByQuestion[q.docId] || ''}
                            onChange={e => setLinkCardIdByQuestion(prev => ({ ...prev, [q.docId]: e.target.value }))}
                          />
                          <button
                            className={styles.buttonSecondary}
                            type="button"
                            disabled={rowBusy === q.docId}
                            onClick={() =>
                              runRowAction(q.docId, async () => {
                                const cardId = (linkCardIdByQuestion[q.docId] || '').trim();
                                if (!cardId) throw new Error('Card ID is required');
                                const res = await fetch(`/api/admin/questions/${q.docId}`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ cardId }),
                                });
                                const data = (await res.json()) as ApiErrorResponse;
                                if (!res.ok) throw new Error(data.message || data.error || 'Link failed');
                              })
                            }
                          >
                            Link card
                          </button>
                          <button
                            className={styles.buttonSecondary}
                            type="button"
                            disabled={rowBusy === q.docId}
                            onClick={() =>
                              runRowAction(q.docId, async () => {
                                const cardId = (linkCardIdByQuestion[q.docId] || '').trim();
                                if (!cardId) throw new Error('Card ID is required');
                                const res = await fetch(`/api/admin/questions/${q.docId}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ cardId }),
                                });
                                const data = (await res.json()) as ApiErrorResponse;
                                if (!res.ok) throw new Error(data.message || data.error || 'Unlink failed');
                              })
                            }
                          >
                            Unlink card
                          </button>

                          <select
                            className={styles.select}
                            value={cardTypeByQuestion[q.docId] || 'qa'}
                            onChange={e =>
                              setCardTypeByQuestion(prev => ({ ...prev, [q.docId]: e.target.value as 'qa' | 'story' }))
                            }
                          >
                            <option value="qa">QA card</option>
                            <option value="story">Story card</option>
                          </select>
                          <button
                            className={styles.button}
                            type="button"
                            disabled={rowBusy === q.docId}
                            onClick={() =>
                              runRowAction(q.docId, async () => {
                                const res = await fetch(`/api/admin/questions/${q.docId}/create-card`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ type: cardTypeByQuestion[q.docId] || 'qa' }),
                                });
                                const data = (await res.json()) as ApiErrorResponse & { card?: { docId?: string } };
                                if (!res.ok) throw new Error(data.message || data.error || 'Create card failed');
                                const cardId = data.card?.docId;
                                if (cardId) {
                                  setCreateMessage(`Created draft card ${cardId}. Open edit page to complete it.`);
                                }
                              })
                            }
                          >
                            Create card
                          </button>

                          {q.usedByCardIds.length > 0 && (
                            <div className={styles.meta}>
                              Linked: {q.usedByCardIds.map(id => <Link key={id} href={`/admin/card-admin/${id}/edit`}>{id}</Link>)}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

