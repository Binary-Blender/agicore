// Agicore Compiler — THEME generator
//
// Generates CSS custom properties + TypeScript theme constants from
// top-level THEME declarations. Each declared theme yields its own
// `src/styles/<name>.css` file; the LAST declared theme also becomes
// the active `src/styles/theme.css` and is mirrored to `src/lib/theme.ts`.
//
// If no THEME is declared, this generator emits nothing.

import type {
  AgiFile, ThemeDecl, ThemePalette, ThemeBackground, ThemeDensity, ThemeRadius,
} from '@agicore/parser';

const PALETTE_HEX: Record<ThemePalette, string> = {
  indigo:  '#6366f1',
  violet:  '#8b5cf6',
  rose:    '#f43f5e',
  amber:   '#f59e0b',
  emerald: '#10b981',
  cyan:    '#06b6d4',
  slate:   '#64748b',
};

const DENSITY_SPACING: Record<ThemeDensity, string> = {
  compact:     '0.75rem',
  comfortable: '1rem',
  spacious:    '1.25rem',
};

const RADIUS_VALUES: Record<ThemeRadius, string> = {
  sharp:   '0px',
  rounded: '0.5rem',
  pill:    '9999px',
};

function backgroundDecl(bg: ThemeBackground): { primary: string; extra: string } {
  if (bg === 'dark')  return { primary: '#0f0f13', extra: '' };
  if (bg === 'light') return { primary: '#f8f9fa', extra: '' };
  return { primary: '#0f0f13', extra: '  color-scheme: light dark;\n' };
}

function generateThemeCss(theme: ThemeDecl): string {
  const primary = PALETTE_HEX[theme.palette];
  const accent  = theme.accent ?? primary;
  const spacing = DENSITY_SPACING[theme.density];
  const radius  = RADIUS_VALUES[theme.radius];
  const bg      = backgroundDecl(theme.background);

  return `/* Agicore Generated Theme — ${theme.name}
 * palette: ${theme.palette}   motif: ${theme.motif}   density: ${theme.density}
 * DO NOT EDIT BY HAND — regenerated from THEME ${theme.name} { ... }
 */
:root {
  --color-primary: ${primary};
  --color-accent: ${accent};
  --font-family: "${theme.font}", system-ui, -apple-system, sans-serif;
  --spacing-unit: ${spacing};
  --radius: ${radius};
  --bg-primary: ${bg.primary};
${bg.extra}}
`;
}

function generateThemeTs(theme: ThemeDecl): string {
  const primary = PALETTE_HEX[theme.palette];
  const accent  = theme.accent ?? primary;
  return `// Agicore Generated — DO NOT EDIT BY HAND
// Source: THEME ${theme.name} { ... }

export const APP_THEME = {
  palette: '${theme.palette}',
  accent: '${accent}',
  background: '${theme.background}',
  font: '${theme.font}',
  density: '${theme.density}',
  motif: '${theme.motif}',
  radius: '${theme.radius}',
} as const;

export type AppTheme = typeof APP_THEME;
`;
}

export function generateTheme(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!ast.themes || ast.themes.length === 0) return files;

  // Emit each declared theme as its own stylesheet.
  for (const theme of ast.themes) {
    files.set(`src/styles/${theme.name}.css`, generateThemeCss(theme));
  }

  // The LAST declared theme becomes the active theme (theme.css + theme.ts).
  const active = ast.themes[ast.themes.length - 1]!;
  files.set('src/styles/theme.css', generateThemeCss(active));
  files.set('src/lib/theme.ts', generateThemeTs(active));

  return files;
}
