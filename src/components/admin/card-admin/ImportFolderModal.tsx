'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getFolderTree } from '@/lib/services/images/local/photoService';
import type { TreeNode } from '@/lib/types/photo';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from './PhotoPicker.module.css';
import importStyles from './ImportFolderModal.module.css';

interface FolderItemProps {
  node: TreeNode;
  selectedFolder: string | null;
  expandedFolders: Set<string>;
  onSelect: (folderId: string) => void;
  onToggle: (folderId: string) => void;
  level?: number;
}

const FolderItem = ({
  node,
  selectedFolder,
  expandedFolders,
  onSelect,
  onToggle,
  level = 0,
}: FolderItemProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedFolders.has(node.id);
  const isSelected = selectedFolder === node.id;

  return (
    <div className={styles.treeNode} style={{ marginLeft: `${level * 8}px` }}>
      <div
        className={`${styles.treeNodeHeader} ${isSelected ? styles.treeNodeSelected : ''}`}
        onClick={() => onSelect(node.id)}
        onDoubleClick={() => hasChildren && onToggle(node.id)}
        role="button"
        tabIndex={0}
      >
        <span className={styles.folderIcon}>📁</span>
        <div className={styles.treeNodeName}>{node.name}</div>
      </div>
      {hasChildren && isExpanded && (
        <div className={styles.treeChildren}>
          {node.children.map((child) => (
            <FolderItem
              key={child.id}
              node={child}
              selectedFolder={selectedFolder}
              expandedFolders={expandedFolders}
              onSelect={onSelect}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ImportFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (cardId: string) => void;
}

interface PreviewResult {
  importSourcePath: string;
  imageCount: number;
  willNormalize: boolean;
  title: string;
  maxImages?: number;
}

interface BatchPreviewSubdir {
  folderPath: string;
  importSourcePath: string;
  imageCount: number;
  title: string;
}

type ImportMode = 'single' | 'batch';

export default function ImportFolderModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportFolderModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<ImportMode>('single');
  const [importAsCard, setImportAsCard] = useState(true);
  const [folderTree, setFolderTree] = useState<TreeNode[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [batchPreview, setBatchPreview] = useState<{
    subdirs: BatchPreviewSubdir[];
    totalSubdirs: number;
    totalImages: number;
  } | null>(null);
  const [batchResult, setBatchResult] = useState<{
    totalImported: number;
    totalSkipped: number;
    totalFailed: number;
  } | null>(null);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isLoadingBatchPreview, setIsLoadingBatchPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [duplicateInfo, setDuplicateInfo] = useState<{
    existingCardId: string;
    existingTitle: string;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadFolderTree = useCallback(async () => {
    try {
      setIsLoadingFolders(true);
      setError(null);
      const tree = await getFolderTree();
      setFolderTree(tree);
      const initialExpanded = new Set<string>();
      const addToExpanded = (nodes: TreeNode[]) => {
        nodes.forEach((node) => {
          if (!['xNormalized', 'yEdited', 'zOriginals'].includes(node.name)) {
            initialExpanded.add(node.id);
          }
          if (node.children?.length) addToExpanded(node.children);
        });
      };
      addToExpanded(tree);
      setExpandedFolders(initialExpanded);
      if (tree.length > 0 && !selectedFolder) {
        setSelectedFolder(tree[0].id);
      }
    } catch (err) {
      setError('Failed to load folder structure.');
      console.error(err);
    } finally {
      setIsLoadingFolders(false);
    }
  }, [selectedFolder]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPreview(null);
      setBatchPreview(null);
      setBatchResult(null);
      setDuplicateInfo(null);
      loadFolderTree();
    }
  }, [isOpen, loadFolderTree]);

  useEffect(() => {
    if (mode === 'batch' && selectedFolder) {
      setIsLoadingBatchPreview(true);
      setBatchPreview(null);
      setBatchResult(null);
      fetch('/api/import/batch/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: selectedFolder }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || data.message || 'Batch preview failed');
          return data;
        })
        .then((data) => setBatchPreview(data))
        .catch((err) => setError(err instanceof Error ? err.message : 'Batch preview failed'))
        .finally(() => setIsLoadingBatchPreview(false));
    } else {
      setBatchPreview(null);
      setBatchResult(null);
    }
  }, [mode, selectedFolder]);

  useEffect(() => {
    if (mode === 'single' && selectedFolder) {
      setIsLoadingPreview(true);
      setPreview(null);
      setPreviewError(null);
      setDuplicateInfo(null);
      fetch('/api/import/folder/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: selectedFolder }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || data.message || 'Preview failed');
          }
          return data;
        })
        .then((data) => {
          setPreview(data);
          setPreviewError(null);
        })
        .catch((err) => {
          setPreviewError(err instanceof Error ? err.message : 'Could not read folder');
          setPreview(null);
        })
        .finally(() => setIsLoadingPreview(false));
    } else {
      setPreview(null);
      setPreviewError(null);
    }
  }, [mode, selectedFolder]);

  const handleFolderSelect = useCallback((folderId: string) => {
    setSelectedFolder(folderId);
    setError(null);
    setDuplicateInfo(null);
  }, []);

  const handleFolderToggle = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const doImport = useCallback(
    async (overwriteCardId?: string) => {
      if (!selectedFolder) return;
      try {
        setIsImporting(true);
        setError(null);
        setDuplicateInfo(null);
        const response = await fetch('/api/import/folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderPath: selectedFolder,
            mediaOnly: !importAsCard,
            ...(overwriteCardId && { overwriteCardId }),
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || data.message || 'Import failed');
        }

        const result = await response.json();

        if (result.exists && result.existingCardId) {
          setDuplicateInfo({
            existingCardId: result.existingCardId,
            existingTitle: result.existingTitle || 'Untitled',
          });
          return;
        }

        onClose();
        if (importAsCard && result.cardId) {
          if (onSuccess) onSuccess(result.cardId);
          else router.push(`/admin/studio?card=${encodeURIComponent(result.cardId)}`);
        } else {
          router.push('/admin/studio');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed');
        console.error(err);
      } finally {
        setIsImporting(false);
      }
    },
    [selectedFolder, importAsCard, onClose, onSuccess, router]
  );

  const doBatchImport = useCallback(async () => {
    if (!selectedFolder) return;
    try {
      setIsImporting(true);
      setError(null);
      setBatchResult(null);
      const response = await fetch('/api/import/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: selectedFolder }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.message || 'Batch import failed');
      }
      const result = await response.json();
      setBatchResult({
        totalImported: result.totalImported,
        totalSkipped: result.totalSkipped,
        totalFailed: result.totalFailed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch import failed');
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  }, [selectedFolder]);

  const handleImport = useCallback(() => doImport(), [doImport]);

  const handleOverwrite = useCallback(() => {
    if (duplicateInfo) doImport(duplicateInfo.existingCardId);
  }, [duplicateInfo, doImport]);

  const handleCancelDuplicate = useCallback(() => {
    setDuplicateInfo(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Import</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.albumList}>
            <div className={importStyles.modeTabs}>
              <button
                type="button"
                className={`${importStyles.modeTab} ${mode === 'single' ? importStyles.active : ''}`}
                onClick={() => setMode('single')}
              >
                Single folder
              </button>
              <button
                type="button"
                className={`${importStyles.modeTab} ${mode === 'batch' ? importStyles.active : ''}`}
                onClick={() => setMode('batch')}
              >
                Batch (all subdirs)
              </button>
            </div>
            <h3 className={styles.albumTitle}>
              {mode === 'single' ? 'Select Folder' : 'Select Root Folder'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--admin-support-meta-color)', marginBottom: '0.5rem' }}>
              {mode === 'single'
                ? 'Album folder (with yEdited/xNormalized) or folder with images.'
                : 'Root folder to search for all xNormalized subdirs.'}
            </p>
            {isLoadingFolders ? (
              <div className={styles.loading}>
                <LoadingSpinner />
                <p>Loading folders...</p>
              </div>
            ) : (
              folderTree.map((node) => (
                <FolderItem
                  key={node.id}
                  node={node}
                  selectedFolder={selectedFolder}
                  expandedFolders={expandedFolders}
                  onSelect={handleFolderSelect}
                  onToggle={handleFolderToggle}
                />
              ))
            )}
          </div>

          <div className={styles.photoGrid}>
            <div className={styles.noContent}>
              {mode === 'batch' ? (
                selectedFolder ? (
                  isLoadingBatchPreview ? (
                    <p>Scanning for xNormalized subdirs...</p>
                  ) : batchPreview ? (
                    <>
                      <div className={importStyles.batchPreview}>
                        <ul className={importStyles.batchPreviewList}>
                          {batchPreview.subdirs.map((s) => (
                            <li key={s.folderPath} className={importStyles.batchPreviewItem}>
                              <span>{s.title}</span>
                              <span>{s.imageCount} images</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className={importStyles.batchSummary}>
                        {batchPreview.totalSubdirs} subdirs, {batchPreview.totalImages} images total
                      </div>
                      {batchResult && (
                        <div className={importStyles.batchResult}>
                          Imported: {batchResult.totalImported} | Skipped (duplicates): {batchResult.totalSkipped} | Failed: {batchResult.totalFailed}
                        </div>
                      )}
                    </>
                  ) : (
                    <p>No xNormalized subdirs found under this root.</p>
                  )
                ) : (
                  <p>Select a root folder</p>
                )
              ) : selectedFolder ? (
                isLoadingPreview ? (
                  <p>Checking folder...</p>
                ) : previewError ? (
                  <p style={{ color: 'var(--color-danger)' }}>{previewError}</p>
                ) : preview ? (
                  preview.imageCount > 0 ? (
                    <>
                      <p><strong>{preview.imageCount}</strong> image{preview.imageCount !== 1 ? 's' : ''} will be imported</p>
                      <div className={importStyles.importTypeRow}>
                        <label>
                          <input
                            type="radio"
                            checked={importAsCard}
                            onChange={() => setImportAsCard(true)}
                          />
                          {' '}As card (gallery)
                        </label>
                        <label>
                          <input
                            type="radio"
                            checked={!importAsCard}
                            onChange={() => setImportAsCard(false)}
                          />
                          {' '}Images only (no card)
                        </label>
                      </div>
                      {importAsCard && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--admin-support-meta-color)', marginTop: '0.5rem' }}>
                          Card title: &quot;{preview.title}&quot;
                        </p>
                      )}
                      {preview.maxImages && preview.imageCount > preview.maxImages && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-danger)', marginTop: '0.5rem', fontWeight: 500 }}>
                          Too many images. Maximum is {preview.maxImages}. Split or increase IMPORT_FOLDER_MAX_IMAGES.
                        </p>
                      )}
                      {preview.willNormalize && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--admin-support-label-color)', marginTop: '0.5rem' }}>
                          Images will be WebP-optimized in memory during import (no local xNormalized folder). Only
                          files named like <code>…__X.jpg</code> are included.
                        </p>
                      )}
                      <p style={{ fontSize: '0.875rem', color: 'var(--admin-support-meta-color)', marginTop: '0.25rem' }}>
                        Metadata (captions) imported when available. Duplicates skipped when importing images only.
                      </p>
                    </>
                  ) : (
                    <p>
                      No matching images. Use files whose names end with <code>__X</code> before the extension (e.g.{' '}
                      <code>photo__X.jpg</code>) in the folder, or under <code>yEdited</code> / <code>xNormalized</code>.
                    </p>
                  )
                ) : (
                  <p>Could not read folder</p>
                )
              ) : (
                <p>Select a folder to import</p>
              )}
            </div>
          </div>
        </div>

        {duplicateInfo ? (
          <div className={styles.footer} style={{ flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              A card &quot;{duplicateInfo.existingTitle}&quot; was already created from this folder.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleOverwrite}
                className={styles.doneButton}
                disabled={isImporting}
                type="button"
              >
                {isImporting ? (
                  <>
                    <LoadingSpinner />
                    <span>Overwriting...</span>
                  </>
                ) : (
                  'Overwrite'
                )}
              </button>
              <button
                onClick={handleCancelDuplicate}
                disabled={isImporting}
                type="button"
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--admin-support-control-border-color)',
                  borderRadius: '4px',
                  background: 'var(--admin-support-control-background-color)',
                  color: 'var(--admin-support-control-text-color)',
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : mode === 'batch' ? (
          <div className={styles.footer}>
            <button
              onClick={doBatchImport}
              className={styles.doneButton}
              disabled={
                !selectedFolder ||
                !batchPreview ||
                batchPreview.totalSubdirs === 0 ||
                isImporting
              }
              type="button"
            >
              {isImporting ? (
                <>
                  <LoadingSpinner />
                  <span>Importing...</span>
                </>
              ) : (
                'Import all as images'
              )}
            </button>
          </div>
        ) : (
          <div className={styles.footer}>
            <button
              onClick={handleImport}
              className={styles.doneButton}
              disabled={
                !selectedFolder ||
                !preview ||
                preview.imageCount === 0 ||
                isImporting ||
                (preview.maxImages != null && preview.imageCount > preview.maxImages)
              }
              type="button"
            >
              {isImporting ? (
                <>
                  <LoadingSpinner />
                  <span>Importing{preview?.willNormalize ? ' (optimizing...)' : ''}...</span>
                </>
              ) : importAsCard ? (
                'Import as Card'
              ) : (
                'Import images only'
              )}
            </button>
          </div>
        )}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
