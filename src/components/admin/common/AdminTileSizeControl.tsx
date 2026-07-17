'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Grid2X2, RotateCcw } from 'lucide-react';
import styles from './AdminTileSizeControl.module.css';

type AdminTileSizeControlProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  onChange: (value: number) => void;
  surfaceLabel: string;
};

export default function AdminTileSizeControl({
  value,
  min,
  max,
  step,
  defaultValue,
  onChange,
  surfaceLabel,
}: AdminTileSizeControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const controlLabel = `${surfaceLabel} tile size`;

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((current) => !current)}
        aria-label={controlLabel}
        aria-expanded={open}
        title={controlLabel}
      >
        <Grid2X2 size={15} aria-hidden="true" />
      </button>
      {open ? (
        <div className={styles.popover} role="group" aria-label={controlLabel}>
          <div className={styles.labelRow}>
            <span>Tile size</span>
            <button
              type="button"
              className={styles.reset}
              onClick={() => onChange(defaultValue)}
              disabled={value === defaultValue}
              aria-label={`Reset ${surfaceLabel.toLowerCase()} tile size`}
              title="Reset tile size"
            >
              <RotateCcw size={14} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.sliderRow}>
            <Grid2X2 className={styles.sizeIcon} size={11} aria-hidden="true" />
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(event) => onChange(Number(event.target.value))}
              aria-label={controlLabel}
              aria-valuetext={`${value} pixels minimum tile width`}
            />
            <Grid2X2 className={styles.sizeIcon} size={17} aria-hidden="true" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
