import { resolvePalette } from './resolve-palette';
import type { ThemeConfig } from './types';

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
