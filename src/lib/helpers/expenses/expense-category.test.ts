import { expenseClassifierSamples } from '@/mocks/expense-classifier-samples';
import {
  buildCategoryKey,
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

describe('isExplicitIncomeEntry', () => {
  it('returns true when +amount appears in the input', () => {
    expect(isExplicitIncomeEntry('pagaron +2m')).toBe(true);
  });

  it('returns false when +amount is not present', () => {
    expect(isExplicitIncomeEntry('salary 2m')).toBe(false);
  });
});
