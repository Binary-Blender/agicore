// ─── Macro Executor ──────────────────────────────────────────────────────────
// Maps macro names to actual function calls within NovaSyn Council.
// Stubs for now — will be wired to real services in a later phase.

const macroHandlers: Record<string, (input: any) => Promise<any>> = {
  'council.run_discussion': async (input) => {
    // TODO: Wire to meeting/conversation service for running a multi-persona discussion
    return { meetingId: '', messages: [], model: 'stub' };
  },
  'council.get_consensus': async (input) => {
    // TODO: Wire to analyzeMeeting for consensus extraction
    return { consensus: [], disagreements: [], summary: '' };
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
