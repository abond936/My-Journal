'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import {
  DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES,
  type GalleryTagInheritanceToggles,
} from '@/lib/types/authorSettings';
import { DIMENSION_LABEL, DIMENSION_ORDER } from '@/lib/utils/tagDisplay';
import styles from './settings.module.css';

type SettingsResponse = {
  ok: boolean;
  settings?: { galleryTagInheritance: GalleryTagInheritanceToggles };
  message?: string;
};

function togglesEqual(
  a: GalleryTagInheritanceToggles,
  b: GalleryTagInheritanceToggles
): boolean {
  return DIMENSION_ORDER.every((dimension) => a[dimension] === b[dimension]);
}

export default function AdminSettingsPage() {
  const feedback = useAppFeedback();
  const [savedToggles, setSavedToggles] = useState<GalleryTagInheritanceToggles>({
    ...DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES,
  });
  const [toggles, setToggles] = useState<GalleryTagInheritanceToggles>({
    ...DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(() => !togglesEqual(toggles, savedToggles), [toggles, savedToggles]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/author-settings');
        const data = (await res.json()) as SettingsResponse;
        if (!res.ok) {
          throw new Error(data.message || 'Failed to load settings');
        }
        if (!cancelled && data.settings?.galleryTagInheritance) {
          setSavedToggles(data.settings.galleryTagInheritance);
          setToggles(data.settings.galleryTagInheritance);
        }
      } catch (error) {
        if (!cancelled) {
          feedback.showError(error instanceof Error ? error.message : 'Failed to load settings');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feedback]);

  const cancel = useCallback(() => {
    setToggles({ ...savedToggles });
  }, [savedToggles]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/author-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryTagInheritance: toggles }),
      });
      const data = (await res.json()) as SettingsResponse;
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save settings');
      }
      if (data.settings?.galleryTagInheritance) {
        setSavedToggles(data.settings.galleryTagInheritance);
        setToggles(data.settings.galleryTagInheritance);
      }
      feedback.showSuccess('Settings saved.');
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [feedback, toggles]);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Loading settings…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.lead}>
          Gallery→card tag inheritance copies confirmed tags from gallery media onto cards when
          enabled. All dimensions default off.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="inheritance-heading">
        <h2 id="inheritance-heading" className={styles.sectionTitle}>
          Tag inheritance
        </h2>
        <ul className={styles.toggleList}>
          {DIMENSION_ORDER.map((dimension) => (
            <li key={dimension}>
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={toggles[dimension]}
                  disabled={saving}
                  onChange={(event) =>
                    setToggles((current) => ({
                      ...current,
                      [dimension]: event.target.checked,
                    }))
                  }
                />
                <span>{DIMENSION_LABEL[dimension]}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className={styles.hint}>
          When on, changing gallery membership or gallery-media tags updates card tags for that
          dimension automatically.
        </p>
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelButton}
          disabled={saving || !isDirty}
          onClick={cancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.saveButton}
          disabled={saving || !isDirty}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
