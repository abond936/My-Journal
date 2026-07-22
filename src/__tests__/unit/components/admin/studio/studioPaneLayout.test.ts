import {
  DEFAULT_CARD_EDIT_WIDTH,
  MAX_CARD_EDIT_WIDTH,
  MIN_CARD_EDIT_PX,
  MIN_QUESTIONS_PX,
  applyColumnWidth,
  cardEditWidthBounds,
  clampPaneWidth,
  paneHandleCount,
  questionsWidthBounds,
  renderedColumnWidth,
  rowWidthForPaneResize,
} from '@/components/admin/studio/studioPaneLayout';

describe('Studio pane layout contract', () => {
  it('counts only dividers between visible panes', () => {
    expect(paneHandleCount({ compose: true, questions: true, media: true })).toBe(2);
    expect(paneHandleCount({ compose: true, questions: false, media: true })).toBe(1);
    expect(paneHandleCount({ compose: false, questions: false, media: true })).toBe(0);
  });

  it('reserves visible sibling minimums when bounding Compose', () => {
    expect(cardEditWidthBounds(1000, { questions: true, media: true })).toEqual({
      minEdit: MIN_CARD_EDIT_PX,
      maxEdit: 604,
    });
    expect(cardEditWidthBounds(140, { questions: true, media: true })).toBeNull();
    expect(cardEditWidthBounds(5000, { questions: false, media: false })?.maxEdit).toBe(
      MAX_CARD_EDIT_WIDTH
    );
  });

  it('reserves Compose and Media when bounding Questions', () => {
    expect(
      questionsWidthBounds(1000, {
        compose: true,
        media: true,
        composeWidth: DEFAULT_CARD_EDIT_WIDTH,
      })
    ).toEqual({ minQuestions: MIN_QUESTIONS_PX, maxQuestions: 447 });
  });

  it('clamps stored and dragged widths to their real range', () => {
    expect(clampPaneWidth(100, 220, 1200)).toBe(220);
    expect(clampPaneWidth(600, 220, 1200)).toBe(600);
    expect(clampPaneWidth(1400, 220, 1200)).toBe(1200);
  });

  it('uses rendered width with offset fallback and applies the column contract', () => {
    const row = document.createElement('div');
    Object.defineProperty(row, 'offsetWidth', { value: 640 });
    row.getBoundingClientRect = jest.fn(() => ({ width: 0 } as DOMRect));
    expect(rowWidthForPaneResize(row)).toBe(640);

    const column = document.createElement('div');
    column.getBoundingClientRect = jest.fn(() => ({ width: 412 } as DOMRect));
    expect(renderedColumnWidth(column, 300)).toBe(412);
    applyColumnWidth(column, 412, 220);
    expect(column.style.flex).toBe('0 0 412px');
    expect(column.style.width).toBe('412px');
    expect(column.style.minWidth).toBe('220px');
  });
});
