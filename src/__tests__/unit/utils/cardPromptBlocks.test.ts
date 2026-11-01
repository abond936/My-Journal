import {
  countUnresolvedPromptBlocks,
  stripUnresolvedPromptBlocks,
} from '@/lib/utils/cardPromptBlocks';

describe('Card prompt blocks', () => {
  const content = [
    '<p>Opening</p>',
    '<h3 data-prompt-block="true">What happened next?</h3>',
    '<p>The authored answer remains.</p>',
    '<h2>Reader heading</h2>',
    "<h3 class='guide' data-prompt-block='true'>Who was there?</h3>",
  ].join('');

  it('counts only explicitly marked editing prompts', () => {
    expect(countUnresolvedPromptBlocks(content)).toBe(2);
    expect(countUnresolvedPromptBlocks('<h3>Legacy copied prompt</h3>')).toBe(0);
  });

  it('removes prompt headings from Reader content without removing authored answers', () => {
    const readerContent = stripUnresolvedPromptBlocks(content);
    expect(readerContent).not.toContain('What happened next?');
    expect(readerContent).not.toContain('Who was there?');
    expect(readerContent).toContain('The authored answer remains.');
    expect(readerContent).toContain('<h2>Reader heading</h2>');
  });
});
