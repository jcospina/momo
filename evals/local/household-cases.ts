import type { SqlExpenseRow } from '@/agent/tools/sqlite-query';

export type HouseholdFixture = {
  metadata: {
    seed: number;
    currentDate: string;
    householdId: string;
    ownerId: string;
    memberId: string;
    measuredAggregateTarget: Record<string, unknown>;
    generatedAggregateShape: Record<string, unknown>;
  };
  rows: (SqlExpenseRow & { source_input: string })[];
};
export type HouseholdCase = {
  id: string;
  question: string;
  scope: 'personal' | 'household';
  expected:
    | { kind: 'amounts'; amounts: number[]; transactionCount: number }
    | { kind: 'missing_income' };
};

// Independent reference: match words/phrases in synthetic note text, never query
// SQL or use the executor's tag view/normalizer to calculate expected totals.
function words(note: string | null): string[] {
  return (
    (note ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\b\d+(?:\.\d+)?[km]?\b/g, ' ')
      .match(/[a-z]+/g) ?? []
  );
}
function phrase(row: SqlExpenseRow, term: string): boolean {
  const haystack = ` ${words(row.note).join(' ')} `;
  return haystack.includes(` ${term} `);
}
const sum = (rows: SqlExpenseRow[]) =>
  rows.reduce((total, row) => total + row.amount_cents, 0);

export function buildHouseholdCases(
  fixture: HouseholdFixture,
): HouseholdCase[] {
  const shared = fixture.rows.filter(
    row => row.household_id === fixture.metadata.householdId,
  );
  const personal = fixture.rows.filter(
    row => row.user_id === fixture.metadata.ownerId,
  );
  function amount(
    id: string,
    question: string,
    predicate: (row: SqlExpenseRow) => boolean,
    scope: 'personal' | 'household' = 'household',
  ): HouseholdCase {
    const rows = (scope === 'household' ? shared : personal).filter(predicate);
    return {
      id,
      question,
      scope,
      expected: {
        kind: 'amounts',
        amounts: [sum(rows)],
        transactionCount: rows.length,
      },
    };
  }
  const august = shared.filter(
    row => phrase(row, 'almuerzo') && row.expense_date.startsWith('2026-08'),
  );
  const october = shared.filter(
    row => phrase(row, 'almuerzo') && row.expense_date.startsWith('2026-10'),
  );
  return [
    amount(
      'household-lunch',
      '¿Cuánto gastamos en almuerzos en el hogar, entre todos los lugares y todo el historial?',
      row => phrase(row, 'almuerzo'),
    ),
    amount(
      'personal-lunch',
      '¿Cuánto he gastado yo en almuerzos en todo mi historial? Solo mis gastos, no los de los demás.',
      row => phrase(row, 'almuerzo'),
      'personal',
    ),
    amount(
      'place-wings',
      '¿Cuánto ha gastado el hogar en Wings en total, sin importar si fue almuerzo o cena?',
      row => phrase(row, 'wings'),
    ),
    amount(
      'lunch-wings',
      '¿Cuánto gastó el hogar específicamente en almuerzos en Wings?',
      row => phrase(row, 'almuerzo') && phrase(row, 'wings'),
    ),
    amount(
      'person-leo',
      '¿Cuánto gastó el hogar en cosas para Leo, sumando todas las categorías donde aparece su nombre?',
      row => phrase(row, 'leo'),
    ),
    amount(
      'person-marta-rojas',
      '¿Cuánto suman los gastos del hogar relacionados con Marta Rojas, en todas las categorías?',
      row => phrase(row, 'marta rojas'),
    ),
    amount(
      'pet-luna',
      '¿Cuánto ha gastado el hogar en Luna, nuestra mascota, en total?',
      row => phrase(row, 'luna'),
    ),
    amount(
      'overlapping-lunch-crepes',
      'En los gastos del hogar, suma lo de almuerzos o Crepes. Si un gasto es almuerzo en Crepes, cuéntalo una sola vez.',
      row => phrase(row, 'almuerzo') || phrase(row, 'crepes'),
    ),
    amount(
      'october-lunch',
      '¿Cuánto gastó el hogar en almuerzos el mes pasado?',
      row => phrase(row, 'almuerzo') && row.expense_date.startsWith('2026-10'),
    ),
    {
      id: 'lunch-month-comparison',
      question:
        'Compara los almuerzos del hogar en agosto y octubre de 2026: dime ambos totales y cuánto aumentó o bajó octubre frente a agosto.',
      scope: 'household',
      expected: {
        kind: 'amounts',
        amounts: [
          sum(august),
          sum(october),
          Math.abs(sum(october) - sum(august)),
        ],
        transactionCount: august.length + october.length,
      },
    },
    amount(
      'uncategorized-including-null',
      '¿Cuánto gastamos en el hogar en cosas sin categoría?',
      row => row.category === null || row.category === 'uncategorized',
    ),
    {
      id: 'missing-income',
      question: '¿Qué porcentaje de los ingresos está ahorrando el hogar?',
      scope: 'household',
      expected: { kind: 'missing_income' },
    },
  ];
}
