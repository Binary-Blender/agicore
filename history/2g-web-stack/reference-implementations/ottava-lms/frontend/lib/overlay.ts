export interface OverlayPayload {
  reinforcement: string[];
  policy_highlights: string[];
  combined: string[];
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (item === null || item === undefined) {
        return '';
      }
      return String(item).trim();
    })
    .filter(Boolean);
};

const parsePossibleJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // Some legacy records may be double-encoded JSON strings ("{...}")
    if (
      (trimmed.startsWith('\"') && trimmed.endsWith('\"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      try {
        return JSON.parse(trimmed.slice(1, -1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

export const createEmptyOverlay = (): OverlayPayload => ({
  reinforcement: [],
  policy_highlights: [],
  combined: [],
});

const pickFirstArray = (source: Record<string, unknown>, keys: string[]): string[] => {
  for (const key of keys) {
    const candidate = toStringArray(source[key]);
    if (candidate.length) {
      return candidate;
    }
  }
  return [];
};

export const normalizeOverlayPayload = (input?: unknown): OverlayPayload => {
  if (!input) {
    return createEmptyOverlay();
  }

  const parsed = parsePossibleJson(input);

  if (!parsed) {
    return createEmptyOverlay();
  }

  if (Array.isArray(parsed)) {
    const normalized = toStringArray(parsed);
    return normalized.length
      ? {
          reinforcement: [...normalized],
          policy_highlights: [],
          combined: [...normalized],
        }
      : createEmptyOverlay();
  }

  if (typeof parsed !== 'object') {
    return createEmptyOverlay();
  }

  const payload = parsed as Record<string, unknown>;

  const reinforcement = pickFirstArray(payload, [
    'reinforcement',
    'reinforcement_phrases',
    'reinforcementPhrases',
    'lyric_reinforcement',
    'lyricReinforcers',
    'lyric_reinforcers',
  ]);

  const policyHighlights = pickFirstArray(payload, [
    'policy_highlights',
    'policyHighlights',
    'policy_addons',
    'policyAddons',
    'policy_additions',
  ]);

  let combined = pickFirstArray(payload, [
    'combined',
    'reminder_phrases',
    'reminderPhrases',
    'phrases',
    'all',
  ]);

  if (!combined.length && (reinforcement.length || policyHighlights.length)) {
    combined = [...reinforcement, ...policyHighlights];
  }

  // Legacy data might only populate `combined`, so surface something sensible.
  const normalizedReinforcement = reinforcement.length
    ? reinforcement
    : combined.length
    ? [...combined]
    : [];
  const normalizedHighlights = policyHighlights;

  return {
    reinforcement: normalizedReinforcement,
    policy_highlights: normalizedHighlights,
    combined,
  };
};
