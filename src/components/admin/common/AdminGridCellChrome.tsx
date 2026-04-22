'use client';

import React from 'react';
import clsx from 'clsx';
import { ADMIN_GRID_CHROME } from '@/components/admin/common/adminGridChromeAttr';
import styles from './AdminGridCellChrome.module.css';

export type AdminGridCellChromeProps = {
  className?: string;
  selected?: boolean;
  /** Merged onto the root cell `div` (e.g. `id`, `ref`, `style`, `role`, handlers). */
  rootProps?: Omit<React.ComponentPropsWithRef<'div'>, 'children'>;
  thumbnail: React.ReactNode;
  overlayTopStart?: React.ReactNode;
  overlayTopEnd?: React.ReactNode;
  overlayLeftRail?: React.ReactNode;
  overlayBottom?: React.ReactNode;
  belowThumbnail?: React.ReactNode;
  /** Extra class on the left tag rail (e.g. studio compact typography). */
  overlayLeftRailClassName?: string;
};

/**
 * Shared admin grid cell shell: full-width image stack with overlaid controls and left tag rail.
 */
export default function AdminGridCellChrome({
  className,
  selected,
  rootProps,
  thumbnail,
  overlayTopStart,
  overlayTopEnd,
  overlayLeftRail,
  overlayBottom,
  belowThumbnail,
  overlayLeftRailClassName,
}: AdminGridCellChromeProps) {
  const { className: rootClassFromProps, ...restRoot } = rootProps ?? {};
  return (
    <div
      {...restRoot}
      className={clsx(styles.cell, selected && styles.selected, className, rootClassFromProps)}
    >
      <div className={styles.thumbStack}>
        {thumbnail}
        <div className={styles.thumbScrim} aria-hidden />
        <div className={styles.overlayTop}>
          {overlayTopStart ? (
            <div className={styles.overlayTopStart} data-admin-chrome={ADMIN_GRID_CHROME.overlayTopStart}>
              {overlayTopStart}
            </div>
          ) : (
            <span className={styles.overlayTopStart} />
          )}
          {overlayTopEnd ? (
            <div className={styles.overlayTopEnd} data-admin-chrome={ADMIN_GRID_CHROME.overlayTopEnd}>
              {overlayTopEnd}
            </div>
          ) : null}
        </div>
        {overlayLeftRail ? (
          <div
            className={clsx(styles.overlayLeftRail, overlayLeftRailClassName)}
            data-admin-chrome={ADMIN_GRID_CHROME.tagRail}
          >
            {overlayLeftRail}
          </div>
        ) : null}
        {overlayBottom ? <div className={styles.overlayBottom}>{overlayBottom}</div> : null}
      </div>
      {belowThumbnail ? <div className={styles.belowThumb}>{belowThumbnail}</div> : null}
    </div>
  );
}
