import type { MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JournalImage from '@/components/common/JournalImage';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Media, PickerMedia, TreeNode } from '@/lib/types/photo';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import styles from '@/components/admin/card-admin/PhotoPicker.module.css';

type MediaLocalImportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (media: Media[]) => Promise<void> | void;
  title?: string;
};

type BatchImportResponse = {
  results: { sourcePath: string; mediaId: string; media: Media; skipped?: boolean }[];
  errors: { sourcePath: string; message: string }[];
  metadataReadIssues?: { sourcePath: string; message: string }[];
};

type FolderItemProps = {
  node: TreeNode;
  selectedFolder: string | null;
  expandedFolders: Set<string>;
  onSelect: (folderId: string) => void;
  onToggle: (folderId: string) => void;
  level?: number;
};

const FolderItem = ({
  node,
  selectedFolder,
  expandedFolders,
  onSelect,
  onToggle,
  level = 0,
}: FolderItemProps) => {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expandedFolders.has(node.id);
  const isSelected = selectedFolder === node.id;

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(node.id);
  };

  const handleDoubleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (hasChildren) {
      onToggle(node.id);
    }
  };

  return (
    <div className={styles.treeNode} style={{ marginLeft: `${level * 8}px` }}>
      <div
        className={`${styles.treeNodeHeader} ${isSelected ? styles.treeNodeSelected : ''}`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        role="button"
        tabIndex={0}
        style={{
          cursor: 'pointer',
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggle(node.id);
            }}
            className={styles.treeToggle}
          >
            {isExpanded ? '-' : '+'}
          </button>
        ) : (
          <span className={styles.treeToggleSpacer} aria-hidden="true">
            &nbsp;
          </span>
        )}
        <span className={styles.folderIcon}>📁</span>
        <div className={styles.treeNodeName}>{node.name}</div>
      </div>

      {hasChildren && isExpanded ? (
        <div className={styles.treeChildren}>
          {node.children!.map((child) => (
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
      ) : null}
    </div>
  );
};

function shouldAutoCollapse(folderName: string) {
  return folderName === 'xNormalized' || folderName === 'yEdited' || folderName === 'zOriginals';
}

function collectExpandableIds(nodes: TreeNode[]): Set<string> {
  const ids = new Set<string>();
  const walk = (list: TreeNode[]) => {
    list.forEach((node) => {
      if (!shouldAutoCollapse(node.name)) {
        ids.add(node.id);
      }
      if (node.children?.length) {
        walk(node.children);
      }
    });
  };
  walk(nodes);
  return ids;
}

function treeContainsId(nodes: TreeNode[], targetId: string): boolean {
  return nodes.some((node) => node.id === targetId || treeContainsId(node.children ?? [], targetId));
}

async function loadLocalFolderTree(): Promise<TreeNode[]> {
  const response = await fetch('/api/images/local/folder-tree');
  if (!response.ok) {
    throw new Error('Failed to fetch folder tree');
  }
  return response.json();
}

async function loadLocalFolderContents(folderPath: string): Promise<PickerMedia[]> {
  const response = await fetch('/api/images/local/folder-contents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to load folder contents:', response.status, errorText);
    throw new Error(`Failed to load folder contents for ${folderPath}: ${errorText}`);
  }
  return response.json();
}

