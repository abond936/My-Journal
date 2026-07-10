'use client';

import type { TreeNode } from '@/lib/types/photo';
import styles from './PhotoPicker.module.css';

export interface PhotoPickerFolderItemProps {
  node: TreeNode;
  selectedFolder: string | null;
  expandedFolders: Set<string>;
  onSelect: (folderId: string) => void;
  onToggle: (folderId: string) => void;
  level?: number;
}

export function PhotoPickerFolderItem({
  node,
  selectedFolder,
  expandedFolders,
  onSelect,
  onToggle,
  level = 0,
}: PhotoPickerFolderItemProps) {
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
          cursor: 'pointer',
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
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
          {node.children.map((child) => (
            <PhotoPickerFolderItem
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
}
