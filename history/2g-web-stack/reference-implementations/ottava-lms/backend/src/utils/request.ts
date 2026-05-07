export const firstQueryValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
};

export const positiveIntFromQuery = (value: unknown, fallback: number, max?: number): number => {
  const raw = firstQueryValue(value);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  if (max !== undefined) {
    return Math.min(parsed, max);
  }
  return parsed;
};
