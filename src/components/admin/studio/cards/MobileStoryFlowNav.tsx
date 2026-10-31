'use client';

import styles from './CardForm.module.css';

export const MOBILE_STORY_STEPS = [
  { id: 'words', label: 'Words' },
  { id: 'media', label: 'Media' },
  { id: 'details', label: 'Details' },
  { id: 'placement', label: 'Placement' },
  { id: 'preview', label: 'Preview' },
] as const;

export default function MobileStoryFlowNav() {
  const goTo = (id: string) => {
    document.getElementById(`mobile-story-${id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <nav className={styles.mobileStoryFlowNav} aria-label="Story workflow">
      {MOBILE_STORY_STEPS.map((step) => (
        <button
          key={step.id}
          type="button"
          className={styles.mobileStoryFlowButton}
          onClick={() => goTo(step.id)}
        >
          {step.label}
        </button>
      ))}
    </nav>
  );
}
