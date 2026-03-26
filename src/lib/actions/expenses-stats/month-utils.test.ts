import {
  buildMonthRange,
  buildMonthSpan,
  normalizeMonth,
  uniqueMonths,
} from './month-utils';

describe('expenses-stats month utils', () => {
  it('normalizes valid months and rejects invalid strings', () => {
    expect(normalizeMonth('2024-02')).toBe('2024-02');
    expect(normalizeMonth('invalid')).toBeNull();
  });

  it('keeps input order while deduplicating explicit months', () => {
    const result = buildMonthRange({
      months: ['2024-02', 'invalid', '2024-01', '2024-02'],
    });

    expect(result).toEqual(['2024-02', '2024-01']);
  });

  it('builds a backward month range from endMonth and count', () => {
    const result = buildMonthRange({
      endMonth: '2024-03',
      count: 3,
    });

    expect(result).toEqual(['2024-01', '2024-02', '2024-03']);
  });

  it('builds month spans inclusively and guards invalid windows', () => {
    expect(buildMonthSpan('2024-01', '2024-03')).toEqual([
      '2024-01',
      '2024-02',
      '2024-03',
    ]);
    expect(buildMonthSpan('2024-03', '2024-01')).toEqual([]);
  });

  it('deduplicates month collections preserving first-seen order', () => {
    expect(uniqueMonths(['2024-01', '2024-01', '2024-02'])).toEqual([
      '2024-01',
      '2024-02',
    ]);
  });
});
