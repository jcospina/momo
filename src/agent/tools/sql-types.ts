export type SqlExpenseRow = {
  id: string;
  user_id: string;
  household_id: string | null;
  amount_cents: number;
  currency: string;
  expense_date: string;
  merchant: string | null;
  category: string | null;
  note: string | null;
  tags?: string[];
};

export type QuerySqlInput = {
  scope: 'personal' | 'household';
  sql: string;
  parameters: (string | number | null)[];
};

export type QuerySqlResult = {
  rows: Record<string, string | number | null>[];
  truncated: boolean;
  currency: string;
  errorCode?: string;
  error?: string;
};
