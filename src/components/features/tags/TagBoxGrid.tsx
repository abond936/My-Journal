import React from 'react';
import { Tag } from '@/lib/types/tag';
import TagBox from './TagBox';
import styles from '@/styles/components/navigation/TagBoxGrid.module.css';

interface TagBoxGridProps {
  tags: Tag[];
  onTagClick: (tag: Tag) => void;
  selectedTagId?: string;
}

const TagBoxGrid: React.FC<TagBoxGridProps> = ({
  tags,
  onTagClick,
  selectedTagId,
}) => {
  // Sort tags by entry count and album count
  const sortedTags = [...tags].sort((a, b) => {
    const aTotal = (a.entryCount || 0) + (a.albumCount || 0);
    const bTotal = (b.entryCount || 0) + (b.albumCount || 0);
    return bTotal - aTotal;
  });

  // Determine size based on content count
  const getTagSize = (tag: Tag): 'small' | 'medium' | 'large' => {
    const totalCount = (tag.entryCount || 0) + (tag.albumCount || 0);
    if (totalCount > 10) return 'large';
    if (totalCount > 5) return 'medium';
    return 'small';
  };

  return (
    <div className={styles.grid}>
      {sortedTags.map((tag) => (
        <TagBox
          key={tag.id}
          tag={tag}
          size={getTagSize(tag)}
          isExpanded={tag.id === selectedTagId}
          onClick={() => onTagClick(tag)}
          entryCount={tag.entryCount}
          albumCount={tag.albumCount}
        />
      ))}
    </div>
  );
};

export default TagBoxGrid; 