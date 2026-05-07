export const normalizeSearchTerm = (value?: string | null): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length ? trimmed : null;
};

export const buildFuzzySearchTerm = (term: string): string => {
  const escaped = term.replace(/[%_\\]/g, '\\$&');
  return `%${escaped}%`;
};
