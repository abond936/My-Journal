'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JournalUserPublic } from '@/lib/auth/journalUsersFirestore';
import type { AudienceGroup, AudienceSelection } from '@/lib/types/audience';
import type {
  CardAudienceImpact,
  CollectionAudienceImpact,
} from '@/lib/services/audienceImpactService';
import styles from './AudienceSelector.module.css';

type AudienceSelectorProps = {
  value?: AudienceSelection;
  scopeLabel: string;
  consequence: string;
  disabled?: boolean;
  onSave: (selection: AudienceSelection) => Promise<boolean>;
  getCombinedImpact?: (selection: AudienceSelection) => Promise<CardAudienceImpact>;
  getCollectionImpact?: (selection: AudienceSelection) => Promise<CollectionAudienceImpact>;
};

type ImpactState =
  | { scope: 'card'; value: CardAudienceImpact }
  | { scope: 'collection'; value: CollectionAudienceImpact };

const allReadersSelection = (): AudienceSelection => ({
  allContacts: true,
  groupIds: [],
  contactIds: [],
});

function normalize(selection?: AudienceSelection): AudienceSelection {
  if (!selection) return allReadersSelection();
  return {
    allContacts: selection.allContacts,
    groupIds: [...new Set(selection.groupIds)].sort(),
    contactIds: [...new Set(selection.contactIds)].sort(),
  };
}

