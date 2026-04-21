/**
 * Curated collections tree / unparented drag-and-drop (default on).
 * Set `NEXT_PUBLIC_CURATED_TREE_DND=false` (or `0`, `no`, `off`) in `.env.local` to disable as a kill switch.
 */
export function isCuratedTreeDndEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_CURATED_TREE_DND;
  if (raw == null || String(raw).trim() === '') return true;
  const v = String(raw).trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}
