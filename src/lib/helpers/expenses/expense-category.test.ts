import { expenseClassifierSamples } from '@/mocks/expense-classifier-samples';
import {
  buildCategoryKey,
  extractTagNgrams,
  isExplicitIncomeEntry,
  scoreExpenseCategory,
} from './expense-category';

describe('scoreExpenseCategory', () => {
  it.each(expenseClassifierSamples)('classifies $language: $text', ({
    text,
    expectedCategory,
  }) => {
    const result = scoreExpenseCategory(text);
    expect(result.category).toBe(expectedCategory);
  });

  it('resolves one-edit typos', () => {
    const result = scoreExpenseCategory('yber 14');
    expect(result.category).toBe('transportation');
  });

  it('does not resolve two-edit typos', () => {
    const result = scoreExpenseCategory('yyber 14');
    expect(result.category).toBeNull();
  });

  it('does not apply fuzzy correction when disabled', () => {
    const result = scoreExpenseCategory('yber 14', { allowFuzzy: false });
    expect(result.category).toBeNull();
  });
});

describe('buildCategoryKey', () => {
  it('normalizes text and strips amount tokens', () => {
    expect(buildCategoryKey('  Peluquería +30k!!  ')).toBe('peluqueria');
  });

  it('returns empty key when input has only amount tokens', () => {
    expect(buildCategoryKey('+20k 300')).toBe('');
  });
});

describe('extractTagNgrams', () => {
  it('returns 1- and 2-grams for two-token entries', () => {
    expect(extractTagNgrams('80 doctors appointment')).toEqual([
      'doctors',
      'appointment',
      'doctors appointment',
    ]);
  });

  it('returns 1- through 3-grams for four-token entries with diacritics stripped', () => {
    expect(extractTagNgrams('46k copago médico en casa')).toEqual([
      'copago',
      'medico',
      'casa',
      'copago medico',
      'medico casa',
      'copago medico casa',
    ]);
  });

  it('returns an empty list when only amount tokens are present', () => {
    expect(extractTagNgrams('+20k 300')).toEqual([]);
  });

  it('deduplicates repeated unigrams while keeping unique higher-order n-grams', () => {
    expect(extractTagNgrams('gas gas 10')).toEqual(['gas', 'gas gas']);
  });

  it('treats hyphens as word boundaries instead of joining tokens', () => {
    expect(extractTagNgrams('Shell gas fill-up')).toEqual([
      'shell',
      'gas',
      'fill',
      'up',
      'shell gas',
      'gas fill',
      'fill up',
      'shell gas fill',
      'gas fill up',
    ]);
  });

  it('drops English stop words at token level while keeping cross-stop-word n-grams', () => {
    const tags = extractTagNgrams('groceries at costco');
    expect(tags).toContain('groceries');
    expect(tags).toContain('costco');
    expect(tags).toContain('groceries costco');
    expect(tags).not.toContain('at');
    expect(tags).not.toContain('groceries at');
    expect(tags).not.toContain('at costco');
  });

  it('drops Spanish stop words after diacritic stripping', () => {
    const tags = extractTagNgrams('compré pan y leche');
    expect(tags).toEqual([
      'compre',
      'pan',
      'leche',
      'compre pan',
      'pan leche',
      'compre pan leche',
    ]);
  });

  it('keeps content tokens when surrounded by stop words', () => {
    expect(extractTagNgrams('a la carta')).toEqual(['carta']);
  });

  it('returns an empty list when the note is entirely stop words', () => {
    expect(extractTagNgrams('a la')).toEqual([]);
  });
});

describe('isExplicitIncomeEntry', () => {
  it('returns true when +amount appears in the input', () => {
    expect(isExplicitIncomeEntry('pagaron +2m')).toBe(true);
  });

  it('returns false when +amount is not present', () => {
    expect(isExplicitIncomeEntry('salary 2m')).toBe(false);
  });
});
