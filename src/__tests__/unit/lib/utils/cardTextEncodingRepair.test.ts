import { repairCardTextEncoding } from '@/lib/utils/cardTextEncodingRepair';

describe('repairCardTextEncoding', () => {
  it('repairs apostrophes, quotation marks, dashes, and bullets', () => {
    expect(repairCardTextEncoding('card', 'I don�t know.').value).toBe('I don’t know.');
    expect(repairCardTextEncoding('card', 'years�first').value).toBe('years—first');
    expect(repairCardTextEncoding('card', 'She said, �Yes.�').value).toBe('She said, “Yes.”');
    expect(repairCardTextEncoding('card', 'One � Two').value).toBe('One • Two');
  });

  it('applies the approved ambiguous repairs', () => {
    expect(repairCardTextEncoding('L7MzrMYEdKIN6oKQm34k', 'So many what ifs�/ The answers').value)
      .toBe('So many what ifs? The answers');
    expect(repairCardTextEncoding('zbhht3S6dkhTIffny1Zz', '���������').value).toBe('');
  });
});
