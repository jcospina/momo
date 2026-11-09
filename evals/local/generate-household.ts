import { writeFileSync } from 'node:fs';
import { extractTagNgrams } from '@helpers/expenses/expense-category';
import { parseChatEntries } from '@helpers/expenses/expense-parser';

const categories: [string | null, number, number, string[]][] = [
  [
    'groceries',
    126,
    50,
    [
      'mercado',
      'mercado',
      'fruta',
      'verduras',
      'mercado leo',
      'mercado tienda',
      'fruta plaza',
      'mercado semanal',
    ],
  ],
  [
    'kids',
    71,
    45,
    [
      'colegio',
      'colegio',
      'juguetes',
      'uniforme',
      'colegio leo',
      'ropa leo',
      'libros leo',
      'clase leo',
    ],
  ],
  [
    'housing',
    58,
    1200,
    [
      'administracion',
      'hipoteca',
      'aseo',
      'arreglo',
      'arreglo cocina',
      'aseo casa',
      'cuota vivienda',
      'reparacion lavadora',
    ],
  ],
  [
    'dining',
    36,
    25,
    [
      'almuerzo crepes',
      'almuerzo kntina',
      'almuerzo wings',
      'cena wings',
      'desayuno crepes',
      'almuerzo',
      'cena',
      'cafe',
    ],
  ],
  [
    'health',
    36,
    70,
    [
      'medico',
      'farmacia',
      'medicinas',
      'examen',
      'consulta leo',
      'consulta marta rojas',
      'medicina leo',
      'consulta general',
    ],
  ],
  [
    'vehicle',
    27,
    110,
    [
      'seguro',
      'taller',
      'aceite',
      'llantas',
      'seguro carro',
      'cambio aceite',
      'arreglo carro',
    ],
  ],
  [
    'transportation',
    22,
    12,
    ['taxi', 'bus', 'parqueadero', 'pasaje', 'taxi centro', 'bus colegio'],
  ],
  [
    'utilities',
    22,
    100,
    ['agua', 'luz', 'gas', 'internet', 'plan celular', 'factura internet'],
  ],
  [
    'pets',
    17,
    60,
    [
      'veterinario luna',
      'comida luna',
      'vacuna luna',
      'arena luna',
      'veterinario',
      'comida luna',
    ],
  ],
  [
    'shopping',
    12,
    40,
    ['ropa', 'zapatos', 'compra', 'repuesto', 'ropa leo', 'compra tienda'],
  ],
  [
    'uncategorized',
    10,
    20,
    ['varios', 'pendiente', 'otros', 'varios leo', 'pendiente tienda'],
  ],
  [
    'travel',
    8,
    180,
    ['hotel', 'paseo', 'pasajes', 'viaje', 'paseo familia', 'hotel playa'],
  ],
  [
    'entertainment',
    6,
    35,
    ['cine', 'juego', 'teatro', 'pelicula', 'cine leo', 'juego familia'],
  ],
  ['education', 3, 90, ['curso leo', 'curso marta rojas', 'libro']],
  ['rent', 3, 1800, ['arriendo', 'arriendo', 'arriendo']],
  ['gifts', 1, 80, ['regalo marta rojas']],
  [null, 1, 19, ['ajuste']],
  ['fees', 1, 8, ['comision']],
  ['treats', 1, 9, ['helado leo']],
  ['fun', 1, 24, ['parque leo']],
];

