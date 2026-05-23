function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function seededRandomRank(seed: string, id: string): number {
  return fnv1a32(`${seed}:${id}`);
}

export function orderIdsBySeed(ids: string[], seed: string): string[] {
  const normalizedSeed = seed.trim() || 'default';
  return [...ids].sort((a, b) => {
    const rankDiff = seededRandomRank(normalizedSeed, a) - seededRandomRank(normalizedSeed, b);
    return rankDiff !== 0 ? rankDiff : a.localeCompare(b);
  });
}
