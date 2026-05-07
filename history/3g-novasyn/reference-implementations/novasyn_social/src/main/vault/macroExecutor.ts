// ─── Macro Executor ──────────────────────────────────────────────────────────
// Maps macro names to actual function calls within NovaSyn Social.
// Stubs for now — will be wired to real services in a later phase.

const macroHandlers: Record<string, (input: any) => Promise<any>> = {
  'social.draft_email': async (input) => {
    // TODO: Wire to draftService for email draft generation
    return { draftText: '', confidence: 0, model: 'stub' };
  },
  'social.classify_inbox': async (input) => {
    // TODO: Wire to classificationService for inbox classification
    return { classified: 0, results: [] };
  },
  'social.generate_post': async (input) => {
    // TODO: Wire to draftService for social media post generation
    return { postText: '', platform: input?.platform || 'unknown', model: 'stub' };
  },
};

/**
 * Execute a macro by name with the given input.
 * Throws if the macro name is not registered.
 */
export async function executeMacro(macroName: string, input: any): Promise<any> {
  const handler = macroHandlers[macroName];
  if (!handler) {
    throw new Error(`Unknown macro: ${macroName}`);
  }
  return handler(input);
}

/** Get list of registered macro names */
export function getRegisteredMacroNames(): string[] {
  return Object.keys(macroHandlers);
}
