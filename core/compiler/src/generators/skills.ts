// SKILL Code Generator
// Generates src/lib/skills.ts — a TypeScript registry for keyword-based
// skill document injection into AI system prompts.
// Activated when ast.skills.length > 0.

import type { AgiFile, SkillDecl } from '@agicore/parser';

function skillEntry(skill: SkillDecl): string {
  const keywords = skill.keywords.map(k => `'${k}'`).join(', ');
  return [
    '  {',
    `    name: '${skill.name}',`,
    `    description: ${JSON.stringify(skill.description)},`,
    `    keywords: [${keywords}],`,
    `    domain: '${skill.domain ?? 'general'}',`,
    `    priority: ${skill.priority},`,
    '  },',
  ].join('\n');
}

export function generateSkills(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.skills.length === 0) return files;

  const entries = ast.skills.map(skillEntry).join('\n');

  const content = [
    '// Agicore Generated — DO NOT EDIT BY HAND',
    '// Re-run `agicore generate` to regenerate.',
    '// Skill registry: keyword-based domain expertise injection.',
    '',
    'export interface SkillDef {',
    '  name: string;',
    '  description: string;',
    '  keywords: string[];',
    '  domain: string;',
    '  priority: number;',
    '}',
    '',
    'export const SKILL_REGISTRY: SkillDef[] = [',
    entries,
    '];',
    '',
    '/**',
    ' * Return skills whose keywords appear in the user message, ranked by priority.',
    ' */',
    'export function matchSkills(userMessage: string): SkillDef[] {',
    '  const lower = userMessage.toLowerCase();',
    '  return SKILL_REGISTRY',
    '    .filter(skill => skill.keywords.some(kw => lower.includes(kw)))',
    '    .sort((a, b) => b.priority - a.priority);',
    '}',
    '',
    '/**',
    ' * Build a context prefix to prepend to the system prompt based on matched skills.',
    ' * Returns an empty string when no skills match.',
    ' */',
    'export function buildSkillContext(userMessage: string): string {',
    '  const matched = matchSkills(userMessage);',
    '  if (matched.length === 0) return \'\';',
    '  const lines = matched.map(',
    '    s => `[${s.domain.toUpperCase()} CONTEXT: ${s.description}]`,',
    '  );',
    '  return lines.join(\'\\n\') + \'\\n\\n\';',
    '}',
    '',
    '/**',
    ' * Return all distinct domains covered by declared skills.',
    ' */',
    'export function skillDomains(): string[] {',
    '  return [...new Set(SKILL_REGISTRY.map(s => s.domain))];',
    '}',
    '',
  ].join('\n');

  files.set('src/lib/skills.ts', content);
  return files;
}
