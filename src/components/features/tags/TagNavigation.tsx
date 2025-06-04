import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/app/view/tag-view/TagNavigation.module.css';
import { Tag } from '@/lib/types/tag';

interface TagNavigationProps {
  tags: Tag[];
}

const TagNavigation: React.FC<TagNavigationProps> = ({ tags }) => {
  const pathname = usePathname();

  return (
    <nav className={styles.navigation}>
      <ul>
        {tags.map((tag) => (
          <li key={tag.id}>
            <Link 
              href={`/view/tag-view/${tag.id}`}
              className={pathname === `/view/tag-view/${tag.id}` ? styles.active : ''}
            >
              {tag.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TagNavigation; 