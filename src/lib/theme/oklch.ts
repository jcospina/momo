/**
 * Minimal OKLCH helpers for build-time palette generation. Theme colours are
 * authored as `oklch(...)` strings; shades and contrast are computed here so
 * the emitted CSS is plain oklch every browser understands.
 */

export type Oklch = {
  /** Lightness, 0–1. */
  l: number;
  /** Chroma, 0–~0.4. */
  c: number;
  /** Hue in degrees, 0–360. */
  h: number;
};

const OKLCH_PATTERN =
  /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)(%?)\s+([\d.]+)(?:deg)?\s*(?:\/\s*[\d.]+%?\s*)?\)$/i;

/** CSS Color 4: chroma 100% = 0.4. */
const CHROMA_PERCENT_REFERENCE = 0.4;

/** Parses `oklch(L C H)` with L as `0.72` or `72%`. Returns null otherwise. */
export function parseOklch(value: string): Oklch | null {
  const match = value.trim().match(OKLCH_PATTERN);
  if (!match) return null;
  const [, lRaw, lPercent, cRaw, cPercent, hRaw] = match;
  const l = Number(lRaw) / (lPercent ? 100 : 1);
  const c = cPercent
    ? (Number(cRaw) / 100) * CHROMA_PERCENT_REFERENCE
    : Number(cRaw);
  const h = Number(hRaw);
  if (![l, c, h].every(Number.isFinite)) return null;
  return { l, c, h: normalizeHue(h) };
}

export function normalizeHue(hue: number): number {
  const wrapped = hue % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatOklch({ l, c, h }: Oklch): string {
  return `oklch(${round(l, 4)} ${round(c, 4)} ${round(normalizeHue(h), 2)})`;
}

/** OKLCH → linear sRGB (Björn Ottosson's OKLab matrices), clamped to gamut. */
function toLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const hueRadians = (h * Math.PI) / 180;
  const a = c * Math.cos(hueRadians);
  const b = c * Math.sin(hueRadians);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const lCubed = lPrime ** 3;
  const mCubed = mPrime ** 3;
  const sCubed = sPrime ** 3;

  const red =
    4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  const green =
    -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  const blue =
    -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

  const clamp = (channel: number) => Math.min(1, Math.max(0, channel));
  return [clamp(red), clamp(green), clamp(blue)];
}

/** WCAG relative luminance of an OKLCH colour. */
export function relativeLuminance(color: Oklch): number {
  const [red, green, blue] = toLinearSrgb(color);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio between two colours (1–21). */
export function contrastRatio(first: Oklch, second: Oklch): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}
