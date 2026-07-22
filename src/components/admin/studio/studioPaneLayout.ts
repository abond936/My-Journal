export const CARD_EDIT_RESIZE_HANDLE = 8;
export const MIN_CARD_EDIT_PX = 220;
export const MIN_QUESTIONS_PX = 200;
export const MIN_MEDIA_BANK_PX = 180;
export const DEFAULT_CARD_EDIT_WIDTH = 357;
export const DEFAULT_QUESTIONS_WIDTH = 272;
export const MAX_CARD_EDIT_WIDTH = 1200;
export const MAX_QUESTIONS_WIDTH = 840;

export function paneHandleCount(opts: {
  compose: boolean;
  questions: boolean;
  media: boolean;
}): number {
  return Math.max(0, [opts.compose, opts.questions, opts.media].filter(Boolean).length - 1);
}

export function cardEditWidthBounds(
  rowWidth: number,
  opts: { questions: boolean; media: boolean }
): { minEdit: number; maxEdit: number } | null {
  const handleCount = paneHandleCount({ compose: true, questions: opts.questions, media: opts.media });
  const rawMax =
    rowWidth -
    (opts.questions ? MIN_QUESTIONS_PX : 0) -
    (opts.media ? MIN_MEDIA_BANK_PX : 0) -
    handleCount * CARD_EDIT_RESIZE_HANDLE;
  if (rawMax < 1) return null;
  const maxEdit = Math.min(MAX_CARD_EDIT_WIDTH, rawMax);
  return { minEdit: Math.min(MIN_CARD_EDIT_PX, maxEdit), maxEdit };
}

export function questionsWidthBounds(
  rowWidth: number,
  opts: { compose: boolean; media: boolean; composeWidth: number }
): { minQuestions: number; maxQuestions: number } | null {
  const handleCount = paneHandleCount({ compose: opts.compose, questions: true, media: opts.media });
  const rawMax =
    rowWidth -
    (opts.compose ? opts.composeWidth : 0) -
    (opts.media ? MIN_MEDIA_BANK_PX : 0) -
    handleCount * CARD_EDIT_RESIZE_HANDLE;
  if (rawMax < 1) return null;
  const maxQuestions = Math.min(MAX_QUESTIONS_WIDTH, rawMax);
  return { minQuestions: Math.min(MIN_QUESTIONS_PX, maxQuestions), maxQuestions };
}

export function clampPaneWidth(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function rowWidthForPaneResize(row: HTMLElement): number {
  const width = row.getBoundingClientRect().width;
  return width > 0 ? width : row.offsetWidth;
}

export function renderedColumnWidth(element: HTMLDivElement | null, fallback: number): number {
  if (!element) return fallback;
  const width = element.getBoundingClientRect().width;
  return width > 0 ? width : fallback;
}

export function applyColumnWidth(
  element: HTMLDivElement | null,
  width: number,
  minimumWidth: number
): void {
  if (!element) return;
  element.style.flex = `0 0 ${width}px`;
  element.style.width = `${width}px`;
  element.style.minWidth = `${minimumWidth}px`;
}
