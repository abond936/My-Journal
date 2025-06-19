import React, { useMemo, useState } from "react";
import { Tree, NodeModel } from "@minoru/react-dnd-treeview";
import styles from '@/app/admin/tag-admin/tag-admin.module.css';
import { useTag } from "@/components/providers/TagProvider";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export default function TagTreeView() {
  const { tags, updateTag, loading, error, mutate, createTag, deleteTag } = useTag();

  // State for add child form
  const [addingChildTo, setAddingChildTo] = useState<string | null>(null);
  const [childName, setChildName] = useState("");

  // Map tags to treeview nodes
  const treeData = useMemo(() => {
    if (!tags) return [];
    // Build a map of id -> tag
    const tagMap = new Map(tags.map(tag => [tag.id, { ...tag, children: [] }]));
    // Assign children to parents
    tags.forEach(tag => {
      if (tag.parentId && tagMap.has(tag.parentId)) {
        tagMap.get(tag.parentId).children.push(tagMap.get(tag.id));
      }
    });
    // Find root nodes
    const roots = tags.filter(tag => !tag.parentId).map(tag => tagMap.get(tag.id));
    // Recursively flatten the tree, sorting children by order
    const flatten = (nodes, depth = 0) => {
      let result = [];
      nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
      for (const node of nodes) {
        result.push({
          id: node.id,
          parent: node.parentId || 0,
          text: node.name,
          droppable: true,
          order: node.order ?? 0,
        });
        if (node.children && node.children.length > 0) {
          result = result.concat(flatten(node.children, depth + 1));
        }
      }
      return result;
    };
    return flatten(roots);
  }, [tags]);

  console.log(
    'treeData for tree view:',
    treeData.slice(0, 20).map(n => ({
      id: n.id,
      parent: n.parent,
      text: n.text,
      order: n.order
    }))
  );

  console.log(
    'Children of Family (BCF2MHi5RftGUeYiD1La):',
    treeData
      .filter(n => n.parent === "BCF2MHi5RftGUeYiD1La")
      .map(n => ({
        id: n.id,
        text: n.text,
        order: n.order
      }))
  );

  // Handle drag-and-drop
  const handleDrop = async (newTree: NodeModel[]) => {
    // Group nodes by parent
    const siblingsByParent = {};
    newTree.forEach(node => {
      const parent = node.parent;
      if (!siblingsByParent[parent]) siblingsByParent[parent] = [];
      siblingsByParent[parent].push(node);
    });
    // For each parent, sort children by their order in newTree and assign new order values
    const updatePromises = [];
    for (const parent in siblingsByParent) {
      const siblings = siblingsByParent[parent];
      // Sort siblings by their order in newTree (which is their order in the array)
      siblings.forEach((node, idx) => {
        const tag = tags.find(t => t.id === node.id);
        const newParentId = node.parent === 0 ? null : node.parent;
        const newOrder = idx * 10;
        if (tag && (tag.parentId !== newParentId || tag.order !== newOrder)) {
          console.log(`Updating tag ${node.id}: parentId ${tag.parentId} -> ${newParentId}, order ${tag.order} -> ${newOrder}`);
          updatePromises.push(updateTag(node.id, { parentId: newParentId, order: newOrder }));
        }
      });
    }
    await Promise.all(updatePromises);
    mutate();
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading tags</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ height: 500 }}>
        <Tree
          tree={treeData}
          rootId={0}
          sort={false}
          canDrop={(tree, { dragSourceId, dropTargetId }) => {
            if (dragSourceId === dropTargetId) return false;
            return true;
          }}
          classes={{
            root: styles.noBullets,
            container: styles.noBullets,
          }}
          initialOpen={true}
          render={(node, { depth, isOpen, onToggle, isDropTarget }) => (
            <div
              className={styles.rowWrapper}
              style={{
                marginLeft: depth * 14,
                background: isDropTarget ? '#e6f7ff' : undefined,
                border: isDropTarget ? '2px solid #1976d2' : undefined,
              }}
            >
              {node.droppable && (
                <span onClick={onToggle} style={{ cursor: "pointer", marginRight: 4, fontSize: '0.9em' }}>
                  {isOpen ? "▼" : "▶"}
                </span>
              )}
              <span className={styles.dragHandle}>::</span>
              <span style={{ flex: 1 }}>{node.text}</span>
              {/* Add Child and Delete buttons */}
              <button
                className={styles.actionButton}
                style={{ marginLeft: 4 }}
                onClick={() => {
                  setAddingChildTo(addingChildTo === node.id ? null : node.id);
                  setChildName("");
                }}
                title="Add Child"
              >
                +
              </button>
              <button
                className={`${styles.actionButton} ${styles.deleteButton}`}
                style={{ marginLeft: 4 }}
                onClick={async () => {
                  if (window.confirm('Delete this tag and all its children?')) {
                    await deleteTag(node.id);
                    mutate();
                  }
                }}
                title="Delete Tag"
              >
                Delete
              </button>
              {/* Inline Add Child Form */}
              {addingChildTo === node.id && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (childName.trim()) {
                      await createTag({ name: childName.trim(), parentId: node.id });
                      setChildName("");
                      setAddingChildTo(null);
                      mutate();
                    }
                  }}
                  style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center' }}
                >
                  <input
                    value={childName}
                    onChange={e => setChildName(e.target.value)}
                    placeholder="New child name"
                    style={{ fontSize: '0.95em', marginRight: 4, padding: '2px 4px' }}
                    autoFocus
                  />
                  <button type="submit" className={styles.actionButton}>Add</button>
                  <button type="button" className={styles.actionButton} style={{ marginLeft: 2 }} onClick={() => setAddingChildTo(null)}>Cancel</button>
                </form>
              )}
            </div>
          )}
          placeholderRender={(node, { depth }) => (
            <div
              style={{
                height: 4,
                background: '#1976d2',
                marginLeft: depth * 14,
                borderRadius: 2,
              }}
            />
          )}
          dragPreviewRender={monitorProps => <div>{monitorProps.item.text}</div>}
          onDrop={handleDrop}
        />
      </div>
    </DndProvider>
  );
} 