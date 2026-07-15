'use client';

import React, { useMemo, useState } from 'react';
import EditModal from '@/components/admin/studio/cards/EditModal';
import type { Person } from '@/lib/types/archiveIdentity';
import type { Tag } from '@/lib/types/tag';
import styles from './PeopleAdminPanel.module.css';

type Props = {
  person: Person | null;
  whoTags: Tag[];
  saving: boolean;
  onClose: () => void;
  onSave: (update: Pick<Person, 'canonicalName' | 'aliases' | 'linkedWhoTagId'>) => Promise<void>;
};

export default function IdentityEditModal({ person, whoTags, saving, onClose, onSave }: Props) {
  const [canonicalName, setCanonicalName] = useState(person?.canonicalName ?? '');
  const [aliases, setAliases] = useState(person?.aliases.map((alias) => alias.name).join(', ') ?? '');
  const [linkedWhoTagId, setLinkedWhoTagId] = useState(person?.linkedWhoTagId ?? '');
  const legacyNames = useMemo(() => {
    const byId = new Map(whoTags.filter((tag) => tag.docId).map((tag) => [tag.docId!, tag.name]));
    return person?.legacyWhoTagIds.map((id) => byId.get(id) ?? id) ?? [];
  }, [person, whoTags]);

  if (!person) return null;
  return (
    <EditModal isOpen onClose={onClose} title={`Identity: ${person.canonicalName}`} size="wide">
      <div className={styles.identityEditForm}>
        <label>Type<input value={person.kind === 'nonhuman' ? 'Non-human subject' : 'Person'} disabled /></label>
        <label>Canonical name<input value={canonicalName} onChange={(event) => setCanonicalName(event.target.value)} /></label>
        <label>Aliases<input value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder="Names, separated by commas" /></label>
        <label>Linked Who tag<select value={linkedWhoTagId} onChange={(event) => setLinkedWhoTagId(event.target.value)}>
          {!person.linkedWhoTagId ? <option value="">No linked Who tag</option> : null}
          {whoTags.map((tag) => <option key={tag.docId} value={tag.docId}>{tag.name}</option>)}
        </select></label>
        <div className={styles.identityLegacy}><strong>Legacy Who links</strong><span>{legacyNames.length ? legacyNames.join(', ') : 'None'}</span></div>
        <div className={styles.identityEditActions}>
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" disabled={saving || !canonicalName.trim()} onClick={() => void onSave({
            canonicalName: canonicalName.trim(),
            aliases: aliases.split(',').map((name) => name.trim()).filter(Boolean).map((name) => ({ name })),
            ...(linkedWhoTagId ? { linkedWhoTagId } : {}),
          })}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </EditModal>
  );
}
