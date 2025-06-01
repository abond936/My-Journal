import React from 'react';
import styles from '@/styles/components/common/ViewSelector.module.css';

export type ViewType = 'long-form' | 'accordion' | 'card' | 'timeline' | 'magazine';

interface ViewSelectorProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const ViewSelector: React.FC<ViewSelectorProps> = ({ currentView, onViewChange }) => {
  const views = [
    { id: 'long-form', label: 'Long Form', icon: '📝' },
    { id: 'accordion', label: 'Accordion', icon: '📋' },
    { id: 'card', label: 'Card', icon: '🃏' },
    { id: 'timeline', label: 'Timeline', icon: '⏳' },
    { id: 'magazine', label: 'Magazine', icon: '📰' }
  ] as const;

  return (
    <div className={styles.container}>
      <div className={styles.label}>View:</div>
      <div className={styles.buttons}>
        {views.map((view) => (
          <button
            key={view.id}
            className={`${styles.button} ${currentView === view.id ? styles.active : ''}`}
            onClick={() => onViewChange(view.id)}
            aria-pressed={currentView === view.id}
          >
            <span className={styles.icon}>{view.icon}</span>
            <span className={styles.viewLabel}>{view.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ViewSelector; 