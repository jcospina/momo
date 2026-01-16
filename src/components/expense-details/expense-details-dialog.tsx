'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { getExpensesByMessageId, updateExpenses } from '@actions/expenses';
import type { ExpenseCategory } from '@lib-types/expenses';
import { EXPENSE_CATEGORIES } from '@lib-types/expenses';
import { Button } from '@ui/button/button';
import { Dialog } from '@ui/dialog/dialog';
import type { DialogController } from '@ui/dialog/dialog.types';
import { Divider } from '@ui/divider/divider';
import { Flex } from '@ui/flex/flex';
import { Input } from '@ui/input/input';
import { Select } from '@ui/select/select';
import { Typography } from '@ui/typography/typography';
import styles from './expense-details-dialog.module.css';

const uniqueCategories = (() => {
  const seen = new Set<ExpenseCategory>();
  return EXPENSE_CATEGORIES.filter(category => {
    if (seen.has(category)) return false;
    seen.add(category);
    return true;
  });
})();

const categorySet = new Set(uniqueCategories);

type CategoryOption = {
  value: ExpenseCategory;
  label: string;
};

type ExpenseDetailsDialogProps = {
  controller: DialogController;
  messageId: string | null;
};

type ExpenseDraft = {
  id: string;
  amount: string;
  expenseDate: string;
  category: ExpenseCategory | null;
  merchant: string;
  currency: string;
  note: string;
};

function formatCategoryLabel(category: ExpenseCategory) {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatAmount(amountCents: number, currency: string) {
  if (!Number.isFinite(amountCents)) return '';
  const divisor = currency === 'COP' ? 1 : 100;
  return (amountCents / divisor).toString();
}

function formatExpenseNote(note: string, fallback: string) {
  const trimmed = note.trim();
  if (!trimmed) return fallback;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function ExpenseDetailsDialog({
  controller,
  messageId,
}: ExpenseDetailsDialogProps) {
  const [expenseDrafts, setExpenseDrafts] = useState<ExpenseDraft[]>([]);
  const [loadedMessageId, setLoadedMessageId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = useMemo<CategoryOption[]>(
    () =>
      uniqueCategories.map(category => ({
        value: category,
        label: formatCategoryLabel(category),
      })),
    [],
  );

  useEffect(() => {
    let isActive = true;
    if (!controller.open || !messageId) {
      return () => {
        isActive = false;
      };
    }

    getExpensesByMessageId({ messageId }).then(result => {
      if (!isActive) return;
      const drafts = (result.expenses ?? []).map(expense => {
        const category =
          expense.category &&
          categorySet.has(expense.category as ExpenseCategory)
            ? (expense.category as ExpenseCategory)
            : null;
        const currency = expense.currency ?? 'USD';
        return {
          id: expense.id,
          amount: formatAmount(expense.amount_cents, currency),
          expenseDate: expense.expense_date ?? '',
          category,
          merchant: expense.merchant ?? '',
          currency,
          note: expense.note ?? '',
        };
      });
      setExpenseDrafts(drafts);
      setLoadedMessageId(messageId);
    });

    return () => {
      isActive = false;
    };
  }, [controller.open, messageId]);

  const handleClose = () => {
    controller.closeDialog();
  };

  const handleSave = async () => {
    if (!expenseDrafts.length) {
      controller.closeDialog();
      return;
    }
    setIsSaving(true);
    const updates = expenseDrafts.map(draft => ({
      id: draft.id,
      amount: draft.amount,
      expense_date: draft.expenseDate,
      category: draft.category,
      merchant: draft.merchant || null,
      currency: draft.currency,
    }));
    await updateExpenses({ updates, messageId });
    setIsSaving(false);
    controller.closeDialog();
  };

  const updateDraft = useCallback(
    (id: string, changes: Partial<ExpenseDraft>) => {
      setExpenseDrafts(prev =>
        prev.map(draft => (draft.id === id ? { ...draft, ...changes } : draft)),
      );
    },
    [],
  );

  const hasFreshData = Boolean(messageId) && loadedMessageId === messageId;
  const visibleExpenses = hasFreshData ? expenseDrafts : [];
  const showLoading = controller.open && Boolean(messageId) && !hasFreshData;
  const showEmpty =
    controller.open && !showLoading && visibleExpenses.length === 0;

  const content = (
    <Flex
      direction="column"
      gap={2}
      className={styles['expense-details__content']}
    >
      {showLoading ? (
        <Typography size="sm">Loading expenses...</Typography>
      ) : null}
      {showEmpty ? <Typography size="sm">No expenses found.</Typography> : null}
      {visibleExpenses.map((expense, index) => {
        const amountId = `expense-amount-${expense.id}`;
        const dateId = `expense-date-${expense.id}`;
        const categoryId = `expense-category-${expense.id}`;
        const merchantId = `expense-merchant-${expense.id}`;
        const selectedCategory = categoryOptions.find(
          option => option.value === expense.category,
        );

        return (
          <div key={expense.id} className={styles['expense-details__block']}>
            {visibleExpenses.length > 1 ? (
              <Typography as="h3" size="sm" weight="bold">
                {formatExpenseNote(expense.note, `Expense ${index + 1}`)}
              </Typography>
            ) : null}
            <div className={styles['expense-details__dual-row']}>
              <div className={styles['expense-details__field']}>
                <Typography
                  as="label"
                  size="sm"
                  weight="bold"
                  htmlFor={amountId}
                >
                  Amount
                </Typography>
                <Input
                  id={amountId}
                  className={styles['expense-details__control']}
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={expense.amount}
                  onChange={event =>
                    updateDraft(expense.id, { amount: event.target.value })
                  }
                />
              </div>
              <div className={styles['expense-details__field']}>
                <Typography as="label" size="sm" weight="bold" htmlFor={dateId}>
                  Date
                </Typography>
                <Input
                  id={dateId}
                  className={styles['expense-details__control']}
                  type="date"
                  value={expense.expenseDate}
                  onChange={event =>
                    updateDraft(expense.id, { expenseDate: event.target.value })
                  }
                />
              </div>
            </div>
            <div className={styles['expense-details__row']}>
              <Typography
                as="label"
                size="sm"
                weight="bold"
                htmlFor={categoryId}
              >
                Category
              </Typography>
              <Select
                id={categoryId}
                className={styles['expense-details__control']}
                name={categoryId}
                aria-label="Expense category"
                options={categoryOptions}
                value={selectedCategory ?? null}
                placeholder="Select a category"
                getOptionLabel={option => option.label}
                getOptionValue={option => option.value}
                onChange={option =>
                  updateDraft(expense.id, { category: option?.value ?? null })
                }
              />
            </div>
            <div className={styles['expense-details__row']}>
              <Typography
                as="label"
                size="sm"
                weight="bold"
                htmlFor={merchantId}
              >
                Merchant
              </Typography>
              <Input
                id={merchantId}
                className={styles['expense-details__control']}
                value={expense.merchant}
                placeholder="Add merchant"
                onChange={event =>
                  updateDraft(expense.id, { merchant: event.target.value })
                }
              />
            </div>
            {index < visibleExpenses.length - 1 ? (
              <Divider thickness="thin" />
            ) : null}
          </div>
        );
      })}
    </Flex>
  );

  return (
    <Dialog
      controller={controller}
      title="Expense details"
      content={content}
      actions={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    />
  );
}
