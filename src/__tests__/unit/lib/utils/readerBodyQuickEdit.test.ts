import {
  buildReaderBodyQuickEditPatch,
  contentHtmlToPlainBodyDraft,
  isReaderBodyQuickEditEligible,
  plainBodyDraftToContentHtml,
} from '@/lib/utils/readerBodyQuickEdit';

describe('isReaderBodyQuickEditEligible', () => {
  it('allows empty or paragraph-only content', () => {
    expect(isReaderBodyQuickEditEligible('')).toBe(true);
    expect(isReaderBodyQuickEditEligible('<p>Hello world</p>')).toBe(true);
    expect(isReaderBodyQuickEditEligible('<p>One</p><p>Two</p>')).toBe(true);
  });

  it('rejects embedded media and rich structures', () => {
    expect(isReaderBodyQuickEditEligible('<p>Hi</p><figure data-media-id="m1"></figure>')).toBe(false);
    expect(isReaderBodyQuickEditEligible('<p><span data-type="cardMention">@Card</span></p>')).toBe(false);
    expect(isReaderBodyQuickEditEligible('<blockquote><p>Quote</p></blockquote>')).toBe(false);
  });
});

describe('plain body draft conversion', () => {
  it('round-trips paragraph prose', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>';
    const draft = contentHtmlToPlainBodyDraft(html);
    expect(draft).toBe('First paragraph\n\nSecond paragraph');
    expect(plainBodyDraftToContentHtml(draft)).toBe(html);
  });

  it('escapes HTML in draft text', () => {
    expect(plainBodyDraftToContentHtml('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
    );
  });
});

describe('buildReaderBodyQuickEditPatch', () => {
  it('builds a content-only patch for changed prose', () => {
    const patch = buildReaderBodyQuickEditPatch('Updated body', '<p>Original body</p>');
    expect(patch).toEqual({ content: '<p>Updated body</p>' });
  });

  it('returns null when body is unchanged', () => {
    expect(buildReaderBodyQuickEditPatch('Same text', '<p>Same text</p>')).toBeNull();
  });

  it('returns null for ineligible content', () => {
    expect(
      buildReaderBodyQuickEditPatch('New text', '<figure data-media-id="m1"></figure>')
    ).toBeNull();
  });
});
