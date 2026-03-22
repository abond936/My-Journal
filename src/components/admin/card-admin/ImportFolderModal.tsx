'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getFolderTree } from '@/lib/services/images/local/photoService';
import type { TreeNode } from '@/lib/types/photo';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from './PhotoPicker.module.css';

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
}

export default function ImportFolderModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportFolderModalProps) {
  const router = useRouter();
  const [folderTree, setFolderTree] = useState<TreeNode[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
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
      setDuplicateInfo(null);
      loadFolderTree();
    }
  }, [isOpen, loadFolderTree]);

  useEffect(() => {
    if (selectedFolder) {
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
  }, [selectedFolder]);

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
        if (onSuccess) {
          onSuccess(result.cardId);
        } else {
          router.push(`/admin/card-admin/${result.cardId}/edit`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed');
        console.error(err);
      } finally {
        setIsImporting(false);
      }
    },
    [selectedFolder, onClose, onSuccess, router]
  );

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
          <h2 className={styles.title}>Import Folder as Card</h2>
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
            <h3 className={styles.albumTitle}>Select Folder</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text2-color)', marginBottom: '0.5rem' }}>
              Select the album folder (with yEdited/xNormalized) or a folder with images.
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
              {selectedFolder ? (
                isLoadingPreview ? (
                  <p>Checking folder...</p>
                ) : previewError ? (
                  <p style={{ color: 'var(--color-danger)' }}>{previewError}</p>
                ) : preview ? (
                  preview.imageCount > 0 ? (
                    <>
                      <p><strong>{preview.imageCount}</strong> image{preview.imageCount !== 1 ? 's' : ''} will be imported</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text2-color)', marginTop: '0.5rem' }}>
                        Card title: &quot;{preview.title}&quot;
                      </p>
                      {preview.willNormalize && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--color3)', marginTop: '0.5rem' }}>
                          Will normalize yEdited → xNormalized before import
                        </p>
                      )}
                      <p style={{ fontSize: '0.875rem', color: 'var(--text2-color)', marginTop: '0.25rem' }}>
                        Metadata (captions) imported when available from .json or image properties.
                      </p>
                    </>
                  ) : (
                    <p>No images found. Select a folder with yEdited, xNormalized, or images.</p>
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
                  border: '1px solid var(--border1-color)',
                  borderRadius: '4px',
                  background: 'var(--layout-background2-color)',
                  color: 'var(--text1-color)',
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.footer}>
            <button
              onClick={handleImport}
              className={styles.doneButton}
              disabled={!selectedFolder || !preview || preview.imageCount === 0 || isImporting}
              type="button"
            >
              {isImporting ? (
                <>
                  <LoadingSpinner />
                  <span>Importing{preview?.willNormalize ? ' (normalizing...)' : ''}...</span>
                </>
              ) : (
                'Import as Card'
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
