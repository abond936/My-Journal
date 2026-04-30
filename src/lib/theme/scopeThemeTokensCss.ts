/**
 * Rewrites generated token CSS so variables apply under a scope selector instead of :root.
 * Used for Theme admin reader preview without affecting the live app chrome.
 */
export function scopeThemeTokensCss(css: string, scopeSelector: string): string {
  return css
    .replace(/^:root\s*\{/m, `${scopeSelector} {`)
    .replace(/^\[data-theme="dark"\]\s*\{/m, `[data-theme="dark"] ${scopeSelector} {`);
}
