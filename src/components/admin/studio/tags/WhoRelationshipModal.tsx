'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import EditModal from '@/components/admin/studio/cards/EditModal';
import type { PersonRelationship } from '@/lib/types/archiveIdentity';
import type { Tag } from '@/lib/types/tag';
import { resolvePerspectiveRoles } from '@/lib/utils/personRelationships';
import styles from './WhoRelationshipModal.module.css';

type Snapshot = { relationships: PersonRelationship[]; archivePerspectivePersonId?: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? data?.error ?? 'The relationship change could not be saved.');
  return data as T;
}

export function WhoRelationshipModal({ tag, whoTags, onClose, onUpdateTag }: {
  tag: Tag | null;
  whoTags: Tag[];
  onClose: () => void;
  onUpdateTag: (id: string, update: Partial<Omit<Tag, 'docId'>>) => Promise<Tag | undefined>;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [gender, setGender] = useState<Tag['gender']>(tag?.gender);
  const [otherTagId, setOtherTagId] = useState('');
  const [relationshipType, setRelationshipType] = useState<PersonRelationship['type']>('parent');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!tag) return;
    try { setSnapshot(await api<Snapshot>('/api/admin/archive-identity')); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Relationships could not be loaded.'); }
  }, [tag]);
  useEffect(() => void load(), [load]);

  const change = async (work: () => Promise<unknown>) => {
    setSaving(true); setError('');
    try { await work(); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The relationship change could not be saved.'); }
    finally { setSaving(false); }
  };
  const names = useMemo(() => new Map(whoTags.map((item) => [item.docId, item.name])), [whoTags]);
  const related = useMemo(() => snapshot?.relationships.filter((relationship) => relationship.fromPersonId === tag?.docId || relationship.toPersonId === tag?.docId) ?? [], [snapshot?.relationships, tag?.docId]);
  const perspectiveRoles = useMemo(() => snapshot?.archivePerspectivePersonId && tag?.docId
    ? [...(resolvePerspectiveRoles(snapshot.relationships, snapshot.archivePerspectivePersonId).get(tag.docId) ?? [])]
    : [], [snapshot, tag?.docId]);

  if (!tag?.docId) return null;
  return <EditModal isOpen onClose={onClose} title={`Who: ${tag.name}`} size="wide">
    <div className={styles.form}>
      <p className={styles.status}>Tag hierarchy owns names and aggregation. Use relationships only for tags that represent one individual. These optional links do not change or assign tags.</p>
      {error && <p className={styles.error}>{error}</p>}
      <label>Gender for relationship labels<select value={gender ?? ''} onChange={(event) => setGender((event.target.value || undefined) as Tag['gender'])}>
        <option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option><option value="nonbinary">Nonbinary</option><option value="unknown">Unknown</option>
      </select></label>
      <div className={styles.actions}><button disabled={saving} onClick={() => change(async () => {
        const updated = await onUpdateTag(tag.docId!, { gender });
        if (!updated) throw new Error('Gender could not be saved.');
      })}>Save gender</button>
      <button disabled={saving || snapshot?.archivePerspectivePersonId === tag.docId} onClick={() => change(() => api('/api/admin/archive-identity/perspective', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archivePerspectivePersonId: tag.docId }) }))}>{snapshot?.archivePerspectivePersonId === tag.docId ? 'Current perspective' : 'Set perspective'}</button></div>
      {perspectiveRoles.length > 0 && <p className={styles.status}>Relative to the current perspective: {perspectiveRoles.join(', ')}</p>}
      <label>Relationship<select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as PersonRelationship['type'])}><option value="parent">is parent of</option><option value="partner">is partner of</option><option value="spouse">is spouse of</option></select></label>
      <label>Other Who tag<select value={otherTagId} onChange={(event) => setOtherTagId(event.target.value)}><option value="">Choose a tag</option>{whoTags.filter((item) => item.docId !== tag.docId).map((item) => <option key={item.docId} value={item.docId}>{item.name}</option>)}</select></label>
      <div className={styles.actions}><button disabled={saving || !otherTagId} onClick={() => change(async () => {
        await api('/api/admin/archive-identity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'relationship', data: { fromPersonId: tag.docId, type: relationshipType, toPersonId: otherTagId } }) });
        setOtherTagId('');
      })}>Add relationship</button></div>
      <div className={styles.rows}>{related.map((relationship) => {
        const otherId = relationship.fromPersonId === tag.docId ? relationship.toPersonId : relationship.fromPersonId;
        const label = relationship.type === 'parent'
          ? relationship.fromPersonId === tag.docId ? `parent of ${names.get(otherId) ?? otherId}` : `child of ${names.get(otherId) ?? otherId}`
          : `${relationship.type} of ${names.get(otherId) ?? otherId}`;
        return <div className={styles.row} key={relationship.docId}><span>{label}</span><button disabled={saving} onClick={() => change(() => api(`/api/admin/archive-identity/relationship/${relationship.docId}`, { method: 'DELETE' }))}>Remove</button></div>;
      })}</div>
    </div>
  </EditModal>;
}
