'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { JournalUserPublic } from '@/lib/auth/journalUsersFirestore';
import styles from './journal-users.module.css';

type ListResponse = { users: JournalUserPublic[] };

async function fetchUsers(): Promise<JournalUserPublic[]> {
  const res = await fetch('/api/admin/journal-users');
  const data = (await res.json()) as ListResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load users');
  }
  return data.users;
}

export default function JournalUsersAdminPage() {
  const [users, setUsers] = useState<JournalUserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const [passwordById, setPasswordById] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

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
    setCreateMessage(null);
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
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Create failed');
      }
      setCreateMessage(
        'Viewer created. Send them your site link with this username and password (store passwords securely).'
      );
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      await load();
    } catch (err) {
      setCreateMessage(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreateBusy(false);
    }
  };

  const patchUser = async (id: string, body: Record<string, unknown>) => {
    setRowError(null);
    setRowBusy(id);
    try {
      const res = await fetch(`/api/admin/journal-users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Update failed');
      }
      await load();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setRowBusy(null);
    }
  };

  const handleSetPassword = async (id: string) => {
    const pwd = passwordById[id]?.trim();
    if (!pwd || pwd.length < 8) {
      setRowError('New password must be at least 8 characters');
      return;
    }
    await patchUser(id, { password: pwd });
    setPasswordById(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageHeading}>Journal users</h1>
      <p className={styles.intro}>
        You are the only admin. Create viewer accounts here, then share your site URL plus username and password.
        Run <code>npm run seed:journal-users</code> once (with an empty <code>journal_users</code> collection) to
        move the admin account from env vars into Firestore.
      </p>

      {listError && <div className={styles.error}>{listError}</div>}

      <section className={styles.section}>
        <h2>Add viewer</h2>
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
              {createBusy ? 'Creating…' : 'Create viewer'}
            </button>
          </div>
        </form>
        {createMessage && <div className={styles.success}>{createMessage}</div>}
      </section>

      <section className={styles.section}>
        <h2>All users</h2>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            {rowError && <div className={styles.error}>{rowError}</div>}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
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
                            onChange={e =>
                              setPasswordById(prev => ({ ...prev, [u.docId]: e.target.value }))
                            }
                            autoComplete="new-password"
                          />
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
