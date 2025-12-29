import type {
  ExpenseInvertedIndex,
  ExpenseScoringConfig,
} from '@lib-types/expenses';
import type { SupportedCurrency } from '@lib-types/user-preferences';

export const AMOUNT_REGEX = /([0-9]+(?:\.[0-9]+)?)([kKmM])?/;

export const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
};

export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';
export const EXPENSE_SCORING: ExpenseScoringConfig = {
  strong: 3,
  weak: 1,
  exclude: -2,
  min_confidence: 3,
  min_margin: 2,
};

export const BIGRAM_OVERLAP_THRESHOLD = 0.3;
export const MAX_EDIT_DISTANCE = 2;
export const MIN_FUZZY_TERM_LENGTH = 3;

export const EXPENSE_INVERTED_INDEX: ExpenseInvertedIndex = {
  adobe: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  agua: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  airbnb: [
    {
      category: 'housing',
      match: 'exclude',
    },
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  airline: [
    {
      category: 'travel',
      match: 'weak',
    },
  ],
  airport: [
    {
      category: 'travel',
      match: 'weak',
    },
  ],
  aldi: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  almuerzo: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  alquiler: [
    {
      category: 'housing',
      match: 'strong',
    },
  ],
  amazon: [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
  'amazon prime': [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  anniversary: [
    {
      category: 'gifts',
      match: 'weak',
    },
  ],
  apartamento: [
    {
      category: 'housing',
      match: 'weak',
    },
  ],
  apartment: [
    {
      category: 'housing',
      match: 'weak',
    },
  ],
  apple: [
    {
      category: 'shopping',
      match: 'strong',
    },
    {
      category: 'subscriptions',
      match: 'weak',
    },
  ],
  'apple music': [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  'apple tv': [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  appointment: [
    {
      category: 'health',
      match: 'weak',
    },
  ],
  ara: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  arriendo: [
    {
      category: 'housing',
      match: 'strong',
    },
  ],
  atm: [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  audible: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  auto: [
    {
      category: 'vehicle',
      match: 'weak',
    },
  ],
  'auto insurance': [
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  bank: [
    {
      category: 'fees',
      match: 'weak',
    },
  ],
  'bank transfer': [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  bar: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  bill: [
    {
      category: 'utilities',
      match: 'weak',
    },
  ],
  birthday: [
    {
      category: 'gifts',
      match: 'weak',
    },
  ],
  bitbucket: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  bonus: [
    {
      category: 'income',
      match: 'strong',
    },
  ],
  book: [
    {
      category: 'education',
      match: 'weak',
    },
  ],
  booking: [
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  bootcamp: [
    {
      category: 'education',
      match: 'strong',
    },
  ],
  breakfast: [
    {
      category: 'dining',
      match: 'weak',
    },
  ],
  broadband: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  bus: [
    {
      category: 'transportation',
      match: 'strong',
    },
    {
      category: 'vehicle',
      match: 'exclude',
    },
  ],
  buy: [
    {
      category: 'shopping',
      match: 'weak',
    },
  ],
  cab: [
    {
      category: 'transportation',
      match: 'strong',
    },
  ],
  cafe: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  car: [
    {
      category: 'vehicle',
      match: 'weak',
    },
  ],
  'car wash': [
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  'card payment': [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  carrefour: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  casa: [
    {
      category: 'housing',
      match: 'weak',
    },
  ],
  'cash withdrawal': [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  cashback: [
    {
      category: 'income',
      match: 'strong',
    },
  ],
  'cellular plan': [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  cena: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  certificacion: [
    {
      category: 'education',
      match: 'strong',
    },
  ],
  certification: [
    {
      category: 'education',
      match: 'strong',
    },
  ],
  charge: [
    {
      category: 'fees',
      match: 'strong',
    },
  ],
  charity: [
    {
      category: 'gifts',
      match: 'strong',
    },
  ],
  chatgpt: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  cinema: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  cita: [
    {
      category: 'dining',
      match: 'strong',
    },
    {
      category: 'health',
      match: 'weak',
    },
  ],
  'cita medica': [
    {
      category: 'health',
      match: 'weak',
    },
  ],
  clinic: [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  clinica: [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  clothes: [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
  coche: [
    {
      category: 'vehicle',
      match: 'weak',
    },
  ],
  coffee: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  colegio: [
    {
      category: 'education',
      match: 'strong',
    },
  ],
  comida: [
    {
      category: 'dining',
      match: 'weak',
    },
    {
      category: 'groceries',
      match: 'weak',
    },
  ],
  comision: [
    {
      category: 'fees',
      match: 'strong',
    },
  ],
  commission: [
    {
      category: 'fees',
      match: 'strong',
    },
  ],
  compra: [
    {
      category: 'groceries',
      match: 'weak',
    },
  ],
  concert: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  concierto: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  condominio: [
    {
      category: 'housing',
      match: 'strong',
    },
  ],
  condominium: [
    {
      category: 'housing',
      match: 'strong',
    },
  ],
  consulta: [
    {
      category: 'health',
      match: 'weak',
    },
  ],
  costco: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  course: [
    {
      category: 'education',
      match: 'strong',
    },
  ],
  'credit card': [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  'credit card payment': [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  crunchyroll: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  curiositystream: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  curso: [
    {
      category: 'education',
      match: 'strong',
    },
  ],
  d1: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  date: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  decathlon: [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
  deezer: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  delivery: [
    {
      category: 'dining',
      match: 'strong',
    },
    {
      category: 'groceries',
      match: 'exclude',
    },
  ],
  dentist: [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  dentista: [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  departamento: [
    {
      category: 'housing',
      match: 'weak',
    },
  ],
  deposit: [
    {
      category: 'income',
      match: 'weak',
    },
  ],
  desayuno: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  diesel: [
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  dinner: [
    {
      category: 'dining',
      match: 'weak',
    },
  ],
  disney: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  doctor: [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  donacion: [
    {
      category: 'gifts',
      match: 'strong',
    },
  ],
  donation: [
    {
      category: 'gifts',
      match: 'strong',
    },
  ],
  doordash: [
    {
      category: 'dining',
      match: 'strong',
    },
    {
      category: 'groceries',
      match: 'exclude',
    },
  ],
  electric: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  electricidad: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  electricity: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  electronica: [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
  electronics: [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
  energia: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  entertainment: [
    {
      category: 'education',
      match: 'exclude',
    },
  ],
  event: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  exito: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  expedia: [
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  farmacia: [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  fee: [
    {
      category: 'fees',
      match: 'strong',
    },
  ],
  festival: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  fiber: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  fibra: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  figma: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  finca: [
    {
      category: 'housing',
      match: 'weak',
    },
  ],
  flat: [
    {
      category: 'housing',
      match: 'weak',
    },
  ],
  flight: [
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  food: [
    {
      category: 'dining',
      match: 'weak',
    },
    {
      category: 'groceries',
      match: 'weak',
    },
  ],
  freelance: [
    {
      category: 'income',
      match: 'strong',
    },
  ],
  fuel: [
    {
      category: 'transportation',
      match: 'exclude',
    },
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  fun: [
    {
      category: 'entertainment',
      match: 'weak',
    },
  ],
  funimation: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  game: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  gaming: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  gas: [
    {
      category: 'transportation',
      match: 'exclude',
    },
    {
      category: 'utilities',
      match: 'strong',
    },
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  'gas bill': [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  gasolina: [
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  gasoline: [
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  gift: [
    {
      category: 'gifts',
      match: 'strong',
    },
  ],
  github: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  gitlab: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  glovo: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  google: [
    {
      category: 'subscriptions',
      match: 'weak',
    },
  ],
  'google one': [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  groceries: [
    {
      category: 'dining',
      match: 'exclude',
    },
    {
      category: 'groceries',
      match: 'strong',
    },
    {
      category: 'shopping',
      match: 'exclude',
    },
  ],
  gym: [
    {
      category: 'health',
      match: 'weak',
    },
  ],
  'h&m': [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
  hbo: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  'hbo max': [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  'health insurance': [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  hipoteca: [
    {
      category: 'housing',
      match: 'strong',
    },
  ],
  hm: [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
  hoa: [
    {
      category: 'housing',
      match: 'strong',
    },
  ],
  hobby: [
    {
      category: 'entertainment',
      match: 'weak',
    },
  ],
  home: [
    {
      category: 'housing',
      match: 'weak',
    },
  ],
  hospital: [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  hostel: [
    {
      category: 'housing',
      match: 'exclude',
    },
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  hotel: [
    {
      category: 'housing',
      match: 'exclude',
    },
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  house: [
    {
      category: 'housing',
      match: 'weak',
    },
  ],
  hulu: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  icloud: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  ikea: [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
  income: [
    {
      category: 'income',
      match: 'strong',
    },
  ],
  'insurance car': [
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  interes: [
    {
      category: 'fees',
      match: 'strong',
    },
  ],
  interest: [
    {
      category: 'fees',
      match: 'strong',
    },
  ],
  internet: [
    {
      category: 'subscriptions',
      match: 'exclude',
    },
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  jumbo: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  'just eat': [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  kindle: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
    {
      category: 'shopping',
      match: 'weak',
    },
  ],
  'kindle unlimited': [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  'late fee': [
    {
      category: 'fees',
      match: 'strong',
    },
  ],
  learning: [
    {
      category: 'education',
      match: 'weak',
    },
  ],
  lease: [
    {
      category: 'housing',
      match: 'strong',
    },
  ],
  leisure: [
    {
      category: 'entertainment',
      match: 'weak',
    },
  ],
  libro: [
    {
      category: 'education',
      match: 'weak',
    },
  ],
  lidl: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  lightroom: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  luggage: [
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  lunch: [
    {
      category: 'dining',
      match: 'weak',
    },
  ],
  luz: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  lyft: [
    {
      category: 'transportation',
      match: 'strong',
    },
  ],
  maleta: [
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  market: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  max: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  meal: [
    {
      category: 'dining',
      match: 'weak',
    },
  ],
  mecanico: [
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  mechanic: [
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  medicine: [
    {
      category: 'health',
      match: 'weak',
    },
  ],
  medico: [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  mercado: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  metro: [
    {
      category: 'transportation',
      match: 'strong',
    },
  ],
  midjourney: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  'mobile plan': [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  monthly: [
    {
      category: 'housing',
      match: 'weak',
    },
    {
      category: 'subscriptions',
      match: 'weak',
    },
    {
      category: 'utilities',
      match: 'weak',
    },
  ],
  mortgage: [
    {
      category: 'housing',
      match: 'strong',
    },
  ],
  move: [
    {
      category: 'transfer',
      match: 'weak',
    },
  ],
  movie: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  movies: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  mubi: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  multa: [
    {
      category: 'fees',
      match: 'strong',
    },
  ],
  nebula: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  netflix: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
    {
      category: 'utilities',
      match: 'exclude',
    },
  ],
  nintendo: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  nomina: [
    {
      category: 'income',
      match: 'strong',
    },
  ],
  notion: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  ocio: [
    {
      category: 'entertainment',
      match: 'weak',
    },
  ],
  'office 365': [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  openai: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  'pago tarjeta': [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  paramount: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  parking: [
    {
      category: 'transportation',
      match: 'strong',
    },
  ],
  paycheck: [
    {
      category: 'income',
      match: 'strong',
    },
  ],
  payment: [
    {
      category: 'transfer',
      match: 'weak',
    },
  ],
  'payment received': [
    {
      category: 'income',
      match: 'strong',
    },
  ],
  peacock: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  peaje: [
    {
      category: 'transportation',
      match: 'strong',
    },
  ],
  penalty: [
    {
      category: 'fees',
      match: 'strong',
    },
  ],
  pharmacy: [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  phone: [
    {
      category: 'subscriptions',
      match: 'exclude',
    },
  ],
  'phone plan': [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  photoshop: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  plan: [
    {
      category: 'subscriptions',
      match: 'weak',
    },
  ],
  playstation: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  'power bill': [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  predial: [
    {
      category: 'housing',
      match: 'strong',
    },
  ],
  present: [
    {
      category: 'gifts',
      match: 'strong',
    },
  ],
  'prime video': [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  'property tax': [
    {
      category: 'housing',
      match: 'strong',
    },
  ],
  propina: [
    {
      category: 'gifts',
      match: 'strong',
    },
  ],
  pub: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  purchase: [
    {
      category: 'shopping',
      match: 'weak',
    },
  ],
  rappi: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  received: [
    {
      category: 'income',
      match: 'weak',
    },
  ],
  reembolso: [
    {
      category: 'income',
      match: 'strong',
    },
  ],
  refund: [
    {
      category: 'income',
      match: 'strong',
    },
  ],
  regalo: [
    {
      category: 'gifts',
      match: 'strong',
    },
  ],
  renewal: [
    {
      category: 'subscriptions',
      match: 'weak',
    },
  ],
  rent: [
    {
      category: 'housing',
      match: 'strong',
    },
    {
      category: 'transfer',
      match: 'exclude',
    },
    {
      category: 'travel',
      match: 'exclude',
    },
  ],
  renta: [
    {
      category: 'housing',
      match: 'strong',
    },
  ],
  repair: [
    {
      category: 'transportation',
      match: 'exclude',
    },
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  reparacion: [
    {
      category: 'vehicle',
      match: 'strong',
    },
  ],
  reservation: [
    {
      category: 'travel',
      match: 'weak',
    },
  ],
  restaurant: [
    {
      category: 'dining',
      match: 'strong',
    },
    {
      category: 'groceries',
      match: 'exclude',
    },
  ],
  restaurante: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  retiro: [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  ride: [
    {
      category: 'transportation',
      match: 'weak',
    },
  ],
  ropa: [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
  salary: [
    {
      category: 'income',
      match: 'strong',
    },
  ],
  school: [
    {
      category: 'education',
      match: 'strong',
    },
  ],
  scribd: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  send: [
    {
      category: 'transfer',
      match: 'weak',
    },
  ],
  service: [
    {
      category: 'fees',
      match: 'weak',
    },
    {
      category: 'utilities',
      match: 'weak',
    },
  ],
  servicios: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  'servicios publicos': [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  shoes: [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
  shop: [
    {
      category: 'shopping',
      match: 'weak',
    },
  ],
  shopping: [
    {
      category: 'groceries',
      match: 'weak',
    },
    {
      category: 'transfer',
      match: 'exclude',
    },
  ],
  snack: [
    {
      category: 'dining',
      match: 'weak',
    },
  ],
  soundcloud: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  spotify: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
    {
      category: 'utilities',
      match: 'exclude',
    },
  ],
  steam: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  store: [
    {
      category: 'shopping',
      match: 'weak',
    },
  ],
  subscription: [
    {
      category: 'subscriptions',
      match: 'weak',
    },
    {
      category: 'utilities',
      match: 'exclude',
    },
  ],
  subway: [
    {
      category: 'transportation',
      match: 'strong',
    },
  ],
  sueldo: [
    {
      category: 'income',
      match: 'strong',
    },
  ],
  supermarket: [
    {
      category: 'dining',
      match: 'exclude',
    },
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  supermercado: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  suscripcion: [
    {
      category: 'subscriptions',
      match: 'weak',
    },
  ],
  takeout: [
    {
      category: 'dining',
      match: 'strong',
    },
  ],
  taxi: [
    {
      category: 'transportation',
      match: 'strong',
    },
    {
      category: 'vehicle',
      match: 'exclude',
    },
  ],
  terapia: [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  tesco: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  therapy: [
    {
      category: 'health',
      match: 'strong',
    },
  ],
  tidal: [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  tienda: [
    {
      category: 'shopping',
      match: 'weak',
    },
  ],
  tip: [
    {
      category: 'gifts',
      match: 'strong',
    },
  ],
  toll: [
    {
      category: 'transportation',
      match: 'strong',
    },
  ],
  train: [
    {
      category: 'transportation',
      match: 'strong',
    },
  ],
  training: [
    {
      category: 'education',
      match: 'weak',
    },
  ],
  tram: [
    {
      category: 'transportation',
      match: 'strong',
    },
  ],
  transfer: [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  transferencia: [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  transport: [
    {
      category: 'transportation',
      match: 'weak',
    },
  ],
  travel: [
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  trip: [
    {
      category: 'transportation',
      match: 'weak',
    },
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  tuition: [
    {
      category: 'education',
      match: 'strong',
    },
  ],
  uber: [
    {
      category: 'transportation',
      match: 'strong',
    },
    {
      category: 'vehicle',
      match: 'exclude',
    },
  ],
  'uber eats': [
    {
      category: 'dining',
      match: 'strong',
    },
    {
      category: 'groceries',
      match: 'exclude',
    },
  ],
  universidad: [
    {
      category: 'education',
      match: 'strong',
    },
  ],
  university: [
    {
      category: 'education',
      match: 'strong',
    },
  ],
  vehicle: [
    {
      category: 'vehicle',
      match: 'weak',
    },
  ],
  viaje: [
    {
      category: 'transportation',
      match: 'weak',
    },
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  vivienda: [
    {
      category: 'housing',
      match: 'weak',
    },
  ],
  vuelo: [
    {
      category: 'travel',
      match: 'strong',
    },
  ],
  walmart: [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  water: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  wedding: [
    {
      category: 'gifts',
      match: 'weak',
    },
  ],
  'whole foods': [
    {
      category: 'groceries',
      match: 'strong',
    },
  ],
  wifi: [
    {
      category: 'utilities',
      match: 'strong',
    },
  ],
  wire: [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  withdrawal: [
    {
      category: 'transfer',
      match: 'strong',
    },
  ],
  xbox: [
    {
      category: 'entertainment',
      match: 'strong',
    },
  ],
  'youtube premium': [
    {
      category: 'subscriptions',
      match: 'strong',
    },
  ],
  zapatos: [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
  zara: [
    {
      category: 'shopping',
      match: 'strong',
    },
  ],
};

export const expenseTerms = Object.keys(EXPENSE_INVERTED_INDEX);
