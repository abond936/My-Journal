const REPLACEMENT = '\uFFFD';
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

const SPECIAL_REPAIRS: Record<string, Array<[string | RegExp, string]>> = {
  '1j82i0U6byPwKHmKYzfp': [[/^\uFFFD{2}\s*/u, '']],
  '3e0ovCh2SbA6UtEmmres': [
    [/\uFFFDthe big\s+\uFFFDR\uFFFD{2}responsibility/gu, '“the big ‘R’”—responsibility'],
  ],
  'AeMiOw3CHDGIEeZ14Fj9': [[/^\uFFFD$/u, '']],
  'L7MzrMYEdKIN6oKQm34k': [[/what ifs\uFFFD\/ The/giu, 'what ifs? The']],
  'bnDdjgoHAlgH1C1IiTLn': [[/is\uFFFD{2} this/gu, 'is”—this']],
  'giNhcW2RWROYCaxTBQoR': [[/\uFFFD{6,9}/gu, '']],
  'LxwmPdtG9ftHSBAhd1Ap': [[/\s+and\s+\uFFFD\s*$/u, '']],
  'axvSkfFFO9jUtPFY9YdZ': [[/^\uFFFD/u, '•']],
  'xmgmJ4Y69d4XhkcRcCUd': [
    [/\uFFFDthe big\s+\uFFFDR\uFFFD{2}responsibility/gu, '“the big ‘R’”—responsibility'],
  ],
  'zbhht3S6dkhTIffny1Zz': [[/^\uFFFD+$/u, '']],
};

function isHighConfidenceApostrophe(value: string, index: number): boolean {
  const before = value[index - 1] ?? '';
  const remainder = value.slice(index + 1);
  return (
    WORD_CHARACTER.test(before) &&
    /^(?:s|t|d|m|re|ve|ll)(?!\p{L})/iu.test(remainder)
  );
}

function inferReplacement(value: string, index: number): string | null {
  const before = value[index - 1] ?? '';
  const after = value[index + 1] ?? '';

  if (isHighConfidenceApostrophe(value, index)) return '’';
  if (WORD_CHARACTER.test(before) && WORD_CHARACTER.test(after)) return '—';
  if (/\s/u.test(before) && /\s/u.test(after)) return '•';

  const openingBoundary = index === 0 || /[\s>(\[{—-]/u.test(before);
  if (openingBoundary && after && !/\s/u.test(after)) return '“';

  const closingBoundary =
    index === value.length - 1 || !after || /[\s<.,!?;:)}\]]/u.test(after);
  if (before && !/\s/u.test(before) && closingBoundary) return '”';

  return null;
}

export type CardTextRepairResult = {
  value: string;
  replacements: number;
  unresolved: number;
};

export function repairCardTextEncoding(cardId: string, original: string): CardTextRepairResult {
  let value = original;
  let replacements = 0;

  for (const [pattern, replacement] of SPECIAL_REPAIRS[cardId] ?? []) {
    value = value.replace(pattern, (...args) => {
      const match = args[0] as string;
      replacements += Array.from(match).filter((character) => character === REPLACEMENT).length;
      return replacement;
    });
  }

  let repaired = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== REPLACEMENT) {
      repaired += character;
      continue;
    }

    const inferred = inferReplacement(value, index);
    if (inferred === null) {
      repaired += character;
    } else {
      repaired += inferred;
      replacements += 1;
    }
  }

  return {
    value: repaired,
    replacements,
    unresolved: Array.from(repaired).filter((character) => character === REPLACEMENT).length,
  };
}
