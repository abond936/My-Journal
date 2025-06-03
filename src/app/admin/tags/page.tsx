'use client';

import { useState, useEffect } from 'react';
import { getTags, updateTag, deleteTag, createTag } from '@/lib/services/tagService';
import { Tag } from '@/lib/types/tag';
import styles from '@/app/admin/tags/tags.module.css';

interface TagWithChildren extends Tag {
  children: TagWithChildren[];
}

interface EditingField {
  id: string;
  field: 'name' | 'description' | 'dimension';
}

export default function AdminTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dimension, setDimension] = useState<'all' | 'who' | 'what' | 'when' | 'where' | 'reflection'>('all');
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagParent, setNewTagParent] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showTagStructure, setShowTagStructure] = useState(false);

  const displayTagHierarchy = () => {
    // Group tags by dimension
    const tagsByDimension = tags.reduce((acc, tag) => {
      const dimension = tag.dimension || 'uncategorized';
      if (!acc[dimension]) {
        acc[dimension] = [];
      }
      acc[dimension].push(tag);
      return acc;
    }, {} as Record<string, Tag[]>);

    // Find root tags (no parent) and orphaned tags
    const rootTags = tags.filter(tag => !tag.parentId);
    const orphanedTags = tags.filter(tag => 
      tag.parentId && !tags.find(t => t.id === tag.parentId)
    );

    console.log('\n=== TAG HIERARCHY ===');
    
    // Display root tags by dimension
    console.log('\nROOT TAGS:');
    Object.entries(tagsByDimension).forEach(([dimension, dimensionTags]) => {
      const rootTagsInDimension = dimensionTags.filter(tag => !tag.parentId);
      if (rootTagsInDimension.length > 0) {
        console.log(`\n${dimension.toUpperCase()}:`);
        rootTagsInDimension.forEach(tag => {
          console.log(`  ${tag.name} (ID: ${tag.id})`);
          // Display children
          const children = tags.filter(t => t.parentId === tag.id);
          children.forEach(child => {
            console.log(`    └─ ${child.name} (ID: ${child.id})`);
            // Display grandchildren
            const grandchildren = tags.filter(t => t.parentId === child.id);
            grandchildren.forEach(grandchild => {
              console.log(`      └─ ${grandchild.name} (ID: ${grandchild.id})`);
            });
          });
        });
      }
    });

    // Display orphaned tags
    if (orphanedTags.length > 0) {
      console.log('\nORPHANED TAGS:');
      orphanedTags.forEach(tag => {
        console.log(`  ${tag.name} (ID: ${tag.id}, Parent ID: ${tag.parentId})`);
      });
    }

    console.log('\n=== END TAG HIERARCHY ===\n');
  };

  const logTagStructure = () => {
    // Only log if we have tags loaded
    if (tags.length === 0) {
      console.log('No tags loaded yet');
      return;
    }

    console.log('\n=== TAG STRUCTURE ===');
    console.log('Total tags:', tags.length);
    
    // Group by dimension first
    const byDimension = tags.reduce((acc, tag) => {
      const dimension = tag.dimension || 'uncategorized';
      if (!acc[dimension]) acc[dimension] = [];
      acc[dimension].push(tag);
      return acc;
    }, {} as Record<string, Tag[]>);

    // Log each dimension's structure
    Object.entries(byDimension).forEach(([dimension, dimensionTags]) => {
      console.log(`\n${dimension.toUpperCase()}:`);
      
      // Find root tags in this dimension
      const rootTags = dimensionTags.filter(tag => !tag.parentId);
      rootTags.forEach(rootTag => {
        console.log(`  ${rootTag.name} (ID: ${rootTag.id})`);
        
        // Find direct children
        const children = dimensionTags.filter(tag => tag.parentId === rootTag.id);
        children.forEach(child => {
          console.log(`    └─ ${child.name} (ID: ${child.id})`);
        });
      });
    });

    // Log orphaned tags separately
    const orphanedTags = tags.filter(tag => 
      tag.parentId && !tags.find(t => t.id === tag.parentId)
    );
    
    if (orphanedTags.length > 0) {
      console.log('\nORPHANED TAGS:');
      orphanedTags.forEach(tag => {
        console.log(`  ${tag.name} (ID: ${tag.id}, Parent ID: ${tag.parentId})`);
      });
    }

    console.log('\n=== END TAG STRUCTURE ===\n');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allTags = await getTags();
      setTags(allTags);
    } catch (error) {
      console.error('Error loading tags:', error);
      setError(error instanceof Error ? error.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const buildTagTree = (tags: Tag[]): TagWithChildren[] => {
    const tagMap = new Map<string, TagWithChildren>();
    const roots: TagWithChildren[] = [];
    const processedIds = new Set<string>();
    const orphanedTags: TagWithChildren[] = [];

    // First pass: create all tag objects
    tags.forEach(tag => {
      if (!tag.id) {
        console.error('Tag missing ID:', tag);
        return;
      }
      tagMap.set(tag.id, { ...tag, children: [] });
    });

    // Second pass: build the tree and identify orphans
    tags.forEach(tag => {
      if (!tag.id) {
        console.error('Tag missing ID:', tag);
        return;
      }
      if (processedIds.has(tag.id)) return;
      processedIds.add(tag.id);
      
      const tagWithChildren = tagMap.get(tag.id);
      if (!tagWithChildren) {
        console.error('Tag not found in map:', tag.id);
        return;
      }

      if (tag.parentId) {
        const parent = tagMap.get(tag.parentId);
        if (parent) {
          parent.children.push(tagWithChildren);
        } else {
          // Handle orphaned tags
          orphanedTags.push(tagWithChildren);
        }
      } else {
        roots.push(tagWithChildren);
      }
    });

    return roots;
  };

  const startEditing = (tagId: string, field: EditingField['field'], value: string) => {
    setEditingField({ id: tagId, field });
    setEditValue(value);
  };

  const handleEditSave = async () => {
    if (!editingField) return;

    try {
      const tag = tags.find(t => t.id === editingField.id);
      if (!tag) return;

      const updates: Partial<Tag> = {};
      if (editingField.field === 'name') {
        updates.name = editValue;
      } else if (editingField.field === 'description') {
        updates.description = editValue;
      } else if (editingField.field === 'dimension') {
        updates.dimension = editValue as Tag['dimension'];
      }

      await updateTag(editingField.id, updates);
      
      // Update local state
      setTags(prevTags => 
        prevTags.map(t => 
          t.id === editingField.id 
            ? { ...t, ...updates }
            : t
        )
      );

      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating tag:', error);
      setError(error instanceof Error ? error.message : 'Failed to update tag');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleEditSave();
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const inspectTagStructure = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) {
      console.error('Tag not found:', tagId);
      return;
    }

    // Find all child tags recursively
    const findChildren = (parentId: string): Tag[] => {
      return tags.filter(t => t.parentId === parentId);
    };

    const getTagHierarchy = (tagId: string, level: number = 0): string => {
      const tag = tags.find(t => t.id === tagId);
      if (!tag) return '';
      
      const indent = '  '.repeat(level);
      const children = findChildren(tagId);
      const childStrings = children.map(child => getTagHierarchy(child.id, level + 1));
      
      return `${indent}${tag.name} (ID: ${tag.id})\n${childStrings.join('')}`;
    };

    console.log('Tag Structure:');
    console.log(getTagHierarchy(tagId));
    console.log('Full tag data:', tag);
  };

  const handleDeleteTag = async (tagId: string) => {
    console.log('\n=== TAG DELETION PROCESS STARTED ===');
    console.log('Attempting to delete tag with ID:', tagId);
    
    if (!tagId || tagId.trim() === '') {
      console.error('Invalid tag ID provided for deletion:', tagId);
      setError('Invalid tag ID. Please try refreshing the page.');
      return;
    }

    const tagToDelete = tags.find(t => t.id === tagId);
    if (!tagToDelete) {
      console.error('Tag not found in state:', tagId);
      setError('Tag not found. Please try refreshing the page.');
      return;
    }

    console.log('\nTag to be deleted:', {
      id: tagToDelete.id,
      name: tagToDelete.name,
      dimension: tagToDelete.dimension,
      parentId: tagToDelete.parentId
    });

    // Find child tags
    const childTags = tags.filter(t => t.parentId === tagId);
    console.log('\nChild tags that will also be deleted:', childTags.map(t => ({
      id: t.id,
      name: t.name,
      dimension: t.dimension
    })));

    if (!confirm(`Are you sure you want to delete "${tagToDelete.name}" and its ${childTags.length} child tags?`)) {
      console.log('Deletion cancelled by user');
      return;
    }

    try {
      console.log('\nCalling deleteTag service...');
      await deleteTag(tagId);
      console.log('Tag deleted successfully from database');
      
      // Update local state instead of reloading
      setTags(prevTags => {
        // Remove the deleted tag and all its children
        const tagIdsToRemove = new Set([tagId, ...childTags.map(t => t.id)]);
        return prevTags.filter(tag => !tagIdsToRemove.has(tag.id));
      });
      
      console.log('\n=== TAG DELETION PROCESS COMPLETED ===\n');
    } catch (error) {
      console.error('\nError during deletion process:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete tag');
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagParent) return;

    try {
      const newTag: Omit<Tag, 'id'> = {
        name: editValue,
        parentId: newTagParent,
        dimension: dimension as Tag['dimension'],
        order: 0,
        description: '',
        entryCount: 0,
        albumCount: 0
      };

      await createTag(newTag);
      await loadData();
      setIsAddingTag(false);
      setNewTagParent(null);
      setEditValue('');
    } catch (error) {
      console.error('Error creating tag:', error);
      setError(error instanceof Error ? error.message : 'Failed to create tag');
    }
  };

  const handleTagSelect = (tagId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    console.log('Selecting tag:', tagId, 'Current selection:', Array.from(selectedTags));
    
    setSelectedTags(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(tagId)) {
        newSelected.delete(tagId);
      } else {
        newSelected.add(tagId);
      }
      console.log('New selection:', Array.from(newSelected));
      return newSelected;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedTags.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTags.size} tags? This will also delete all child tags.`)) {
      return;
    }

    try {
      // Delete tags in sequence to avoid race conditions
      for (const tagId of selectedTags) {
        await deleteTag(tagId);
      }
      await loadData();
      setSelectedTags(new Set());
    } catch (error) {
      console.error('Error deleting tags:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete tags');
    }
  };

  const adjustOrders = (siblings: Tag[], newOrder: number, movedTagId: string) => {
    // Sort siblings by order
    const sortedSiblings = [...siblings].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Find the index where the new order would be inserted
    const insertIndex = sortedSiblings.findIndex(tag => (tag.order || 0) > newOrder);
    
    // Create new orders array
    const newOrders = sortedSiblings.map((tag, index) => {
      if (tag.id === movedTagId) {
        return newOrder;
      }
      // If this tag comes after the insertion point, increment its order
      if (insertIndex !== -1 && index >= insertIndex) {
        return (tag.order || 0) + 1;
      }
      return tag.order || 0;
    });

    return newOrders;
  };

  const handleOrderChange = async (newOrder: number) => {
    const currentTag = tag; // Capture tag in closure
    try {
      // Get all siblings (tags with the same parent)
      const siblings = tags.filter(t => t.parentId === currentTag.parentId);
      
      // Sort siblings by order
      const sortedSiblings = [...siblings].sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Find the index where the new order would be inserted
      const insertIndex = sortedSiblings.findIndex(t => (t.order || 0) > newOrder);
      
      // Create new orders array
      const newOrders = sortedSiblings.map((sibling, index) => {
        if (sibling.id === currentTag.id) {
          return newOrder;
        }
        // If this tag comes after the insertion point, increment its order
        if (insertIndex !== -1 && index >= insertIndex) {
          return (sibling.order || 0) + 1;
        }
        return sibling.order || 0;
      });

      // Update local state immediately
      setTags(prevTags => 
        prevTags.map(t => {
          const update = sortedSiblings.findIndex(s => s.id === t.id);
          if (update !== -1) {
            return { ...t, order: newOrders[update] };
          }
          return t;
        })
      );

      // Then update the database
      const updates = sortedSiblings.map((sibling, index) => ({
        id: sibling.id,
        order: newOrders[index]
      }));

      await Promise.all(updates.map(update => 
        updateTag(update.id, { order: update.order })
      ));
    } catch (error) {
      console.error('Error updating order:', error);
      setError(error instanceof Error ? error.message : 'Failed to update order');
      // Revert local state on error
      await loadData();
    }
  };

  const handleParentIdChange = async (newParentId: string) => {
    const currentTag = tag; // Capture tag in closure
    try {
      // Update local state immediately
      setTags(prevTags => 
        prevTags.map(t => 
          t.id === currentTag.id 
            ? { ...t, parentId: newParentId || null }
            : t
        )
      );

      // Then update the database
      await updateTag(currentTag.id, { parentId: newParentId || null });
    } catch (error) {
      console.error('Error updating parentId:', error);
      setError(error instanceof Error ? error.message : 'Failed to update parent');
      // Revert local state on error
      await loadData();
    }
  };

  const renderTagNode = (tag: TagWithChildren, level: number = 0) => {
    const isSelected = selectedTags.has(tag.id);
    const isEditing = editingField?.id === tag.id;

    const onDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Delete clicked for tag:', tag.id, tag.name);
      handleDeleteTag(tag.id);
    };

    const handleParentIdChange = async (newParentId: string) => {
      const currentTag = tag; // Capture tag in closure
      try {
        // Update local state immediately
        setTags(prevTags => 
          prevTags.map(t => 
            t.id === currentTag.id 
              ? { ...t, parentId: newParentId || null }
              : t
          )
        );

        // Then update the database
        await updateTag(currentTag.id, { parentId: newParentId || null });
      } catch (error) {
        console.error('Error updating parentId:', error);
        setError(error instanceof Error ? error.message : 'Failed to update parent');
        // Revert local state on error
        await loadData();
      }
    };

    const handleOrderChange = async (newOrder: number) => {
      const currentTag = tag; // Capture tag in closure
      try {
        // Get all siblings (tags with the same parent)
        const siblings = tags.filter(t => t.parentId === currentTag.parentId);
        
        // Sort siblings by order
        const sortedSiblings = [...siblings].sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Find the index where the new order would be inserted
        const insertIndex = sortedSiblings.findIndex(t => (t.order || 0) > newOrder);
        
        // Create new orders array
        const newOrders = sortedSiblings.map((sibling, index) => {
          if (sibling.id === currentTag.id) {
            return newOrder;
          }
          // If this tag comes after the insertion point, increment its order
          if (insertIndex !== -1 && index >= insertIndex) {
            return (sibling.order || 0) + 1;
          }
          return sibling.order || 0;
        });

        // Update local state immediately
        setTags(prevTags => 
          prevTags.map(t => {
            const update = sortedSiblings.findIndex(s => s.id === t.id);
            if (update !== -1) {
              return { ...t, order: newOrders[update] };
            }
            return t;
          })
        );

        // Then update the database
        const updates = sortedSiblings.map((sibling, index) => ({
          id: sibling.id,
          order: newOrders[index]
        }));

        await Promise.all(updates.map(update => 
          updateTag(update.id, { order: update.order })
        ));
      } catch (error) {
        console.error('Error updating order:', error);
        setError(error instanceof Error ? error.message : 'Failed to update order');
        // Revert local state on error
        await loadData();
      }
    };

    return (
      <div key={tag.id} className={styles.tagNode}>
        <div className={styles.tagContent} style={{ marginLeft: `${level * 20}px` }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleTagSelect(tag.id, e)}
          />
          <div className={styles.tagInfo}>
            <span
              className={styles.tagName}
              onClick={() => startEditing(tag.id, 'name', tag.name)}
            >
              {tag.name}
            </span>
            <div className={styles.tagMetadata}>
              <div className={styles.metadataField}>
                <label>Parent:</label>
                <select
                  value={tag.parentId || ''}
                  onChange={(e) => handleParentIdChange(e.target.value)}
                  className={styles.metadataInput}
                >
                  <option value="">None (Root Tag)</option>
                  {tags
                    .filter(t => t.id !== tag.id) // Don't allow self as parent
                    .map(parent => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name} ({parent.dimension})
                      </option>
                    ))}
                </select>
              </div>
              <div className={styles.metadataField}>
                <label>Order:</label>
                <input
                  type="number"
                  value={tag.order || 0}
                  onChange={(e) => handleOrderChange(Number(e.target.value))}
                  className={styles.metadataInput}
                  step="0.1"
                  min="0"
                />
              </div>
            </div>
          </div>
          <div className={styles.tagActions}>
            <button 
              className={styles.addChildButton}
              onClick={() => setNewTagParent(tag.id)}
            >
              Add Child
            </button>
            <button 
              className={styles.deleteButton}
              onClick={onDeleteClick}
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
        {tag.children.length > 0 && (
          <div className={styles.children}>
            {tag.children.map((child) => renderTagNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderOrphanedTags = () => {
    const orphanedTags = tags.filter(tag => 
      tag.parentId && !tags.find(t => t.id === tag.parentId)
    );

    if (orphanedTags.length === 0) return null;

    return (
      <div className={styles.orphanedSection}>
        <h2>Orphaned Tags</h2>
        <div className={styles.orphanedTags}>
          {orphanedTags.map(tag => (
            <div key={tag.id} className={styles.tagNode}>
              <div 
                className={`${styles.tagContent} ${selectedTags.has(tag.id) ? styles.bulkSelected : ''}`}
              >
                <div className={styles.tagInfo}>
                  <input
                    type="checkbox"
                    checked={selectedTags.has(tag.id)}
                    onChange={(e) => handleTagSelect(tag.id, e)}
                    className={styles.tagCheckbox}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className={styles.editableField}>
                    {tag.name}
                  </div>
                  <span className={styles.tagDimension}>{tag.dimension}</span>
                </div>
                <div className={styles.tagActions}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTag(tag.id);
                    }}
                    className={styles.deleteButton}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const filteredTags = buildTagTree(tags);

  const renderTagHierarchy = () => {
    const tagTree = buildTagTree(tags);
    
    // Group tags by dimension
    const dimensionOrder = ['who', 'what', 'when', 'where', 'reflection', 'uncategorized'];
    const tagsByDimension = tagTree.reduce((acc, tag) => {
      const dimension = tag.dimension || 'uncategorized';
      if (!acc[dimension]) {
        acc[dimension] = [];
      }
      acc[dimension].push(tag);
      return acc;
    }, {} as Record<string, TagWithChildren[]>);

    return (
      <div className={styles.tagHierarchy}>
        {dimensionOrder.map(dimension => {
          const dimensionTags = tagsByDimension[dimension] || [];
          if (dimensionTags.length === 0) return null;
          
          return (
            <div key={dimension} className={styles.dimensionGroup}>
              {dimension === 'uncategorized' && (
                <h3>Uncategorized</h3>
              )}
              {dimensionTags.map((tag) => renderTagNode(tag))}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className={styles.loading}>Loading tags...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.tagsPage}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Tags Management</h1>
          <button 
            onClick={() => setShowTagStructure(!showTagStructure)}
            className={styles.logButton}
          >
            {showTagStructure ? 'Hide Tag Structure' : 'Show Tag Structure'}
          </button>
        </div>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Tags</span>
            <span className={styles.statValue}>{tags.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Root Tags</span>
            <span className={styles.statValue}>{filteredTags.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Orphaned Tags</span>
            <span className={styles.statValue}>
              {tags.filter(tag => tag.parentId && !tags.find(t => t.id === tag.parentId)).length}
            </span>
          </div>
          {selectedTags.size > 0 && (
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Selected Tags</span>
              <span className={styles.statValue}>{selectedTags.size}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <select
            value={dimension}
            onChange={e => setDimension(e.target.value as typeof dimension)}
            className={styles.filterSelect}
          >
            <option value="all">All Dimensions</option>
            <option value="who">Who</option>
            <option value="what">What</option>
            <option value="when">When</option>
            <option value="where">Where</option>
            <option value="reflection">Reflection</option>
          </select>
        </div>
        <div className={styles.controlsRight}>
          <button
            onClick={() => {
              setNewTagParent(null);
              setIsAddingTag(true);
              setEditValue('');
            }}
            className={styles.addRootButton}
          >
            Add Root Tag
          </button>
          {selectedTags.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className={styles.bulkDeleteButton}
            >
              Delete Selected ({selectedTags.size})
            </button>
          )}
        </div>
      </div>

      {isAddingTag && (
        <form onSubmit={handleAddTag} className={styles.addTagForm}>
          <input
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            placeholder="New tag name"
            className={styles.editInput}
            autoFocus
          />
          <div className={styles.editActions}>
            <button type="submit" className={styles.saveButton}>Add</button>
            <button 
              type="button" 
              onClick={() => {
                setIsAddingTag(false);
                setNewTagParent(null);
                setEditValue('');
              }} 
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {renderTagHierarchy()}
    </div>
  );
} 