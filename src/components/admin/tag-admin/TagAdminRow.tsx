'use client';

import React, { useState } from 'react';
import { Tag } from '@/lib/types/tag';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TagWithChildren extends Tag {
  children?: Tag[];
}

interface TagAdminRowProps {
  tag: TagWithChildren;
  onUpdateTag: (tagId: string, updates: Partial<Omit<Tag, 'id'>>) => void;
  onDeleteTag: (tagId: string) => void;
  onCreateTag: (name: string, parentId: string | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: (tagId: string) => void;
}

export function TagAdminRow({ tag, onUpdateTag, onDeleteTag, onCreateTag, isCollapsed, onToggleCollapse }: TagAdminRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tagName, setTagName] = useState(tag.name);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [childName, setChildName] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    padding: '4px 10px',
    marginBottom: '1px',
    display: 'flex',
    alignItems: 'center',
  };

  const handleSave = () => {
    if (tagName.trim() !== '' && tagName.trim() !== tag.name) {
      onUpdateTag(tag.id, { name: tagName.trim() });
    }
    setIsEditing(false);
  };

  const handleAddChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (childName.trim()) {
      onCreateTag(childName.trim(), tag.id);
      setChildName('');
      setIsAddingChild(false);
    }
  };

  const hasChildren = tag.children && tag.children.length > 0;

  return (
    <div>
      <div ref={setNodeRef} style={style} {...attributes}>
        <span {...listeners} style={{ cursor: 'grab', paddingRight: '8px', touchAction: 'none' }}>
          &#x2630;
        </span>

        <div style={{ width: '24px' }}>
          {hasChildren && (
            <button onClick={() => onToggleCollapse(tag.id)} style={{ all: 'unset', cursor: 'pointer', display: 'inline-block', width: '100%' }}>
              {isCollapsed ? '▶' : '▼'}
            </button>
          )}
        </div>

        {isEditing ? (
          <input
            type="text"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setIsEditing(false);
                setTagName(tag.name);
              }
            }}
            autoFocus
            style={{ flexGrow: 1 }}
          />
        ) : (
          <span onClick={() => setIsEditing(true)} style={{ flexGrow: 1 }}>
            {tag.name}
          </span>
        )}

        <button
          onClick={() => setIsAddingChild(true)}
          style={{ marginLeft: '10px', cursor: 'pointer' }}
        >
          +
        </button>

        <button
          onClick={() => onDeleteTag(tag.id)}
          style={{ marginLeft: '10px', cursor: 'pointer' }}
        >
          Delete
        </button>
      </div>

      {isAddingChild && (
        <form onSubmit={handleAddChild} style={{ marginLeft: '50px', padding: '5px 0' }}>
          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="New child tag name"
            autoFocus
            onBlur={() => setIsAddingChild(false)} // Optional: hide on blur
            style={{ marginRight: '10px' }}
          />
          <button type="submit">Add</button>
        </form>
      )}
    </div>
  );
} 