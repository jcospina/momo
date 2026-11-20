import {
  buildCategoryTokens,
  buildMemberTokens,
  type ColorToken,
} from './category-palette';
import { resolvePalette } from './resolve-palette';
import type { ResolvedPalette, ThemeConfig } from './types';

function tokenLines(name: string, token: ColorToken): string {
  return `  --${name}: ${token.fill};\n  --${name}-ink: ${token.ink};`;
}

/** Fixed colour per category and per member slot (see color-vars.ts). */
function identityColorLines(p: ResolvedPalette): string {
  const categories = Object.entries(buildCategoryTokens(p)).map(
    ([category, token]) => tokenLines(`category-${category}`, token),
  );
  const members = buildMemberTokens(p);
  const memberLines = members.slots.map((token, index) =>
    tokenLines(`member-${index + 1}`, token),
  );
  return [
    ...categories,
    ...memberLines,
    tokenLines('member-none', members.none),
  ].join('\n');
}

function buildBlock(theme: ThemeConfig): string {
  const p = resolvePalette(theme.palette);
  return `:root[data-schema="${theme.name}"] {
  --color-dark: ${p.text};
  --color-light: ${p.surface};
  --color-disabled: ${p.disabled};

  --bg-page: ${p.background};
  --bg-panel: ${p.surface};
  --bg-toggle: ${p.toggle};

  --fg-primary: var(--color-dark);
  --fg-muted: color-mix(in oklch, var(--color-dark), white 20%);
  --fg-subtle: color-mix(in oklch, var(--color-dark), white 40%);
  --fg-on-disabled: color-mix(in oklch, var(--color-dark), white 50%);
  --fg-on-secondary: ${p.textOnSecondary};

  --accent-primary: ${p.primary};
  --accent-secondary: ${p.secondary};
  --accent-info: ${p.info};
  --accent-feature: ${p.feature};
  --accent-warm: ${p.warm};

  --tone-error: ${p.error};
  --tone-warning: ${p.warning};
  --tone-success: ${p.success};

  --dot-color: color-mix(in oklch, var(--color-dark), transparent 80%);

  --chart-1: ${p.chart[0]};
  --chart-2: ${p.chart[1]};
  --chart-3: ${p.chart[2]};
  --chart-4: ${p.chart[3]};
  --chart-5: ${p.chart[4]};
  --chart-6: ${p.chart[5]};
  --chart-stroke: ${p.chartStroke};
  --chart-tooltip-bg: ${p.chartTooltipBg};
  --chart-tooltip-border: var(--chart-stroke);
  --chart-axis: var(--chart-stroke);
  --chart-grid: color-mix(in oklch, var(--chart-stroke), transparent 84%);

${identityColorLines(p)}

  /* Legacy raw color aliases — kept so components referencing raw palette
     names repaint with the active theme. Will be removed in a follow-up. */
  --color-sunbeam-yellow: ${p.background};
  --color-spring-green: ${p.primary};
  --color-vibrant-coral: ${p.secondary};
  --color-sky-aqua: ${p.info};
  --color-mauve-magic: ${p.feature};
  --color-amber-glow: ${p.warm};
}`;
}

export function generateThemeCSS(themes: ThemeConfig[]): string {
  return themes.map(buildBlock).join('\n\n');
}
