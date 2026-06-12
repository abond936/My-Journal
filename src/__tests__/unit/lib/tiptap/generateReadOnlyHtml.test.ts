import { generateReadOnlyHtml } from '@/lib/tiptap/generateReadOnlyHtml';

describe('generateReadOnlyHtml', () => {
  it('returns empty string for blank content', () => {
    expect(generateReadOnlyHtml('')).toBe('');
    expect(generateReadOnlyHtml('   ')).toBe('');
  });

  it('preserves paragraph text from stored TipTap HTML', () => {
    const html = generateReadOnlyHtml('<p>Inline story body</p>');
    expect(html).toContain('Inline story body');
  });

  it('preserves card mention attributes for feed navigation', () => {
    const html = generateReadOnlyHtml(
      '<p><span data-type="cardMention" data-card-id="card-42" data-label="Related card" class="card-inline-link" role="link" tabindex="0">@Related card</span></p>'
    );

    expect(html).toContain('data-type="cardMention"');
    expect(html).toContain('data-card-id="card-42"');
    expect(html).toContain('@Related card');
  });

  it('preserves figure-with-image markup from stored content', () => {
    const html = generateReadOnlyHtml(
      '<figure data-figure-with-image data-size="medium" data-alignment="left" data-wrap="off" data-media-id="media-1" data-media-type="content" class="figure"><img src="https://example.com/photo.jpg" alt="Caption" width="800" height="600" data-media-id="media-1"><figcaption></figcaption></figure>'
    );

    expect(html).toContain('data-figure-with-image');
    expect(html).toContain('data-media-id="media-1"');
    expect(html).toContain('https://example.com/photo.jpg');
  });
});
