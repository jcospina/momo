import { render, screen } from '@testing-library/react';
import { CategoryRingChart } from './category-ring-chart';
import { MonthlyTotalsBarChart } from './monthly-totals-bar-chart';
import { mockChartLayout } from './shared/mock-chart-layout.test-helper';
import { UserTotalsRingChart } from './user-totals-ring-chart';

/**
 * The same category (or member) must keep the same colour in every chart and
 * period, no matter where it ranks — that is what ties charts to the chat.
 */

beforeEach(() => {
  mockChartLayout();
});

function fillFor(label: string): string | null {
  const button = screen.getByText(label).closest('button');
  const dot = button?.querySelector('span');
  return dot ? (dot as HTMLElement).style.background : null;
}

describe('CategoryRingChart', () => {
  it('colours a category the same whatever its rank', () => {
    const first = render(
      <CategoryRingChart
        monthLabel="Jan"
        currency="USD"
        items={[
          { category: 'dining', totalCents: 9_000 },
          { category: 'groceries', totalCents: 1_000 },
        ]}
      />,
    );
    expect(fillFor('Dining')).toBe('var(--category-dining)');
    first.unmount();

    render(
      <CategoryRingChart
        monthLabel="Feb"
        currency="USD"
        items={[
          { category: 'groceries', totalCents: 9_000 },
          { category: 'dining', totalCents: 1_000 },
        ]}
      />,
    );
    expect(fillFor('Dining')).toBe('var(--category-dining)');
    expect(fillFor('Groceries')).toBe('var(--category-groceries)');
  });

  it('gives the long tail a neutral "Others" colour', () => {
    render(
      <CategoryRingChart
        monthLabel="Jan"
        currency="USD"
        items={[
          'dining',
          'groceries',
          'housing',
          'travel',
          'fun',
          'pets',
          'fees',
        ].map((category, index) => ({ category, totalCents: 1_000 - index }))}
      />,
    );
    expect(fillFor('Others')).toBe('var(--category-others)');
  });
});

describe('UserTotalsRingChart', () => {
  it('colours each member by their fixed slot', () => {
    render(
      <UserTotalsRingChart
        currency="USD"
        items={[
          { key: 'u-2', user_label: 'Riley', totalCents: 9_000, color_slot: 2 },
          { key: 'u-1', user_label: 'Alex', totalCents: 1_000, color_slot: 1 },
        ]}
      />,
    );
    expect(fillFor('Riley')).toBe('var(--member-2)');
    expect(fillFor('Alex')).toBe('var(--member-1)');
  });
});

describe('MonthlyTotalsBarChart', () => {
  it('colours series by category and translates their names', () => {
    render(
      <MonthlyTotalsBarChart
        currency="USD"
        months={[
          {
            month: '2026-01',
            categories: [
              { category: 'self_care', totalCents: 5_000 },
              { category: 'dining', totalCents: 3_000 },
            ],
          },
        ]}
      />,
    );
    expect(fillFor('Self care')).toBe('var(--category-self_care)');
    expect(fillFor('Dining')).toBe('var(--category-dining)');
  });
});
