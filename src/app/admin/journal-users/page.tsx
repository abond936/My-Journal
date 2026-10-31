'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import type { JournalUserPublic } from '@/lib/auth/journalUsersFirestore';
import type { AudienceGroup } from '@/lib/types/audience';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import styles from './journal-users.module.css';

type ListResponse = { users: JournalUserPublic[] };
type GroupListResponse = { groups: AudienceGroup[] };

async function fetchUsers(): Promise<JournalUserPublic[]> {
  const res = await fetch('/api/admin/journal-users');
  const data = (await res.json()) as ListResponse & { message?: string; error?: string; code?: string };
  throwIfJsonApiFailed(res, data, 'Users could not be loaded. Try again.');
  return data.users;
}

async function fetchGroups(): Promise<AudienceGroup[]> {
  const res = await fetch('/api/admin/audience-groups');
  const data = (await res.json()) as GroupListResponse & { message?: string; error?: string; code?: string };
  throwIfJsonApiFailed(res, data, 'Audience groups could not be loaded. Try again.');
  return data.groups;
}

export default function JournalUsersAdminPage() {
  const feedback = useAppFeedback();
  const [users, setUsers] = useState<JournalUserPublic[]>([]);
  const [groups, setGroups] = useState<AudienceGroup[]>([]);
  const [groupDrafts, setGroupDrafts] = useState<Record<string, { name: string; memberContactIds: string[] }>>({});
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [passwordById, setPasswordById] = useState<Record<string, string>>({});
  const [passwordErrorById, setPasswordErrorById] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);
  const [groupBusy, setGroupBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setListError(null);
    setLoading(true);
    try {
      const [nextUsers, nextGroups] = await Promise.all([fetchUsers(), fetchGroups()]);
      setUsers(nextUsers);
      setGroups(nextGroups);
      setGroupDrafts(Object.fromEntries(nextGroups.map((group) => [
        group.docId,
        { name: group.name, memberContactIds: group.memberContactIds },
      ])));
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Users could not be loaded. Try again.');
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
    feedback.showSuccess('Temporary password updated.');
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

  const handleToggleDisabled = async (user: JournalUserPublic) => {
    if (!user.disabled) {
      const confirmed = await feedback.confirm({
        title: 'Disable user?',
        message: `${user.displayName} will lose access on their next request. Their account and content access can be restored by enabling the account again.`,
        confirmLabel: 'Disable',
        cancelLabel: 'Keep active',
        tone: 'danger',
      });
      if (!confirmed) return;
    }

    const updated = await patchUser(user.docId, { disabled: !user.disabled });
    if (updated) {
      feedback.showSuccess(user.disabled ? 'User enabled.' : 'User disabled.');
    }
  };

  const readerUsers = users.filter((user) => user.role === 'viewer');

  const toggleMember = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((candidate) => candidate !== id) : [...ids, id];

  const handleCreateGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    setGroupBusy('new');
    try {
      const res = await fetch('/api/admin/audience-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, memberContactIds: newGroupMemberIds }),
      });
      const data = await res.json();
      throwIfJsonApiFailed(res, data, 'This audience group could not be created.');
      feedback.showSuccess('Audience group created.');
      setNewGroupName('');
      setNewGroupMemberIds([]);
      await load();
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'This audience group could not be created.', 'Group not created');
    } finally {
      setGroupBusy(null);
    }
  };

  const handleSaveGroup = async (id: string) => {
    const draft = groupDrafts[id];
    if (!draft) return;
    setGroupBusy(id);
    try {
      const res = await fetch(`/api/admin/audience-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      throwIfJsonApiFailed(res, data, 'This audience group could not be saved.');
      feedback.showSuccess('Audience group saved. Access changes take effect on the next Reader request.');
      await load();
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'This audience group could not be saved.', 'Group not saved');
    } finally {
      setGroupBusy(null);
    }
  };

  const handleDeleteGroup = async (group: AudienceGroup) => {
    const confirmed = await feedback.confirm({
      title: 'Delete audience group?',
      message: `Delete ${group.name}? Deletion is blocked while any Card or Collection audience still uses it.`,
      confirmLabel: 'Delete group',
      cancelLabel: 'Keep group',
      tone: 'danger',
    });
    if (!confirmed) return;
    setGroupBusy(group.docId);
    try {
      const res = await fetch(`/api/admin/audience-groups/${group.docId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throwIfJsonApiFailed(res, data, 'This audience group could not be deleted.');
      }
      feedback.showSuccess('Audience group deleted.');
      await load();
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'This audience group could not be deleted.', 'Group not deleted');
    } finally {
      setGroupBusy(null);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.pageHeading}>User Management</h1>
      </header>

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

      <section className={styles.section}>
        <h2>Audience groups</h2>
        <p className={styles.intro}>Reusable groups control access only when a Card or Collection explicitly selects them. Disabled readers remain listed but cannot enter the Reader.</p>
        <form onSubmit={handleCreateGroup} className={styles.groupEditor}>
          <div className={styles.inputGroup}>
            <label htmlFor="new-audience-group">New group name</label>
            <input
              id="new-audience-group"
              className={styles.input}
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Family"
              required
            />
          </div>
          <div className={styles.memberGrid} aria-label="New group members">
            {readerUsers.map((user) => (
              <label key={user.docId} className={styles.memberChoice}>
                <input
                  type="checkbox"
                  checked={newGroupMemberIds.includes(user.docId)}
                  onChange={() => setNewGroupMemberIds((ids) => toggleMember(ids, user.docId))}
                />
                <span>{user.displayName}{user.disabled ? ' (disabled)' : ''}</span>
              </label>
            ))}
          </div>
          <button type="submit" className={styles.button} disabled={groupBusy === 'new'}>
            {groupBusy === 'new' ? 'Creating…' : 'Create group'}
          </button>
        </form>

        <div className={styles.groupList}>
          {groups.map((group) => {
            const draft = groupDrafts[group.docId] ?? { name: group.name, memberContactIds: group.memberContactIds };
            return (
              <div key={group.docId} className={styles.groupEditor}>
                <div className={styles.inputGroup}>
                  <label htmlFor={`audience-group-${group.docId}`}>Group name</label>
                  <input
                    id={`audience-group-${group.docId}`}
                    className={styles.input}
                    value={draft.name}
                    onChange={(event) => setGroupDrafts((current) => ({
                      ...current,
                      [group.docId]: { ...draft, name: event.target.value },
                    }))}
                  />
                </div>
                <div className={styles.memberGrid} aria-label={`${group.name} members`}>
                  {readerUsers.map((user) => (
                    <label key={user.docId} className={styles.memberChoice}>
                      <input
                        type="checkbox"
                        checked={draft.memberContactIds.includes(user.docId)}
                        onChange={() => setGroupDrafts((current) => ({
                          ...current,
                          [group.docId]: {
                            ...draft,
                            memberContactIds: toggleMember(draft.memberContactIds, user.docId),
                          },
                        }))}
                      />
                      <span>{user.displayName}{user.disabled ? ' (disabled)' : ''}</span>
                    </label>
                  ))}
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.button}
                    disabled={groupBusy === group.docId}
                    onClick={() => void handleSaveGroup(group.docId)}
                  >
                    Save group
                  </button>
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    disabled={groupBusy === group.docId}
                    onClick={() => void handleDeleteGroup(group)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          {!loading && groups.length === 0 ? <p className={styles.intro}>No audience groups yet.</p> : null}
        </div>
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
                            onClick={() => void handleToggleDisabled(u)}
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
              <p className={styles.intro}>No users have been added yet. Use Add User above to create the first reader account.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
