'use client';

import {
  humanizeCategorySlug,
  isExpenseCategory,
  OTHERS_CATEGORY_KEY,
  UNCATEGORIZED,
} from '@constants/expenses/categories';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

/**
 * Translated name for a category slug. Known categories, "uncategorized"
 * (null included) and the charts' "others" bucket are translated; any other
 * slug keeps its own name so stats never hide what was logged.
 */
export function useCategoryLabel(): (
  category: string | null | undefined,
) => string {
  const t = useTranslations('expenses.categories');
  return useCallback(
    (category: string | null | undefined) => {
      if (!category || category === UNCATEGORIZED) return t(UNCATEGORIZED);
      if (category === OTHERS_CATEGORY_KEY) return t(OTHERS_CATEGORY_KEY);
      if (isExpenseCategory(category)) return t(category);
      return humanizeCategorySlug(category);
    },
    [t],
  );
}
