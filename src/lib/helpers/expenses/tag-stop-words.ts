const ENGLISH_STOP_WORDS = [
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'at',
  'in',
  'on',
  'of',
  'to',
  'for',
  'with',
] as const;

const SPANISH_STOP_WORDS = [
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'y',
  'o',
  'a',
  'de',
  'en',
  'con',
  'por',
] as const;

export const TAG_STOP_WORDS: ReadonlySet<string> = new Set<string>([
  ...ENGLISH_STOP_WORDS,
  ...SPANISH_STOP_WORDS,
]);

export function dropStopWords(tokens: string[]): string[] {
  return tokens.filter(token => !TAG_STOP_WORDS.has(token));
}
