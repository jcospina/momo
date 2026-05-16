/**
 * Pure sample-data generation for MoMo evals, local fixtures, and DB seeding.
 * This module has no Supabase dependency so golden datasets can be generated
 * without local DB setup.
 */

import { extractTagNgrams } from '@helpers/expenses/expense-category';

export { extractTagNgrams };

export type SampleExpenseRow = {
  user_id: string;
  household_id: string;
  amount_cents: number;
  currency: string;
  expense_date: string;
  merchant: string | null;
  category: string;
  note: string | null;
  tags: string[];
};

export type SampleExpenseMetadata = {
  currency: string;
  endDate: string;
  householdId: string;
  memberId: string;
  ownerId: string;
  rowCount: number;
  seed: number;
  startDate: string;
};

export type GenerateSampleExpenseOptions = {
  currency?: string;
  householdId?: string;
  memberId?: string;
  now?: string | Date;
  ownerId?: string;
  seed?: number;
};

export type SampleExpenseDataset = {
  metadata: SampleExpenseMetadata;
  rows: SampleExpenseRow[];
};

const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_SAMPLE_SEED = 20260424;
export const DEFAULT_SAMPLE_NOW = '2026-04-24';

let currentCurrency: string = DEFAULT_CURRENCY;
let rngState: number = normalizeSeed(DEFAULT_SAMPLE_SEED);

type ChatLabelInput = {
  note?: string | null;
  merchant?: string | null;
  category?: string | null;
};

export function chatLabelFor({
  note,
  merchant,
  category,
}: ChatLabelInput): string {
  return (note ?? merchant ?? category ?? '').toString().toLowerCase().trim();
}

const ANNUAL_DRIFT_BY_CATEGORY: Record<string, number[]> = {
  dining: [
    1, 1.012, 1.018, 1.027, 1.035, 1.044, 1.052, 1.066, 1.072, 1.081, 1.094,
    1.101, 1.114,
  ],
  groceries: [
    1, 1.009, 1.017, 1.026, 1.041, 1.046, 1.052, 1.061, 1.075, 1.083, 1.091,
    1.103, 1.112,
  ],
  health: [
    1, 1, 1.021, 1.021, 1.037, 1.037, 1.037, 1.052, 1.052, 1.068, 1.068, 1.068,
    1.083,
  ],
  housing: [
    1, 1, 1, 1, 1, 1.033, 1.033, 1.033, 1.033, 1.033, 1.033, 1.033, 1.033,
  ],
  kids: [
    1, 1, 1, 1.018, 1.018, 1.018, 1.018, 1.042, 1.042, 1.042, 1.058, 1.058,
    1.058,
  ],
  pets: [
    1, 1.011, 1.011, 1.026, 1.026, 1.026, 1.039, 1.039, 1.052, 1.052, 1.052,
    1.064, 1.064,
  ],
  self_care: [
    1, 1, 1.015, 1.015, 1.015, 1.034, 1.034, 1.034, 1.047, 1.047, 1.047, 1.059,
    1.059,
  ],
  shopping: [
    1, 1.005, 1.011, 1.019, 1.024, 1.035, 1.038, 1.044, 1.057, 1.063, 1.069,
    1.077, 1.088,
  ],
  subscriptions: [
    1, 1, 1, 1, 1.063, 1.063, 1.063, 1.063, 1.063, 1.093, 1.093, 1.093, 1.093,
  ],
  transportation: [
    1, 0.982, 1.015, 1.044, 1.023, 1.071, 1.092, 1.063, 1.038, 1.076, 1.051,
    1.089, 1.111,
  ],
  travel: [
    1, 1, 1.018, 1.018, 1.037, 1.037, 1.061, 1.061, 1.081, 1.081, 1.096, 1.096,
    1.112,
  ],
  utilities: [
    1, 1.007, 1.019, 1.019, 1.036, 1.036, 1.051, 1.051, 1.063, 1.063, 1.079,
    1.079, 1.094,
  ],
  vehicle: [
    1, 1, 1.018, 1.018, 1.018, 1.036, 1.036, 1.036, 1.052, 1.052, 1.052, 1.069,
    1.069,
  ],
};