function sameSelection(left: AudienceSelection, right: AudienceSelection): boolean {
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

export default function AudienceSelector({
  value,
  scopeLabel,
  consequence,
  disabled = false,
  onSave,
  getCombinedImpact,
  getCollectionImpact,
}: AudienceSelectorProps) {
  const normalizedValue = useMemo(() => normalize(value), [value]);
  const [draft, setDraft] = useState<AudienceSelection>(normalizedValue);
  const [users, setUsers] = useState<JournalUserPublic[]>([]);
  const [groups, setGroups] = useState<AudienceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [impact, setImpact] = useState<ImpactState | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState<string | null>(null);

  useEffect(() => setDraft(normalizedValue), [normalizedValue]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersResponse, groupsResponse] = await Promise.all([
          fetch('/api/admin/journal-users'),
          fetch('/api/admin/audience-groups'),
        ]);
        const usersData = await usersResponse.json().catch(() => ({}));
        const groupsData = await groupsResponse.json().catch(() => ({}));
        if (!usersResponse.ok) throw new Error(usersData.message || 'Readers could not be loaded.');
        if (!groupsResponse.ok) throw new Error(groupsData.message || 'Audience groups could not be loaded.');
        if (cancelled) return;
        setUsers(Array.isArray(usersData.users) ? usersData.users : []);
        setGroups(Array.isArray(groupsData.groups) ? groupsData.groups : []);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Audience choices could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!getCombinedImpact && !getCollectionImpact) {
      setImpact(null);
      setImpactError(null);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setImpactLoading(true);
      setImpactError(null);
      const request = getCollectionImpact
        ? getCollectionImpact(normalize(draft)).then((value) => ({ scope: 'collection', value }) as const)
        : getCombinedImpact!(normalize(draft)).then((value) => ({ scope: 'card', value }) as const);
      void request
        .then((nextImpact) => {
          if (!cancelled) setImpact(nextImpact);
        })
        .catch((impactFailure) => {
          if (!cancelled) {
            setImpact(null);
            setImpactError(impactFailure instanceof Error ? impactFailure.message : 'Combined audience could not be calculated.');
          }
        })
        .finally(() => {
          if (!cancelled) setImpactLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [draft, getCombinedImpact, getCollectionImpact]);

  const readerUsers = useMemo(
    () => users.filter((user) => user.role === 'viewer').sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [users]
  );
  const enabledReaderIds = useMemo(
    () => new Set(readerUsers.filter((user) => !user.disabled).map((user) => user.docId)),
    [readerUsers]
  );
  const effectiveIds = useMemo(() => {
    if (draft.allContacts) return enabledReaderIds;
    const ids = new Set(draft.contactIds.filter((id) => enabledReaderIds.has(id)));
    groups
      .filter((group) => draft.groupIds.includes(group.docId))
      .forEach((group) => group.memberContactIds.forEach((id) => {
        if (enabledReaderIds.has(id)) ids.add(id);
      }));
    return ids;
  }, [draft, enabledReaderIds, groups]);
  const effectiveReaders = readerUsers.filter((user) => effectiveIds.has(user.docId));
  const changed = !sameSelection(draft, normalizedValue);

  const toggleId = (field: 'groupIds' | 'contactIds', id: string) => {
    setMessage(null);
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((candidate) => candidate !== id)
        : [...current[field], id].sort(),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const selection = normalize(draft);
      const saved = await onSave(selection);
      if (saved) {
        setDraft(selection);
        setMessage('Audience saved. Access changes take effect on the next Reader request.');
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Audience could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.selector} aria-label={`${scopeLabel} audience`}>
      <div className={styles.heading}>
        <div>
          <strong>{scopeLabel} audience</strong>
          {!value ? <span className={styles.legacy}>Legacy default: all enabled readers</span> : null}
        </div>
        <span>{effectiveReaders.length} enabled reader{effectiveReaders.length === 1 ? '' : 's'}</span>
      </div>
      <p className={styles.consequence}>{consequence}</p>
      {loading ? <p aria-busy="true">Loading readers and groups...</p> : null}
      {!loading ? (
        <>
          <label className={styles.mode}>
            <input
              type="radio"
              name={`${scopeLabel}-audience-mode`}
              checked={draft.allContacts}
              disabled={disabled || saving}
              onChange={() => setDraft(allReadersSelection())}
            />
            All enabled readers
          </label>
          <label className={styles.mode}>
            <input
              type="radio"
              name={`${scopeLabel}-audience-mode`}
              checked={!draft.allContacts}
              disabled={disabled || saving}
              onChange={() => setDraft((current) => ({ ...current, allContacts: false }))}
            />
            Selected groups and people
          </label>
          {!draft.allContacts ? (
            <div className={styles.choices}>
              <fieldset>
                <legend>Groups</legend>
                {groups.length ? groups.map((group) => (
                  <label key={group.docId}>
                    <input
                      type="checkbox"
                      checked={draft.groupIds.includes(group.docId)}
                      disabled={disabled || saving}
                      onChange={() => toggleId('groupIds', group.docId)}
                    />
                    {group.name}
                  </label>
                )) : <span>No groups created.</span>}
              </fieldset>
              <fieldset>
                <legend>Individual readers</legend>
                {readerUsers.length ? readerUsers.map((user) => (
                  <label key={user.docId}>
                    <input
                      type="checkbox"
                      checked={draft.contactIds.includes(user.docId)}
                      disabled={disabled || saving}
                      onChange={() => toggleId('contactIds', user.docId)}
                    />
                    {user.displayName}{user.accessKind === 'guest' ? ' (guest)' : ''}{user.disabled ? ' (disabled)' : ''}
                  </label>
                )) : <span>No Reader accounts created.</span>}
              </fieldset>
            </div>
          ) : null}
          <div className={styles.preview} role="status">
            <strong>Who can read through this route:</strong>{' '}
            {effectiveReaders.length
              ? effectiveReaders.map((user) => user.displayName).join(', ')
              : 'No enabled readers.'}
          </div>
          {getCombinedImpact || getCollectionImpact ? (
            <div className={styles.preview} aria-live="polite">
              {impactLoading ? 'Calculating all routes...' : impact?.scope === 'card' ? (
                <>
                  <strong>{impact.value.basis === 'if_published' ? 'If published with this audience:' : 'Combined access after Save:'}</strong>{' '}
                  {impact.value.effectiveReaders.length
                    ? impact.value.effectiveReaders.map((reader) => reader.displayName).join(', ')
                    : 'No enabled readers.'}
                  {' '}Routes included: {[
                    ...(impact.value.standaloneIncluded ? ['standalone Feed'] : []),
                    ...impact.value.otherRoutes.map((route) => route.title),
                  ].join(', ') || 'none'}.
                </>
              ) : impact?.scope === 'collection' ? (
                <>
                  <strong>
                    {impact.value.basis === 'current_after_save'
                      ? 'Placed Card access after Save:'
                      : 'If this Collection is published and reader-ready:'}
                  </strong>{' '}
                  {impact.value.cards.length} unique placed Card{impact.value.cards.length === 1 ? '' : 's'}.
                  {impact.value.missingCardIds.length ? (
                    <> {impact.value.missingCardIds.length} missing Card reference{impact.value.missingCardIds.length === 1 ? '' : 's'} must be resolved.</>
                  ) : null}
                  {impact.value.cards.length ? (
                    <details className={styles.impactDetails}>
                      <summary>Review each placed Card consequence</summary>
                      <ul className={styles.impactList}>
                        {impact.value.cards.map((card) => (
                          <li key={card.cardId}>
                            <strong>{card.title}</strong>{card.status !== 'published' ? ' (Draft)' : ''}: {' '}
                            {card.effectiveReaders.length
                              ? card.effectiveReaders.map((reader) => reader.displayName).join(', ')
                              : 'No enabled readers.'}
                            {' '}Routes: {card.routes.map((route) => route.title).join(', ')}.
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </>
              ) : impactError || 'Combined audience has not been calculated.'}
            </div>
          ) : null}
          <button type="button" disabled={disabled || saving || !changed} onClick={() => void save()}>
            {saving ? 'Saving audience...' : 'Save audience'}
          </button>
        </>
      ) : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {message ? <p className={styles.message} role="status">{message}</p> : null}
    </section>
  );
}
