const PROMPT_BLOCK_PATTERN = /<h([1-6])\b[^>]*data-prompt-block=["']true["'][^>]*>[\s\S]*?<\/h\1>/gi;

export function countUnresolvedPromptBlocks(content: string | null | undefined): number {
  if (!content || typeof content !== 'string') return 0;
  return [...content.matchAll(PROMPT_BLOCK_PATTERN)].length;
}

/** Reader and preview surfaces omit editing-only prompt headings. */
export function stripUnresolvedPromptBlocks(content: string | null | undefined): string {
  if (!content || typeof content !== 'string') return content || '';
  return content.replace(PROMPT_BLOCK_PATTERN, '');
}
