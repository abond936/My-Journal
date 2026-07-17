'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import type { JournalUserPublic } from '@/lib/auth/journalUsersFirestore';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import styles from './journal-users.module.css';

type ListResponse = { users: JournalUserPublic[] };

async function fetchUsers(): Promise<JournalUserPublic[]> {
  const res = await fetch('/api/admin/journal-users');
  const data = (await res.json()) as ListResponse & { message?: string; error?: string; code?: string };
  throwIfJsonApiFailed(res, data, 'Users could not be loaded. Try again.');
  return data.users;
}

export default function JournalUsersAdminPage() {
  const feedback = useAppFeedback();
  const [users, setUsers] = useState<JournalUserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [passwordById, setPasswordById] = useState<Record<string, string>>({});
  const [passwordErrorById, setPasswordErrorById] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const stickyTopRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const tabsEl = document.getElementById('admin-tabs-bar');
      const stickyEl = stickyTopRef.current;
      if (!tabsEl || !stickyEl) return;
      const tabsHeight = tabsEl.getBoundingClientRect().height;
      const stickyHeight = stickyEl.getBoundingClientRect().height;

      document.documentElement.style.setProperty('--admin-tabs-height', `${tabsHeight}px`);
      document.documentElement.style.setProperty('--admin-table-header-top', `${tabsHeight + stickyHeight}px`);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const load = useCallback(async () => {
    setListError(null);
    setLoading(true);
    try {
      setUsers(await fetchUsers());
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateBusy(true);
    try {
      const res = await fetch('/api/admin/journal-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          displayName: newDisplayName.trim() || undefined,
        }),
      });
      const data = await res.json();
      throwIfJsonApiFailed(res, data, 'This user could not be added. Check the details and try again.');
      feedback.showSuccess('User added. Share the site link, username, and temporary password.');
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      await load();
    } catch (err) {
      feedback.showError(err instanceof Error ? err.message : 'This user could not be added. Try again.', 'User not added');
    } finally {
      setCreateBusy(false);
    }
  };

  const patchUser = async (id: string, body: Record<string, unknown>): Promise<boolean> => {
    setRowBusy(id);
    try {
      const res = await fetch(`/api/admin/journal-users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      throwIfJsonApiFailed(res, data, 'This user could not be updated. Try again.');
      await load();
      return true;
    } catch (err) {
      feedback.showError(err instanceof Error ? err.message : 'This user could not be updated. Try again.', 'User not updated');
      return false;
    } finally {
      setRowBusy(null);
    }
  };

  const handleSetPassword = async (id: string) => {
    const pwd = passwordById[id]?.trim();
    if (!pwd || pwd.length < 8) {
      setPasswordErrorById(prev => ({ ...prev, [id]: 'Enter at least 8 characters.' }));
      return;
    }
    const updated = await patchUser(id, { password: pwd });
    if (!updated) return;
    setPasswordById(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPasswordErrorById(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.stickyTop} ref={stickyTopRef}>
        <h1 className={styles.pageHeading}>User Management</h1>
      </div>

      {listError && <div className={styles.error}>{listError}</div>}

      <section className={styles.section}>
        <h2>Add User</h2>
        <form onSubmit={handleCreate}>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="ju-username">Username</label>
              <input
                id="ju-username"
                className={styles.input}
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="ju-password">Temporary password</label>
              <input
                id="ju-password"
                type="password"
                className={styles.input}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="ju-display">Display name (optional)</label>
              <input
                id="ju-display"
                className={styles.input}
                value={newDisplayName}
                onChange={e => setNewDisplayName(e.target.value)}
              />
            </div>
            <button type="submit" className={styles.button} disabled={createBusy}>
              {createBusy ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </section>

      <section className={`${styles.section} ${styles.tableSection}`}>
        <h2>All users</h2>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.entriesTable}>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Display name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.docId} className={u.disabled ? styles.rowDisabled : undefined}>
                      <td>{u.username}</td>
                      <td>{u.displayName}</td>
                      <td>{u.role}</td>
                      <td>{u.disabled ? 'Disabled' : 'Active'}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            disabled={rowBusy === u.docId}
                            onClick={() => patchUser(u.docId, { disabled: !u.disabled })}
                          >
                            {u.disabled ? 'Enable' : 'Disable'}
                          </button>
                          <input
                            type="password"
                            className={styles.input}
                            placeholder="New password (8+)"
                            value={passwordById[u.docId] ?? ''}
                            onChange={e => {
                              setPasswordById(prev => ({ ...prev, [u.docId]: e.target.value }));
                              if (passwordErrorById[u.docId]) {
                                setPasswordErrorById(prev => {
                                  const next = { ...prev };
                                  delete next[u.docId];
                                  return next;
                                });
                              }
                            }}
                            autoComplete="new-password"
                            aria-label={`New password for ${u.username}`}
                            aria-invalid={Boolean(passwordErrorById[u.docId])}
                            aria-describedby={passwordErrorById[u.docId] ? `password-error-${u.docId}` : undefined}
                          />
                          <span id={`password-error-${u.docId}`} className={styles.inlineError} role="alert">
                            {passwordErrorById[u.docId] ?? ''}
                          </span>
                          <button
                            type="button"
                            className={styles.button}
                            disabled={rowBusy === u.docId}
                            onClick={() => handleSetPassword(u.docId)}
                          >
                            Set password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && !loading && (
              <p className={styles.intro}>No Firestore users yet. Use the seed script or legacy env login.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
