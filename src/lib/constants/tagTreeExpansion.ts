export type TagDimension = 'who' | 'what' | 'when' | 'where';

/**
 * How many tag levels under each dimension header stay expanded initially.
 * 0 = only the first row of tags under the dimension (e.g. Family, Friends); deeper levels start collapsed.
 * 1 = those rows show their children expanded by default; deeper levels collapsed, etc.
 */
export const TAG_TREE_DEFAULT_EXPAND_LEVELS = 0;

/**
 * Per-dimension overrides. Uncomment or set when a dimension needs a deeper default (e.g. shallow Who tree vs deep Where).
 */
export const TAG_TREE_EXPAND_LEVELS_BY_DIMENSION: Partial<Record<TagDimension, number>> = {
  // who: 1,
  // where: 1,
};

export function getTagTreeExpandLevelsForDimension(dimensionKey: string): number {
  const key = dimensionKey as TagDimension;
  const override = TAG_TREE_EXPAND_LEVELS_BY_DIMENSION[key];
  if (override !== undefined) return override;
  return TAG_TREE_DEFAULT_EXPAND_LEVELS;
}
