import { validateQuestionRevealContent } from '@/lib/utils/questionReveal';

describe('validateQuestionRevealContent', () => {
  it('requires content for a Question Reveal card', () => {
    expect(validateQuestionRevealContent({ type: 'qa', displayMode: 'inline', content: '' })).toEqual(
      expect.objectContaining({ valid: false, imageCount: 0 })
    );
  });

  it('allows one RTE figure with caption and a card mention', () => {
    const content =
      '<figure data-figure-with-image><img src="ice-cream.jpg"><figcaption>Hand cranked</figcaption></figure>' +
      '<p>Vanilla <span data-type="cardMention" data-card-id="story-1">@Ice cream story</span></p>';
    expect(validateQuestionRevealContent({ type: 'qa', displayMode: 'inline', content })).toEqual({
      valid: true,
      imageCount: 1,
    });
  });

  it('rejects more than one RTE image', () => {
    const content =
      '<figure data-figure-with-image><img src="one.jpg"><figcaption>One</figcaption></figure>' +
      '<figure data-figure-with-image><img src="two.jpg"><figcaption>Two</figcaption></figure>';
    expect(validateQuestionRevealContent({ type: 'qa', displayMode: 'inline', content })).toEqual(
      expect.objectContaining({ valid: false, imageCount: 2 })
    );
  });

  it('does not constrain Open questions', () => {
    expect(validateQuestionRevealContent({ type: 'qa', displayMode: 'navigate', content: '' })).toEqual({
      valid: true,
      imageCount: 0,
    });
  });
});
