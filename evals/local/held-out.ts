import type { MomoAgentEvalCase } from '@evals/types/cases';

// Separate from the unchanged original goldens. Expected values are calculated
// directly from fixture rows and never included in model messages or prompts.
const semanticCases = [
  {
    id: 'roof-personal-scope',
    en: 'What have I spent on keeping a roof over my head?',
    es: '¿Cuánto he gastado en mantener un techo sobre mi cabeza?',
    label: 'Housing: mortgage, property tax, HOA dues and washer repair',
    category: 'housing',
    totalExpenseCents: 3_720_540,
    transactionCount: 30,
  },
  {
    id: 'phone-personal-scope',
    en: 'How much went toward staying connected by phone?',
    es: '¿Cuánto se fue en mantenerme comunicado por teléfono?',
    label:
      'Phone replacement after cracked screen; no personal cell phone plan records',
    category: 'shopping',
    totalExpenseCents: 58_055,
    transactionCount: 1,
  },
  {
    id: 'phone-explicit-personal',
    en: 'Looking only at my own spending, how much went toward staying connected by phone?',
    es: 'Mirando únicamente mis propios gastos, ¿cuánto se fue en mantenerme comunicado por teléfono?',
    label:
      'Phone replacement after cracked screen; no personal cell phone plan records',
    category: 'shopping',
    totalExpenseCents: 58_055,
    transactionCount: 1,
  },
  {
    id: 'car-maintenance',
    en: 'How much have I spent on servicing and replacing worn parts on my car? Leave out fuel, insurance and loan payments.',
    es: '¿Cuánto he gastado en mantenimiento y reemplazo de piezas desgastadas del carro? Excluye gasolina, seguro y cuotas del préstamo.',
    label: 'Oil change and New tires (set of 4)',
    category: 'vehicle',
    totalExpenseCents: 95_077,
    transactionCount: 5,
  },
  {
    id: 'broken-home-equipment',
    en: 'What have I paid to fix broken appliances or hot-water equipment?',
    es: '¿Cuánto pagué por arreglar mis electrodomésticos o el equipo de agua caliente que se dañaron?',
    label: 'Washer repair and Replaced broken water heater parts',
    category: 'housing',
    totalExpenseCents: 67_161,
    transactionCount: 2,
  },
  {
    id: 'damaged-handset',
    en: 'How much did replacing my damaged handset cost me?',
    es: '¿Cuánto me costó reemplazar mi celular dañado?',
    label: 'Phone replacement after cracked screen',
    category: 'shopping',
    totalExpenseCents: 58_055,
    transactionCount: 1,
  },
];

export const heldOutCases: MomoAgentEvalCase[] = semanticCases.flatMap(test =>
  (['en', 'es'] as const).map(locale => ({
    id: `held-out-${test.id}-${locale}`,
    input: test[locale],
    locale,
    pairId: `held-out-${test.id}`,
    category: 'filtered_total',
    difficulty: 'hard',
    expectedTools: ['querySql'],
    expected: {
      kind: 'filtered_total',
      label: test.label,
      category: test.category,
      startDate: '2025-04-01',
      endDate: '2026-04-24',
      totalExpenseCents: test.totalExpenseCents,
      transactionCount: test.transactionCount,
      currency: 'USD',
    },
    metadata: {
      answerability: 'indirect_hard',
      currency: 'USD',
      fixture: 'expenses.usd.golden.json',
      fixtureEndDate: '2026-04-24',
      scope: 'personal',
      dimension: 'note',
    },
  })),
);