let state = 20261109;
function random() {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 4294967296;
}
const plans = categories.flatMap(([category, count, base, templates]) =>
  Array.from({ length: count }, (_, i) => ({
    category,
    base,
    description: templates[i % templates.length],
  })),
);
for (let i = plans.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [plans[i], plans[j]] = [plans[j], plans[i]];
}
// Match the observed overlap depth with invented qualifiers, never real names.
for (const [fromCount, toCount, needed] of [
  [3, 9, 6],
  [3, 6, 34],
  [1, 3, 4],
] as const) {
  let changed = 0;
  for (let offset = 0; offset < plans.length && changed < needed; offset++) {
    const index = (offset * 37) % plans.length;
    if (
      index % 36 === 0 ||
      extractTagNgrams(plans[index].description).length !== fromCount
    )
      continue;
    const extra = toCount === 9 ? ' marta diaz' : ' leo';
    const candidate = plans[index].description + extra;
    if (extractTagNgrams(candidate).length !== toCount) continue;
    plans[index].description = candidate;
    changed++;
  }
  if (changed !== needed) throw new Error('Insufficient synthetic templates');
}
const start = Date.parse('2025-11-01T00:00:00Z');
const end = Date.parse('2026-11-08T00:00:00Z');
let parserCategoryDisagreements = 0;
const rows = plans.map((plan, index) => {
  const expenseDate = new Date(
    start +
      Math.floor(((end - start) * index) / (plans.length - 1) / 86400000) *
        86400000,
  )
    .toISOString()
    .slice(0, 10);
  const price = plan.base + (index % 7) * 2 + Number(expenseDate.slice(5, 7));
  const sourceInput = `${price}k ${plan.description}`;
  const parsed = parseChatEntries(sourceInput, 'COP');
  if (
    parsed.status !== 'parsed' ||
    parsed.entries.length !== 1 ||
    parsed.errors.length
  )
    throw new Error(`Cannot parse synthetic input ${index}`);
  const entry = parsed.entries[0];
  if (entry.category !== plan.category) parserCategoryDisagreements++;
  // Legacy records can have edited notes or absent tags. Amounts always come
  // from the actual production parser; category labels mimic stored history.
  const note = index < 44 ? plan.description : entry.normalized;
  const tags = index % 36 === 0 ? [] : extractTagNgrams(note);
  return {
    id: `synthetic-expense-${String(index + 1).padStart(4, '0')}`,
    user_id: index % 3 === 0 ? 'synthetic-member-b' : 'synthetic-member-a',
    household_id: 'synthetic-household',
    amount_cents: entry.amount_minor,
    currency: 'COP',
    expense_date: expenseDate,
    merchant: index % 10 === 0 || index === 1 ? 'synthetic local shop' : null,
    category: plan.category,
    note,
    tags,
    source_input: sourceInput,
  };
});
const histogram = (values: (string | number)[]) =>
  values.reduce<Record<string, number>>((counts, value) => {
    counts[String(value)] = (counts[String(value)] ?? 0) + 1;
    return counts;
  }, {});
const measured = {
  rows: 462,
  nullMerchants: 414,
  nullNotes: 0,
  emptyTags: 13,
  notesContainingNumbers: 418,
  wordCounts: { 1: 33, 2: 218, 3: 159, 4: 39, 5: 9, 6: 4 },
  tagCounts: { 0: 13, 1: 235, 3: 168, 6: 40, 9: 6 },
  startDate: '2025-11-01',
  endDate: '2026-11-08',
  incomeRows: 0,
};
const generated = {
  rows: rows.length,
  nullMerchants: rows.filter(r => r.merchant === null).length,
  nullNotes: 0,
  emptyTags: rows.filter(r => !r.tags.length).length,
  notesContainingNumbers: rows.filter(r => /\d/.test(r.note)).length,
  wordCounts: histogram(rows.map(r => r.note.split(/\s+/).length)),
  tagCounts: histogram(rows.map(r => r.tags.length)),
  startDate: rows[0].expense_date,
  endDate: rows.at(-1)?.expense_date,
  incomeRows: 0,
  categories: histogram(rows.map(r => r.category ?? 'NULL')),
};
const fixture = {
  metadata: {
    synthetic: true,
    seed: 20261109,
    currency: 'COP',
    currentDate: '2026-11-09',
    householdId: 'synthetic-household',
    ownerId: 'synthetic-member-a',
    memberId: 'synthetic-member-b',
    provenance:
      'Invented Spanish templates and names only. Uses aggregate distribution targets; no real records or private names copied.',
    categoryAssignment:
      'Prescribed synthetic stored categories; production parser supplies amount and initial tags. Legacy notes/tags modeled explicitly.',
    parserCategoryDisagreements,
    measuredAggregateTarget: measured,
    generatedAggregateShape: generated,
  },
  rows,
};
writeFileSync(
  'evals/mocks/dataset/household-typed.synthetic.json',
  JSON.stringify(fixture, null, 2) + '\n',
);
execFileSync(
  'pnpm',
  [
    'exec',
    'biome',
    'format',
    '--write',
    'evals/mocks/dataset/household-typed.synthetic.json',
  ],
  { stdio: 'pipe' },
);
console.log(
  JSON.stringify({ measured, generated, parserCategoryDisagreements }, null, 2),
);

import { execFileSync } from 'node:child_process';
