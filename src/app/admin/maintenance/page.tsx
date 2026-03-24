'use client';

import React, { useState } from 'react';
import styles from './maintenance.module.css';

type ReconcileReport = {
  cardsWithEmptyGalleryButImportedFolder: Array<{
    cardId: string;
    title: string;
    importedFromFolder: string;
    matchingMediaCount: number;
    matchingMediaIds: string[];
  }>;
  orphanedMedia: Array<{ mediaId: string; filename: string; sourcePath: string }>;
  orphanedReferences: {
    coverImageId: Array<{ cardId: string; mediaId: string }>;
    galleryMedia: Array<{ cardId: string; mediaId: string }>;
    contentMedia: Array<{ cardId: string; mediaId: string }>;
  };
  mediaWithMissingStorage: Array<{ mediaId: string; storagePath: string }>;
  reLinkedCards: string[];
  removedOrphanedRefs: number;
  errors: string[];
};

type CleanupReport = {
  totalMediaDocs: number;
  mediaResetToTemporary: number;
  totalCardsProcessed: number;
  validMediaFound: number;
  invalidMediaRemoved: number;
  mediaActivated: number;
  storageValidationErrors: number;
  errors: string[];
};

type BackfillReport = {
  totalMediaDocs: number;
  processedMediaDocs: number;
  updatedMediaDocs: number;
  skippedMediaDocs: number;
  errors: string[];
  processingTime: number;
};

type CoverDiagnosticCard = {
  cardId: string;
  title: string;
  coverImageId: string | null;
  coverImageFocalPoint: unknown;
  media?: {
    docId: string;
    filename: string;
    width: number;
    height: number;
    storagePath: string | null;
    hasStorageUrl: boolean;
    objectPosition: string | null;
    warnings: string[];
  };
  mediaNotFound?: boolean;
  noCover?: boolean;
};

type CoverDiagnosticResult = {
  searchTitle: string;
  cards: CoverDiagnosticCard[];
  error?: string;
};

async function postMaintenance<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }
  return data;
}

