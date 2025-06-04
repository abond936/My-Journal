import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tag } from '@/lib/types/tag';
import styles from '@/styles/pages/admin/tags.module.css';

interface SortableTagProps {
  tag: Tag;
  children: React.ReactNode;
}

export function SortableTag({ tag, children }: SortableTagProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: tag.id,
    disabled: true // Disable drag by default
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 1 : 0,
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only enable dragging if Shift key is pressed
    if (e.shiftKey) {
      // Re-enable the drag listeners
      const dragListeners = listeners?.onMouseDown;
      if (dragListeners) {
        dragListeners(e);
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onMouseDown={handleMouseDown}
      className={styles.sortableTag}
    >
      {children}
    </div>
  );
} 