// ─── Macro Executor ──────────────────────────────────────────────────────────
// Maps macro names to actual function calls within NovaSyn Writer.
// Stubs for now — will be wired to real services in a later phase.

const macroHandlers: Record<string, (input: any) => Promise<any>> = {
  'writer.ai_rewrite': async (input) => {
    // TODO: Wire to aiService for AI rewrite of selected text
    return { rewrittenText: '', model: 'stub', tokens: 0 };
  },
  'writer.export_chapter': async (input) => {
    // TODO: Wire to export service for chapter export
    return { filePath: '', format: input?.format || 'markdown', success: false };
  },
  'writer.generate_outline': async (input) => {
    // TODO: Wire to aiService for outline generation
    return { beats: [], model: 'stub', tokens: 0 };
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
