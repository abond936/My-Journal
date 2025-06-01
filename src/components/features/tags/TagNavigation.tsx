import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/lib/styles/components/features/tag/TagNavigation.module.css';
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
              href={`/tags/${tag.id}`}
              className={pathname === `/tags/${tag.id}` ? styles.active : ''}
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