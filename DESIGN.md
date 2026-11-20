---
name: MoMo
description: Chat-first expense tracking with a themeable, tactile, neobrutalist interface.
colors:
  background: "oklch(0.9224 0.198 107.23)"
  surface: "oklch(96.868% 0.01862 96.902)"
  text: "oklch(11.449% 0.0736 272.286)"
  disabled: "oklch(0.7522 0.0193 261.19)"
  accent-primary: "oklch(0.8736 0.2433 149.53)"
  accent-secondary: "oklch(0.719 0.1751 22.5)"
  accent-info: "oklch(0.8259 0.1358 216.9)"
  accent-feature: "oklch(0.7049 0.1837 317.15)"
  accent-warm: "oklch(0.7934 0.1661 69.16)"
typography:
  display:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1.4rem + 4vw, 5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0"
  headline:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "clamp(1.85rem, 1.2rem + 2.4vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  title:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "clamp(1.3rem, 1.05rem + 1.1vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "clamp(0.95rem, 0.9rem + 0.3vw, 1rem)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "clamp(0.8rem, 0.75rem + 0.25vw, 0.875rem)"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0"
  logo:
    fontFamily: "Bungee Shade, Outfit, system-ui, sans-serif"
    fontSize: "clamp(4rem, 2.125rem + 5.333vw, 8rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0"
rounded:
  sm: "5px"
  md: "10px"
  pill: "999px"
spacing:
  base: "8px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
  xxxl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 32px"
  button-secondary:
    backgroundColor: "{colors.accent-secondary}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 32px"
  button-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 32px"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px"
  panel-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "24px"
  toggle-selected:
    backgroundColor: "{colors.accent-info}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 12px"
---

# Design System: MoMo

## 1. Overview

**Creative North Star: "Tactile Chat Ledger"**

MoMo should feel like a personal spending chat made physical: theme-colored paper, inked edges, chunky controls, and fast tactile feedback. The interface serves the product, so the visual system must keep capture, correction, and household context easy to scan while still making money feel less boring.

The atmosphere is playful, direct, and tactile: finance without spreadsheets. Use semantic theme roles, thick ink borders, and hard offset shadows to make actions feel tappable and concrete. The default Sunbeam palette is the reference mood, but the system must remain compatible with any current or future theme generated from `src/lib/theme/themes.config.ts`.

**Key Characteristics:**
- Themeable OKLCH color with ink outlines.
- Hard-shadow neobrutalism, structural not decorative.
- Rounded but blocky 10px controls.
- Chat-first density with visible states for parsing, sync, and errors.
- Motion is quick state feedback, not choreography.

## 2. Colors

MoMo's color system is semantic and themeable. `src/lib/theme/themes.config.ts` defines each palette, `src/lib/theme/resolve-palette.ts` fills optional roles, and `src/lib/theme/generate-css.ts` writes the active `:root[data-schema="..."]` variables. Sunbeam is the default palette, not the only palette.

### Primary
- **Background** (`--bg-page` / `background`): The page field for the active theme. In Sunbeam this maps to Sunbeam Yellow.
- **Primary Accent** (`--accent-primary` / `accent-primary`): Primary action color for creation, success, and the strongest forward motion. In Sunbeam this maps to Spring Green.

### Secondary
- **Secondary Accent** (`--accent-secondary` / `accent-secondary`): Destructive actions, errors, failed parsing states, and high-attention secondary buttons. In Sunbeam this maps to Vibrant Coral.
- **Info Accent** (`--accent-info` / `accent-info`): Informational emphasis, selected toggles, own chat bubbles, navigation progress, and chart interaction support. In Sunbeam this maps to Sky Aqua.

### Tertiary
- **Feature Accent** (`--accent-feature` / `accent-feature`): Feature emphasis and incoming chat bubbles. Use it when the app is speaking back. In Sunbeam this maps to Mauve Magic.
- **Warm Accent** (`--accent-warm` / `accent-warm`): Warm surfaces such as chat rails, theme toggles, and warning-adjacent highlights. In Sunbeam this maps to Amber Glow.

### Neutral
- **Surface** (`--bg-panel`, `--color-light` / `surface`): Panels, inputs, menus, and cards. In Sunbeam this maps to Warm Paper. Never use pure white.
- **Text / Ink** (`--fg-primary`, `--color-dark` / `text`): Text, borders, chart strokes, separators, and hard shadows. In Sunbeam this maps to Deep Ink. Never use pure black.
- **Disabled** (`--color-disabled` / `disabled`): Disabled fields and unavailable actions. In Sunbeam this maps to Disabled Slate.

### Default Sunbeam Palette
- **Sunbeam Yellow** (`--color-sunbeam-yellow`): Default background alias.
- **Spring Green** (`--color-spring-green`): Default primary accent alias.
- **Mauve Magic** (`--color-mauve-magic`): Default feature accent alias.
- **Amber Glow** (`--color-amber-glow`): Default warm accent alias.
- **Vibrant Coral** (`--color-vibrant-coral`): Default secondary accent alias.
- **Sky Aqua** (`--color-sky-aqua`): Default info accent alias.
- **Warm Paper** (`--color-light`): Default surface.
- **Deep Ink** (`--color-dark`): Default text and ink.
- **Disabled Slate** (`--color-disabled`): Default disabled state.

### Named Rules
**The Theme Role Rule.** New UI should target semantic roles first: `--bg-page`, `--bg-panel`, `--fg-primary`, `--accent-primary`, `--accent-secondary`, `--accent-info`, `--accent-feature`, `--accent-warm`, and tone/chart roles. Raw color aliases are legacy compatibility paths that repaint with the active theme.

**The Ink Holds Everything Rule.** Every interactive surface needs a visible ink edge or clear ink text. Theme color without ink feels decorative and loses the MoMo signature.

**The Color Has a Job Rule.** Primary moves forward, secondary warns or removes, info informs or selects, feature speaks as the product, warm supports chat and warning-adjacent surfaces. Do not bind behavior to Sunbeam color names.

## 3. Typography

**Display Font:** Outfit, with system sans fallbacks.
**Body Font:** Outfit, with system sans fallbacks.
**Label/Mono Font:** Outfit for labels. Bungee Shade is reserved for the MoMo logo only.

**Character:** Outfit keeps the product readable and friendly without slipping into corporate fintech. Bungee Shade gives the brand mark its loud personality, but it must not become a general display font.

### Hierarchy
- **Display** (700, `clamp(2.25rem, 1.4rem + 4vw, 5rem)`, 1.1): First-screen landing statements and rare oversized moments.
- **Headline** (700, `clamp(1.85rem, 1.2rem + 2.4vw, 2.75rem)`, 1.15): Page-level headings, stats section titles, and empty-state leads.
- **Title** (700, `clamp(1.3rem, 1.05rem + 1.1vw, 1.75rem)`, 1.3): Panel titles, card titles, and chart headers.
- **Body** (400, `clamp(0.95rem, 0.9rem + 0.3vw, 1rem)`, 1.5): Messages, settings copy, form text, and normal UI explanation. Keep paragraphs under 75ch.
- **Label** (700, `clamp(0.8rem, 0.75rem + 0.25vw, 0.875rem)`, 1.4): Controls, chips, nav links, metadata, and compact chart legends.

### Named Rules
**The Logo Stays Logo Rule.** Bungee Shade belongs to the MoMo mark and loader only. Do not use it for headings, buttons, or marketing copy.

**The No Finance Formality Rule.** Avoid thin, spaced-out, executive-dashboard typography. MoMo type should be clear, chunky, and direct.

## 4. Elevation

MoMo does not use soft ambient shadows. Depth is structural: a surface is either flat or physically offset with a hard ink shadow. The shadow reads as a pressed block, not a glow.

### Shadow Vocabulary
- **Small Press** (`-2px 2px 0 var(--color-dark)`): Hovered buttons, menus, chat bubbles, badges, chart legends, and compact overlays.
- **Medium Block** (`-6px 6px 0 var(--color-dark)`): Default buttons, inputs on focus, toasts, tooltips, and feature cards.
- **Large Block** (`-12px 12px 0 var(--color-dark)`): Panels and strong framed surfaces.
- **Extra Block** (`-16px 16px 0 var(--color-dark)`): Large desktop panels and hero previews.
- **None** (`none`): Resting inputs, shadowless analytics panels, chart canvases, and flat navigation.

### Named Rules
**The Hard Shadow Only Rule.** Soft blur shadows, glass effects, and glow elevation are prohibited. If a surface needs depth, use an offset ink shadow from the vocabulary.

**The State Press Rule.** Interactive elements should reduce their hard shadow on hover or focus to feel pressed, not float upward.

## 5. Components

### Buttons
- **Shape:** Rounded but blocky corners (10px radius) with a 2px ink border.
- **Primary:** `--accent-primary` fill, active text color, 8px by 32px padding, and Medium Block shadow.
- **Secondary:** `--accent-secondary` fill for destructive or high-attention alternatives, with the same physical treatment as primary.
- **Surface:** `--bg-panel` fill for neutral actions that still need button weight.
- **Hover / Focus:** Move the button by roughly 3px and reduce the shadow to Small Press. Do not add glow.
- **Icon / Link:** Icon buttons are borderless and compact. Link buttons underline with thickening text decoration rather than boxed treatments.

### Chips
- **Style:** Toggle chips use the active surface, a 2px active ink border, bold labels, 4px by 12px padding, and a slightly tighter radius (8px).
- **State:** Selected chips switch to `--accent-info` with Small Press shadow. Disabled chips reduce opacity and remove the pressed shadow.

### Cards / Containers
- **Corner Style:** 10px radius with visible clipping.
- **Background:** `--bg-panel` for app panels. Feature cards may use accent fills only when the surrounding layout stays readable in every theme.
- **Shadow Strategy:** Large Block by default for panels, Extra Block on wide desktop hero-scale surfaces, and no shadow for dense analytics panels.
- **Border:** 4px active ink for major panels, 2px active ink for compact cards and message bubbles.
- **Internal Padding:** Use the 8px spacing scale. Common values are 16px, 24px, and 32px.

### Inputs / Fields
- **Style:** `--bg-panel` fill, 2px active ink border, 10px radius, and 8px internal padding.
- **Focus:** Translate 6px right and 6px up, then add Medium Block shadow.
- **Hover:** On pointer devices, translate 2px and add Small Press.
- **Disabled:** Active disabled role background, muted text, no shadow, no translation.

### Navigation
- **App Nav:** Sparse grid layout with logo centered on desktop, theme selector placed deliberately, and no decorative container around the nav.
- **Landing Nav:** Fixed top rail on `--bg-page` with a 2px bottom ink border, bold links, and underline-on-hover.
- **Mobile:** Hide nonessential landing section links before the nav gets cramped. Preserve Login and theme selection.

### Signature Component
**Chat Bubble:** Incoming messages use `--accent-feature`, own messages use `--accent-info`, both with 2px active ink borders and Small Press shadows. Status and action slots stay inline so parsing, category needs, and failures remain visible without modal interruption.

## 6. Do's and Don'ts

### Do:
- **Do** use semantic theme variables generated by `src/lib/theme/generate-css.ts`. The color system is active and themeable.
- **Do** document Sunbeam as the default palette, not as the only design contract.
- **Do** keep thick ink borders on controls, cards, panels, menus, and chat bubbles.
- **Do** use the hard-shadow vocabulary exactly: `-2px`, `-6px`, `-12px`, and `-16px` offsets.
- **Do** make chat, parsing state, sync state, and recovery actions visible in place.
- **Do** preserve accessible contrast and avoid relying on color alone for financial status, message processing state, or chart interpretation.

### Don't:
- **Don't** make MoMo feel like corporate fintech.
- **Don't** make MoMo feel like spreadsheet-first budgeting software.
- **Don't** make MoMo feel like sterile SaaS dashboards.
- **Don't** make MoMo feel like gamified savings guilt.
- **Don't** make MoMo feel like an overly polished AI finance coach.
- **Don't** hard-code Sunbeam raw aliases for new UI when a semantic role exists.
- **Don't** use pure black or pure white. Use the active theme's text and surface roles.
- **Don't** add soft blur shadows, glassmorphism, gradient text, or side-stripe borders.
- **Don't** turn chat capture into a form-heavy workflow unless the user explicitly asks for that behavior.
