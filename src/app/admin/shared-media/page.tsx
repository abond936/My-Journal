'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import AudienceSelector from '@/components/admin/audience/AudienceSelector';
import CopyReaderLinkButton from '@/components/admin/common/CopyReaderLinkButton';
import type { AudienceSelection } from '@/lib/types/audience';
import type { Media } from '@/lib/types/photo';
import type { SharedMediaCollection } from '@/lib/types/sharedMediaCollection';
import styles from './shared-media-admin.module.css';

type Detail = { collection: SharedMediaCollection; media: Media[] };

export default function SharedMediaAdminPage() {
  const [collections, setCollections] = useState<SharedMediaCollection[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadCollections = useCallback(async (preferredId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/shared-media-collections');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Shared Media Collections could not be loaded.');
      const items = Array.isArray(data.collections) ? data.collections as SharedMediaCollection[] : [];
      setCollections(items);
      setSelectedId((current) => preferredId || current || items[0]?.docId || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Shared Media Collections could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCollections(); }, [loadCollections]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/admin/shared-media-collections/${encodeURIComponent(selectedId)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'This Shared Media Collection could not be loaded.');
        if (cancelled) return;
        const next = { collection: data.collection, media: data.media } as Detail;
        setDetail(next);
        setTitle(next.collection.title);
        setDescription(next.collection.description ?? '');
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'This Shared Media Collection could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedId]);

  const patch = useCallback(async (change: Record<string, unknown>): Promise<SharedMediaCollection | null> => {
    if (!detail || busy) return null;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/shared-media-collections/${encodeURIComponent(detail.collection.docId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: detail.collection.revision, ...change }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'The Shared Media Collection could not be saved.');
      const collection = data.collection as SharedMediaCollection;
      setDetail((current) => current ? { ...current, collection } : current);
      setCollections((current) => current.map((item) => item.docId === collection.docId ? collection : item));
      return collection;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The Shared Media Collection could not be saved.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [busy, detail]);

  const create = async () => {
    if (!newTitle.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/shared-media-collections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), mediaIds: [] }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'The Shared Media Collection could not be created.');
      setNewTitle('');
      setMessage('Private draft created. Select photos in Studio Media to add them.');
      await loadCollections(data.collection.docId);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'The Shared Media Collection could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const removeMedia = async (mediaId: string) => {
    if (!detail) return;
    const saved = await patch({ mediaIds: detail.collection.mediaIds.filter((id) => id !== mediaId) });
    if (saved) {
      setDetail((current) => current ? { ...current, media: current.media.filter((item) => item.docId !== mediaId) } : current);
      setMessage('Photo removed from this Shared Media Collection. The Media item and Story uses are unchanged.');
    }
  };

  return (
    <main className={styles.page}>
      <header><h1>Shared Media Collections</h1><p>Curate bounded photo sets for selected readers without exposing the private Media library.</p></header>
      <section className={styles.create}>
        <input aria-label="New Shared Media Collection title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="New photo collection title" />
        <button type="button" disabled={busy || !newTitle.trim()} onClick={() => void create()}>Create private draft</button>
      </section>
      {collections.length ? (
        <select aria-label="Shared Media Collection" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          {collections.map((collection) => <option key={collection.docId} value={collection.docId}>{collection.title}</option>)}
        </select>
      ) : !loading ? <p>No Shared Media Collections yet.</p> : null}
      {loading ? <p aria-busy="true">Loading...</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {message ? <p className={styles.message} role="status">{message}</p> : null}
      {detail ? (
        <>
          <section className={styles.editor}>
            <div>
              <strong>{detail.collection.lifecycle === 'published' ? 'Published' : 'Private draft'}</strong>
              <span>Revision {detail.collection.revision}</span>
            </div>
            <label>Title<input value={title} disabled={busy || detail.collection.lifecycle === 'published'} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>Description<textarea value={description} disabled={busy || detail.collection.lifecycle === 'published'} onChange={(event) => setDescription(event.target.value)} /></label>
            <div className={styles.actions}>
              <button type="button" disabled={busy || detail.collection.lifecycle === 'published' || !title.trim()} onClick={() => void patch({ title, description }).then((saved) => { if (saved) setMessage('Collection details saved.'); })}>Save details</button>
              <button type="button" disabled={busy} onClick={() => void patch({ lifecycle: detail.collection.lifecycle === 'published' ? 'draft' : 'published' }).then((saved) => { if (saved) setMessage(saved.lifecycle === 'published' ? 'Photo collection published to its selected audience.' : 'Photo collection returned to Draft.'); })}>
                {detail.collection.lifecycle === 'published' ? 'Return to Draft' : 'Publish photo collection'}
              </button>
              {detail.collection.lifecycle === 'published' ? (
                <CopyReaderLinkButton path={`/shared-media/${encodeURIComponent(detail.collection.docId)}`} />
              ) : null}
            </div>
          </section>
          <AudienceSelector
            value={detail.collection.audience}
            scopeLabel="Photo collection"
            consequence="Only this selected set becomes available through this route. Other archive Media remain private."
            disabled={busy || detail.collection.lifecycle === 'published'}
            onSave={async (audience: AudienceSelection) => Boolean(await patch({ audience }))}
          />
          <section>
            <h2>Photos ({detail.media.length})</h2>
            <p>Select photos in Studio Media to create or add to a Shared Media Collection. Removing one here does not delete it or alter any Story.</p>
            <div className={styles.grid}>
              {detail.media.map((media) => (
                <article key={media.docId}>
                  <Image src={media.storageUrl} alt={media.caption || media.filename} width={media.width} height={media.height} sizes="12rem" />
                  <span>{media.caption || media.filename}</span>
                  <button type="button" disabled={busy || detail.collection.lifecycle === 'published'} onClick={() => void removeMedia(media.docId)}>Remove</button>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