export default function MediaLocalImportDialog({
  isOpen,
  onClose,
  onImportComplete,
  title = 'Import Media',
}: MediaLocalImportDialogProps) {
  const feedback = useAppFeedback();
  const [folderTree, setFolderTree] = useState<TreeNode[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PickerMedia[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<PickerMedia[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importElapsedSec, setImportElapsedSec] = useState(0);
  const [readEmbeddedMetadata, setReadEmbeddedMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMetadataNotice, setImportMetadataNotice] = useState<string | null>(null);
  const photoLoadRequestSeqRef = useRef(0);

  const hasSelection = selectedPhotos.length > 0;

  const resetDialog = useCallback(() => {
    setFolderTree([]);
    setSelectedFolder(null);
    setPhotos([]);
    setSelectedPhotos([]);
    setExpandedFolders(new Set());
    setIsLoadingFolders(false);
    setIsLoadingPhotos(false);
    setIsImporting(false);
    setImportElapsedSec(0);
    setReadEmbeddedMetadata(false);
    setError(null);
    setImportMetadataNotice(null);
  }, []);

  const loadFolderTree = useCallback(async () => {
    try {
      setIsLoadingFolders(true);
      setError(null);
      const tree = await loadLocalFolderTree();
      setFolderTree(tree);
      setExpandedFolders(collectExpandableIds(tree));
      setSelectedFolder((prev) => (prev && treeContainsId(tree, prev) ? prev : tree[0]?.id ?? null));
    } catch (err) {
      setError('Failed to load folder structure. Please try again.');
      console.error('Error loading folder tree:', err);
    } finally {
      setIsLoadingFolders(false);
    }
  }, []);

  const loadPhotos = useCallback(async (folderId: string) => {
    const requestSeq = photoLoadRequestSeqRef.current + 1;
    photoLoadRequestSeqRef.current = requestSeq;
    try {
      setIsLoadingPhotos(true);
      setError(null);
      const contents = await loadLocalFolderContents(folderId);
      if (photoLoadRequestSeqRef.current === requestSeq) {
        setPhotos(contents);
      }
    } catch (err) {
      if (photoLoadRequestSeqRef.current === requestSeq) {
        setError('Failed to load photos. Please try again.');
      }
      console.error('Error loading photos:', err);
    } finally {
      if (photoLoadRequestSeqRef.current === requestSeq) {
        setIsLoadingPhotos(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetDialog();
      return;
    }
    void loadFolderTree();
  }, [isOpen, loadFolderTree, resetDialog]);

  useEffect(() => {
    if (!selectedFolder) return;
    void loadPhotos(selectedFolder);
  }, [selectedFolder, loadPhotos]);

  useEffect(() => {
    if (!isImporting) return;
    setImportElapsedSec(0);
    const id = window.setInterval(() => {
      setImportElapsedSec((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isImporting]);

  const handleFolderSelect = useCallback((folderId: string) => {
    setSelectedFolder(folderId);
    setSelectedPhotos([]);
    setPhotos([]);
    setError(null);
  }, []);

  const handleFolderToggle = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const expandAllFolders = useCallback(() => {
    setExpandedFolders(collectExpandableIds(folderTree));
  }, [folderTree]);

  const collapseAllFolders = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const handlePhotoSelect = useCallback((photo: PickerMedia) => {
    if (isImporting) return;
    setSelectedPhotos((prev) => {
      const isSelected = prev.some((item) => item.sourcePath === photo.sourcePath);
      if (isSelected) {
        return prev.filter((item) => item.sourcePath !== photo.sourcePath);
      }
      return [...prev, photo];
    });
  }, [isImporting]);

  const handleImport = useCallback(async () => {
    if (selectedPhotos.length === 0) return;

    const maxSourcePathsPerRequest = 40;

    try {
      setImportElapsedSec(0);
      setIsImporting(true);
      setError(null);
      setImportMetadataNotice(null);

      const importedResults: Media[] = [];
      const importFailures: { sourcePath: string; message: string }[] = [];
      let skippedCount = 0;
      let anyMetadataReadIssue = false;

      for (let i = 0; i < selectedPhotos.length; i += maxSourcePathsPerRequest) {
        const slice = selectedPhotos.slice(i, i + maxSourcePathsPerRequest);
        const response = await fetch('/api/images/local/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourcePaths: slice.map((photo) => photo.sourcePath),
            readEmbeddedMetadata,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const message = errorText || `HTTP ${response.status}`;
          slice.forEach((photo) => {
            importFailures.push({ sourcePath: photo.sourcePath, message });
          });
          continue;
        }

        const data = (await response.json()) as BatchImportResponse;
        importedResults.push(...(data.results ?? []).map((result) => result.media));
        skippedCount += (data.results ?? []).filter((result) => result.skipped === true).length;
        importFailures.push(...(data.errors ?? []));

        const metadataIssues = data.metadataReadIssues ?? [];
        if (readEmbeddedMetadata && metadataIssues.length > 0) {
          anyMetadataReadIssue = true;
          const uniqueMessages = [...new Set(metadataIssues.map((issue) => issue.message))];
          setImportMetadataNotice(
            `Import metadata was on, but Exif could not run for ${metadataIssues.length} file(s): ${uniqueMessages.join('; ')} ` +
              'Set EXIFTOOL_PATH to your exiftool binary if it is not in the default location.'
          );
        }
      }

      if (importedResults.length > 0) {
        await onImportComplete?.(importedResults);
      }

      if (skippedCount > 0) {
        feedback.showToast({
          title: 'Already in library',
          tone: 'info',
          message:
            skippedCount === 1
              ? 'That image source path already exists, so the existing media record was reused.'
              : `${skippedCount} image source paths already existed, so the existing media records were reused.`,
        });
      }

      if (importFailures.length > 0) {
        const failedList = importFailures.map((failure) => `${failure.sourcePath}: ${failure.message}`).join('; ');
        if (importedResults.length === 0) {
          setError(
            importFailures.length === selectedPhotos.length
              ? `Import failed (${importFailures.length} file(s)): ${failedList}`
              : `Import failed: ${failedList}`
          );
        } else {
          setError(
            `${importFailures.length} of ${selectedPhotos.length} failed - ${failedList}. ` +
              `${importedResults.length} added to the media bank.`
          );
        }
      }

      if (importedResults.length > 0 && importFailures.length === 0 && !anyMetadataReadIssue) {
        onClose();
      }
    } catch (err) {
      console.error('Error importing photos:', err);
      setError(err instanceof Error ? err.message : 'Failed to import photos');
    } finally {
      setIsImporting(false);
      setImportElapsedSec(0);
    }
  }, [feedback, onClose, onImportComplete, readEmbeddedMetadata, selectedPhotos]);

  const retryLocal = useCallback(() => {
    setError(null);
    if (selectedFolder) {
      void loadPhotos(selectedFolder);
    } else {
      void loadFolderTree();
    }
  }, [loadFolderTree, loadPhotos, selectedFolder]);

  const selectedPhotoIds = useMemo(() => new Set(selectedPhotos.map((photo) => photo.sourcePath)), [selectedPhotos]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close import dialog">
            X
          </button>
        </div>
        <p className={styles.sourceHint}>
          Import new files into the media bank from your configured local folders.
        </p>

        <div className={styles.content}>
          <div className={styles.albumList}>
            <h3 className={styles.albumTitle}>Albums</h3>
            {!isLoadingFolders && folderTree.length > 0 ? (
              <div className={styles.treeToolbar}>
                <button
                  type="button"
                  className={styles.treeToolButton}
                  onClick={expandAllFolders}
                  title="Open every folder branch (except processing folders)"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  className={styles.treeToolButton}
                  onClick={collapseAllFolders}
                  title="Close all branches (root folders stay visible)"
                >
                  Collapse all
                </button>
              </div>
            ) : null}
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
            {isLoadingPhotos ? (
              <div className={styles.loading}>
                <LoadingSpinner />
                <p>Loading photos...</p>
              </div>
            ) : photos.length === 0 ? (
              <div className={styles.noContent}>No photos in this album</div>
            ) : (
              <div className={styles.grid}>
                {photos.map((photo) => {
                  const isSelected = selectedPhotoIds.has(photo.sourcePath);
                  return (
                    <div
                      key={photo.id}
                      className={`${styles.photoItem} ${isSelected ? styles.photoItemSelected : ''}`}
                      onClick={() => handlePhotoSelect(photo)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handlePhotoSelect(photo);
                        }
                      }}
                    >
                      <JournalImage
                        src={getDisplayUrl(photo)}
                        alt={photo.filename}
                        className={styles.photoImage}
                        width={150}
                        height={150}
                        sizes="150px"
                        priority={false}
                      />
                      <div className={styles.photoFilename} title={photo.filename}>
                        {photo.filename}
                      </div>
                      {isSelected ? <div className={styles.checkmark} aria-hidden="true">v</div> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          {importMetadataNotice ? (
            <div className={styles.importMetadataNotice} role="alert">
              {importMetadataNotice}
            </div>
          ) : null}
          <label className={styles.footerMetaToggle}>
            <input
              type="checkbox"
              checked={readEmbeddedMetadata}
              onChange={(event) => setReadEmbeddedMetadata(event.target.checked)}
              disabled={isImporting}
            />
            <span>Import Metadata.</span>
          </label>
          {isImporting ? (
            <p className={styles.importProgressHint} role="status" aria-live="polite">
              Server import in progress ({importElapsedSec}s). The browser waits for the whole batch to finish.
              {readEmbeddedMetadata
                ? ' With import metadata on, each file runs ExifTool and can take noticeably longer.'
                : ''}
            </p>
          ) : null}
          <div className={styles.footerRow}>
            <button
              type="button"
              onClick={() => void handleImport()}
              className={styles.doneButton}
              disabled={!hasSelection || isImporting}
            >
              {isImporting ? (
                <>
                  <LoadingSpinner />
                  <span>
                    Importing {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''}...
                  </span>
                </>
              ) : (
                `Import ${selectedPhotos.length} photo${selectedPhotos.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>

        {error ? (
          <div className={styles.error} role="alert">
            {error}
            <button type="button" onClick={retryLocal} className={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