type OneOffEvent = {
  monthOffset: number;
  day: number;
  category: string;
  merchant: string;
  note: string;
  amount: number;
  user: 'owner' | 'member';
};

const ONE_OFF_EVENTS: OneOffEvent[] = [
  {
    monthOffset: 1,
    day: 18,
    category: 'health',
    merchant: 'Urgent Care Center',
    note: 'Weekend urgent care visit',
    amount: 31500,
    user: 'member',
  },
  {
    monthOffset: 2,
    day: 23,
    category: 'shopping',
    merchant: 'Home Depot',
    note: 'Replaced broken water heater parts',
    amount: 28000,
    user: 'owner',
  },
  {
    monthOffset: 4,
    day: 11,
    category: 'vehicle',
    merchant: 'Midas',
    note: 'Unexpected brake repair',
    amount: 73500,
    user: 'member',
  },
  {
    monthOffset: 5,
    day: 26,
    category: 'fees',
    merchant: 'City Parking',
    note: 'Parking ticket',
    amount: 6800,
    user: 'owner',
  },
  {
    monthOffset: 7,
    day: 9,
    category: 'kids',
    merchant: 'Pediatric Dental',
    note: 'Kid dental filling',
    amount: 42000,
    user: 'member',
  },
  {
    monthOffset: 9,
    day: 16,
    category: 'housing',
    merchant: 'Appliance Repair Co',
    note: 'Washer repair',
    amount: 38500,
    user: 'owner',
  },
  {
    monthOffset: 10,
    day: 21,
    category: 'pets',
    merchant: 'Happy Paws Vet',
    note: 'Sick visit and medication',
    amount: 29500,
    user: 'member',
  },
  {
    monthOffset: 11,
    day: 6,
    category: 'shopping',
    merchant: 'Apple',
    note: 'Phone replacement after cracked screen',
    amount: 54900,
    user: 'owner',
  },
];

export function generateSampleExpenseData(
  options: GenerateSampleExpenseOptions = {},
): SampleExpenseDataset {
  const {
    currency = DEFAULT_CURRENCY,
    householdId = 'sample-household',
    memberId = 'sample-member',
    now = DEFAULT_SAMPLE_NOW,
    ownerId = 'sample-owner',
    seed = DEFAULT_SAMPLE_SEED,
  } = options;
  const dateWindow = buildDateWindow(now);
  currentCurrency = currency;
  rngState = normalizeSeed(seed);
  const rows: SampleExpenseRow[] = [];
  forEachMonth(dateWindow, (year, month, maxDay, monthOffset) => {
    rows.push(
      ...generateIncomeRows(
        year,
        month,
        ownerId,
        memberId,
        householdId,
        maxDay,
        monthOffset,
        currency,
      ),
    );
    rows.push(
      ...generateExpenseRows(
        year,
        month,
        ownerId,
        memberId,
        householdId,
        maxDay,
        monthOffset,
        currency,
      ),
    );
  });

  return {
    metadata: {
      currency,
      endDate: dateStr(
        dateWindow.endYear,
        dateWindow.endMonth,
        dateWindow.todayDay,
      ),
      householdId,
      memberId,
      ownerId,
      rowCount: rows.length,
      seed,
      startDate: dateStr(dateWindow.startYear, dateWindow.startMonth, 1),
    },
    rows,
  };
}

// ── iteration helper ─────────────────────────────────────────────────────────

type DateWindow = {
  endMonth: number;
  endYear: number;
  startMonth: number;
  startYear: number;
  todayDay: number;
};

