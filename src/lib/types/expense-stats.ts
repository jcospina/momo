export type MonthlyByCategoryRow = {
  household_id: string | null;
  month: string;
  category: string | null;
  total_cents: number;
};

export type MonthlyTotalsRow = {
  household_id: string | null;
  month: string;
  total_cents: number;
};

export type MonthlyByCategoryUserRow = {
  household_id: string;
  month: string;
  category: string;
  user_label: string;
  total_cents: number;
};

export type MonthlyTotalsByUserRow = {
  household_id: string;
  user_label: string | null;
  month: string;
  total_cents: number;
};

export type UserTotalPoint = {
  user_label: string;
  totalCents: number;
};

export type DailyTotalsByMonthRow = {
  household_id: string | null;
  month: string;
  day: number;
  total_cents: number;
  cumulative_cents: number | null;
};
