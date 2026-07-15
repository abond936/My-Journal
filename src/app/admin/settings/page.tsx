'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { TAG_SET_0_LABEL } from '@/lib/constants/tagSet0';
import {
  DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES,
  type GalleryTagInheritanceToggles,
  type TagSet0Status,
} from '@/lib/types/authorSettings';
import type { TypesenseReconciliationReport } from '@/lib/services/typesenseReconciliation';
import type { BackupOperationsStatus } from '@/lib/services/backupStatusService';
import { DIMENSION_LABEL, DIMENSION_ORDER } from '@/lib/utils/tagDisplay';
import styles from './settings.module.css';

type SettingsResponse = {
  ok: boolean;
  settings?: { galleryTagInheritance: GalleryTagInheritanceToggles };
  reconciliation?: {
    candidateCount: number;
    reconciledCardCount: number;
    failedCardCount: number;
  };
  reconciliationError?: string;
  message?: string;
};

type TagSet0Response = {
  ok: boolean;
  tagSet0?: TagSet0Status;
  result?: {
    alreadyInstalled?: boolean;
    createdCount?: number;
    skippedCount?: number;
    removedCount?: number;
  };
  message?: string;
};

function formatWhen(iso?: string): string {
  if (!iso) return 'Unknown time';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

type OperationsResponse = {
  ok: boolean;
  backup?: BackupOperationsStatus;
  index?: TypesenseReconciliationReport;
  manifest?: {
    runId: string;
    timestamp: string;
    runDir: string;
    complete: boolean;
    firestoreDocCount: number;
    storageObjectCount: number;
  };
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
  const [tagSet0, setTagSet0] = useState<TagSet0Status>({ installed: false, tagCount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagSetBusy, setTagSetBusy] = useState(false);
  const [operations, setOperations] = useState<{
    backup: BackupOperationsStatus | null;
    index: TypesenseReconciliationReport | null;
  }>({ backup: null, index: null });
  const [operationsLoading, setOperationsLoading] = useState(true);
  const [backupRunning, setBackupRunning] = useState(false);

  const isDirty = useMemo(() => !togglesEqual(toggles, savedToggles), [toggles, savedToggles]);

  const loadOperations = useCallback(async () => {
    const res = await fetch('/api/admin/settings/operations');
    const data = (await res.json()) as OperationsResponse;
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load operations status');
    }
    setOperations({
      backup: data.backup ?? null,
      index: data.index ?? null,
    });
  }, []);

  const loadTagSet0 = useCallback(async () => {
    const res = await fetch('/api/admin/tag-set-0');
    const data = (await res.json()) as TagSet0Response;
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load taxonomy status');
    }
    if (data.tagSet0) {
      setTagSet0(data.tagSet0);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [settingsRes] = await Promise.all([
          fetch('/api/admin/author-settings'),
          loadTagSet0().catch((error) => {
            if (!cancelled) {
              feedback.showError(error instanceof Error ? error.message : 'Failed to load taxonomy');
            }
          }),
          loadOperations().catch((error) => {
            if (!cancelled) {
              feedback.showError(
                error instanceof Error ? error.message : 'Failed to load operations status'
              );
            }
          }),
        ]);
        const data = (await settingsRes.json()) as SettingsResponse;
        if (!settingsRes.ok) {
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
          setOperationsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feedback, loadTagSet0, loadOperations]);

  const cancel = useCallback(() => {
    setToggles({ ...savedToggles });
  }, [savedToggles]);

  const save = useCallback(async () => {
    const newlyEnabled = DIMENSION_ORDER.filter(
      (dimension) => !savedToggles[dimension] && toggles[dimension]
    );
    if (newlyEnabled.length > 0) {
      const confirmed = await feedback.confirm({
        title: 'Enable Gallery inheritance?',
        message: `This enables ${newlyEnabled.map((dimension) => DIMENSION_LABEL[dimension]).join(', ')} for new cards. Existing cards remain protected unless you previously opted them into those dimensions; opted-in cards will be recalculated now.`,
        confirmLabel: 'Enable and reconcile',
        cancelLabel: 'Cancel',
      });
      if (!confirmed) return;
    }
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
      if (data.reconciliationError) {
        feedback.showToast({
          tone: 'warning',
          title: 'Settings saved; reconciliation failed',
          message: data.reconciliationError,
        });
      } else if (data.reconciliation?.failedCardCount) {
        feedback.showToast({
          tone: 'warning',
          title: 'Settings saved; some cards need retry',
          message: `Recalculated ${data.reconciliation.reconciledCardCount} of ${data.reconciliation.candidateCount} opted-in cards. ${data.reconciliation.failedCardCount} failed.`,
        });
      } else {
        const count = data.reconciliation?.reconciledCardCount ?? 0;
        feedback.showSuccess(
          count
            ? `Settings saved. Recalculated ${count} opted-in card${count === 1 ? '' : 's'}.`
            : 'Settings saved. No existing protected cards were changed.'
        );
      }
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [feedback, savedToggles, toggles]);

  const installTagSet0 = useCallback(async () => {
    setTagSetBusy(true);
    try {
      const res = await fetch('/api/admin/tag-set-0', { method: 'POST' });
      const data = (await res.json()) as TagSet0Response;
      if (!res.ok) {
        throw new Error(data.message || 'Failed to install starter taxonomy');
      }
      if (data.tagSet0) {
        setTagSet0(data.tagSet0);
      }
      if (data.result?.alreadyInstalled) {
        feedback.showSuccess(`${TAG_SET_0_LABEL} is already installed.`);
        return;
      }
      if ((data.result?.createdCount ?? 0) === 0) {
        feedback.showToast({
          tone: 'warning',
          title: 'Nothing added',
          message:
            'No starter tags were added because matching names already exist in your library.',
        });
        return;
      }
      const skipped = data.result?.skippedCount ?? 0;
      const created = data.result?.createdCount ?? 0;
      feedback.showSuccess(
        skipped > 0
          ? `Added ${created} starter tags. Skipped ${skipped} slots that already exist.`
          : `Added ${created} starter tags.`
      );
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'Failed to install starter taxonomy');
    } finally {
      setTagSetBusy(false);
    }
  }, [feedback]);

  const removeTagSet0 = useCallback(async () => {
    const shouldRemove = await feedback.confirm({
      title: `Remove ${TAG_SET_0_LABEL}?`,
      message:
        'This removes only tags that were added by the starter install. Your existing tags stay in place. Cards and media lose assignments to removed starter tags.',
      confirmLabel: 'Remove starter tags',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!shouldRemove) return;

    setTagSetBusy(true);
    try {
      const res = await fetch('/api/admin/tag-set-0', { method: 'DELETE' });
      const data = (await res.json()) as TagSet0Response;
      if (!res.ok) {
        throw new Error(data.message || 'Failed to remove starter taxonomy');
      }
      if (data.tagSet0) {
        setTagSet0(data.tagSet0);
      }
      const removed = data.result?.removedCount ?? 0;
      feedback.showSuccess(
        removed > 0 ? `Removed ${removed} starter tags.` : 'Starter taxonomy was not installed.'
      );
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'Failed to remove starter taxonomy');
    } finally {
      setTagSetBusy(false);
    }
  }, [feedback]);

  const runBackup = useCallback(async () => {
    const shouldRun = await feedback.confirm({
      title: 'Run paired backup?',
      message:
        'This runs Firestore + Storage backup to your local Firebase Backups folder. It may take several minutes.',
      confirmLabel: 'Run backup',
      cancelLabel: 'Cancel',
    });
    if (!shouldRun) return;

    setBackupRunning(true);
    try {
      const res = await fetch('/api/admin/settings/operations', { method: 'POST' });
      const data = (await res.json()) as OperationsResponse;
      if (!res.ok) {
        throw new Error(data.message || 'Backup failed');
      }
      if (data.backup) {
        setOperations((current) => ({ ...current, backup: data.backup! }));
      }
      if (data.index) {
        setOperations((current) => ({ ...current, index: data.index! }));
      }
      const docs = data.manifest?.firestoreDocCount ?? 0;
      const objects = data.manifest?.storageObjectCount ?? 0;
      feedback.showSuccess(`Backup finished (${docs} Firestore docs, ${objects} storage objects).`);
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'Backup failed');
    } finally {
      setBackupRunning(false);
    }
  }, [feedback]);

  const refreshOperations = useCallback(async () => {
    setOperationsLoading(true);
    try {
      await loadOperations();
      feedback.showSuccess('Operations status refreshed.');
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'Failed to refresh operations status');
    } finally {
      setOperationsLoading(false);
    }
  }, [feedback, loadOperations]);

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
          Author preferences, optional taxonomy, backup posture, and index health. Taxonomy install is
          additive only — it never replaces tags you already created.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="taxonomy-heading">
        <h2 id="taxonomy-heading" className={styles.sectionTitle}>
          Starter taxonomy
        </h2>
        <p className={styles.hint}>
          {TAG_SET_0_LABEL} adds a optional skeleton alongside your existing tag library — family roles,
          general topics, recent years, months, and US states. Install is additive only.
        </p>
        <p className={styles.statusLine}>
          Status:{' '}
          <span className={tagSet0.installed ? styles.statusInstalled : styles.statusNotInstalled}>
            {tagSet0.installed ? `Installed (${tagSet0.tagCount} tags)` : 'Not installed'}
          </span>
        </p>
        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.saveButton}
            disabled={tagSetBusy || tagSet0.installed}
            onClick={() => void installTagSet0()}
          >
            {tagSetBusy ? 'Working…' : 'Install starter taxonomy'}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            disabled={tagSetBusy || !tagSet0.installed}
            onClick={() => void removeTagSet0()}
          >
            Remove starter taxonomy
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="inheritance-heading">
        <h2 id="inheritance-heading" className={styles.sectionTitle}>
          Tag inheritance
        </h2>
        <p className={styles.hint}>
          Choose which dimensions new cards may inherit from their Gallery items. Existing cards remain
          protected until you release a dimension on that card. A released dimension follows the Gallery:
          blank child assignments make it Unreviewed; N/A and Unknown remain intentional tags. Protecting
          it again preserves its current assignments and stops future Gallery changes.
        </p>
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
      </section>

      <section className={styles.section} aria-labelledby="operations-heading">
        <h2 id="operations-heading" className={styles.sectionTitle}>
          Backup &amp; restore
        </h2>
        {operationsLoading && !operations.backup ? (
          <p className={styles.muted}>Loading backup status…</p>
        ) : (
          <>
            <p className={styles.hint}>
              Paired Firestore + Storage snapshots live under your local Firebase Backups folder when
              ONEDRIVE_PATH is configured. Restore always uses guarded CLI commands on a disposable
              target — never from this page.
            </p>
            <ul className={styles.detailList}>
              <li>
                Last complete backup:{' '}
                {operations.backup?.latestComplete ? (
                  <>
                    <strong>{formatWhen(operations.backup.latestComplete.timestamp)}</strong>
                    {' · '}
                    <span className={styles.mono}>{operations.backup.latestComplete.runId}</span>
                  </>
                ) : (
                  'None recorded yet'
                )}
              </li>
              {operations.backup?.backupRoot ? (
                <li>
                  Backup folder: <span className={styles.mono}>{operations.backup.backupRoot}</span>
                </li>
              ) : null}
              {!operations.backup?.readable && operations.backup?.triggerBlockedReason ? (
                <li>{operations.backup.triggerBlockedReason}</li>
              ) : null}
            </ul>
            <div className={styles.inlineActions}>
              <button
                type="button"
                className={styles.saveButton}
                disabled={
                  backupRunning || !operations.backup?.triggerAllowed || operationsLoading
                }
                onClick={() => void runBackup()}
              >
                {backupRunning ? 'Running backup…' : 'Run paired backup'}
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={operationsLoading || backupRunning}
                onClick={() => void refreshOperations()}
              >
                Refresh status
              </button>
            </div>
            <div className={styles.restoreNote}>
              <strong>Restore (CLI only)</strong> — Use a disposable Firebase project, not production.
              Dry-run:{' '}
              <span className={styles.mono}>
                npm run restore:run -- --backup=&quot;&lt;run-dir&gt;&quot;
              </span>
              . Apply only after review. Full drill: <span className={styles.mono}>docs/NPM-SCRIPTS.md</span>{' '}
              → Restore drill.
            </div>
          </>
        )}
      </section>

      <section className={styles.section} aria-labelledby="index-heading">
        <h2 id="index-heading" className={styles.sectionTitle}>
          Search index health
        </h2>
        {operationsLoading && !operations.index ? (
          <p className={styles.muted}>Loading index status…</p>
        ) : operations.index ? (
          <>
            <p className={styles.statusLine}>
              Status:{' '}
              <span
                className={
                  operations.index.healthy ? styles.indexHealthy : styles.indexDegraded
                }
              >
                {!operations.index.configured
                  ? 'Typesense not configured (Firestore fallback)'
                  : operations.index.healthy
                    ? 'Healthy'
                    : 'Needs attention'}
              </span>
            </p>
            {operations.index.configured && operations.index.cards && operations.index.media ? (
              <ul className={styles.detailList}>
                <li>
                  Cards — Firestore {operations.index.cards.firestoreCount}, Typesense{' '}
                  {operations.index.cards.typesenseCount}
                  {operations.index.cards.countDelta !== 0
                    ? ` (delta ${operations.index.cards.countDelta})`
                    : ''}
                </li>
                <li>
                  Media — Firestore {operations.index.media.firestoreCount}, Typesense{' '}
                  {operations.index.media.typesenseCount}
                  {operations.index.media.countDelta !== 0
                    ? ` (delta ${operations.index.media.countDelta})`
                    : ''}
                </li>
                {operations.index.recentSyncFailures.length > 0 ? (
                  <li>
                    Recent sync failures: {operations.index.recentSyncFailures.length}
                  </li>
                ) : null}
              </ul>
            ) : null}
            <p className={styles.hint}>{operations.index.repairHint}</p>
            <div className={styles.inlineActions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={operationsLoading || backupRunning}
                onClick={() => void refreshOperations()}
              >
                Refresh index status
              </button>
            </div>
          </>
        ) : (
          <p className={styles.muted}>Index status unavailable.</p>
        )}
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
          {saving ? 'Saving…' : 'Save inheritance settings'}
        </button>
      </div>
    </div>
  );
}
