import React from 'react';
import styles from './page.module.css';

interface CategoryPageProps {
  params: {
    categoryId: string;
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <div className={styles.container}>
      <h1>Entries for Category: {params.categoryId}</h1>
    </div>
  );
} 