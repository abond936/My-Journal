'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTag } from '@/components/providers/TagProvider';
import type { Person, PersonGroup, PersonRelationship } from '@/lib/types/archiveIdentity';
import { normalizeTagDimensionKey } from '@/lib/utils/tagUtils';
import type { ArchiveIdentityReviewReport } from '@/lib/utils/archiveIdentityReview';
import styles from './PeopleAdminPanel.module.css';

type Snapshot = { people: Person[]; relationships: PersonRelationship[]; groups: PersonGroup[]; archivePerspectivePersonId?: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? data?.error ?? 'The identity change could not be saved.');
  return data as T;
}

export default function PeopleAdminPanel() {
  const { tags } = useTag();
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [person, setPerson] = useState({ kind: 'human' as Person['kind'], canonicalName: '', aliases: '', linkedWhoTagId: '' });
  const [relation, setRelation] = useState({ fromPersonId: '', type: 'parent' as PersonRelationship['type'], toPersonId: '' });
  const [group, setGroup] = useState({ name: '', type: 'family' as PersonGroup['type'], memberPersonIds: [] as string[] });
  const [review, setReview] = useState<ArchiveIdentityReviewReport>();

  const load = useCallback(async () => {
    try { setData(await api<Snapshot>('/api/admin/archive-identity')); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'People could not be loaded.'); }
  }, []);
  useEffect(() => void load(), [load]);

  const change = async (work: () => Promise<unknown>) => {
    setSaving(true); setError('');
    try { await work(); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The identity change could not be saved.'); }
    finally { setSaving(false); }
  };
  const post = (entity: string, payload: unknown) => api('/api/admin/archive-identity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity, data: payload }) });
  const names = useMemo(() => new Map((data?.people ?? []).map((item) => [item.docId, item.canonicalName])), [data?.people]);
  const whoTags = tags.filter((tag) => normalizeTagDimensionKey(tag.dimension) === 'who');

  if (!data && !error) return <p className={styles.status}>Loading people…</p>;
  return <div className={styles.panel}>
    <p className={styles.intro}>Named Who subjects are stable identities, including people and non-human subjects. Names are aliases; family roles apply to people through relationships and perspective.</p>
    {error && <p className={styles.error}>{error}</p>}{saving && <p className={styles.status}>Saving…</p>}
    <section className={styles.section}><h3>Who review</h3>
      <p className={styles.intro}>Read-only proposals based on explicit links, names, hierarchy position, and actual direct assignments. Candidate classifications are not migration decisions.</p>
      <button disabled={saving} onClick={() => change(async () => setReview(await api<ArchiveIdentityReviewReport>('/api/admin/archive-identity/review')))}>Prepare review</button>
      {review && <div className={styles.reviewSummary}>{review.rows.length} Who tags · {review.rows.filter((row) => row.confidence === 'confirmed').length} confirmed · {review.rows.filter((row) => row.confidence === 'candidate').length} candidates · {review.rows.filter((row) => row.confidence === 'ambiguous').length} ambiguous · {review.aliasClusters.length} possible alias clusters</div>}
      {review?.aliasClusters.map((cluster) => <p className={styles.intro} key={cluster.nodeTagId}><strong>{cluster.nodeName} ({cluster.decision}):</strong> {cluster.candidateNames.join(', ')}</p>)}
      {review && <div className={styles.reviewTable} role="table" aria-label="Who identity review">
        {review.rows.map((row) => <div className={styles.reviewRow} role="row" key={row.tagId}>
          <span><strong>{row.name}</strong><small>{row.classification} · {row.confidence}</small></span>
          <span title="Direct assignments">Direct: {row.direct.cards} C · {row.direct.media} M · {row.direct.questions} Q</span>
          <span title="Assignments at this tag or its descendants">Tree: {row.subtree.cards} C · {row.subtree.media} M · {row.subtree.questions} Q</span>
        </div>)}
      </div>}
    </section>
    <section className={styles.section}><h3>Identities</h3><div className={styles.form}>
      <select value={person.kind} onChange={(e) => setPerson({ ...person, kind: e.target.value as Person['kind'] })}><option value="human">Person</option><option value="nonhuman">Non-human subject</option></select>
      <input placeholder="Canonical name" value={person.canonicalName} onChange={(e) => setPerson({ ...person, canonicalName: e.target.value })} />
      <input placeholder="Aliases, separated by commas" value={person.aliases} onChange={(e) => setPerson({ ...person, aliases: e.target.value })} />
      <select value={person.linkedWhoTagId} onChange={(e) => setPerson({ ...person, linkedWhoTagId: e.target.value })}><option value="">No linked Who tag</option>{whoTags.map((tag) => <option key={tag.docId} value={tag.docId}>{tag.name}</option>)}</select>
      <button disabled={saving || !person.canonicalName.trim()} onClick={() => change(async () => { await post('person', { kind: person.kind, canonicalName: person.canonicalName, aliases: person.aliases.split(',').map((name) => name.trim()).filter(Boolean).map((name) => ({ name })), ...(person.linkedWhoTagId ? { linkedWhoTagId: person.linkedWhoTagId } : {}) }); setPerson({ kind: 'human', canonicalName: '', aliases: '', linkedWhoTagId: '' }); })}>Add identity</button>
    </div><div className={styles.rows}>{data?.people.map((item) => <div className={styles.row} key={item.docId}><span><strong>{item.canonicalName}</strong> · {item.kind === 'nonhuman' ? 'non-human' : 'person'}{item.aliases.length ? ` · ${item.aliases.map((a) => a.name).join(', ')}` : ''}</span><button disabled={saving || item.kind === 'nonhuman' || data.archivePerspectivePersonId === item.docId} onClick={() => change(() => api('/api/admin/archive-identity/perspective', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archivePerspectivePersonId: item.docId }) }))}>{data.archivePerspectivePersonId === item.docId ? 'Perspective' : 'Set perspective'}</button></div>)}</div></section>
    <section className={styles.section}><h3>Relationships</h3><div className={styles.form}>
      <select value={relation.fromPersonId} onChange={(e) => setRelation({ ...relation, fromPersonId: e.target.value })}><option value="">First person</option>{data?.people.map((p) => <option key={p.docId} value={p.docId}>{p.canonicalName}</option>)}</select>
      <select value={relation.type} onChange={(e) => setRelation({ ...relation, type: e.target.value as PersonRelationship['type'] })}><option value="parent">is parent of</option><option value="spouse">is spouse of</option><option value="partner">is partner of</option></select>
      <select value={relation.toPersonId} onChange={(e) => setRelation({ ...relation, toPersonId: e.target.value })}><option value="">Second person</option>{data?.people.map((p) => <option key={p.docId} value={p.docId}>{p.canonicalName}</option>)}</select>
      <button disabled={saving || !relation.fromPersonId || !relation.toPersonId} onClick={() => change(async () => { await post('relationship', relation); setRelation({ ...relation, fromPersonId: '', toPersonId: '' }); })}>Add relationship</button>
    </div><div className={styles.rows}>{data?.relationships.map((r) => <div className={styles.row} key={r.docId}><span>{names.get(r.fromPersonId)} · {r.type} · {names.get(r.toPersonId)}</span><button onClick={() => change(() => api(`/api/admin/archive-identity/relationship/${r.docId}`, { method: 'DELETE' }))}>Remove</button></div>)}</div></section>
    <section className={styles.section}><h3>Groups</h3><div className={styles.form}>
      <input placeholder="Group name" value={group.name} onChange={(e) => setGroup({ ...group, name: e.target.value })} />
      <select value={group.type} onChange={(e) => setGroup({ ...group, type: e.target.value as PersonGroup['type'] })}><option value="family">Family</option><option value="couple">Couple</option><option value="household">Household</option></select>
      <div className={styles.members}>{data?.people.map((p) => <label key={p.docId}><input type="checkbox" checked={group.memberPersonIds.includes(p.docId!)} onChange={(e) => setGroup({ ...group, memberPersonIds: e.target.checked ? [...group.memberPersonIds, p.docId!] : group.memberPersonIds.filter((id) => id !== p.docId) })} />{p.canonicalName}</label>)}</div>
      <button disabled={saving || !group.name.trim() || group.memberPersonIds.length < 2 || (group.type === 'couple' && group.memberPersonIds.length !== 2)} onClick={() => change(async () => { await post('group', group); setGroup({ ...group, name: '', memberPersonIds: [] }); })}>Add group</button>
    </div><div className={styles.rows}>{data?.groups.map((g) => <div className={styles.row} key={g.docId}><span><strong>{g.name}</strong> · {g.type} · {g.memberPersonIds.map((id) => names.get(id) ?? id).join(', ')}</span><button onClick={() => change(() => api(`/api/admin/archive-identity/group/${g.docId}`, { method: 'DELETE' }))}>Remove</button></div>)}</div></section>
  </div>;
}
