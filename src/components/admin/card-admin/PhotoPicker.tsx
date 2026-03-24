'use client';

import { useState, useEffect, useCallback } from 'react';
import JournalImage from '@/components/common/JournalImage';
import { getFolderTree, getFolderContents } from '@/lib/services/images/local/photoService';
import { Media, PickerMedia, TreeNode } from '@/lib/types/photo';
import { HydratedGalleryMediaItem } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import styles from './PhotoPicker.module.css';

type SourceTab = 'local' | 'library';

const LIBRARY_PAGE_LIMIT = 40;

interface PhotoPickerProps {
  isOpen: boolean;
  onSelect?: (media: Media) => void;
  onMultiSelect?: (media: HydratedGalleryMediaItem[]) => void;
  onClose: () => void;
  initialMode?: 'single' | 'multi';
}

interface MediaListApiResponse {
  media: Media[];
  pagination: {
    limit: number;
    hasNext: boolean;
    nextCursor?: string | null;
  };
}

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

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(node.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
          backgroundColor: isSelected ? '#f0f0f0' : 'transparent',
          cursor: 'pointer',
        }}
      >
        <span className={styles.folderIcon}>📁</span>
        <div className={styles.treeNodeName}>{node.name}</div>
      </div>

      {hasChildren && isExpanded && (
        <div className={styles.treeChildren}>
          {node.children.map(child => (
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

export default function PhotoPicker({
  isOpen,
  onSelect,
  onMultiSelect,
  onClose,
  initialMode = 'single',
}: PhotoPickerProps) {
  const [sourceTab, setSourceTab] = useState<SourceTab>('local');

  const [folderTree, setFolderTree] = useState<TreeNode[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PickerMedia[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<PickerMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode] = useState<'single' | 'multi'>(initialMode);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const [libraryItems, setLibraryItems] = useState<Media[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryLoadingMore, setLibraryLoadingMore] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryNextCursor, setLibraryNextCursor] = useState<string | null>(null);
  const [libraryHasNext, setLibraryHasNext] = useState(false);
  const [librarySearchDraft, setLibrarySearchDraft] = useState('');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [selectedLibraryMedia, setSelectedLibraryMedia] = useState<Media[]>([]);

  const shouldAutoCollapse = (folderName: string) =>
    folderName === 'xNormalized' || folderName === 'yEdited' || folderName === 'zOriginals';

  const collectExpandableIds = useCallback((nodes: TreeNode[]): Set<string> => {
    const ids = new Set<string>();
    const walk = (list: TreeNode[]) => {
      list.forEach(node => {
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
  }, []);

  const expandAllFolders = useCallback(() => {
    setExpandedFolders(collectExpandableIds(folderTree));
  }, [folderTree, collectExpandableIds]);

  const collapseAllFolders = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const loadFolderTree = useCallback(async () => {
    try {
      setIsLoadingFolders(true);
      setError(null);
      const tree = await getFolderTree();
      setFolderTree(tree);

      // Default: only top-level folders expanded — shorter tree; use "Expand all" for full depth.
      const initialExpanded = new Set<string>(
        tree.filter(node => !shouldAutoCollapse(node.name)).map(node => node.id)
      );
      setExpandedFolders(initialExpanded);

      if (tree.length > 0) {
        setSelectedFolder(tree[0].id);
      }
    } catch (err) {
      setError('Failed to load folder structure. Please try again.');
      console.error('Error loading folder tree:', err);
    } finally {
      setIsLoadingFolders(false);
    }
  }, []);

  const loadPhotos = useCallback(async (folderId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const contents = await getFolderContents(folderId);
      setPhotos(contents);
    } catch (err) {
      setError('Failed to load photos. Please try again.');
      console.error('Error loading photos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFolderSelect = useCallback((folderId: string) => {
    setSelectedFolder(folderId);
    setSelectedPhotos([]);
    setError(null);
  }, []);

  const handleFolderToggle = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const completeLocalImport = useCallback(
    async (pickerPhotos: PickerMedia[]) => {
      if (pickerPhotos.length === 0) return;

      const CONCURRENT_IMPORTS = 5;

      try {
        setIsImporting(true);
        setError(null);

        const importedResults: { mediaId: string; media: Media }[] = [];

        for (let i = 0; i < pickerPhotos.length; i += CONCURRENT_IMPORTS) {
          const chunk = pickerPhotos.slice(i, i + CONCURRENT_IMPORTS);
          const chunkResults = await Promise.all(
            chunk.map(async photo => {
              const response = await fetch('/api/images/local/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourcePath: photo.sourcePath }),
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to import image: ${errorText}`);
              }

              return (await response.json()) as { mediaId: string; media: Media };
            })
          );
          importedResults.push(...chunkResults);
        }

        if (mode === 'single') {
          if (importedResults.length > 0 && onSelect) {
            onSelect(importedResults[0].media);
          }
        } else if (mode === 'multi' && onMultiSelect) {
          const hydratedItems: HydratedGalleryMediaItem[] = importedResults.map(res => ({
            mediaId: res.mediaId,
            order: 0,
            media: res.media,
          }));
          onMultiSelect(hydratedItems);
        }
        onClose();
      } catch (err) {
        console.error('Error importing photos:', err);
        setError(err instanceof Error ? err.message : 'Failed to import photos');
      } finally {
        setIsImporting(false);
      }
    },
    [mode, onSelect, onMultiSelect, onClose]
  );

  const completeLibrarySelection = useCallback(() => {
    if (selectedLibraryMedia.length === 0 || !onMultiSelect) return;
    const hydrated: HydratedGalleryMediaItem[] = selectedLibraryMedia.map((media, order) => ({
      mediaId: media.docId,
      order,
      media,
    }));
    onMultiSelect(hydrated);
    onClose();
  }, [selectedLibraryMedia, onMultiSelect, onClose]);

  const handleLocalPhotoSelect = useCallback(
    (photo: PickerMedia) => {
      if (mode === 'single') {
        void completeLocalImport([photo]);
        return;
      }
      setSelectedPhotos(prev => {
        const isSelected = prev.some(p => p.sourcePath === photo.sourcePath);
        if (isSelected) {
          return prev.filter(p => p.sourcePath !== photo.sourcePath);
        }
        return [...prev, photo];
      });
    },
    [mode, completeLocalImport]
  );

  const handleLibraryMediaClick = useCallback(
    (media: Media) => {
      if (mode === 'single') {
        onSelect?.(media);
        onClose();
        return;
      }
      setSelectedLibraryMedia(prev => {
        const exists = prev.some(m => m.docId === media.docId);
        if (exists) {
          return prev.filter(m => m.docId !== media.docId);
        }
        return [...prev, media];
      });
    },
    [mode, onSelect, onClose]
  );

  const handleDoneLocal = useCallback(() => {
    void completeLocalImport(selectedPhotos);
  }, [completeLocalImport, selectedPhotos]);

  const switchTab = useCallback((tab: SourceTab) => {
    setError(null);
    setLibraryError(null);
    setSourceTab(tab);
  }, []);

  const applyLibrarySearch = useCallback(() => {
    setLibrarySearchQuery(librarySearchDraft.trim());
  }, [librarySearchDraft]);

  const loadMoreLibrary = useCallback(async () => {
    if (!libraryNextCursor || !libraryHasNext || libraryLoadingMore) return;
    setLibraryLoadingMore(true);
    setLibraryError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(LIBRARY_PAGE_LIMIT));
      if (librarySearchQuery) params.set('search', librarySearchQuery);
      params.set('cursor', libraryNextCursor);
      const res = await fetch(`/api/media?${params}`);
      if (!res.ok) {
        throw new Error(`Failed to load media (${res.status})`);
      }
      const data = (await res.json()) as MediaListApiResponse;
      setLibraryItems(prev => [...prev, ...data.media]);
      setLibraryNextCursor(data.pagination.nextCursor ?? null);
      setLibraryHasNext(data.pagination.hasNext);
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLibraryLoadingMore(false);
    }
  }, [libraryNextCursor, libraryHasNext, libraryLoadingMore, librarySearchQuery]);

  useEffect(() => {
    if (!isOpen) return;
    setSourceTab('local');
    setSelectedPhotos([]);
    setSelectedLibraryMedia([]);
    setLibraryItems([]);
    setLibraryNextCursor(null);
    setLibraryHasNext(false);
    setLibrarySearchDraft('');
    setLibrarySearchQuery('');
    setLibraryRefreshKey(0);
    setLibraryError(null);
    setError(null);
    void loadFolderTree();
  }, [isOpen, loadFolderTree]);

  useEffect(() => {
    if (selectedFolder) {
      loadPhotos(selectedFolder);
    }
  }, [selectedFolder, loadPhotos]);

  useEffect(() => {
    if (!isOpen || sourceTab !== 'library') return;

    let cancelled = false;

    const run = async () => {
      setLibraryLoading(true);
      setLibraryError(null);
      try {
        const params = new URLSearchParams();
        params.set('limit', String(LIBRARY_PAGE_LIMIT));
        if (librarySearchQuery) params.set('search', librarySearchQuery);
        const res = await fetch(`/api/media?${params}`);
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('You need admin access to browse the media library.');
          }
          throw new Error(`Failed to load media (${res.status})`);
        }
        const data = (await res.json()) as MediaListApiResponse;
        if (!cancelled) {
          setLibraryItems(data.media);
          setLibraryNextCursor(data.pagination.nextCursor ?? null);
          setLibraryHasNext(data.pagination.hasNext);
        }
      } catch (e) {
        if (!cancelled) {
          setLibraryError(e instanceof Error ? e.message : 'Failed to load library');
          setLibraryItems([]);
          setLibraryNextCursor(null);
          setLibraryHasNext(false);
        }
      } finally {
        if (!cancelled) {
          setLibraryLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, sourceTab, librarySearchQuery]);

  if (!isOpen) return null;

  const showLocalFooter = sourceTab === 'local' && mode === 'multi';
  const showLibraryFooter = sourceTab === 'library' && mode === 'multi';
  const activeError = sourceTab === 'local' ? error : libraryError;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Select Photos</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>

        <div className={styles.sourceTabs} role="tablist" aria-label="Photo source">
          <button
            type="button"
            role="tab"
            aria-selected={sourceTab === 'local'}
            className={`${styles.sourceTab} ${sourceTab === 'local' ? styles.sourceTabActive : ''}`}
            onClick={() => switchTab('local')}
          >
            This PC
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sourceTab === 'library'}
            className={`${styles.sourceTab} ${sourceTab === 'library' ? styles.sourceTabActive : ''}`}
            onClick={() => switchTab('library')}
          >
            Library
          </button>
        </div>
        <p className={styles.sourceHint}>
          {sourceTab === 'local'
            ? 'Import new files from your configured local folders.'
            : 'Reuse images already in Firestore (no upload). Google Photos and other sources can plug in here later.'}
        </p>

        {sourceTab === 'local' && (
          <div className={styles.content}>
            <div className={styles.albumList}>
              <h3 className={styles.albumTitle}>Albums</h3>
              {!isLoadingFolders && folderTree.length > 0 && (
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
              )}
              {isLoadingFolders ? (
                <div className={styles.loading}>
                  <LoadingSpinner />
                  <p>Loading folders...</p>
                </div>
              ) : (
                folderTree.map(node => (
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
              {isLoading ? (
                <div className={styles.loading}>
                  <LoadingSpinner />
                  <p>Loading photos...</p>
                </div>
              ) : photos.length === 0 ? (
                <div className={styles.noContent}>No photos in this album</div>
              ) : (
                <div className={styles.grid}>
                  {photos.map(photo => {
                    const isSelected = selectedPhotos.some(p => p.sourcePath === photo.sourcePath);
                    return (
                      <div
                        key={photo.id}
                        className={`${styles.photoItem} ${isSelected ? styles.photoItemSelected : ''}`}
                        onClick={() => !isImporting && handleLocalPhotoSelect(photo)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (!isImporting) handleLocalPhotoSelect(photo);
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
                        {isSelected && (
                          <div className={styles.checkmark} aria-hidden="true">
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {sourceTab === 'library' && (
          <div className={styles.libraryPanel}>
            <div className={styles.libraryToolbar}>
              <input
                type="search"
                className={styles.librarySearchInput}
                placeholder="Search filename, caption, path…"
                value={librarySearchDraft}
                onChange={e => setLibrarySearchDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLibrarySearch();
                  }
                }}
                aria-label="Search library"
              />
              <button type="button" className={styles.librarySearchButton} onClick={applyLibrarySearch}>
                Search
              </button>
            </div>

            {libraryLoading ? (
              <div className={styles.loading}>
                <LoadingSpinner />
                <p>Loading library…</p>
              </div>
            ) : libraryItems.length === 0 ? (
              <div className={styles.noContent}>No media matches the current search.</div>
            ) : (
              <>
                <div className={styles.libraryGrid}>
                  {libraryItems.map(media => {
                    const isSelected = selectedLibraryMedia.some(m => m.docId === media.docId);
                    return (
                      <div
                        key={media.docId}
                        className={`${styles.photoItem} ${isSelected ? styles.photoItemSelected : ''}`}
                        onClick={() => handleLibraryMediaClick(media)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleLibraryMediaClick(media);
                          }
                        }}
                      >
                        <JournalImage
                          src={getDisplayUrl(media)}
                          alt={media.filename || media.docId}
                          className={styles.photoImage}
                          width={150}
                          height={150}
                          sizes="150px"
                          priority={false}
                        />
                        {mode === 'multi' && isSelected && (
                          <div className={styles.checkmark} aria-hidden="true">
                            ✓
                          </div>
                        )}
                        <div className={styles.libraryCaption} title={media.filename}>
                          {media.filename}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {libraryHasNext && (
                  <div className={styles.libraryLoadMoreWrap}>
                    <button
                      type="button"
                      className={styles.libraryLoadMore}
                      onClick={() => void loadMoreLibrary()}
                      disabled={libraryLoadingMore}
                    >
                      {libraryLoadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {(showLocalFooter || showLibraryFooter) && (
          <div className={styles.footer}>
            <button
              type="button"
              onClick={() => {
                if (sourceTab === 'local') {
                  void handleDoneLocal();
                } else {
                  completeLibrarySelection();
                }
              }}
              className={styles.doneButton}
              disabled={
                sourceTab === 'local'
                  ? selectedPhotos.length === 0 || isImporting
                  : selectedLibraryMedia.length === 0
              }
            >
              {sourceTab === 'local' ? (
                isImporting ? (
                  <>
                    <LoadingSpinner />
                    <span>
                      Importing {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''}…
                    </span>
                  </>
                ) : (
                  `Import ${selectedPhotos.length} photo${selectedPhotos.length !== 1 ? 's' : ''}`
                )
              ) : (
                `Use ${selectedLibraryMedia.length} photo${selectedLibraryMedia.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        )}

        {activeError && (
          <div className={styles.error} role="alert">
            {activeError}
            <button
              type="button"
              onClick={() => {
                if (sourceTab === 'local') {
                  setError(null);
                  if (isImporting) {
                    setIsImporting(false);
                  } else if (selectedFolder) {
                    loadPhotos(selectedFolder);
                  } else {
                    loadFolderTree();
                  }
                } else {
                  setLibraryError(null);
                  setLibraryRefreshKey(k => k + 1);
                }
              }}
              className={styles.retryButton}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
