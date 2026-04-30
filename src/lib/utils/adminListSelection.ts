import type React from 'react';

type ModifierKeys = { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean };

/**
 * Multi-select for admin list checkboxes: plain click = only this item (deselect if it was the sole selection);
 * Ctrl/Meta+click = toggle in set; Shift+click = range from last anchor, Shift+Ctrl = add range to set.
 * Updates `anchorIndexRef` for the next range (non-shift path).
 */
export function applyModifierSelection(args: {
  orderedIds: string[];
  id: string;
  index: number;
  /** From a mouse or keyboard event (e.g. space on checkbox with Shift/Ctrl). */
  modifiers: ModifierKeys;
  /** Current selection, as ids (order ignored). */
  selected: string[];
  setSelected: (ids: string[]) => void;
  anchorIndexRef: React.MutableRefObject<number | null>;
}): void {
  const { orderedIds, id, index, modifiers, selected, setSelected, anchorIndexRef } = args;
  const sel = new Set(selected);
  const { shiftKey, ctrlKey, metaKey } = modifiers;
  const additive = ctrlKey || metaKey;

  if (shiftKey) {
    const anchor = anchorIndexRef.current ?? index;
    const i0 = Math.min(anchor, index);
    const i1 = Math.max(anchor, index);
    const rangeIds = orderedIds.slice(i0, i1 + 1);
    if (additive) {
      const next = new Set(sel);
      for (const rid of rangeIds) next.add(rid);
      setSelected([...next]);
    } else {
      setSelected(rangeIds);
    }
    return;
  }

  if (additive) {
    if (sel.has(id)) {
      sel.delete(id);
    } else {
      sel.add(id);
    }
    setSelected([...sel]);
    anchorIndexRef.current = index;
    return;
  }

  if (sel.size === 1 && sel.has(id)) {
    setSelected([]);
    anchorIndexRef.current = null;
  } else {
    setSelected([id]);
    anchorIndexRef.current = index;
  }
}
