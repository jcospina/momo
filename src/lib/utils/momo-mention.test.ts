import { parseMomoMention } from './momo-mention';

describe('parseMomoMention', () => {
  it('detects @momo at the start of a message', () => {
    expect(parseMomoMention('@momo how much?')).toEqual({ tagged: true });
  });

  it('detects @momo after surrounding whitespace and punctuation', () => {
    expect(parseMomoMention('hey @momo, this month?')).toEqual({
      tagged: true,
    });
    expect(parseMomoMention('this month @MOMO')).toEqual({ tagged: true });
    expect(parseMomoMention('@MoMo!')).toEqual({ tagged: true });
  });

  it('is case-insensitive', () => {
    expect(parseMomoMention('@MoMo hi').tagged).toBe(true);
    expect(parseMomoMention('@MOMO hi').tagged).toBe(true);
    expect(parseMomoMention('@momo hi').tagged).toBe(true);
  });

  it('returns tagged: false for empty or whitespace-only content', () => {
    expect(parseMomoMention('')).toEqual({ tagged: false });
    expect(parseMomoMention('   ')).toEqual({ tagged: false });
  });

  it('returns tagged: false when @momo is absent', () => {
    expect(parseMomoMention('how much did I spend?')).toEqual({
      tagged: false,
    });
  });

  it('does not match @momo as a substring of a longer word', () => {
    expect(parseMomoMention('@momology is great')).toEqual({ tagged: false });
  });

  it('does not match when @ is glued to a preceding token (e.g. email)', () => {
    expect(parseMomoMention('email@momo.com')).toEqual({ tagged: false });
  });

  it('detects @momo when followed by allowed punctuation', () => {
    expect(parseMomoMention('@momo.').tagged).toBe(true);
    expect(parseMomoMention('@momo,').tagged).toBe(true);
    expect(parseMomoMention('@momo?').tagged).toBe(true);
    expect(parseMomoMention('@momo!').tagged).toBe(true);
    expect(parseMomoMention('@momo;').tagged).toBe(true);
    expect(parseMomoMention('@momo:').tagged).toBe(true);
  });

  it('returns tagged: true when there are multiple mentions', () => {
    expect(parseMomoMention('@momo @momo')).toEqual({ tagged: true });
  });
});
