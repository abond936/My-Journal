'use client';

import styles from './CardForm.module.css';

export const MOBILE_STORY_STEPS = [
  { id: 'words', label: 'Words' },
  { id: 'media', label: 'Media' },
  { id: 'details', label: 'Details' },
  { id: 'placement', label: 'Placement' },
  { id: 'preview', label: 'Preview' },
] as const;

export type MobileStoryStep = (typeof MOBILE_STORY_STEPS)[number]['id'];

export default function MobileStoryFlowNav({
  activeStep,
  onStepChange,
}: {
  activeStep: MobileStoryStep;
  onStepChange: (step: MobileStoryStep) => void;
}) {

  return (
    <nav className={styles.mobileStoryFlowNav} aria-label="Story workflow">
      {MOBILE_STORY_STEPS.map((step) => (
        <button
          key={step.id}
          type="button"
          className={`${styles.mobileStoryFlowButton} ${activeStep === step.id ? styles.mobileStoryFlowButtonActive : ''}`}
          aria-current={activeStep === step.id ? 'step' : undefined}
          onClick={() => onStepChange(step.id)}
        >
          {step.label}
        </button>
      ))}
    </nav>
  );
}
