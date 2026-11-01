'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import type { JournalUserPublic } from '@/lib/auth/journalUsersFirestore';
import type { AudienceGroup } from '@/lib/types/audience';
import type { AudienceGroupMembershipImpact } from '@/lib/services/audienceGroupImpactService';
import type {
  ProspectiveReaderAccessImpact,
  ReaderAccountAccessImpact,
} from '@/lib/services/readerAccountImpactService';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import styles from './journal-users.module.css';

type ListResponse = { users: JournalUserPublic[] };
type GroupListResponse = { groups: AudienceGroup[] };
type InviteResult = { recipientId: string; inviteUrl: string; expiresAt: number };

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
  const [prospectiveAccessImpact, setProspectiveAccessImpact] = useState<ProspectiveReaderAccessImpact | null>(null);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestDisplayName, setGuestDisplayName] = useState('');
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestAccessImpact, setGuestAccessImpact] = useState<ProspectiveReaderAccessImpact | null>(null);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [passwordById, setPasswordById] = useState<Record<string, string>>({});
  const [passwordErrorById, setPasswordErrorById] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [userAccessImpacts, setUserAccessImpacts] = useState<Record<string, ReaderAccountAccessImpact>>({});
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);
  const [groupBusy, setGroupBusy] = useState<string | null>(null);
  const [groupImpacts, setGroupImpacts] = useState<Record<string, {
    signature: string;
    impact: AudienceGroupMembershipImpact;
  }>>({});

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
      setGroupImpacts({});
      setUserAccessImpacts({});
      setProspectiveAccessImpact(null);
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
      if (!prospectiveAccessImpact) {
        const impactResponse = await fetch('/api/admin/journal-users/prospective-access-impact');
        const impactData = await impactResponse.json();
        throwIfJsonApiFailed(impactResponse, impactData, 'New Reader access could not be calculated.');
        setProspectiveAccessImpact(impactData.impact as ProspectiveReaderAccessImpact);
        return;
      }
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

  const handleCreateGuest = async (event: React.FormEvent) => {
    event.preventDefault();
    setGuestBusy(true);
    try {
      if (!guestAccessImpact) {
        const impactResponse = await fetch('/api/admin/journal-users/prospective-access-impact');
        const impactData = await impactResponse.json();
        throwIfJsonApiFailed(impactResponse, impactData, 'New guest access could not be calculated.');
        setGuestAccessImpact(impactData.impact as ProspectiveReaderAccessImpact);
        return;
      }
      const response = await fetch('/api/admin/recipient-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'create',
          email: guestEmail,
          displayName: guestDisplayName.trim() || undefined,
        }),
      });
      const data = await response.json();
      throwIfJsonApiFailed(response, data, 'This guest invitation could not be created.');
      setInviteResult(data as InviteResult);
      setGuestEmail('');
      setGuestDisplayName('');
      setGuestAccessImpact(null);
      feedback.showSuccess('Guest added. Copy and send the private invitation link.');
      await load();
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'This guest invitation could not be created.', 'Invitation not created');
    } finally {
      setGuestBusy(false);
    }
  };

  const handleReissueInvite = async (recipientId: string) => {
    setRowBusy(recipientId);
    try {
      const response = await fetch('/api/admin/recipient-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'reissue', recipientId }),
      });
      const data = await response.json();
      throwIfJsonApiFailed(response, data, 'A new invitation link could not be created.');
      setInviteResult(data as InviteResult);
      feedback.showSuccess('New invitation created. The previous unused link no longer works.');
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'A new invitation link could not be created.', 'Invitation not created');
    } finally {
      setRowBusy(null);
    }
  };

  const copyInvite = async () => {
    if (!inviteResult) return;
    try {
      await navigator.clipboard.writeText(inviteResult.inviteUrl);
      feedback.showSuccess('Invitation link copied.');
    } catch {
      feedback.showError('Select and copy the invitation link manually.', 'Link not copied');
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
    const proposedDisabled = !user.disabled;
    if (user.role === 'viewer' && userAccessImpacts[user.docId]?.proposedDisabled !== proposedDisabled) {
      setRowBusy(user.docId);
      try {
        const response = await fetch(`/api/admin/journal-users/${user.docId}/access-impact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disabled: proposedDisabled }),
        });
        const data = await response.json();
        throwIfJsonApiFailed(response, data, 'This Reader access impact could not be calculated.');
        setUserAccessImpacts((current) => ({
          ...current,
          [user.docId]: data.impact as ReaderAccountAccessImpact,
        }));
      } catch (error) {
        feedback.showError(error instanceof Error ? error.message : 'This Reader access impact could not be calculated.', 'Access not changed');
      } finally {
        setRowBusy(null);
      }
      return;
    }
    if (user.role !== 'viewer' && !user.disabled) {
      const confirmed = await feedback.confirm({
        title: 'Disable user?',
        message: `${user.displayName} will lose access on their next request. Their account and content access can be restored by enabling the account again.`,
        confirmLabel: 'Disable',
        cancelLabel: 'Keep active',
        tone: 'danger',
      });
      if (!confirmed) return;
    }

    const updated = await patchUser(user.docId, { disabled: proposedDisabled });
    if (updated) {
      feedback.showSuccess(user.disabled ? 'User enabled.' : 'User disabled.');
    }
  };

  const readerUsers = users.filter((user) => user.role === 'viewer');

  const toggleMember = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((candidate) => candidate !== id) : [...ids, id];

  const membershipSignature = (ids: string[]) => [...new Set(ids)].sort().join('\u0000');

  const names = (readers: Array<{ displayName: string }>) =>
    readers.length ? readers.map((reader) => reader.displayName).join(', ') : 'none';

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
    const group = groups.find((candidate) => candidate.docId === id);
    if (!draft || !group) return;
    const signature = membershipSignature(draft.memberContactIds);
    const membershipChanged = signature !== membershipSignature(group.memberContactIds);
    setGroupBusy(id);
    try {
      if (membershipChanged && groupImpacts[id]?.signature !== signature) {
        const impactResponse = await fetch(`/api/admin/audience-groups/${id}/impact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberContactIds: draft.memberContactIds }),
        });
        const impactData = await impactResponse.json();
        throwIfJsonApiFailed(impactResponse, impactData, 'This access impact could not be calculated.');
        setGroupImpacts((current) => ({
          ...current,
          [id]: { signature, impact: impactData.impact as AudienceGroupMembershipImpact },
        }));
        return;
      }
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
        <h2>Invite a guest</h2>
        <p className={styles.intro}>Create Reader access without a password. The private link works once, expires after seven days, and can be replaced at any time.</p>
        <form onSubmit={handleCreateGuest}>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="guest-email">Email</label>
              <input
                id="guest-email"
                type="email"
                className={styles.input}
                value={guestEmail}
                onChange={(event) => {
                  setGuestEmail(event.target.value);
                  setGuestAccessImpact(null);
                }}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="guest-display">Display name (optional)</label>
              <input
                id="guest-display"
                className={styles.input}
                value={guestDisplayName}
                onChange={(event) => {
                  setGuestDisplayName(event.target.value);
                  setGuestAccessImpact(null);
                }}
              />
            </div>
            {guestAccessImpact ? (
              <div className={styles.impactReview}>
                <strong>Review the guest&apos;s initial access</strong>
                <p>This enabled guest will immediately gain access to {guestAccessImpact.collections.length} Collection{guestAccessImpact.collections.length === 1 ? '' : 's'}, {(guestAccessImpact.sharedMediaCollections ?? []).length} shared photo collection{(guestAccessImpact.sharedMediaCollections ?? []).length === 1 ? '' : 's'}, and {guestAccessImpact.cards.length} published Card{guestAccessImpact.cards.length === 1 ? '' : 's'} through legacy or all-enabled-reader routes.</p>
                {guestAccessImpact.collections.length ? <details><summary>Collections</summary><ul>{guestAccessImpact.collections.map((item) => <li key={item.id}>{item.title}</li>)}</ul></details> : null}
                {(guestAccessImpact.sharedMediaCollections ?? []).length ? <details><summary>Shared photo collections</summary><ul>{(guestAccessImpact.sharedMediaCollections ?? []).map((item) => <li key={item.id}>{item.title}</li>)}</ul></details> : null}
                {guestAccessImpact.cards.length ? <details><summary>Published Cards</summary><ul>{guestAccessImpact.cards.map((item) => <li key={item.id}>{item.title}</li>)}</ul></details> : null}
              </div>
            ) : null}
            <button type="submit" className={styles.button} disabled={guestBusy}>
              {guestBusy ? 'Working…' : guestAccessImpact ? 'Create guest with reviewed access' : 'Review initial access'}
            </button>
          </div>
        </form>
        {inviteResult ? (
          <div className={styles.inviteResult} role="status">
            <strong>Private invitation link</strong>
            <p>Send this link only to the intended guest. It expires {new Date(inviteResult.expiresAt).toLocaleString()}.</p>
            <div className={styles.inviteRow}>
              <input className={styles.inviteLink} readOnly value={inviteResult.inviteUrl} aria-label="Private invitation link" onFocus={(event) => event.currentTarget.select()} />
              <button type="button" className={styles.buttonSecondary} onClick={() => void copyInvite()}>Copy link</button>
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2>Add password account</h2>
        <form onSubmit={handleCreate}>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="ju-username">Username</label>
              <input
                id="ju-username"
                className={styles.input}
                value={newUsername}
                onChange={e => {
                  setNewUsername(e.target.value);
                  setProspectiveAccessImpact(null);
                }}
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
                onChange={e => {
                  setNewPassword(e.target.value);
                  setProspectiveAccessImpact(null);
                }}
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
                onChange={e => {
                  setNewDisplayName(e.target.value);
                  setProspectiveAccessImpact(null);
                }}
              />
            </div>
            {prospectiveAccessImpact ? (
              <div className={styles.impactReview}>
                <strong>Review the new Reader&apos;s initial access</strong>
                <p>This enabled account will immediately gain access to {prospectiveAccessImpact.collections.length} Collection{prospectiveAccessImpact.collections.length === 1 ? '' : 's'}, {(prospectiveAccessImpact.sharedMediaCollections ?? []).length} shared photo collection{(prospectiveAccessImpact.sharedMediaCollections ?? []).length === 1 ? '' : 's'}, and {prospectiveAccessImpact.cards.length} published Card{prospectiveAccessImpact.cards.length === 1 ? '' : 's'} through legacy or all-enabled-reader routes.</p>
                {prospectiveAccessImpact.collections.length ? (
                  <details><summary>Collections</summary><ul>{prospectiveAccessImpact.collections.map((item) => <li key={item.id}>{item.title}</li>)}</ul></details>
                ) : null}
                {(prospectiveAccessImpact.sharedMediaCollections ?? []).length ? (
                  <details><summary>Shared photo collections</summary><ul>{(prospectiveAccessImpact.sharedMediaCollections ?? []).map((item) => <li key={item.id}>{item.title}</li>)}</ul></details>
                ) : null}
                {prospectiveAccessImpact.cards.length ? (
                  <details><summary>Published Cards</summary><ul>{prospectiveAccessImpact.cards.map((item) => <li key={item.id}>{item.title}</li>)}</ul></details>
                ) : null}
              </div>
            ) : null}
            <button type="submit" className={styles.button} disabled={createBusy}>
              {createBusy ? 'Working...' : prospectiveAccessImpact ? 'Create Reader with reviewed access' : 'Review initial access'}
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
                <span>{user.displayName}{user.accessKind === 'guest' ? ' (guest)' : ''}{user.disabled ? ' (disabled)' : ''}</span>
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
            const signature = membershipSignature(draft.memberContactIds);
            const reviewedImpact = groupImpacts[group.docId]?.signature === signature
              ? groupImpacts[group.docId].impact
              : null;
            const membershipChanged = signature !== membershipSignature(group.memberContactIds);
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
                      <span>{user.displayName}{user.accessKind === 'guest' ? ' (guest)' : ''}{user.disabled ? ' (disabled)' : ''}</span>
                    </label>
                  ))}
                </div>
                {reviewedImpact ? (
                  <div className={styles.impactReview} role="status">
                    <strong>Review this access change before saving</strong>
                    <p>Adds: {names(reviewedImpact.addedMembers)}. Removes: {names(reviewedImpact.removedMembers)}.</p>
                    {reviewedImpact.cards.length || reviewedImpact.collections.length || (reviewedImpact.sharedMediaCollections ?? []).length ? (
                      <>
                        {reviewedImpact.collections.length ? (
                          <div>
                            <strong>Collection access</strong>
                            <ul>
                              {reviewedImpact.collections.map((item) => (
                                <li key={item.id}>{item.title}: gains {names(item.gainingReaders)}; loses {names(item.losingReaders)}.</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {(reviewedImpact.sharedMediaCollections ?? []).length ? (
                          <details><summary>Shared photo collections</summary><ul>{(reviewedImpact.sharedMediaCollections ?? []).map((item) => <li key={item.id}>{item.title}</li>)}</ul></details>
                        ) : null}
                        {reviewedImpact.cards.length ? (
                          <details>
                            <summary>{reviewedImpact.cards.length} published Card{reviewedImpact.cards.length === 1 ? '' : 's'} change effective access</summary>
                            <ul>
                              {reviewedImpact.cards.map((item) => (
                                <li key={item.id}>{item.title}: gains {names(item.gainingReaders)}; loses {names(item.losingReaders)}.</li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </>
                    ) : (
                      <p>No currently Reader-visible Card or Collection changes access.</p>
                    )}
                    <p className={styles.impactNote}>
                      This group is selected by {reviewedImpact.referencedCardAudiences} Card audience{reviewedImpact.referencedCardAudiences === 1 ? '' : 's'}, {reviewedImpact.referencedCollectionAudiences} Collection audience{reviewedImpact.referencedCollectionAudiences === 1 ? '' : 's'}, and {reviewedImpact.referencedSharedMediaCollectionAudiences ?? 0} shared photo audience{reviewedImpact.referencedSharedMediaCollectionAudiences === 1 ? '' : 's'}. Draft or incomplete content does not change Reader access now.
                    </p>
                  </div>
                ) : membershipChanged ? (
                  <p className={styles.impactNote}>Review the Reader-access consequence before this membership change can be saved.</p>
                ) : null}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.button}
                    disabled={groupBusy === group.docId}
                    onClick={() => void handleSaveGroup(group.docId)}
                  >
                    {reviewedImpact ? 'Apply reviewed access change' : membershipChanged ? 'Review access change' : 'Save group'}
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
                    <th>Access</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const accessImpact = userAccessImpacts[u.docId];
                    const reviewedState = accessImpact?.proposedDisabled === !u.disabled;
                    const action = u.disabled ? 'enable' : 'disable';
                    return (
                    <tr key={u.docId} className={u.disabled ? styles.rowDisabled : undefined}>
                      <td>{u.username}</td>
                      <td>{u.displayName}</td>
                      <td>{u.accessKind === 'guest' ? 'Guest' : u.role}</td>
                      <td>{u.disabled ? 'Disabled' : 'Active'}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            disabled={rowBusy === u.docId}
                            onClick={() => void handleToggleDisabled(u)}
                          >
                            {u.role === 'viewer'
                              ? reviewedState ? `Apply reviewed ${action}` : `Review ${action} access`
                              : u.disabled ? 'Enable' : 'Disable'}
                          </button>
                          {u.role === 'viewer' && reviewedState ? (
                            <div className={styles.impactReview}>
                              <strong>Review Reader access before {action}</strong>
                              <p>{u.displayName} will {accessImpact.effect} access to {accessImpact.collections.length} Collection{accessImpact.collections.length === 1 ? '' : 's'}, {(accessImpact.sharedMediaCollections ?? []).length} shared photo collection{(accessImpact.sharedMediaCollections ?? []).length === 1 ? '' : 's'}, and {accessImpact.cards.length} published Card{accessImpact.cards.length === 1 ? '' : 's'}.</p>
                              {accessImpact.collections.length ? (
                                <details>
                                  <summary>Collections</summary>
                                  <ul>{accessImpact.collections.map((item) => <li key={item.id}>{item.title}</li>)}</ul>
                                </details>
                              ) : null}
                              {(accessImpact.sharedMediaCollections ?? []).length ? (
                                <details><summary>Shared photo collections</summary><ul>{(accessImpact.sharedMediaCollections ?? []).map((item) => <li key={item.id}>{item.title}</li>)}</ul></details>
                              ) : null}
                              {accessImpact.cards.length ? (
                                <details>
                                  <summary>Published Cards</summary>
                                  <ul>{accessImpact.cards.map((item) => <li key={item.id}>{item.title}</li>)}</ul>
                                </details>
                              ) : null}
                            </div>
                          ) : null}
                          {u.accessKind !== 'guest' ? <>
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
                          </> : (
                            <button
                              type="button"
                              className={styles.buttonSecondary}
                              disabled={rowBusy === u.docId || u.disabled}
                              onClick={() => void handleReissueInvite(u.docId)}
                            >
                              {u.disabled ? 'Enable before inviting' : 'New invitation link'}
                            </button>
                          )}
                          {u.accessKind === 'guest' && inviteResult?.recipientId === u.docId ? (
                            <div className={styles.rowInviteResult} role="status">
                              <input
                                className={styles.inviteLink}
                                readOnly
                                value={inviteResult.inviteUrl}
                                aria-label={`Private invitation link for ${u.displayName}`}
                                onFocus={(event) => event.currentTarget.select()}
                              />
                              <button type="button" className={styles.buttonSecondary} onClick={() => void copyInvite()}>Copy link</button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {users.length === 0 && !loading && (
              <p className={styles.intro}>No readers have been added yet. Use one of the forms above to add a guest or password account.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
