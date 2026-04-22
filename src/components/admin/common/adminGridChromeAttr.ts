/** Stable `data-admin-chrome` values for grid cell click delegation (avoid CSS-module class strings). */
export const ADMIN_GRID_CHROME = {
  overlayTopStart: 'overlay-top-start',
  overlayTopEnd: 'overlay-top-end',
  tagRail: 'tag-rail',
  tagSearchFoot: 'tag-search-foot',
  /** Media grid: “Edit tags…” row (and similar footer actions). */
  footerActions: 'footer-actions',
} as const;

export function adminChromeSelector(part: (typeof ADMIN_GRID_CHROME)[keyof typeof ADMIN_GRID_CHROME]): string {
  return `[data-admin-chrome="${part}"]`;
}
