import { expenseClassifierSamples } from '@/mocks/expense-classifier-samples';
import { scoreExpenseCategory } from './expense-category';

describe('scoreExpenseCategory', () => {
  it.each(expenseClassifierSamples)(
    'classifies $language: $text',
    ({ text, expectedCategory }) => {
      const result = scoreExpenseCategory(text);
      expect(result.category).toBe(expectedCategory);
    },
  );
});
