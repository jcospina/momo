import { contrastRatio, formatOklch, parseOklch } from './oklch';

describe('parseOklch', () => {
  it('reads decimal lightness', () => {
    expect(parseOklch('oklch(0.9224 0.198 107.23)')).toEqual({
      l: 0.9224,
      c: 0.198,
      h: 107.23,
    });
  });

  it('reads percentage lightness and chroma', () => {
    const parsed = parseOklch('oklch(63% 40% 38deg)');
    expect(parsed?.l).toBeCloseTo(0.63);
    expect(parsed?.c).toBeCloseTo(0.16);
    expect(parsed?.h).toBe(38);
  });

  it('ignores an alpha component', () => {
    expect(parseOklch('oklch(0.5 0.1 200 / 50%)')).toEqual({
      l: 0.5,
      c: 0.1,
      h: 200,
    });
  });

  it('rejects anything that is not oklch', () => {
    expect(parseOklch('#ff0000')).toBeNull();
    expect(parseOklch('color-mix(in oklch, red, blue)')).toBeNull();
  });
});

describe('formatOklch', () => {
  it('round-trips and wraps the hue', () => {
    expect(formatOklch({ l: 0.5, c: 0.1, h: 370 })).toBe('oklch(0.5 0.1 10)');
  });
});

describe('contrastRatio', () => {
  const black = { l: 0, c: 0, h: 0 };
  const white = { l: 1, c: 0, h: 0 };

  it('is 21 for black on white', () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
  });

  it('is 1 for a colour against itself', () => {
    const coral = { l: 0.719, c: 0.1751, h: 22.5 };
    expect(contrastRatio(coral, coral)).toBeCloseTo(1);
  });
});