export default function MaintenancePage() {
  // Reconcile
  const [reconcileCardFilter, setReconcileCardFilter] = useState('');
  const [reconcileCheckStorage, setReconcileCheckStorage] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState<'diagnose' | 'fix-dry' | 'fix' | null>(null);
  const [reconcileResult, setReconcileResult] = useState<{
    report: ReconcileReport;
    after?: ReconcileReport;
  } | null>(null);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  // Cleanup
  const [cleanupLoading, setCleanupLoading] = useState<'dry' | 'live' | null>(null);
  const [cleanupResult, setCleanupResult] = useState<{ report: CleanupReport } | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);

  // Backfill
  const [backfillLoading, setBackfillLoading] = useState<'dry' | 'live' | null>(null);
  const [backfillResult, setBackfillResult] = useState<{ report: BackfillReport } | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  // Diagnose cover
  const [coverCardTitle, setCoverCardTitle] = useState('');
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverResult, setCoverResult] = useState<{ result: CoverDiagnosticResult } | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  const handleReconcile = async (action: 'diagnose' | 'fix', dryRun: boolean) => {
    setReconcileError(null);
    setReconcileResult(null);
    setReconcileLoading(action === 'diagnose' ? 'diagnose' : dryRun ? 'fix-dry' : 'fix');
    try {
      const data = await postMaintenance<{ report: ReconcileReport; after?: ReconcileReport }>(
        '/api/admin/maintenance/reconcile',
        {
          action,
          dryRun: action === 'fix' ? dryRun : undefined,
          cardTitleFilter: reconcileCardFilter.trim() || undefined,
          checkStorage: reconcileCheckStorage,
        }
      );
      setReconcileResult(data);
    } catch (e) {
      setReconcileError(e instanceof Error ? e.message : String(e));
    } finally {
      setReconcileLoading(null);
    }
  };

  const handleCleanup = async (dryRun: boolean) => {
    setCleanupError(null);
    setCleanupResult(null);
    setCleanupLoading(dryRun ? 'dry' : 'live');
    try {
      const data = await postMaintenance<{ report: CleanupReport }>(
        '/api/admin/maintenance/cleanup',
        { dryRun }
      );
      setCleanupResult(data);
    } catch (e) {
      setCleanupError(e instanceof Error ? e.message : String(e));
    } finally {
      setCleanupLoading(null);
    }
  };

  const handleBackfill = async (dryRun: boolean) => {
    setBackfillError(null);
    setBackfillResult(null);
    setBackfillLoading(dryRun ? 'dry' : 'live');
    try {
      const data = await postMaintenance<{ report: BackfillReport }>(
        '/api/admin/maintenance/backfill',
        { dryRun }
      );
      setBackfillResult(data);
    } catch (e) {
      setBackfillError(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfillLoading(null);
    }
  };

  const handleDiagnoseCover = async () => {
    if (!coverCardTitle.trim()) return;
    setCoverError(null);
    setCoverResult(null);
    setCoverLoading(true);
    try {
      const data = await postMaintenance<{ result: CoverDiagnosticResult }>(
        '/api/admin/maintenance/diagnose-cover',
        { cardTitle: coverCardTitle.trim() }
      );
      setCoverResult(data);
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : String(e));
    } finally {
      setCoverLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageHeading}>Maintenance</h1>
      <p>Run maintenance scripts from the admin interface. Use dry-run before live fixes.</p>

      {/* Reconcile */}
      <section className={styles.section}>
        <h2>Reconcile Media & Cards</h2>
        <p>
          Identifies and repairs inconsistencies: cards with empty gallery but importedFromFolder,
          orphaned media, orphaned references, missing storage files.
        </p>
        <div className={styles.controls}>
          <div className={styles.inputGroup}>
            <label>Card title filter (optional):</label>
            <input
              type="text"
              value={reconcileCardFilter}
              onChange={(e) => setReconcileCardFilter(e.target.value)}
              placeholder="e.g. American Adventures"
              className={styles.input}
            />
          </div>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={reconcileCheckStorage}
              onChange={(e) => setReconcileCheckStorage(e.target.checked)}
            />
            Check storage files
          </label>
          <div className={styles.buttons}>
            <button
              onClick={() => handleReconcile('diagnose', false)}
              disabled={!!reconcileLoading}
              className={styles.button}
            >
              {reconcileLoading === 'diagnose' ? 'Running...' : 'Diagnose'}
            </button>
            <button
              onClick={() => handleReconcile('fix', true)}
              disabled={!!reconcileLoading}
              className={styles.buttonSecondary}
            >
              {reconcileLoading === 'fix-dry' ? 'Running...' : 'Fix (dry-run)'}
            </button>
            <button
              onClick={() => confirm('Apply fixes?') && handleReconcile('fix', false)}
              disabled={!!reconcileLoading}
              className={styles.buttonDanger}
            >
              {reconcileLoading === 'fix' ? 'Running...' : 'Fix (live)'}
            </button>
          </div>
        </div>
        {reconcileError && <div className={styles.error}>{reconcileError}</div>}
        {reconcileResult && (
          <div className={styles.result}>
            <pre>{JSON.stringify(reconcileResult.report, null, 2)}</pre>
            {reconcileResult.after && (
              <>
                <h4>After reconciliation:</h4>
                <pre>{JSON.stringify(reconcileResult.after, null, 2)}</pre>
              </>
            )}
          </div>
        )}
      </section>

      {/* Cleanup */}
      <section className={styles.section}>
        <h2>Cleanup Media Collection</h2>
        <p>Removes temporary media, orphaned media, and cleans orphaned references from card content.</p>
        <div className={styles.controls}>
          <div className={styles.buttons}>
            <button
              onClick={() => handleCleanup(true)}
              disabled={!!cleanupLoading}
              className={styles.buttonSecondary}
            >
              {cleanupLoading === 'dry' ? 'Running...' : 'Dry-run'}
            </button>
            <button
              onClick={() => confirm('Apply cleanup?') && handleCleanup(false)}
              disabled={!!cleanupLoading}
              className={styles.buttonDanger}
            >
              {cleanupLoading === 'live' ? 'Running...' : 'Run cleanup'}
            </button>
          </div>
        </div>
        {cleanupError && <div className={styles.error}>{cleanupError}</div>}
        {cleanupResult && (
          <div className={styles.result}>
            <pre>{JSON.stringify(cleanupResult.report, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* Backfill */}
      <section className={styles.section}>
        <h2>Backfill Media Metadata</h2>
        <p>Fetches missing width, height, and metadata from storage for media documents.</p>
        <div className={styles.controls}>
          <div className={styles.buttons}>
            <button
              onClick={() => handleBackfill(true)}
              disabled={!!backfillLoading}
              className={styles.buttonSecondary}
            >
              {backfillLoading === 'dry' ? 'Running...' : 'Dry-run'}
            </button>
            <button
              onClick={() => confirm('Apply backfill?') && handleBackfill(false)}
              disabled={!!backfillLoading}
              className={styles.buttonDanger}
            >
              {backfillLoading === 'live' ? 'Running...' : 'Run backfill'}
            </button>
          </div>
        </div>
        {backfillError && <div className={styles.error}>{backfillError}</div>}
        {backfillResult && (
          <div className={styles.result}>
            <pre>{JSON.stringify(backfillResult.report, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* Diagnose cover */}
      <section className={styles.section}>
        <h2>Diagnose Cover Image</h2>
        <p>Inspect cover image configuration for a card by title.</p>
        <div className={styles.controls}>
          <div className={styles.inputGroup}>
            <label>Card title:</label>
            <input
              type="text"
              value={coverCardTitle}
              onChange={(e) => setCoverCardTitle(e.target.value)}
              placeholder="e.g. High School Graduation"
              className={styles.input}
            />
          </div>
          <button
            onClick={handleDiagnoseCover}
            disabled={coverLoading || !coverCardTitle.trim()}
            className={styles.button}
          >
            {coverLoading ? 'Running...' : 'Diagnose'}
          </button>
        </div>
        {coverError && <div className={styles.error}>{coverError}</div>}
        {coverResult && (
          <div className={styles.result}>
            <pre>{JSON.stringify(coverResult.result, null, 2)}</pre>
          </div>
        )}
      </section>
    </div>
  );
}
