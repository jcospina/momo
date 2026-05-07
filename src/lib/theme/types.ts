/**
 * Palette schema for a theme. Required fields cover the eight semantic roles
 * the UI needs. Optional fields fall back to derivations defined in
 * `resolve-palette.ts`. Any valid CSS color string is accepted (oklch, hex,
 * rgb, hsl, named colors, even `var(--...)` references).
 */
export type ThemePalette = {
  /** Primary text and borders (the "ink"). */
  text: string;
  /** Panel/card background. */
  surface: string;
  /** Page background. */
  background: string;
  /** Main accent — CTAs, success-toned highlights. */
  primary: string;
  /** Alternate accent — danger/error tone by default. */
  secondary: string;
  /** Info highlights. */
  info: string;
  /** Featured/special highlights. */
  feature: string;
  /** Warm accent — toggles, gentle emphasis. */
  warm: string;

  /** Disabled control surface. Default: `color-mix({text}, white 60%)`. */
  disabled?: string;
  /** Toggle background. Default: `{warm}`. */
  toggle?: string;
  /** Text color when sitting on `secondary`. Default: `{text}`. */
  textOnSecondary?: string;
  /** Error tone. Default: `{secondary}`. */
  error?: string;
  /** Warning tone. Default: `color-mix({warm}, black 10%)`. */
  warning?: string;
  /** Success tone. Default: `{primary}`. */
  success?: string;

  /**
   * Six-color categorical palette used by charts (stacked bars, donut slices,
   * line series). Default: derived from the five accent colors plus a mix.
   * Ordered roughly cool → warm so adjacent series have distinguishable hues.
   */
  chart?: [string, string, string, string, string, string];
  /** Chart axes, outlines, and tick marks. Default: `{text}`. */
  chartStroke?: string;
  /** Chart tooltip background. Default: `{surface}`. */
  chartTooltipBg?: string;
};

/** Palette with all optional fields filled in. */
export type ResolvedPalette = Required<ThemePalette>;

export type ThemeConfig = {
  /** Stable identifier — used in localStorage and the `data-schema` attribute. */
  name: string;
  /** Human-readable label shown in the dropdown. */
  label: string;
  palette: ThemePalette;
};
