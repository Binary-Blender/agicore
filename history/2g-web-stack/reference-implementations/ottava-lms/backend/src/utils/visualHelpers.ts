export const clampSnippet = (input: string | null | undefined, max = 1200) => {
  if (!input) return '';
  const normalized = input.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return normalized.slice(0, max);
};

export const parseSizeDimensions = (sizeValue?: string) => {
  const fallback = { width: 1024, height: 1024 };
  if (!sizeValue) return fallback;
  const [w, h] = sizeValue.split('x').map((value) => parseInt(value, 10));
  return {
    width: Number.isFinite(w) && w > 0 ? w : fallback.width,
    height: Number.isFinite(h) && h > 0 ? h : fallback.height,
  };
};