function buildDateWindow(now: string | Date): DateWindow {
  const date = parseSampleDate(now);
  const todayYear = date.getUTCFullYear();
  const todayMonth = date.getUTCMonth() + 1;
  const todayDay = date.getUTCDate();
  const startYear = todayMonth === 12 ? todayYear : todayYear - 1;
  const startMonth = todayMonth === 12 ? 1 : todayMonth;

  return {
    endMonth: todayMonth,
    endYear: todayYear,
    startMonth,
    startYear,
    todayDay,
  };
}

function parseSampleDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid sample date "${value}". Use YYYY-MM-DD.`);
  }
  return parsed;
}

type MonthVisitor = (
  year: number,
  month: number,
  maxDay: number | null,
  monthOffset: number,
) => void;

function forEachMonth(dateWindow: DateWindow, fn: MonthVisitor): void {
  let y = dateWindow.startYear;
  let m = dateWindow.startMonth;
  for (let i = 0; i < 13; i++) {
    // For the current month, cap at today's day; past months use full range.
    const maxDay =
      y === dateWindow.endYear && m === dateWindow.endMonth
        ? dateWindow.todayDay
        : null;
    fn(y, m, maxDay, i);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
}

// ── income generation ────────────────────────────────────────────────────────

function generateIncomeRows(
  year: number,
  month: number,
  ownerId: string,
  memberId: string,
  householdId: string,
  maxDay: number | null,
  monthOffset: number,
  currency: string,
): SampleExpenseRow[] {
  const rows: SampleExpenseRow[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  // Clamp day to month length and, for the current month, to today.
  const d = (day: number) => Math.min(day, maxDay ?? daysInMonth);
  const dayInRange = (day: number) => (maxDay ? day <= maxDay : true);

  const ownerPaycheck = trendAmount(375000, 'income', monthOffset, 0);
  const memberPaycheck = trendAmount(275000, 'income', monthOffset, 0);

  // Candidate income entries: [day, userId, amountCents, merchant, note, monthGuard]
  // monthGuard is null (every month) or a specific month number.
  const candidates: Array<
    [number, string, number, string, string, number | null]
  > = [
    // Salaries stay mostly steady, with small uneven raises across the window.
    [1, ownerId, ownerPaycheck, 'Acme Corp', 'Salary', null],
    [15, ownerId, ownerPaycheck, 'Acme Corp', 'Salary', null],
    [1, memberId, memberPaycheck, 'Globex Inc', 'Salary', null],
    [15, memberId, memberPaycheck, 'Globex Inc', 'Salary', null],
    // Occasional bonuses & one-offs
    [18, ownerId, 320000, 'IRS', 'Tax refund', 3],
    [28, ownerId, vary(500000, 0.08), 'Acme Corp', 'Mid-year bonus', 6],
    [20, ownerId, vary(750000, 0.12), 'Acme Corp', 'Year-end bonus', 12],
    [20, memberId, vary(400000, 0.1), 'Globex Inc', 'Year-end bonus', 12],
    [12, memberId, 45000, 'Facebook Marketplace', 'Sold old couch', 7],
    [22, ownerId, 150000, 'Side project client', 'Freelance web dev', 9],
  ];

  for (const [day, userId, amount, merchant, note, guard] of candidates) {
    if (guard !== null && month !== guard) continue;
    if (!dayInRange(day)) continue;
    rows.push(
      incomeRow(
        userId,
        householdId,
        year,
        month,
        d(day),
        amount,
        merchant,
        note,
        currency,
      ),
    );
  }

  return rows;
}

function incomeRow(
  userId: string,
  householdId: string,
  year: number,
  month: number,
  day: number,
  amountCents: number,
  merchant: string,
  note: string,
  currency: string = currentCurrency,
): SampleExpenseRow {
  const category = 'income';
  const tags = extractTagNgrams(chatLabelFor({ note, merchant, category }));
  return {
    user_id: userId,
    household_id: householdId,
    amount_cents: amountCents,
    currency,
    expense_date: dateStr(year, month, day),
    merchant,
    category,
    note,
    tags,
  };
}

// ── expense generation ───────────────────────────────────────────────────────

function generateExpenseRows(
  year: number,
  month: number,
  ownerId: string,
  memberId: string,
  householdId: string,
  maxDay: number | null,
  monthOffset: number,
  currency: string,
): SampleExpenseRow[] {
  const rows: SampleExpenseRow[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const cap = maxDay ?? daysInMonth;
  const amount = (base: number, category: string, pct = 0.1) =>
    trendAmount(base, category, monthOffset, pct, month);

  // Helper to clamp day to month length and current-month cap.
  const d = (day: number) => Math.min(day, cap);
  // For random ranges, limit upper bound to cap.
  const randDay = (min: number, max: number) =>
    randInt(Math.min(min, cap), Math.min(max, cap));

  // ── Housing ────────────────────────────────────────────────────────────────
  rows.push(
    expense(
      ownerId,
      householdId,
      year,
      month,
      1,
      amount(200000, 'housing', 0.01),
      'housing',
      'Mortgage payment',
      'First National Bank',
    ),
    expense(
      ownerId,
      householdId,
      year,
      month,
      1,
      amount(35000, 'housing', 0.02),
      'housing',
      'HOA dues',
      'Sunrise HOA',
    ),
  );
  // Property tax twice a year
  if (month === 4 || month === 10) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        5,
        amount(185000, 'housing', 0.03),
        'housing',
        'Property tax',
        'County Tax Office',
      ),
    );
  }

  // ── Utilities ──────────────────────────────────────────────────────────────
  // Electricity varies by season
  const elecBase =
    [1, 2, 3].includes(month) || [11, 12].includes(month) ? 18500 : 14000;
  const elec = amount(elecBase, 'utilities', 0.15);
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      d(5),
      elec,
      'utilities',
      'Electricity',
      'City Power Co',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(8),
      amount(6500, 'utilities', 0.1),
      'utilities',
      'Water & sewer',
      'City Water',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(10),
      amount(7500, 'utilities', 0.15),
      'utilities',
      'Natural gas',
      'Gas Utility',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(12),
      amount(7999, 'utilities', 0.01),
      'utilities',
      'Internet',
      'Comcast',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(12),
      amount(5500, 'utilities', 0.02),
      'utilities',
      'Cell phone plan',
      'T-Mobile',
    ),
  );

  // ── Groceries (4-6 trips/month, split between both) ───────────────────────
  const groceryTrips = randInt(4, 6);
  for (let t = 0; t < groceryTrips; t++) {
    const who = t % 2 === 0 ? ownerId : memberId;
    const store = pick([
      'Costco',
      "Trader Joe's",
      'Whole Foods',
      'Kroger',
      'Aldi',
    ]);
    const amt =
      store === 'Costco'
        ? amount(25000, 'groceries', 0.25)
        : amount(12000, 'groceries', 0.3);
    const dayOfMonth = d(
      Math.max(1, Math.round(((t + 1) / (groceryTrips + 1)) * cap)),
    );
    rows.push(
      expense(
        who,
        householdId,
        year,
        month,
        dayOfMonth,
        amt,
        'groceries',
        null,
        store,
      ),
    );
  }

  // ── Dining (3-6 times/month) ───────────────────────────────────────────────
  const diningTrips = randInt(3, 6);
  const restaurants = [
    'Chipotle',
    'Olive Garden',
    'Panera Bread',
    'Chick-fil-A',
    'Starbucks',
    'Local Pizza Place',
    'Thai Orchid',
    'Sushi Zen',
    "McDonald's",
    'In-N-Out',
    "Denny's",
    'Buffalo Wild Wings',
  ];
  for (let t = 0; t < diningTrips; t++) {
    const who = pick([ownerId, memberId]);
    const rest = pick(restaurants);
    const isFast = [
      'Chipotle',
      'Chick-fil-A',
      'Starbucks',
      "McDonald's",
      'In-N-Out',
    ].includes(rest);
    const amt = isFast
      ? amount(1800, 'dining', 0.4)
      : amount(5500, 'dining', 0.35);
    rows.push(
      expense(
        who,
        householdId,
        year,
        month,
        d(randDay(1, cap)),
        amt,
        'dining',
        null,
        rest,
      ),
    );
  }

  // ── Transportation ────────────────────────────────────────────────────────
  rows.push(
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(randDay(5, 12)),
      amount(5500, 'transportation', 0.2),
      'transportation',
      'Gas fill-up',
      'Shell',
    ),
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(randDay(18, 25)),
      amount(5200, 'transportation', 0.2),
      'transportation',
      'Gas fill-up',
      'Chevron',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(randDay(8, 15)),
      amount(4800, 'transportation', 0.2),
      'transportation',
      'Gas fill-up',
      'BP',
    ),
  );
  // Occasional Uber/Lyft
  if (randInt(1, 3) === 1) {
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(1, cap)),
        amount(2500, 'transportation', 0.4),
        'transportation',
        null,
        'Uber',
      ),
    );
  }

  // ── Vehicle ────────────────────────────────────────────────────────────────
  rows.push(
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(3),
      amount(45000, 'vehicle', 0.01),
      'vehicle',
      'Car payment — SUV',
      'Auto Lender',
    ),
  );
  // Insurance quarterly
  if (month % 3 === 1) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(15),
        amount(48000, 'vehicle', 0.03),
        'vehicle',
        'Auto insurance (quarterly)',
        'Geico',
      ),
    );
  }
  // Oil change every 3 months
  if (month % 3 === 0) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(randDay(10, 20)),
        amount(7500, 'vehicle', 0.08),
        'vehicle',
        'Oil change',
        'Jiffy Lube',
      ),
    );
  }
  // Random car maintenance
  if (month === 8) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        14,
        amount(65000, 'vehicle', 0.12),
        'vehicle',
        'New tires (set of 4)',
        'Discount Tire',
      ),
    );
  }
  if (month === 2) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        22,
        amount(42000, 'vehicle', 0.15),
        'vehicle',
        'Brake pads + labor',
        'Midas',
      ),
    );
  }

  // ── Health ─────────────────────────────────────────────────────────────────
  rows.push(
    expense(
      ownerId,
      householdId,
      year,
      month,
      1,
      amount(45000, 'health', 0.02),
      'health',
      'Family health insurance premium',
      'Blue Cross',
    ),
  );
  // Doctor visits scattered
  if (randInt(1, 3) === 1) {
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(5, 25)),
        amount(4000, 'health', 0.3),
        'health',
        'Doctor copay',
        'Family Health Clinic',
      ),
    );
  }
  // Dentist twice a year
  if (month === 3 || month === 9) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(15),
        amount(7500, 'health', 0.04),
        'health',
        'Dental cleaning — adult',
        'Smile Dental',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        d(16),
        amount(7500, 'health', 0.04),
        'health',
        'Dental cleaning — adult',
        'Smile Dental',
      ),
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(17),
        amount(5000, 'health', 0.04),
        'health',
        'Dental cleaning — kids',
        'Smile Dental',
      ),
    );
  }
  // Pharmacy
  if (randInt(1, 2) === 1) {
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(1, cap)),
        amount(2500, 'health', 0.5),
        'health',
        'Prescription',
        'CVS Pharmacy',
      ),
    );
  }

  // ── Kids ───────────────────────────────────────────────────────────────────
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      1,
      amount(120000, 'kids', 0.01),
      'kids',
      'Daycare tuition',
      'Bright Horizons',
    ),
  );
  // After-school activity
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      1,
      amount(15000, 'kids', 0.03),
      'kids',
      'Soccer league',
      'Youth Sports Assoc',
    ),
  );
  // School supplies / random kid stuff
  if (month === 8) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        d(10),
        amount(18500, 'kids', 0.12),
        'kids',
        'Back-to-school supplies',
        'Target',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        d(12),
        amount(32000, 'kids', 0.12),
        'kids',
        'School clothes',
        'Old Navy',
      ),
    );
  }
  // Birthday party
  if (month === 5) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        d(20),
        amount(35000, 'kids', 0.08),
        'kids',
        'Birthday party',
        'Party City + venue',
      ),
    );
  }

  // ── Education ──────────────────────────────────────────────────────────────
  if (randInt(1, 4) === 1) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(randDay(5, 25)),
        amount(3000, 'education', 0.3),
        'education',
        'Online course',
        'Udemy',
      ),
    );
  }
  // Piano lessons monthly
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      d(8),
      amount(16000, 'education', 0.02),
      'education',
      'Piano lessons (kids)',
      'Music Academy',
    ),
  );

  // ── Subscriptions ──────────────────────────────────────────────────────────
  rows.push(
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(1),
      amount(1599, 'subscriptions', 0.01),
      'subscriptions',
      'Netflix',
      'Netflix',
    ),
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(1),
      amount(1099, 'subscriptions', 0.01),
      'subscriptions',
      'Spotify Family',
      'Spotify',
    ),
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(1),
      amount(1499, 'subscriptions', 0.01),
      'subscriptions',
      'iCloud+ storage',
      'Apple',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(5),
      amount(4999, 'subscriptions', 0.01),
      'subscriptions',
      'Gym membership',
      'LA Fitness',
    ),
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(15),
      amount(999, 'subscriptions', 0.01),
      'subscriptions',
      'YouTube Premium',
      'Google',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(20),
      amount(1599, 'subscriptions', 0.01),
      'subscriptions',
      'Disney+',
      'Disney',
    ),
  );
  // Amazon Prime annually
  if (month === 1) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(28),
        amount(13900, 'subscriptions', 0.01),
        'subscriptions',
        'Amazon Prime (annual)',
        'Amazon',
      ),
    );
  }

  // ── Entertainment ──────────────────────────────────────────────────────────
  const entCount = randInt(1, 3);
  const entOptions = [
    { merchant: 'AMC Theaters', note: 'Movie night', base: 5000 },
    { merchant: "Dave & Buster's", note: 'Family game night', base: 7500 },
    { merchant: 'Bowling Alley', note: 'Bowling', base: 4500 },
    { merchant: 'Mini Golf World', note: 'Mini golf with kids', base: 3500 },
    { merchant: 'Escape Room', note: 'Escape room', base: 9000 },
    { merchant: 'Zoo', note: 'Zoo visit', base: 6000 },
    { merchant: 'Aquarium', note: 'Aquarium tickets', base: 8000 },
    { merchant: 'Trampoline Park', note: 'Kids trampoline park', base: 4500 },
  ];
  for (let t = 0; t < entCount; t++) {
    const e = pick(entOptions);
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(1, cap)),
        amount(e.base, 'entertainment', 0.2),
        'entertainment',
        e.note,
        e.merchant,
      ),
    );
  }

  // ── Shopping ───────────────────────────────────────────────────────────────
  const shopCount = randInt(1, 4);
  const shopOptions: Array<{
    merchant: string;
    note: string | null;
    base: number;
  }> = [
    { merchant: 'Amazon', note: 'Household items', base: 4500 },
    { merchant: 'Target', note: null, base: 6500 },
    { merchant: 'IKEA', note: 'Home decor', base: 8000 },
    { merchant: 'Home Depot', note: 'Home improvement', base: 7000 },
    { merchant: 'TJ Maxx', note: 'Clothes', base: 5500 },
    { merchant: 'Best Buy', note: 'Electronics', base: 12000 },
    { merchant: 'Walmart', note: null, base: 3500 },
    { merchant: 'Nordstrom Rack', note: 'Clothes', base: 8500 },
  ];
  for (let t = 0; t < shopCount; t++) {
    const s = pick(shopOptions);
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(1, cap)),
        amount(s.base, 'shopping', 0.35),
        'shopping',
        s.note,
        s.merchant,
      ),
    );
  }

  // ── Self care ──────────────────────────────────────────────────────────────
  // Haircuts
  if (month % 2 === 0) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(randDay(10, 20)),
        amount(3500, 'self_care', 0.03),
        'self_care',
        'Haircut',
        'Great Clips',
      ),
    );
  }
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      d(randDay(5, 25)),
      amount(7500, 'self_care', 0.2),
      'self_care',
      'Hair salon',
      'Salon Luxe',
    ),
  );

  // ── Gifts ──────────────────────────────────────────────────────────────────
  if (month === 12) {
    // Holiday gifts
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(15),
        amount(45000, 'gifts', 0.12),
        'gifts',
        'Holiday gifts — family',
        'Various',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        d(16),
        amount(38000, 'gifts', 0.12),
        'gifts',
        'Holiday gifts — friends & teachers',
        'Various',
      ),
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(10),
        amount(12000, 'gifts', 0.1),
        'gifts',
        'Holiday gift — spouse',
        'Nordstrom',
      ),
    );
  }
  if (month === 2) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(14),
        amount(15000, 'gifts', 0.1),
        'gifts',
        "Valentine's Day dinner + flowers",
        'Various',
      ),
    );
  }
  if (month === 5) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(11),
        amount(8500, 'gifts', 0.12),
        'gifts',
        "Mother's Day gift",
        'Etsy',
      ),
    );
  }
  if (month === 6) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        d(15),
        amount(7500, 'gifts', 0.12),
        'gifts',
        "Father's Day gift",
        'REI',
      ),
    );
  }
  // Random birthday gifts
  if (month === 4 || month === 10) {
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(10, 20)),
        amount(5000, 'gifts', 0.3),
        'gifts',
        'Birthday gift — friend',
        pick(['Amazon', 'Etsy', 'Target']),
      ),
    );
  }

  // ── Pets ───────────────────────────────────────────────────────────────────
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      d(randDay(1, 15)),
      amount(5500, 'pets', 0.15),
      'pets',
      'Dog food & treats',
      'PetSmart',
    ),
  );
  // Vet visits twice a year
  if (month === 4 || month === 10) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        d(20),
        amount(25000, 'pets', 0.2),
        'pets',
        'Vet checkup + vaccines',
        'Happy Paws Vet',
      ),
    );
  }
  // Grooming every 2 months
  if (month % 2 === 1) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        d(randDay(10, 20)),
        amount(6500, 'pets', 0.05),
        'pets',
        'Dog grooming',
        'PetSmart',
      ),
    );
  }

  // ── Fees ───────────────────────────────────────────────────────────────────
  if (month % 3 === 0) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(28),
        amount(1500, 'fees', 0.08),
        'fees',
        'ATM fee',
        'Out-of-network ATM',
      ),
    );
  }

  // ── Travel (seasonal) ─────────────────────────────────────────────────────
  if (month === 7) {
    // Summer vacation
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        1,
        amount(85000, 'travel', 0.1),
        'travel',
        'Flight tickets (family)',
        'Delta Airlines',
      ),
      expense(
        ownerId,
        householdId,
        year,
        month,
        5,
        amount(120000, 'travel', 0.14),
        'travel',
        'Hotel — beach resort (5 nights)',
        'Marriott',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        6,
        amount(15000, 'travel', 0.12),
        'travel',
        'Rental car',
        'Enterprise',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        7,
        amount(8500, 'travel', 0.1),
        'travel',
        'Beach excursion',
        'Local Tours',
      ),
      expense(
        ownerId,
        householdId,
        year,
        month,
        8,
        amount(22000, 'travel', 0.18),
        'travel',
        'Vacation dining',
        'Various restaurants',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        6,
        amount(6500, 'travel', 0.1),
        'travel',
        'Souvenirs',
        'Gift shop',
      ),
    );
  }
  if (month === 11) {
    // Thanksgiving travel
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(22),
        amount(42000, 'travel', 0.16),
        'travel',
        'Flight tickets — Thanksgiving',
        'Southwest Airlines',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        d(23),
        amount(18000, 'travel', 0.12),
        'travel',
        'Rental car — Thanksgiving',
        'Hertz',
      ),
    );
  }
  // Weekend getaway
  if (month === 4) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(18),
        amount(25000, 'travel', 0.14),
        'travel',
        'Cabin rental (weekend)',
        'Airbnb',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        d(18),
        amount(4500, 'transportation', 0.2),
        'travel',
        'Gas for road trip',
        'Shell',
      ),
    );
  }

  const userByKey: Record<'owner' | 'member', string> = {
    member: memberId,
    owner: ownerId,
  };
  for (const event of ONE_OFF_EVENTS) {
    if (event.monthOffset !== monthOffset || event.day > cap) continue;
    rows.push(
      expense(
        userByKey[event.user],
        householdId,
        year,
        month,
        d(event.day),
        amount(event.amount, event.category, 0.04),
        event.category,
        event.note,
        event.merchant,
        currency,
      ),
    );
  }

  return rows;
}

// ── row builder ──────────────────────────────────────────────────────────────

function expense(
  userId: string,
  householdId: string,
  year: number,
  month: number,
  day: number,
  amountCents: number,
  category: string,
  note: string | null,
  merchant: string | null,
  currency: string = currentCurrency,
): SampleExpenseRow {
  const normalizedNote = note ?? null;
  const normalizedMerchant = merchant ?? null;
  const tags = extractTagNgrams(
    chatLabelFor({
      note: normalizedNote,
      merchant: normalizedMerchant,
      category,
    }),
  );
  return {
    user_id: userId,
    household_id: householdId,
    amount_cents: amountCents,
    currency,
    expense_date: dateStr(year, month, day),
    merchant: normalizedMerchant,
    category,
    note: normalizedNote,
    tags,
  };
}

// ── utils ────────────────────────────────────────────────────────────────────

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function trendAmount(
  base: number,
  category: string,
  monthOffset: number,
  pct = 0,
  month: number | null = null,
): number {
  const drift = getCategoryDrift(category, monthOffset);
  const seasonality = getSeasonality(category, month);
  const irregularity = pct > 0 ? 1 + (random() * 2 - 1) * pct : 1;
  return Math.max(100, Math.round(base * drift * seasonality * irregularity));
}

function getCategoryDrift(category: string, monthOffset: number): number {
  if (category === 'income') {
    return monthOffset >= 8 ? 1.028 : monthOffset >= 3 ? 1.012 : 1;
  }

  const series = ANNUAL_DRIFT_BY_CATEGORY[category];
  if (!series) return 1 + monthOffset * 0.004;
  return series[Math.min(monthOffset, series.length - 1)];
}

function getSeasonality(category: string, month: number | null): number {
  if (!month) return 1;

  if (category === 'groceries') {
    if ([11, 12].includes(month)) return 1.18;
    if ([6, 7, 8].includes(month)) return 1.08;
  }

  if (category === 'dining') {
    if ([7, 12].includes(month)) return 1.16;
    if ([1, 2].includes(month)) return 0.92;
  }

  if (category === 'shopping') {
    if ([8, 11, 12].includes(month)) return 1.28;
    if ([1, 2].includes(month)) return 0.86;
  }

  if (category === 'utilities') {
    if ([1, 2, 7, 8, 12].includes(month)) return 1.15;
    if ([4, 5, 10].includes(month)) return 0.9;
  }

  if (category === 'travel') {
    if ([6, 7, 11, 12].includes(month)) return 1.22;
  }

  return 1;
}

/** Vary an amount by ±pct (returns integer cents). */
function vary(base: number, pct: number): number {
  const factor = 1 + (random() * 2 - 1) * pct;
  return Math.round(base * factor);
}

function randInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function normalizeSeed(seed: number): number {
  if (Number.isNaN(seed) || seed <= 0) return 1;
  return seed % 2147483647 || 1;
}

function random(): number {
  rngState = (rngState * 48271) % 2147483647;
  return (rngState - 1) / 2147483646;
}
