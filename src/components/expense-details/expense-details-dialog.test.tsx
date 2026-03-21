import type { ExpenseRecord } from '@lib-types/expenses';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DialogController } from '@ui/dialog/dialog.types';
import type { ReactNode } from 'react';
import {
  getExpensesByMessageId,
  updateExpenses,
} from '@/lib/data/expenses/client';
import { ExpenseDetailsDialog } from './expense-details-dialog';

jest.mock('@/lib/data/expenses/client', () => ({
  getExpensesByMessageId: jest.fn(),
  updateExpenses: jest.fn(),
}));

jest.mock('@ui/dialog/dialog', () => ({
  Dialog: ({
    controller,
    title,
    content,
    actions,
  }: {
    controller: DialogController;
    title: string;
    content: ReactNode;
    actions?: ReactNode;
  }) =>
    controller.open ? (
      <div>
        <h2>{title}</h2>
        {content}
        {actions}
      </div>
    ) : null,
}));

jest.mock('@ui/select/select', () => ({
  Select: ({
    id,
    ['aria-label']: ariaLabel,
    options,
    value,
    placeholder,
    onChange,
  }: {
    id: string;
    'aria-label': string;
    options: Array<{ value: string; label: string }>;
    value: { value: string; label: string } | null;
    placeholder: string;
    onChange?: (option: { value: string; label: string } | null) => void;
  }) => (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value?.value ?? ''}
      onChange={event => {
        const option =
          options.find(next => next.value === event.target.value) ?? null;
        onChange?.(option);
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

function buildController(
  overrides: Partial<DialogController> = {},
): DialogController {
  return {
    open: true,
    onOpenChange: jest.fn(),
    openDialog: jest.fn(),
    closeDialog: jest.fn(),
    toggleDialog: jest.fn(),
    triggerProps: {
      id: 'dialog-trigger',
      onClick: jest.fn(),
      'aria-haspopup': 'dialog',
      'aria-expanded': true,
      'aria-controls': 'dialog-popup',
    },
    dialogProps: {
      open: true,
      onOpenChange: jest.fn(),
      triggerId: 'dialog-trigger',
      popupId: 'dialog-popup',
    },
    ...overrides,
  };
}

function buildExpense(overrides: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    id: 'expense-1',
    household_id: null,
    user_id: 'user-1',
    chat_message_id: 'message-1',
    amount_cents: 200000,
    currency: 'USD',
    expense_date: '2026-03-20',
    merchant: 'Employer Inc',
    category: 'income',
    note: 'Monthly salary',
    created_at: '2026-03-20T10:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

describe('ExpenseDetailsDialog category-driven variants', () => {
  const getExpensesByMessageIdMock = jest.mocked(getExpensesByMessageId);
  const updateExpensesMock = jest.mocked(updateExpenses);

  beforeEach(() => {
    jest.clearAllMocks();
    updateExpensesMock.mockResolvedValue({ updatedIds: ['expense-1'] });
  });

  it('renders income variant fields when category is income', async () => {
    getExpensesByMessageIdMock.mockResolvedValue({
      expenses: [buildExpense()],
    });

    render(
      <ExpenseDetailsDialog
        controller={buildController()}
        messageId="message-1"
      />,
    );

    expect(await screen.findByLabelText('Source')).toBeInTheDocument();
    expect(screen.getByLabelText('Source')).toHaveValue('Employer Inc');
    expect(screen.getByLabelText('Note')).toHaveValue('Monthly salary');
    expect(screen.queryByLabelText('Merchant')).not.toBeInTheDocument();
  });

  it('switches to expense fields when category changes away from income', async () => {
    getExpensesByMessageIdMock.mockResolvedValue({
      expenses: [buildExpense()],
    });

    render(
      <ExpenseDetailsDialog
        controller={buildController()}
        messageId="message-1"
      />,
    );

    const categorySelect = await screen.findByLabelText('Expense category');
    fireEvent.change(categorySelect, { target: { value: 'groceries' } });

    await waitFor(() =>
      expect(screen.getByLabelText('Merchant')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Merchant')).toHaveValue('Employer Inc');
    expect(screen.queryByLabelText('Source')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Note')).not.toBeInTheDocument();
  });

  it('sends note only for income-category updates', async () => {
    getExpensesByMessageIdMock
      .mockResolvedValueOnce({
        expenses: [buildExpense()],
      })
      .mockResolvedValueOnce({
        expenses: [buildExpense()],
      });

    const closeDialog = jest.fn();
    const incomeController = buildController({ closeDialog });

    const { unmount } = render(
      <ExpenseDetailsDialog
        controller={incomeController}
        messageId="message-1"
      />,
    );

    expect(await screen.findByLabelText('Note')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Bonus payout' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateExpensesMock).toHaveBeenCalledWith({
        updates: [
          {
            id: 'expense-1',
            amount: '2000',
            expense_date: '2026-03-20',
            category: 'income',
            merchant: 'Employer Inc',
            note: 'Bonus payout',
            currency: 'USD',
          },
        ],
        messageId: 'message-1',
      }),
    );

    unmount();

    const expenseController = buildController();
    render(
      <ExpenseDetailsDialog
        controller={expenseController}
        messageId="message-1"
      />,
    );

    const categorySelect = await screen.findByLabelText('Expense category');
    fireEvent.change(categorySelect, { target: { value: 'groceries' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateExpensesMock).toHaveBeenLastCalledWith({
        updates: [
          {
            id: 'expense-1',
            amount: '2000',
            expense_date: '2026-03-20',
            category: 'groceries',
            merchant: 'Employer Inc',
            currency: 'USD',
          },
        ],
        messageId: 'message-1',
      }),
    );
  });
});
