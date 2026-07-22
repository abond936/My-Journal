'use client';

import { useMemo, useState } from 'react';
import EditModal from '@/components/admin/studio/cards/EditModal';
import type { Tag } from '@/lib/types/tag';
import styles from './WhoRelationshipModal.module.css';

export function TagMergeModal({ source, tags, onClose, onMerge }: {
  source: Tag | null;
  tags: Tag[];
  onClose: () => void;
  onMerge: (sourceId: string, targetId: string) => Promise<boolean>;
}) {
  const [targetId, setTargetId] = useState('');
  const [working, setWorking] = useState(false);
  const candidates = useMemo(() => source ? tags
    .filter((tag) => tag.docId && tag.docId !== source.docId && tag.dimension === source.dimension)
    .filter((tag) => !(tag.path ?? []).includes(source.docId!))
    .sort((a, b) => a.name.localeCompare(b.name)) : [], [source, tags]);
  if (!source?.docId) return null;
  return <EditModal isOpen onClose={working ? () => undefined : onClose} title={`Merge: ${source.name}`} size="wide">
    <div className={styles.form}>
      <p className={styles.status}>Choose the surviving tag. All assignments and subjects will be consolidated into it. Direct children of {source.name} will move beneath it.</p>
      <label>Merge into<select value={targetId} onChange={(event) => setTargetId(event.target.value)} disabled={working}>
        <option value="">Choose a same-dimension tag</option>
        {candidates.map((tag) => <option key={tag.docId} value={tag.docId}>{tag.name}</option>)}
      </select></label>
      <div className={styles.actions}>
        <button type="button" disabled={working} onClick={onClose}>Cancel</button>
        <button type="button" disabled={working || !targetId} onClick={async () => {
          setWorking(true);
          const merged = await onMerge(source.docId!, targetId);
          setWorking(false);
          if (merged) onClose();
        }}>{working ? 'Assessing…' : 'Review merge'}</button>
      </div>
    </div>
  </EditModal>;
}
