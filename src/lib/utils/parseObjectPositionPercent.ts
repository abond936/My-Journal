/**
 * Parse a CSS object-position string into horizontal/vertical percentages for sliders.
 * Supports "42% 58%", keywords like "left top", and falls back to 50,50.
 */
export function parseObjectPositionToPercents(input: string | undefined): {
  horizontal: number;
  vertical: number;
} {
  const raw = (input || '50% 50%').trim().toLowerCase();
  const pct = raw.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (pct) {
    return {
      horizontal: Math.round(Math.min(100, Math.max(0, Number(pct[1])))),
      vertical: Math.round(Math.min(100, Math.max(0, Number(pct[2])))),
    };
  }

  let horizontal = 50;
  let vertical = 50;
  if (raw.includes('left')) horizontal = 0;
  if (raw.includes('right')) horizontal = 100;
  if (raw.includes('top')) vertical = 0;
  if (raw.includes('bottom')) vertical = 100;
  return { horizontal, vertical };
}
