import { dropStopWords, TAG_STOP_WORDS } from './tag-stop-words';

describe('TAG_STOP_WORDS', () => {
  it('contains exactly the 25 documented entries (13 EN + 13 ES, with "a" overlapping)', () => {
    expect(TAG_STOP_WORDS.size).toBe(25);
  });

  it('includes representative English and Spanish entries', () => {
    expect(TAG_STOP_WORDS.has('the')).toBe(true);
    expect(TAG_STOP_WORDS.has('at')).toBe(true);
    expect(TAG_STOP_WORDS.has('la')).toBe(true);
    expect(TAG_STOP_WORDS.has('de')).toBe(true);
  });

  it('does not include explicitly excluded words', () => {
    for (const word of ['no', 'not', 'nada', 'mas', 'more', 'cash']) {
      expect(TAG_STOP_WORDS.has(word)).toBe(false);
    }
  });
});

describe('dropStopWords', () => {
  it('filters stop words while preserving order of remaining tokens', () => {
    expect(dropStopWords(['groceries', 'at', 'costco'])).toEqual([
      'groceries',
      'costco',
    ]);
  });

  it('returns an empty array when every token is a stop word', () => {
    expect(dropStopWords(['a', 'la', 'de'])).toEqual([]);
  });
});
