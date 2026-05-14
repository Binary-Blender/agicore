// Agicore Generated — DO NOT EDIT BY HAND
// Re-run `agicore generate` to regenerate.
// Skill registry: keyword-based domain expertise injection.

export interface SkillDef {
  name: string;
  description: string;
  keywords: string[];
  domain: string;
  priority: number;
}

export const SKILL_REGISTRY: SkillDef[] = [
  {
    name: 'novasyn_dev_stack',
    description: "NovaSyn development patterns and coding standards",
    keywords: ['typescript', 'react', 'zustand', 'tauri', 'electron', 'ipc', 'schema', 'component', 'novasyn'],
    domain: 'coding',
    priority: 10,
  },
  {
    name: 'creative_writing',
    description: "Author voice matching and narrative techniques",
    keywords: ['write', 'story', 'novel', 'chapter', 'character', 'plot', 'voice', 'narrative'],
    domain: 'creative_writing',
    priority: 7,
  },
];

/**
 * Return skills whose keywords appear in the user message, ranked by priority.
 */
export function matchSkills(userMessage: string): SkillDef[] {
  const lower = userMessage.toLowerCase();
  return SKILL_REGISTRY
    .filter(skill => skill.keywords.some(kw => lower.includes(kw)))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Build a context prefix to prepend to the system prompt based on matched skills.
 * Returns an empty string when no skills match.
 */
export function buildSkillContext(userMessage: string): string {
  const matched = matchSkills(userMessage);
  if (matched.length === 0) return '';
  const lines = matched.map(
    s => `[${s.domain.toUpperCase()} CONTEXT: ${s.description}]`,
  );
  return lines.join('\n') + '\n\n';
}

/**
 * Return all distinct domains covered by declared skills.
 */
export function skillDomains(): string[] {
  return [...new Set(SKILL_REGISTRY.map(s => s.domain))];
}
